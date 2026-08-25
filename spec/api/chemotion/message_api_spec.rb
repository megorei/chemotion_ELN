# frozen_string_literal: true

require 'rails_helper'

# Regression guard: POST /messages/new used to trust client-supplied
# channel_id/user_ids — any authenticated user could fan out notifications to
# arbitrary users on any channel (system-broadcast spoofing). It is now
# deny-by-default: instance Admins keep the tenant-wide surface; group admins
# may only target members of groups they administrate.
describe Chemotion::MessageAPI do
  include_context 'api request authorization context'

  let(:channel) { create(:channel, channel_type: 9) }
  let(:group_admin_a) { create(:person) }
  let(:member_a) { create(:person) }
  let(:member_b) { create(:person) }
  let(:group_a) { create(:group, admins: [group_admin_a], users: [group_admin_a, member_a]) }

  before do
    group_a
    create(:group, admins: [create(:person)], users: [member_b])
  end

  describe 'POST /api/v1/messages/new' do
    subject(:execute_request) { post '/api/v1/messages/new', params: params, as: :json }

    let(:target_ids) { [member_a.id] }
    let(:params) { { channel_id: channel.id, content: 'hello', user_ids: target_ids } }

    context 'when called by an instance Admin' do
      let(:user) { create(:admin) }
      let(:target_ids) { [member_a.id, member_b.id] }

      it 'creates the message' do
        expect { execute_request }.to change(Message, :count).by(1)
        expect(response).to have_http_status(:created)
      end
    end

    context 'when a group admin targets members of the own group' do
      let(:user) { group_admin_a }

      it 'creates the message' do
        expect { execute_request }.to change(Message, :count).by(1)
        expect(response).to have_http_status(:created)
      end
    end

    context 'when a group admin targets members of another group' do
      let(:user) { group_admin_a }
      let(:target_ids) { [member_b.id] }

      it 'is unauthorized and creates nothing' do
        expect { execute_request }.not_to change(Message, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when a group admin mixes own and foreign targets' do
      let(:user) { group_admin_a }
      let(:target_ids) { [member_a.id, member_b.id] }

      it 'is unauthorized' do
        expect { execute_request }.not_to change(Message, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end

    # `user` from the shared context is a plain Person with no group adminship
    context 'when called by a plain user' do
      it 'is unauthorized' do
        expect { execute_request }.not_to change(Message, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when a non-Admin sends without user_ids' do
      let(:user) { group_admin_a }
      let(:params) { { channel_id: channel.id, content: 'hello' } }

      it 'is unauthorized (deny-by-default)' do
        expect { execute_request }.not_to change(Message, :count)
        expect(response).to have_http_status(:unauthorized)
      end
    end
  end
end
