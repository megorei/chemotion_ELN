# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::AdminAPI do
  # let(:json_options) do
  #   {
  #     only: %i[
  #       id type reaction_name_prefix email matrix
  #       last_name first_name
  #     ],
  #     methods: %i[name initials is_templates_moderator molecule_editor account_active]
  #   }
  # end

#   let(:srlzr) do
#     { 'samples_count' => 0, 'reactions_count' => 0 }
#   end
#   let(:layout) do
#     {
#       'sample' => '1',
#       'reaction' => '2',
#       'wellplate' => '3',
#       'screen' => '4',
#       'research_plan' => '5'
#     }
#   end
#   let(:usrext) do
#     { 'confirmed_at' => nil, 'current_sign_in_at' => nil, 'email' => nil }
#   end

#   context 'authorized user-person logged in' do
#     let!(:p1)  { create(:person, first_name: 'Jane', last_name: 'Doe') }
#     let!(:p2)  { create(:person, first_name: 'John', last_name: 'Doe') }
#     let!(:p3)  { create(:person, first_name: 'Jin',  last_name: 'Doe') }
#     let!(:g1)  { create(:group, first_name: 'Doe', last_name: 'Group Test') }
#     let!(:g2)  do
#       create(
#         :group, admins: [p1], users: [p1, p2],
#                 first_name: 'Doe', last_name: 'Group Test'
#       )
#     end
#     let!(:g3) do
#       create(:group, admins: [p1], first_name: 'Doe', last_name: 'Group Test')
#     end
#     let!(:g4) do
#       create(
#         :group, admins: [p2], users: [p2, p3],
#                 first_name: 'Doe', last_name: 'Group Test'
#       )
#     end

    # before do
    #   allow_any_instance_of(WardenAuthentication).to receive(:current_user)
    #     .and_return(p1)
    # end

  describe 'GET /api/v1/admin/device/' do
    let(:device) { create(:device, device_metadata: create(:device_metadata)) }
    before do
      device
      get "/api/v1/admin/device/#{device.id}"
    end

    it 'returns a device with metadata' do
      device_attributes = JSON.parse(response.body)['device']

      expect(device_attributes['id']).to eql(device.id)
      expect(device_attributes['device_metadata']['device_id']).to eql(device.id)
    end
  end

  describe 'POST /api/v1/admin/device/create' do
    let(:params) do
      {
        'group_param' => {
          'first_name' => 'My', 'last_name' => 'Fanclub',
          'email' => 'jane.s@fan.club',
          'name_abbreviation' => 'JFC', 'users' => [p2.id]
        }
      }
    end

    before do
      post '/api/v1/admin/device/create', params
    end

    it 'Creates a group of persons' do
      expect(
        Group.where(
          last_name: 'Fanclub',
          first_name: 'My', name_abbreviation: 'JFC'
        )
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').users.pluck(:id)
      ).to match_array [p1.id, p2.id]
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins
      ).not_to be_empty
      expect(
        Group.find_by(name_abbreviation: 'JFC').admins.first
      ).to eq p1
      expect(
        p1.administrated_accounts.where(name_abbreviation: 'JFC')
      ).not_to be_empty
    end
  end
end
