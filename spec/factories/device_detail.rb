# frozen_string_literal: true

FactoryBot.define do
  factory :device_detail do
    serial_number { '123abc456def' }
    verification_status { 'none' }
    active { false }
    visibility { false }
  end
end
