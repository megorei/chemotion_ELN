# frozen_string_literal: true

FactoryBot.define do
  factory :macromolecule do
    sequence(:name) { |i| "Macromolecule #{i}" }
    deleted_at { nil }
    uniprot_source { "{}" }
    uniprot_ids { ["UNIPROT-ID-1", "UNIPROT-ID-2"] }
  end
end
