# frozen_string_literal: true

module Export
  # P2 WP 02: element-grained export profile — ONE sample as a
  # self-contained, versioned, provenance-carrying payload on top of the
  # collection exporter's serialization core (fetch_one/fetch_containers/
  # fetch_literals reused verbatim; no parallel format invented).
  #
  # Runs in gate mode (@gt = true) so real source ids survive into the
  # payload — ProvenanceRef needs them; the importer's slice-whitelists
  # guarantee they are never assigned locally.
  #
  # Deliberate deltas vs. the collection profile:
  # - elemental_compositions ARE exported (the collection profile silently
  #   drops them — inherited gap, fixed here for the element profile)
  # - no CollectionsSample rows: the importer supplies the landing collection
  # - top-level chemotion_meta key: schema_version + producing app version +
  #   provenance (safe — the importer only reads known model keys; the
  #   legacy 'source' key set the precedent)
  class ExportSample < ExportCollections
    SCHEMA_VERSION = 1
    PROFILE = 'element/sample'

    SoftDeletedSourceError = Class.new(StandardError)

    def initialize(export_id, sample_id, current_user_id = nil)
      super(export_id, [], 'zip', false, true, current_user_id)
      @sample_id = sample_id
    end

    # rubocop:disable Metrics/MethodLength
    def prepare_data
      sample = Sample.with_deleted.find(@sample_id)
      if sample.deleted_at.present?
        raise SoftDeletedSourceError, "sample #{@sample_id} is soft-deleted — export refused"
      end

      Labimotion::Export.fetch_segment_klasses(&method(:fetch_many)) # rubocop:disable Performance/MethodObjectAsBlock
      Labimotion::Export.fetch_dataset_klasses(&method(:fetch_many)) # rubocop:disable Performance/MethodObjectAsBlock

      fetch_one(sample, {
                  'molecule_name_id' => 'MoleculeName',
                  'molecule_id' => 'Molecule',
                  'fingerprint_id' => 'Fingerprint',
                  'created_by' => 'User',
                  'user_id' => 'User',
                })
      fetch_one(sample.fingerprint)
      fetch_one(sample.molecule)
      fetch_one(sample.molecule_name, { 'molecule_id' => 'Molecule', 'user_id' => 'User' })
      fetch_many(sample.residues, { 'sample_id' => 'Sample' })
      fetch_many(sample.elemental_compositions, { 'sample_id' => 'Sample' })

      upload_att = Labimotion::Export.fetch_segments(sample, @uuids, nil, &method(:fetch_one))
      @attachments += upload_att if upload_att&.length&.positive?

      fetch_containers(sample)
      fetch_literals(sample)
      fetch_image('samples', sample.sample_svg_file)
      fetch_image('molecules', sample.molecule.molecule_svg_file)

      @data['chemotion_meta'] = {
        'schema_version' => SCHEMA_VERSION,
        'profile' => PROFILE,
        'app_version' => Chemotion::Application.config.version['version'],
        'exported_at' => Time.current.utc.iso8601,
        'provenance' => {
          'remote_ref' => ProvenanceRef.build(sample).to_s,
          'instance' => TenantContext.current.instance_id,
          'tenant' => TenantContext.current.id || 'single',
          'exported_by' => exporter_identity,
        },
      }
    end
    # rubocop:enable Metrics/MethodLength

    private

    def exporter_identity
      user = User.find_by(id: @current_user_id)
      { 'id' => user&.id, 'federated_id' => user&.federated_id, 'name' => user&.name }
    end
  end
end
