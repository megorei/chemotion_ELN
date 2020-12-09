# frozen_string_literal: true

module DataCite
  def self.sync_device!(chemotion_device)
    Syncer.new(chemotion_device).process!
  end
end
