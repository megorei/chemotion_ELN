# frozen_string_literal: true

class ElementFormType < ApplicationRecord
  belongs_to :creator, class_name: 'User'
  has_many :samples, dependent: :nullify

  scope :enabled, -> { where(enabled: true) }
  scope :enabled_for, ->(user) { enabled.where(enabled_for: user).or(where(enabled_for: nil)) }
  scope :by_element_type, ->(element_type) { where(element_type: element_type) }
end
