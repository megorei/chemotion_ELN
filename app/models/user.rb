# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                     :integer          not null, primary key
#  email                  :string           default(""), not null
#  encrypted_password     :string           default(""), not null
#  reset_password_token   :string
#  reset_password_sent_at :datetime
#  remember_created_at    :datetime
#  sign_in_count          :integer          default(0), not null
#  current_sign_in_at     :datetime
#  last_sign_in_at        :datetime
#  current_sign_in_ip     :inet
#  last_sign_in_ip        :inet
#  created_at             :datetime         not null
#  updated_at             :datetime         not null
#  name                   :string
#  first_name             :string           not null
#  last_name              :string           not null
#  deleted_at             :datetime
#  counters               :hstore           not null
#  name_abbreviation      :string(12)
#  type                   :string           default("Person")
#  reaction_name_prefix   :string(3)        default("R")
#  confirmation_token     :string
#  confirmed_at           :datetime
#  confirmation_sent_at   :datetime
#  unconfirmed_email      :string
#  layout                 :hstore           not null
#  selected_device_id     :integer
#  failed_attempts        :integer          default(0), not null
#  unlock_token           :string
#  locked_at              :datetime
#  account_active         :boolean
#  matrix                 :integer          default(0)
#  providers              :jsonb
#  used_space             :bigint           default(0)
#  allocated_space        :bigint           default(0)
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#

# rubocop: disable Metrics/ClassLength, Metrics/CyclomaticComplexity
# rubocop: disable Metrics/AbcSize
# rubocop: disable Metrics/PerceivedComplexity

