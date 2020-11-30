# == Schema Information
#
# Table name: device_metadata
#
#  id               :integer          not null, primary key
#  device_id        :integer
#  doi              :string
#  url              :string
#  landing_page     :string
#  name             :string
#  type             :string
#  description      :string
#  publisher        :string
#  publication_year :integer
#  manufacturers    :jsonb
#  owners           :jsonb
#  dates            :jsonb
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  deleted_at       :datetime
#
# Indexes
#
#  index_device_metadata_on_deleted_at  (deleted_at)
#  index_device_metadata_on_device_id   (device_id)
#

class DeviceMetadata < ActiveRecord::Base
  self.inheritance_column = nil
  acts_as_paranoid

  belongs_to :device
end
