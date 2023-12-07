# frozen_string_literal: true

class DeviceDetail < ApplicationRecord
  belongs_to :device, optional: true
end
