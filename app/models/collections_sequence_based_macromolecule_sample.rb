# frozen_string_literal: true

class CollectionsSequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid
  belongs_to :collection
  belongs_to :sequence_based_macromolecule_sample
  validates :collection, :sequence_based_macromolecule_sample, presence: true

  include Tagging
  include Collecting

  def self.remove_in_collection(element_ids, collection_ids)
    # Remove from collections
    delete_in_collection_with_filter(element_ids, collection_ids)
    # update sample tag with collection info
    update_tag_by_element_ids(element_ids)
  end

  # prevent removing sample from a collection if associated wellplate or reaction is present
  def self.delete_in_collection_with_filter(sample_ids, collection_ids)
    [collection_ids].flatten.each do |cid|
      next unless cid.is_a?(Integer)
      # TODO: copy and adapt logic from CollectionsSample when SBMM-Sample gets relations to reaction/wellplate
      delete_in_collection(sample_ids, cid)
    end
  end

  def self.create_in_collection(element_ids, collection_ids)
    # upsert in target collection
    # update sample tag with collection info
    static_create_in_collection(element_ids, collection_ids)
  end

  def self.move_to_collection(element_ids, from_col_ids, to_col_ids)
    # Delete in collection
    delete_in_collection_with_filter(element_ids, from_col_ids)
    # Upsert in target collection
    insert_in_collection(element_ids, to_col_ids)
    # Update element tag with collection info
    update_tag_by_element_ids(element_ids)
  end
end
