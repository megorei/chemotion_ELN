# frozen_string_literal: true

# == Schema Information
#
# Table name: attachments
#
#  id              :integer          not null, primary key
#  aasm_state      :string
#  attachable_type :string
#  attachment_data :jsonb
#  bucket          :string
#  checksum        :string
#  con_state       :integer
#  content_type    :string
#  created_by      :integer          not null
#  created_by_type :string
#  created_for     :integer
#  deleted_at      :datetime
#  filename        :string
#  filesize        :bigint
#  folder          :string
#  identifier      :uuid
#  key             :string(500)
#  storage         :string(20)       default("tmp")
#  thumb           :boolean          default(FALSE)
#  version         :string           default("/"), not null
#  created_at      :datetime         not null
#  updated_at      :datetime         not null
#  attachable_id   :integer
#
# Indexes
#
#  index_attachments_on_attachable_type_and_attachable_id  (attachable_type,attachable_id)
#  index_attachments_on_identifier                         (identifier) UNIQUE
#  index_attachments_on_version                            (version) WHERE (deleted_at IS NULL)
#

class Attachment < ApplicationRecord
  has_logidze
  acts_as_paranoid
  include AttachmentJcampAasm
  include AttachmentJcampProcess
  include Labimotion::AttachmentConverter
  include AttachmentUploader::Attachment(:attachment)

  attr_accessor :file_data, :file_path, :thumb_path, :thumb_data, :duplicated, :transferred

  has_ancestry ancestry_column: :version, orphan_strategy: :adopt

  validate :check_file_size

  after_initialize :set_default_created_by_type
  before_create :generate_key

  # reload to get identifier:uuid
  after_create :reload
  after_destroy :delete_file_and_thumbnail
  after_save :attach_file
  # TODO: rm this during legacy store cleaning
  # after_save :add_checksum, if: :new_upload

  belongs_to :attachable, polymorphic: true, optional: true
  has_one :report_template, dependent: :nullify
  # rubocop:disable Rails/InverseOf
  belongs_to :recipient, class_name: 'User', foreign_key: 'created_for', primary_key: 'id', optional: true
  # rubocop:enable Rails/InverseOf

  scope :where_research_plan, lambda { |c_id|
    where(attachable_id: c_id, attachable_type: 'ResearchPlan')
  }

  scope :where_container, lambda { |c_id|
    where(attachable_id: c_id, attachable_type: 'Container')
  }

  scope :where_report, lambda { |r_id|
    where(attachable_id: r_id, attachable_type: 'Report')
  }

  scope :where_template, lambda {
    where(attachable_type: 'Template')
  }

  def set_default_created_by_type
    self.created_by_type ||= 'User'
  rescue NoMethodError
    # This is a workaround for the case ActiveRecord::Migrator.current_version < 20210921114428
  end

  def extname
    File.extname(filename.to_s)
  end

  def read_file
    return if attachment_attacher.file.blank?

    attachment_attacher.file.rewind if attachment_attacher.file.eof?
    attachment_attacher.file.read
  end

  def read_thumbnail
    attachment(:thumbnail).read if attachment(:thumbnail)&.exists?
  end

  def abs_path
    attachment_attacher.url if attachment_attacher.file.present?
  end

  def abs_prev_path
    store.prev_path
  end

  def store
    Storage.new_store(self)
  end

  def old_store(old_store = storage_was)
    Storage.old_store(self, old_store)
  end

  # TODO: rm this during legacy store cleaning
  def add_checksum
    self.checksum = Digest::MD5.hexdigest(read_file) if attachment_attacher.file.present?
    update_column('checksum', checksum) # rubocop:disable Rails/SkipsModelValidations
  end

  # Rewrite read attribute for checksum
  def checksum
    # read_attribute(:checksum).presence || attachment['md5']
    attachment && attachment['md5']
  end

  # TODO: to be handled by shrine
  def reset_checksum
    add_checksum
    update_column('checksum', checksum) if checksum_changed? # rubocop:disable Rails/SkipsModelValidations
  end

  def regenerate_thumbnail
    return unless filesize <= 50 * 1024 * 1024

    store.regenerate_thumbnail
    update_column('thumb', thumb) if thumb_changed? # rubocop:disable Rails/SkipsModelValidations
  end

  # @desc return the associated element {instance of ResearchPlan, Sample,.. or User , or nil}
  # @return [ApplicationRecord, nil] the associated element through direct attachable association
  #   or indirectly through the containers association (Attachment -> Container -> {Element|User})
  #   or the `recipient` associated with the created_for attribute
  # @example
  #  "Attachment.new( attachable: ResearchPlan.last).root_element == ResearchPlan.last" #=> "true"
  #  "Attachment.new( attachable: Sample.last.analyses.first.children.first).root_element == Sample.last" #=> "true"
  #  "Attachment.new( created_for: User.last.id).root_element == User.last" #=> "true"
  #  "Attachment.new.root_element" #=> "nil"
  def root_element
    case attachable_type
    when 'Sample', 'Reaction', 'ResearchPlan', 'Wellplate', 'Screen', 'CelllineSample' # *Model::ELEMENTS
      attachable
    when 'Container'
      attachable&.root_element
    else
      recipient
    end
  end

  def for_research_plan?
    attachable_type == 'ResearchPlan'
  end

  def for_container?
    attachable_type == 'Container'
  end

  def research_plan_id
    for_research_plan? ? attachable_id : nil
  end

  def container_id
    for_container? ? attachable_id : nil
  end

  def research_plan
    for_research_plan? ? attachable : nil
  end

  def container
    for_container? ? attachable : nil
  end

  def update_research_plan!(c_id)
    update!(attachable_id: c_id, attachable_type: 'ResearchPlan')
  end

  def rewrite_file_data!
    return if file_data.blank?

    store.destroy
    store.store_file
    self
  end

  # Rewrite read attribute for filesize
  def filesize
    # read_attribute(:filesize).presence || attachment['size']
    attachment && attachment['size']
  end

  # Rewrite read attribute for content_type
  def content_type
    # read_attribute(:content_type).presence || attachment['mime_type']
    attachment && attachment['mime_type']
  end

  def reload
    super

    set_key
  end

  def set_key; end

  def type_image?
    attachment.present? && attachment['mime_type'].to_s.start_with?('image')
  end

  def type_image_tiff?
    attachment.present? && attachment['mime_type'].to_s == 'image/tiff'
  end

  def annotated?
    # attachment['derivatives'].present? && attachment['derivatives']['annotation'].present?
    attachment_data&.dig('derivatives', 'annotation', 'annotated_file_location').present? || false
  end

  def annotated_image?
    type_image? && annotated?
  end

  # to allow reading of PDF files within research plan analyses tab
  def type_pdf?
    attachment['mime_type'].to_s == 'application/pdf'
  end

  # @return [String] the path to the combined image file on disk
  def annotated_file_location
    return '' unless annotated?

    File.join(
      attachment.storage.directory,
      attachment_data&.dig('derivatives', 'annotation', 'annotated_file_location'),
    )
  end

  # @return [String] build annotation file name based on the original file name
  def annotated_filename
    return '' unless annotated?

    # NB: original tiff file are converted to png for the annotation background layer
    extension_of_annotation = content_type == 'image/tiff' ? '.png' : File.extname(filename)
    "#{File.basename(filename, '.*')}_annotated#{extension_of_annotation}"
  end

  def preview
    "data:image/png;base64,#{Base64.encode64(read_thumbnail)}" if thumb
  end

  private

  def generate_key
    self.key = SecureRandom.uuid unless key
    self.storage = 'local'
  end

  # TODO: rm this during legacy store cleaning
  def new_upload
    storage == 'tmp'
  end

  def store_changed
    !duplicated && storage_changed?
  end

  def transferred?
    transferred || false
  end

  def delete_file_and_thumbnail
    attachment_attacher.destroy
  end

  def user_quota_exceeded?
    user = User.find(created_for.nil? ? created_by : created_for)
    if (user.used_space + attachment_data['metadata']['size']) > user.allocated_space &&
       !user.allocated_space.zero?
      return true
    end

    false
  rescue ActiveRecord::RecordNotFound
    false # creating attachments without user is allowed (for tests)
  end

  def attach_file
    return if file_path.nil?
    return unless File.exist?(file_path)

    attachment_attacher.attach(File.open(file_path, binmode: true))
    raise 'File to large' unless valid?

    raise 'User quota exceeded' if user_quota_exceeded?

    attachment_attacher.create_derivatives

    update_column('attachment_data', attachment_data) # rubocop:disable Rails/SkipsModelValidations
  end

  def check_file_size
    return if file_path.nil?
    return unless File.exist?(file_path)

    return unless File.size(file_path) > Rails.configuration.shrine_storage.maximum_size * 1024 * 1024

    raise "File #{File.basename(file_path)}
      cannot be uploaded. File size must be less than #{Rails.configuration.shrine_storage.maximum_size} MB"
  end
end
