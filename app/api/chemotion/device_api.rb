module Chemotion
  class DeviceAPI < Grape::API
    helpers GroupAdminHelpers

    # WP 07 (REQ-ELN-12): this legacy API trusted client-supplied device ids —
    # any authenticated user could read/update/delete any device. Mutations now
    # require: instance Admin, a directly linked user (users_devices), or a
    # group admin of a linked group. Reads additionally allow members of a
    # linked group (same exposure as GET /api/v1/users/devices).
    helpers do
      def device_linked_user_ids(device)
        device.users_devices.pluck(:user_id)
      end

      def device_manager?(device)
        return false if current_user.nil?
        return true if current_user.is_a?(Admin)
        return true if device_linked_user_ids(device).include?(current_user.id)

        device.groups.any? { |group| group_admin_of?(group) }
      end

      def device_reader?(device)
        return true if device_manager?(device)

        (device_linked_user_ids(device) & current_user.group_ids).any?
      end

      def require_device_manager!(device)
        error!('401 Unauthorized', 401) unless device_manager?(device)
      end

      def require_device_reader!(device)
        error!('401 Unauthorized', 401) unless device_reader?(device)
      end
    end

    resource :devices do
      desc "Create Device"
      params do
        optional :title, type: String, desc: "device name"
        optional :code, type: String, desc: "device code hash"
        optional :types, type: Array, desc: "device types"
        optional :samples, type: Array, desc: "device samples"
      end
      post do
        attributes = declared(params, include_missing: false)
        device = Device.new(attributes.except!(:samples))
        params[:samples].map {|s|
          sample = DevicesSample.create({sample_id: s.sample_id, device_id: device.id, types: s.types})
          device.devices_samples << sample
        }
        device.save!
        current_user.devices << device

        present device, with: Entities::DeviceEntity, root: :device
      end

      desc "get Device by Id"
      params do
        requires :id, type: Integer, desc: "Device id"
      end
      route_param :id do
        get do
          device = Device.find_by(id: params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            require_device_reader!(device)
            present device, with: Entities::DeviceEntity, root: :device
          end
        end
      end

      desc "set selected_device of user"
      route_param :id do
        post 'selected' do
          device = Device.find_by(id: params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            require_device_manager!(device)
            user = User.find_by(id: device.user_id)
            unless user.nil?
              user.selected_device = device
              user.save!
              device.id
            end
          end
        end
      end

      desc "Delete a device by id"
      params do
        requires :id, type: Integer, desc: "device id"
      end
      route_param :id do
        delete do
          device = Device.find(params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            require_device_manager!(device)
            # NOTE: (WP 07) the legacy cleanup here (devices_samples /
            # devices_analyses destruction, "delete as selected_device" via
            # device.user_id) referenced tables and attributes dropped when
            # Device left the users STI table — the route 500ed for everyone
            # before doing anything. Reduced to the plain (paranoid) destroy.

            present device.destroy, with: Entities::DeviceEntity, root: :device
          end
        end
      end

      desc "Update Device by id"
      params do
        requires :id, type: Integer, desc: "device id"
        optional :title, type: String, desc: "device name"
        optional :code, type: String, desc: "device code hash"
        optional :types, type: Array, desc: "device types"
        optional :samples, type: Array, desc: "device samples"
      end
      route_param :id do
        put do
          attributes = declared(params, include_missing: false)
          device = Device.find(params[:id])
          if device.nil?
            error!("404 Device with supplied id not found", 404)
          else
            require_device_manager!(device)
            # update devices_samples
            old_sample_ids = device.devices_samples.map {|devices_sample| devices_sample.id}
            new_sample_ids = params[:samples].map {|s|
              sample = DevicesSample.find_by(id: s.id)
              params = {sample_id: s.sample_id, device_id: device.id, types: s.types}
              if sample.nil?
                sample = DevicesSample.create!(params)
                device.devices_samples << sample
              else
                # were types deleted?
                deleted_types = sample.types - s.types
                deleted_types.map {|type|
                  analysis = device.devices_analyses.find_by(analysis_type: type)
                  experiment = analysis.analyses_experiments.find_by(devices_sample_id: s.id)
                  experiment.destroy!
                }

                sample.update!(params)
              end
              sample.id
            }
            to_remove_sample_ids = old_sample_ids - new_sample_ids
            to_remove_sample_ids.map{ |sample_id|
              device.devices_samples.find_by(id: sample_id).destroy
            }

            device.update(attributes.except!(:samples))
            # FIXME how to prevent this?
            Device.find(params[:id])
          end
        end
      end

      desc "get Devices"
      get do
        # WP 07: was `Device.all` (leaked every device to every user) presented
        # through a `Entity::DeviceEntity` typo that 500ed the route for
        # everyone. Scoped to the caller's own + group devices (instance
        # Admins see all), matching GET /api/v1/users/devices.
        devices = current_user.is_a?(Admin) ? Device.all : Device.by_user_ids(user_ids).distinct
        present devices, with: Entities::DeviceEntity, root: :devices
      end
    end
  end
end
