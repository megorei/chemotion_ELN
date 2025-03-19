# frozen_string_literal: true

class SequenceBasedMacromoleculeSample < ApplicationRecord
  acts_as_paranoid

  before_create :auto_assign_short_label

  has_many :collections_sequence_based_macromolecule_samples, inverse_of: :sequence_based_macromolecule_sample, dependent: :destroy
  has_many :collections, through: :collections_sequence_based_macromolecule_samples
  belongs_to :sequence_based_macromolecule
  belongs_to :user

  scope :for_user, ->(user_id) { where(user_id: user_id) }
  scope :includes_for_list_display, -> { includes(:sequence_based_macromolecule) }
  scope :in_sbmm_order, -> { joins(:sequence_based_macromolecule).order("`sequence_based_macromolecules`.`systematic_name`" => :asc, updated_at: :desc) }

  def auto_assign_short_label
    return if short_label

    self.short_label = "SBMM-Sample-#{Random.uuid}"
  end
end
