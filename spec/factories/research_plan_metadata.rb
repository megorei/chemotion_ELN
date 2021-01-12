# frozen_string_literal: true

FactoryBot.define do
  factory :research_plan_metadata do
    title { 'Research Plan Metadata' }
    sequence(:doi) { |i| "10.12345/RP-#{i}" }
    url { "https://the-device-page.org/#{doi}" }
    landing_page { "https://the-content-page.org/#{doi}" }
    type {}
    description { 'Metadata for research plan' }
    publisher { 'Chemotion' }
    publication_year { Time.current.year }
    dates do
      [
        {
          date: '2020-11-11',
          dateType: 'Published'
        }
      ]
    end
    geo_location do
      [
        {
          geoLocationPoint: {
            pointLongitude: Faker::Address.longitude,
            pointLatitude: Faker::Address.latitude
          }
        }
      ]
    end
    funding_reference do
      [
        {
          funderName: Faker::Name.name,
          funderIdentifier: Faker::Internet.url
        }
      ]
    end
  end
end