class User < ApplicationRecord
  attr_writer :login
  attr_accessor :provider, :uid

  acts_as_paranoid
  # Include default devise modules. Others available are: :timeoutable
  devise :database_authenticatable, :registerable, :confirmable,
         :recoverable, :rememberable, :trackable, :validatable, :lockable, :omniauthable, authentication_keys: [:login]
  has_one :profile, dependent: :destroy
  has_one :container, as: :containable

  has_many :collections
  has_many :samples, -> { unscope(:order).distinct }, through: :collections
  has_many :reactions, through: :collections
  has_many :wellplates, through: :collections
  has_many :screens, through: :collections
  has_many :research_plans, through: :collections
  has_many :vessels, through: :collections
  # created vessels will be kept when the creator goes (dependent: nil).
  has_many :created_vessels, class_name: 'Vessel', inverse_of: :creator, dependent: nil
  has_many :cellline_samples, through: :collections
  has_many :device_descriptions, through: :collections

  has_many :samples_created, foreign_key: :created_by, class_name: 'Sample'

  has_many :sync_out_collections_users, foreign_key: :shared_by_id, class_name: 'SyncCollectionsUser'
  has_many :sync_in_collections_users, class_name: 'SyncCollectionsUser'
  has_many :sharing_collections, through: :sync_out_collections_users, source: :collection
  has_many :shared_collections,  through: :sync_in_collections_users, source: :collection
  has_many :users_devices, dependent: :destroy
  has_many :devices, through: :users_devices
  # belongs_to :selected_device, class_name: 'Device'

  has_many :reports_users
  has_many :reports, through: :reports_users

  has_many :user_affiliations, dependent: :destroy
  has_many :affiliations, through: :user_affiliations

  has_many :computed_props

  has_many :text_templates, dependent: :destroy
  has_one :sample_text_template, dependent: :destroy
  has_one :reaction_text_template, dependent: :destroy
  has_one :reaction_description_text_template, dependent: :destroy
  has_one :screen_text_template, dependent: :destroy
  has_one :wellplate_text_template, dependent: :destroy
  has_one :research_plan_text_template, dependent: :destroy
  has_one :device_description_text_template, dependent: :destroy
  has_many :element_text_templates, dependent: :destroy
  has_many :calendar_entries, foreign_key: :created_by, inverse_of: :creator, dependent: :destroy
  has_many :comments, foreign_key: :created_by, inverse_of: :creator, dependent: :destroy

  accepts_nested_attributes_for :affiliations, :profile

  validates :first_name, :last_name, presence: { allow_blank: false }

  validates :name_abbreviation, uniqueness: { message: 'is already in use.' }
  validate :name_abbreviation_reserved_list, on: :create
  validate :name_abbreviation_length, on: :create
  validate :name_abbreviation_format, on: :create
  validate :mail_checker

  # NB: only Persons and Admins can get a confirmation email and confirm their email.
  before_create :skip_confirmation_notification!, unless: proc { |user|
                                                            %w[Person Admin].include?(user.type)
                                                          }
  # NB: option to skip devise confirmable for Admins and Persons
  before_create :skip_confirmation!, if: proc { |user|
                                           %w[Person Admin].include?(user.type) &&
                                             self.class.allow_unconfirmed_access_for.nil?
                                         }
  before_create :set_account_active, if: proc { |user| %w[Person].include?(user.type) }

  after_create :create_chemotion_public_collection
  after_create :create_all_collection
  after_create :update_matrix
  after_create :send_welcome_email, if: proc { |user| %w[Person].include?(user.type) }
  after_create :set_default_avail_space
  before_destroy :delete_data

  scope :by_name, lambda { |query|
    where("LOWER(first_name) ILIKE ? OR LOWER(last_name) ILIKE ? OR LOWER(first_name || ' ' || last_name) ILIKE ?",
          "#{sanitize_sql_like(query.downcase)}%",
          "#{sanitize_sql_like(query.downcase)}%",
          "#{sanitize_sql_like(query.downcase)}%")
  }
  scope :persons, -> { where(type: 'Person') }

  scope :by_exact_name_abbreviation, lambda { |query, case_insensitive = false|
    if case_insensitive
      where('LOWER(name_abbreviation) = ?', sanitize_sql_like(query.downcase).to_s)
    else
      where(name_abbreviation: query)
    end
  }

  # Find user by an email address in a case insensitive way
  # @param [String] email
  # @return [ActiveRecord::Relation]
  scope :by_email, lambda { |query|
    where('LOWER(email) = ?', sanitize_sql_like(query.downcase.strip))
  }

  # try to find a user by exact match of name_abbreviation
  # fall back to insensitive match result unless multiple users are found.
  def self.try_find_by_name_abbreviation(name_abbreviation)
    result = by_exact_name_abbreviation(name_abbreviation).first # try exact match, should be unique
    if result.nil?
      case_insensitive_result = by_exact_name_abbreviation(name_abbreviation, case_insensitive: true)
      result = case_insensitive_result.size == 1 ? case_insensitive_result.first : nil
    end
    result
  end

  def login
    @login || name_abbreviation || email
  end

  def self.find_first_by_auth_conditions(warden_conditions)
    conditions = warden_conditions.dup
    if (login = conditions.delete(:login))
      where(conditions).where(['name_abbreviation = :value OR lower(email) = lower(:value)', { value: login }]).first
    else
      where(conditions).first
    end
  end

  def active_for_authentication?
    super && account_active
  end

  def name_abbr_config
    @name_abbr_config ||=
      Rails.configuration.respond_to?(:user_props) ? (Rails.configuration.user_props&.name_abbr || {}) : {}
  end

  def name_abbreviation_reserved_list
    return unless (name_abbr_config[:reserved_list] || []).include?(name_abbreviation)

    errors.add(:name_abbreviation, 'is reserved, please change')
  end

  def name_abbreviation_format
    format_abbr_default = /\A[a-zA-Z][a-zA-Z0-9\-_]*[a-zA-Z0-9]\Z/
    format_err_msg_default =
      "can be alphanumeric, middle '_' and '-' are allowed, but leading digit, or trailing '-' and '_' are not."

    format_abbr = name_abbr_config[:format_abbr].presence || format_abbr_default.presence
    format_err_msg = name_abbr_config[:format_abbr_err_msg].presence || format_err_msg_default.presence

    return if name_abbreviation&.match?(format_abbr)

    errors.add(:name_abbreviation, format_err_msg)
  end

  def name_abbreviation_length
    case type
    when 'Group'
      min_val = name_abbr_config[:length_group]&.first || 2
      max_val = name_abbr_config[:length_group]&.last || 5
    when 'Device'
      min_val = name_abbr_config[:length_device]&.first || 2
      max_val = name_abbr_config[:length_device]&.last || 5
    else
      min_val = name_abbr_config[:length_default]&.first || 2
      max_val = name_abbr_config[:length_default]&.last || 3
    end

    return if name_abbreviation.to_s.length.between?(min_val, max_val)

    errors.add(:name_abbreviation, "has to be #{min_val} to #{max_val} characters long")
  end

  def mail_checker
    MailChecker.valid?(email) || errors.add(
      :email, 'from throwable email providers not accepted'
    )
  end

  def owns_collections?(collections)
    collections.pluck(:user_id).uniq == [id]
  end

  def owns_unshared_collections?(collections)
    owns_collections?(collections) && collections.pluck(:is_shared).none?
  end

  def name
    "#{first_name} #{last_name}"
  end

  def initials
    name_abbreviation
  end

  def restore_counters_data
    samples_number = samples_created.pluck(:short_label).map do |l|
      l.split('-').map(&:to_i)
    end.flatten.max || 0

    reactions_number = reactions.pluck(:name).map do |l|
      l.split('#').last.to_i
    end.max || 0

    self.counters = {
      samples: samples_number,
      reactions: reactions_number,
      wellplates: wellplates.count + wellplates.deleted.count,
    }

    save!
  end

  # The element models for which the counters that can be incremented
  COUNTER_KEYS = %w[samples reactions wellplates celllines device_descriptions].freeze

  # Increment a counter for a given key
  #   - samples, reactions, wellplates, celllines, device_descriptions
  #   - or a Generic Element
  # The counter is use to generate short labels as the first counter part of the label (ex the 5 in `JD-5-2`)
  # @param [String] key The key of the counter to increment
  # @return [String] The new integer value of the counter as String
  def increment_counter(key)
    return if counters[key].blank? && !key.in?(COUNTER_KEYS)

    counters[key] = counters[key].to_i.next
    save!
    counters[key]
  end

  def profile
    super || create_profile
  end

  has_many :users_groups, dependent: :destroy
  has_many :groups, through: :users_groups

  def group_ids
    groups.pluck(:id)
  end

  def group_collections
    Collection.where('user_id = ? AND is_locked = ?', group_ids, false)
  end

  def all_collections
    Collection.where('user_id IN (?) ', [id] + group_ids)
  end

  def all_sync_in_collections_users
    SyncCollectionsUser.where('user_id IN (?) ', [id] + group_ids)
  end

  def current_affiliations
    Affiliation.joins(
      'INNER JOIN user_affiliations ua ON ua.affiliation_id = affiliations.id',
    ).where(
      '(ua.user_id = ?) and (ua.deleted_at ISNULL) and (ua.to ISNULL or ua.to > ?)',
      id, Time.zone.now
    ).order('ua.from DESC')
  end

  def is_templates_moderator
    profile&.data&.fetch('is_templates_moderator', false)
  end

  def molecule_editor
    profile&.data&.fetch('molecule_editor', false)
  end

  def generic_admin
    profile&.data&.fetch('generic_admin', {})
  end

  def converter_admin
    profile&.data&.fetch('converter_admin', false)
  end

  def matrix_check_by_name(name)
    mx = Matrice.find_by(name: name)
    return false if mx.nil?

    matrix_check(mx.id)
  end

  def matrix_check(id)
    pins = matrix.to_s(2)
    return false if pins.nil? || id > pins.length

    (pins && pins.reverse[id]) == '1'
  end

  def update_matrix
    check_sql = ApplicationRecord.send(:sanitize_sql_array,
                                       ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ApplicationRecord.connection.exec_query(check_sql)

    if result.presence&.first&.fetch('rs', false)
      sql = ApplicationRecord.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', id])
      ApplicationRecord.connection.exec_query(sql)
    end
  rescue StandardError
    log_error 'Error on update_matrix'
  end

  def remove_from_matrices
    Matrice.where('include_ids @> ARRAY[?]', [id]).find_each do |ma|
      ma.update_columns(include_ids: ma.include_ids -= [id])
    end
    Matrice.where('exclude_ids @> ARRAY[?]', [id]).find_each do |ma|
      ma.update_columns(exclude_ids: ma.exclude_ids -= [id])
    end
  end

  def self.gen_matrix(user_ids = nil)
    check_sql = ApplicationRecord.send(:sanitize_sql_array,
                                       ["SELECT to_regproc('generate_users_matrix') IS NOT null as rs"])
    result = ApplicationRecord.connection.exec_query(check_sql)
    if result.presence&.first&.fetch('rs', false)
      sql = if user_ids.present?
              ApplicationRecord.send(:sanitize_sql_array, ['select generate_users_matrix(array[?])', user_ids])
            else
              'select generate_users_matrix(null)'
            end
      ApplicationRecord.connection.exec_query(sql)
    end
  rescue StandardError
    log_error 'Error on update_matrix'
  end

  def text_templates
    super.presence || TextTemplate.create_default_text_templates_for_user(id)
  end

  def self.from_omniauth(params)
    user = find_by(email: params[:email]&.downcase)
    if user.present?
      providers = user.providers || {}
      providers[params[:provider]] = params[:uid]
      user.providers = providers
      user.save!
    else
      user = User.new(
        email: params[:email]&.downcase,
        first_name: params[:first_name],
        last_name: params[:last_name],
        password: Devise.friendly_token[0, 20],
      )
    end

    if (params[:groups] || []).length&.positive?
      (params[:groups] || []).each do |group|
        name = group.split(':')
        if name.size == 3
          group = Group.find_by(first_name: name[2], last_name: name[1])
          user.groups << group if group.present? && user.groups.exclude?(group)
        end
      end
    end
    user
  end

  def link_omniauth(provider, uid)
    providers = {} if providers.nil?
    providers[provider] = uid
    save!
  end

  def password_required?
    super && provider.blank?
  end

  def extra_rules
    Matrice.extra_rules || {}
  end

  def self.default_admin
    find_by(type: 'Admin', name_abbreviation: 'ADM').presence || where(type: 'Admin').order(:created_at).first
  end

  def self.default_disk_space=(value)
    value = value.to_i
    return true if value == default_disk_space

    find_each do |user|
      user.update(allocated_space: [user.allocated_space, value].max)
    end
    default_admin&.update(allocated_space: value)
  end

  def self.default_disk_space
    return 0 if default_admin.nil?

    default_admin.allocated_space
  end

  private

  # These user collections are locked, i.e., the user is not allowed to:
  # - rename it
  # - move it around in collection tree
  # - add subcollections
  # - delete it

  def create_all_collection
    Collection.create(user: self, label: 'All', is_locked: true, position: 0)
  end

  def create_chemotion_public_collection
    return unless type == 'Person'

    Collection.create(user: self, label: 'chemotion-repository.net', is_locked: true, position: 1)
  end

  def set_account_active
    self.account_active = ENV['DEVISE_NEW_ACCOUNT_INACTIVE'].presence != 'true'
  end

  def send_welcome_email
    WelcomeMailer.delay.mail_welcome_message(id)
  end

  def set_default_avail_space
    self.allocated_space = User.default_disk_space
    save!
  end

  def delete_data
    # TODO: logic to check if user can be really destroy or which data can be deleted
    count = samples.count
    # + self.reactions.count
    # + self.wellplates.count
    # + self.screens.count
    # + self.research_plans.count
    update_columns(email: "#{id}_#{name_abbreviation}@deleted")
    update_columns(name_abbreviation: nil) if count.zero?
    update_columns(providers: nil)
  end

  def user_ids
    [id]
  end
end

class Person < User
  has_many :users_groups, dependent: :destroy, foreign_key: :user_id
  has_many :groups, through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :admin_id
  has_many :administrated_accounts,  through: :users_admins, source: :user
end

class Group < User
  has_many :users_groups, dependent: :destroy
  has_many :users, class_name: 'User', through: :users_groups

  has_many :users_admins, dependent: :destroy, foreign_key: :user_id
  has_many :admins, through: :users_admins, source: :admin # ,  foreign_key:    association_foreign_key: :admin_id
  around_save :update_allocated_space
  before_destroy :remove_from_matrices

  def administrated_by?(user)
    users_admins.where(admin: user).present?
  end

  private

  def user_ids
    # Override method to return an array of user IDs in the group
    users.ids
  end

  def update_allocated_space
    return yield unless allocated_space_changed?

    yield
    users.each do |user|
      next if user.allocated_space >= allocated_space

      user.update(allocated_space: allocated_space)
    end
  end
end

class DeviceDeprecated < User
end

# rubocop: enable Metrics/ClassLength, Metrics/CyclomaticComplexity
# rubocop: enable Metrics/AbcSize
# rubocop: enable Metrics/PerceivedComplexity
