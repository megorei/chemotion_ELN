# frozen_string_literal: true

# == Schema Information
#
# Table name: device_descriptions
#
#  id                              :bigint           not null, primary key
#  device_id                       :integer
#  name                            :string
#  short_label                     :string
#  vendor_id                       :string
#  vendor_url                      :string
#  serial_number                   :string
#  version_doi                     :string
#  version_doi_url                 :string
#  device_type                     :string
#  device_type_detail              :string
#  operation_mode                  :string
#  version_installation_start_date :datetime
#  version_installation_end_date   :datetime
#  description                     :text
#  operators                       :jsonb
#  university_campus               :string
#  institute                       :string
#  building                        :string
#  room                            :string
#  infrastructure_assignment       :string
#  access_options                  :string
#  comments                        :string
#  size                            :string
#  weight                          :string
#  application_name                :string
#  application_version             :string
#  description_for_methods_part    :text
#  created_at                      :datetime         not null
#  updated_at                      :datetime         not null
#  vendor_device_name              :string
#  vendor_device_id                :string
#  vendor_company_name             :string
#  tags                            :string
#  policies_and_user_information   :text
#  version_number                  :string
#  version_characterization        :text
#  deleted_at                      :datetime
#  created_by                      :integer
#  ontologies                      :jsonb
#  ancestry                        :string
#
# Indexes
#
#  index_device_descriptions_on_device_id  (device_id)
#
class DeviceDescription < ApplicationRecord
  attr_accessor :collection_id, :is_split

  include ElementUIStateScopes
  # include PgSearch::Model
  include Collectable
  include ElementCodes
  include AnalysisCodes
  include Taggable
  include Labimotion::Segmentable

  acts_as_paranoid

  belongs_to :device, optional: true
  has_many :collections_device_descriptions, inverse_of: :device_description, dependent: :destroy
  has_many :collections, through: :collections_device_descriptions

  belongs_to :creator, foreign_key: :created_by, class_name: 'User', inverse_of: :device_descriptions

  has_many :attachments, as: :attachable, inverse_of: :attachable, dependent: :nullify
  has_many :sync_collections_users, through: :collections

  has_many :comments, as: :commentable, inverse_of: :commentable, dependent: :destroy
  has_one :container, as: :containable, inverse_of: :containable, dependent: :nullify
  has_ancestry orphan_strategy: :adopt

  accepts_nested_attributes_for :collections_device_descriptions

  scope :includes_for_list_display, -> { includes(:tag) }

  after_create :set_short_label

  def analyses
    container ? container.analyses : []
  end

  def set_short_label
    return if is_split == true

    prefix = 'Dev'
    counter = creator.increment_counter 'device_descriptions' # rubocop:disable Rails/SkipsModelValidations
    user_label = creator.name_abbreviation

    update(short_label: "#{user_label}-#{prefix}#{counter}")
  end

  def counter_for_split_short_label
    element_children = children.with_deleted.order('created_at')
    last_child_label = element_children.where('short_label LIKE ?', "#{short_label}-%").last&.short_label
    last_child_counter = (last_child_label&.match(/^#{short_label}-(\d+)/) && ::Regexp.last_match(1).to_i) || 0

    [last_child_counter, element_children.count].max
  end

  def all_collections(user, collection_ids)
    Collection.where(id: collection_ids) | Collection.where(user_id: user, label: 'All', is_locked: true)
  end

  def create_sub_device_description(user, collection_ids)
    device_description = dup
    segments = device_description.segments

    device_description.is_split = true
    device_description.short_label = "#{short_label}-#{counter_for_split_short_label + 1}"
    device_description.parent = self
    device_description.created_by = user.id
    device_description.container = Container.create_root_container
    device_description.attachments = []
    device_description.segments = []
    device_description.collections << all_collections(user, collection_ids)
    device_description.save!

    device_description.save_segments(segments: segments, current_user_id: user.id) if segments

    device_description.reload
  end
end