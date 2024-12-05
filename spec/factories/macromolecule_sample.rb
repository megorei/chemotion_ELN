# frozen_string_literal: true

FactoryBot.define do
  factory :macromolecule_sample do
    sequence(:name) { |i| "MacromoleculeSample #{i}" }
    deleted_at { nil }
    external_label { nil }
    macromolecule_id { nil }
    sequence(:short_label) { |i| "SBMM-#{i}" }
  end
end
