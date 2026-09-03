# frozen_string_literal: true

FactoryBot.define do
  factory :guest_grant do
    sequence(:federated_id) { |n| "idp.example#guest-#{n}" }
    email { nil }
    state { 'pending' }
  end
end
