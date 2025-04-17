# frozen_string_literal: true

class SequenceBasedMacromolecule < ApplicationRecord
  ACCESSION_FORMAT = /[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}/.freeze

  acts_as_paranoid
  has_many :sequence_based_macromolecule_samples, dependent: nil
  has_many :collections, through: :sequence_based_macromolecule_samples
  belongs_to :protein_sequence_modification, optional: true
  belongs_to :post_translational_modification, optional: true
  belongs_to :parent, class_name: 'SequenceBasedMacromolecule', optional: true

  scope :uniprot, -> { where(uniprot_derivation: 'uniprot') }
  scope :modified, -> { where(uniprot_derivation: 'uniprot_modified') }
  scope :unknown, -> { where(uniprot_derivation: 'uniprot_unknown') }
  scope :non_uniprot, -> { where(uniprot_derivation: %w[uniprot_modified uniprot_unknown]) }
  scope :with_ec_number, lambda { |ec_number|
                           ec_number ? where('ec_numbers @> ARRAY[?]::varchar[]', [ec_number&.strip]) : none
                         }
  scope :with_accession, lambda { |accession|
                           accession ? where('accessions @> ARRAY[?]::varchar[]', [accession&.strip]) : none
                         }
  scope :search_in_name, lambda { |text|
                           text ? where("systematic_name LIKE '%#{text}%' OR short_name LIKE '%#{text}%'") : none
                         }

  accepts_nested_attributes_for(
    :sequence_based_macromolecule_samples,
    :protein_sequence_modification,
    :post_translational_modification,
  )
end
