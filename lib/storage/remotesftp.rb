require 'net/sftp'
require 'storage'

# NOTE (WP 02): legacy/dead path — Zeitwerk-ignored (see config/application.rb)
# and unused since 2016. Nil-hardened anyway (inventory §1.5 #7): credentials
# now read from the storage.yml schema (:stores:sftp:...) with safe navigation,
# and a missing configuration raises a clear error instead of a nil crash.
class RemoteSFTP < Storage

  def initialize
    super
    sftp_config = Rails.configuration.storage.stores&.dig(:sftp) || {}
    @host = sftp_config[:host]
    @username = sftp_config[:username]
    @password = sftp_config[:password]
  end

  def storage_id
    "remote_sftp"
  end

  def move(created_by, file_id_filename, thumbnail)
    begin
      ensure_configured!
      folder = File.join(@upload_root_folder, created_by.to_s)
      path = File.join(folder, file_id_filename)

      Net::SFTP.start(@host, @username, :password => @password) do |sftp|
        sftp.mkdir! folder
        sftp.upload! path

        if thumbnail
          folder_thumbnail = File.join(folder, @thumbnail_folder)
          path_thumbnail = File.join(folder_thumbnail, file_id_filename + ".png")

          sftp.mkdir! folder_thumbnail
          if File.exist?(path_thumbnail)
            sftp.upload! path_thumbnail
          else
            #thumbnail erzeugen?ß
          end
        end
      end
    rescue Exception => e
      puts "ERROR: Can not copy file to ftp-server: " + e.message
      raise e.message
    end
  end

  def read(attachment)
    begin
      ensure_configured!
      folder = File.join(@upload_root_folder, attachment.created_by.to_s)
      file_id = attachment.identifier + "_" + attachment.filename
      path = File.join(folder, file_id)

      Net::SFTP.start(@host, @username, :password => @password) do |sftp|
        return sftp.download!(path)
      end
    rescue Exception => e
      puts "ERROR: Can not read file from ftp-server: " + e.message
      raise e.message
    end
  end

  def delete(attachment)
  end

  def read_thumbnail(attachment)
  end

  private

  def ensure_configured!
    return if @host.present? && @username.present?

    raise 'RemoteSFTP storage is not configured (storage stores.sftp)'
  end

  def create_thumbnail(created_by, file_path, file_id)
  end
end
