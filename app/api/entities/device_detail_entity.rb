# frozen_string_literal: true

module Entities
  class DeviceDetailEntity < Grape::Entity
    expose :id
    expose :device_id
    expose :serial_number
    expose :user_ids
    expose :users
    expose :verification_status
    expose :active
    expose :visibility

    private

    def users
      [] if object&.user_ids.nil?
      User.where(id: object.user_ids)&.map do |user|
        {
          value: user.id, name: "#{user.first_name} #{user.last_name}",
          label: "#{user.first_name} #{user.last_name} (#{user.name_abbreviation})"
        }
      end
    end
  end
end
