module Entities
  class DeviceMetadataEntity < Grape::Entity
    expose :id, documentation: { type: 'Integer', desc: 'metadata id'}
    expose :device_id, documentation: { type: 'String', desc: 'metadata id'}
    expose :name, documentation: { type: 'String', desc: 'device name' }
    expose :doi, documentation: { type: 'String', desc: 'device doi' }
    expose :url, documentation: { type: 'String', desc: 'device url' }
    expose :landing_page, documentation: { type: 'String', desc: 'device landing_page' }
    expose :type, documentation: { type: 'String', desc: 'device type' }
    expose :description, documentation: { type: 'String', desc: 'device description' }
    expose :publisher, documentation: { type: 'String', desc: 'device publisher' }
    expose :publication_year, documentation: { type: 'Integer', desc: 'device publication year' }

    expose :owners, documentation: { desc: 'device owners' }
    expose :manufacturers, documentation: { desc: 'device manufacturers' }
    expose :dates, documentation: { desc: 'device dates' }
  end
end
