# frozen_string_literal: true

module Entities
  class MatriceEntity < ApplicationEntity
    expose :id, :enabled, :name, :label

    # WP 05 (REQ-ELN-5): secrets are write-only. Serialized configs carry a
    # masked placeholder (Matrice::SECRET_PLACEHOLDER) for every stored or
    # residual plaintext secret — never the value itself.
    expose :configs

    def configs
      object.masked_configs
    end

    expose_timestamps

    expose :include_ids, :include_users, unless: ->(_object, options) { options[:unexpose_include_ids] }
    expose :exclude_ids, :exclude_users, unless: ->(_object, options) { options[:unexpose_exclude_ids] }

    def include_users
      return [] if object&.include_ids.nil?

      User.where(id: object.include_ids)&.map do |user|
        { value: user.id, name: "#{user.first_name} #{user.last_name}",
          label: "#{user.first_name} #{user.last_name} (#{user.name_abbreviation})" }
      end
    end

    def exclude_users
      return [] if object&.exclude_ids.nil?

      User.where(id: object.exclude_ids)&.map do |user|
        { value: user.id, name: "#{user.first_name} #{user.last_name}",
          label: "#{user.first_name} #{user.last_name} (#{user.name_abbreviation})" }
      end
    end
  end
end
