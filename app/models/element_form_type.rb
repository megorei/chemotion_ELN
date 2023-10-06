# frozen_string_literal: true

class ElementFormType < ApplicationRecord
  belongs_to :creator, class_name: 'User'
end
