# frozen_string_literal: true

module Import
  # P2 WP 02: element-grained import — the counterpart of
  # Export::ExportSample. Reuses the collection importer's machinery
  # (extract/zip/attachment handling, molecule-by-content resolution in the
  # inherited import_samples, container/dataset/literal importers) and adds:
  #
  # - version gate: chemotion_meta.schema_version / profile checked first
  # - sanitation: Import::SanitizeRules over every payload row (ancestry
  #   neutralized, log_data stripped, non-nil deleted_at = hard error)
  # - idempotency: an existing origin-Provenance for the payload's
  #   remote_ref returns the already-imported element, writes nothing
  # - provenance: origin row on the copy; on a same-instance copy also the
  #   back-reference (direction: copy) on the source element
  # - dry-run: validates payload + reports idempotency without writing
  #   (no attachment rows are created — extract is skipped)
  class ImportSample < ImportCollections
    UnsupportedPayloadError = Class.new(StandardError)
    VersionMismatchError = Class.new(StandardError)

    Result = Struct.new(:sample, :already_imported, :dry_run, keyword_init: true)

    def initialize(att, current_user_id, collection_id:, dry_run: false)
      super(att, current_user_id, false, nil, nil)
      @target_collection = Collection.find(collection_id)
      @dry_run = dry_run
    end

    def execute
      if @dry_run
        read_data_only
      else
        extract
      end
      import_element
    ensure
      cleanup
    end

    private

    # rubocop:disable Metrics/AbcSize
    def import_element
      meta = validate_meta!
      remote_ref = meta.dig('provenance', 'remote_ref')
      raise UnsupportedPayloadError, 'payload carries no provenance.remote_ref' if remote_ref.blank?

      existing = Provenance.origins.find_by(remote_ref: remote_ref, element_type: 'Sample')
      if existing
        return Result.new(sample: existing.element, already_imported: true, dry_run: @dry_run)
      end

      sanitize_payload!
      return Result.new(sample: nil, already_imported: false, dry_run: true) if @dry_run

      sample = nil
      ActiveRecord::Base.transaction do
        wire_target_collection!
        import_samples
        import_residues
        import_elemental_compositions
        import_containers
        import_segments
        import_datasets
        import_attachments
        import_literals

        sample = @instances.fetch('Sample').values.first
        write_provenance!(sample, remote_ref, meta)
      end
      Result.new(sample: sample, already_imported: false, dry_run: false)
    end
    # rubocop:enable Metrics/AbcSize

    def validate_meta!
      meta = (@data || {})['chemotion_meta']
      raise UnsupportedPayloadError, 'not an element payload (chemotion_meta missing)' if meta.nil?
      raise UnsupportedPayloadError, "unsupported profile #{meta['profile'].inspect}" unless
        meta['profile'] == Export::ExportSample::PROFILE

      version = meta['schema_version'].to_i
      if version > Export::ExportSample::SCHEMA_VERSION
        raise VersionMismatchError,
              "payload schema_version #{version} is newer than supported " \
              "#{Export::ExportSample::SCHEMA_VERSION} — upgrade this instance first"
      end

      meta
    end

    def sanitize_payload!
      @data.each do |type, rows|
        next unless rows.is_a?(Hash) && type != 'chemotion_meta'

        rows.each do |uuid, fields|
          rows[uuid] = SanitizeRules.sanitize!(type, fields) if fields.is_a?(Hash)
        end
      end
    end

    # The payload carries no CollectionsSample rows; the landing collection
    # is the importer's choice. Synthesize the join so the inherited
    # import_samples resolves it through its normal fetch_many path.
    def wire_target_collection!
      sample_uuid = @data.fetch('Sample').keys.first
      target_uuid = 'target-collection'
      @instances['Collection'] = { target_uuid => @target_collection }
      @data['CollectionsSample'] = {
        SecureRandom.uuid => { 'sample_id' => sample_uuid, 'collection_id' => target_uuid },
      }
    end

    # The collection importer has no elemental_compositions path (they are
    # not in its payload) — the element profile exports and restores them.
    def import_elemental_compositions
      sort_data(@data.fetch('ElementalComposition', {})).each_value do |fields|
        sample = @instances.dig('Sample', fields.fetch('sample_id'))
        next if sample.nil?

        composition = sample.elemental_compositions
                            .find_or_initialize_by(composition_type: fields['composition_type'])
        composition.update!(fields.slice('data', 'loading'))
      end
    end

    def write_provenance!(sample, remote_ref, meta)
      sample.provenances.create!(
        direction: 'origin',
        remote_ref: remote_ref,
        actor_id: @current_user_id,
        metadata: meta.slice('schema_version', 'app_version', 'exported_at')
                      .merge('exported_by' => meta.dig('provenance', 'exported_by')),
      )

      # Same-instance copy: the source element lives in this very DB — write
      # the outbound back-reference (REQ-ELN-21c) right away. Cross-instance
      # sources get theirs through the (gated) WP 03 transfer flow.
      ref = ProvenanceRef.parse(remote_ref)
      return unless ref.local? && ref.element_type == 'Sample'

      source = Sample.find_by(id: ref.id)
      source&.provenances&.create!(
        direction: 'copy',
        remote_ref: ProvenanceRef.build(sample).to_s,
        actor_id: @current_user_id,
        metadata: { 'copied_to_collection_id' => @target_collection.id },
      )
    end

    # dry-run reads export.json only — no Attachment rows, no image files.
    def read_data_only
      att_file = Tempfile.new(encoding: 'ascii-8bit')
      att_file.write(@att.read_file)
      att_file.rewind
      Zip::File.open(att_file.path) do |zip_file|
        entry = zip_file.find_entry('export.json')
        raise UnsupportedPayloadError, 'zip carries no export.json' if entry.nil?

        @data = JSON.parse(entry.get_input_stream.read.force_encoding('UTF-8'))
      end
    ensure
      att_file&.close
    end
  end
end
