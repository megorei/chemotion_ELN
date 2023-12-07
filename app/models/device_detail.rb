# frozen_string_literal: true

# == Schema Information
#
# Table name: device_details
#
#  id                  :bigint           not null, primary key
#  device_id           :integer
#  serial_number       :string
#  user_ids            :integer          default([]), is an Array
#  verification_status :string           default("none")
#  active              :boolean          default(FALSE)
#  visibility          :boolean          default(FALSE)
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#
# Indexes
#
#  index_device_details_on_device_id  (device_id)
#
class DeviceDetail < ApplicationRecord
  belongs_to :device, optional: true
end
