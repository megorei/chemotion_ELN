# frozen_string_literal: true

FactoryBot.define do
  factory :user_role do
    user factory: %i[person]
    name { UserRole::TEMPLATES_MODERATOR }
  end
end
