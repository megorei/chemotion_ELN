# frozen_string_literal: true

module Import
  module Helpers
    class SequenceBasedMacromoleculeSampleImporter
      def initialize(data, current_user_id, instances)
        @data = data
        @current_user_id = current_user_id
        @instances = instances
      end

      def execute
        create_sequence_based_macromolecule_samples
      end

      def create_sequence_based_macromolecule_samples
        @data.fetch('SequenceBasedMacromoleculeSample', {}).each do |uuid, fields|
          sbmm_uuid = fields.fetch('sequence_based_macromolecule_id')
          sbmm_id = fetch_sbmm(sbmm_uuid)
          ancestry = @instances.fetch('SequenceBasedMacromoleculeSample', {}).fetch(fields['ancestry'], nil)
          sbmm_sample = SequenceBasedMacromoleculeSample.create(
            fields.except('id', 'user_id', 'sequence_based_macromolecule_id', 'ancestry')
            .merge(
              user_id: @current_user_id,
              sequence_based_macromolecule_id: sbmm_id,
              ancestry: ancestry.try(:id),
              collections: fetch_collection(uuid),
              container: Container.create_root_container,
            ),
          )
          update_instances!(uuid, sbmm_sample)
        end
      end

      def fields_for_query(json)
        fields = []
        json.except!('created_at', 'updated_at', 'deleted_at').map do |key, value|
          fields << { "#{key}": value }
        end
        fields
      end

      def fetch_sbmm(sbmm_uuid)
        sbmm_json = @data.fetch('SequenceBasedMacromolecule', {})[sbmm_uuid]
        sbmm_parent_id = sbmm_json['parent_id']
        parent_id = nil

        if sbmm_parent_id.present?
          parent_id = find_or_create_sbmm(sbmm_parent_id, { ids: [], id: nil }, { ids: [], id: nil }, nil)
        end

        ptm_ids_or_id = find_or_create_post_translational_modification(sbmm_json)
        psm_ids_or_id = find_or_create_protein_sequence_modification(sbmm_json)

        find_or_create_sbmm(sbmm_uuid, ptm_ids_or_id, psm_ids_or_id, parent_id)
      end

      # rubocop:disable Metrics/AbcSize
      def find_or_create_sbmm(sbmm_uuid, ptm_ids_or_id, psm_ids_or_id, parent_id)
        sbmm_json = @data.fetch('SequenceBasedMacromolecule', {})[sbmm_uuid]
        sbmm_json_for_query = sbmm_json.except!(
          'parent_id', 'uniprot_source', 'post_translational_modification_id', 'protein_sequence_modification_id'
        )
        fields = fields_for_query(sbmm_json_for_query)
        fields << { post_translational_modification_id: ptm_ids_or_id[:ids] } if ptm_ids_or_id[:ids].present?
        fields << { protein_sequence_modification_id: psm_ids_or_id[:ids] } if psm_ids_or_id[:ids].present?
        fields << { parent_id: parent_id } if parent_id.present?

        sbmm = SequenceBasedMacromolecule.where(sequence_based_macromolecules: fields.reduce({}, :merge))
                                         .where(sequence_based_macromolecules: { deleted_at: nil })
                                         .first

        if sbmm.blank?
          fields << { post_translational_modification_id: ptm_ids_or_id[:id] } if ptm_ids_or_id[:id]
          fields << { protein_sequence_modification_id: psm_ids_or_id[:id] } if psm_ids_or_id[:id]
          sbmm = SequenceBasedMacromolecule.create(fields.reduce({}, :merge))
        end
        update_instances!(sbmm_uuid, sbmm)
        sbmm.id
      end
      # rubocop:enable Metrics/AbcSize

      def find_or_create_post_translational_modification(sbmm_json)
        sbmm_post_translational_modification_id = sbmm_json['post_translational_modification_id']
        return { ids: [], id: nil } if sbmm_post_translational_modification_id.blank?

        json = @data.fetch('PostTranslationalModification', {})[sbmm_post_translational_modification_id]
        fields = fields_for_query(json).reduce({}, :merge)
        ptm = PostTranslationalModification.where(post_translational_modifications: fields)
                                           .where(post_translational_modifications: { deleted_at: nil })

        if ptm.blank?
          ptm = PostTranslationalModification.create(fields)
        else
          ids = ptm.pluck(:id)
        end

        { ids: ids, id: ptm.try(:id) }
      end

      def find_or_create_protein_sequence_modification(sbmm_json)
        sbmm_protein_sequence_modification_id = sbmm_json['protein_sequence_modification_id']
        return { ids: [], id: nil } if sbmm_protein_sequence_modification_id.blank?

        json = @data.fetch('ProteinSequenceModification', {})[sbmm_protein_sequence_modification_id]
        fields = fields_for_query(json).reduce({}, :merge)
        psm = ProteinSequenceModification.where(protein_sequence_modifications: fields)
                                         .where(protein_sequence_modifications: { deleted_at: nil })

        if psm.blank?
          psm = ProteinSequenceModification.create(fields)
        else
          ids = psm.pluck(:id)
        end
        { ids: ids, id: psm.try(:id) }
      end

      def update_instances!(uuid, instance)
        type = instance.class.name
        @instances[type] = {} unless @instances.key?(type)
        @instances[type][uuid] = instance
      end

      def fetch_collection(uuid)
        associations = []
        @data.fetch('CollectionsSequenceBasedMacromoleculeSample', {}).each_value do |fields|
          next unless fields['sequence_based_macromolecule_sample_id'] == uuid

          instance = @instances.fetch('Collection', {})[fields['collection_id']]
          associations << instance unless instance.nil?
        end
        associations
      end
    end
  end
end
