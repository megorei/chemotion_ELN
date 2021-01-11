class AddFieldsToResearchPlanMetadata < ActiveRecord::Migration
  def change
    rename_column :research_plan_metadata, :name, :title

    add_column :research_plan_metadata, :creator, :text
    add_column :research_plan_metadata, :affiliation, :text
    add_column :research_plan_metadata, :contributor, :text
    add_column :research_plan_metadata, :language, :string
    add_column :research_plan_metadata, :rights, :text

    add_column :research_plan_metadata, :format, :string
    add_column :research_plan_metadata, :version, :string
    add_column :research_plan_metadata, :geo_location, :jsonb
    add_column :research_plan_metadata, :funding_reference, :jsonb
    add_column :research_plan_metadata, :subject, :text
    add_column :research_plan_metadata, :alternate_identifier, :text
    add_column :research_plan_metadata, :related_identifier, :text
  end
end
