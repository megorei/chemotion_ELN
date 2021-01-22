FactoryBot.define do
  factory :research_plan do
    sequence(:name) { |i| "Research plan #{i}" }

    body do
      [
        { "id"=>"c8186fff-8011-43e6-9180-5a56f6139b3c",
          "type"=>"richtext",
          "value"=>{ "ops"=>[{ "insert"=>"some text here\n" }] } }
      ]
    end

    association :research_plan_metadata, factory: :research_plan_metadata

    callback(:before_create) do |research_plan|
      research_plan.creator = FactoryBot.build(:user) unless research_plan.creator
    end
  end
end
