FactoryBot.define do
  factory :device_metadata do
    name { 'Device Metadata' }
    sequence(:doi) { |i| "10.12345/DEVICE-#{i}" }
    url { "http://doi.org/#{doi}" }
    landing_page { url }
    type {}
    description { 'Metadata for device'}
    publisher { 'Chemotion' }
    publication_year { Time.current.year }
    owners {[{
      owner: {
        ownerName: Faker::Company.name,
        ownerContact: Faker::Internet.email,
        ownerIdentifier: {}
      }
    }]}
    manufacturers {[{
      manufacturer: {
        manufacturerName: Faker::Company.name,
        modelName: 'TES-T 123',
        manufacturererIdentifier: {}
      }
    }]}
    dates {[{
      date: {
        date: '2020-11-11',
        dateType: 'Commissioned'
      }
    }]}
  end
end
