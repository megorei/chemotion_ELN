# frozen_string_literal: true

RSpec.describe Chemotion::AdminUserAPI do
  let!(:admin) { create(:admin) }
  let!(:user) { create(:person) }

  before do
    allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(admin)
  end

  describe 'PUT /api/v1/admin/users/:id/resetPassword' do
    context 'when sending reset instructions (random=false)' do
      it 'returns success and the user email when the mail is delivered' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions).and_return(true)

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['rp']).to be_truthy
        expect(parsed_json_response['email']).to eq(user.email)
      end

      it 'returns success when SMTP cleanup raises Net::ReadTimeout after delivery' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions).and_raise(Net::ReadTimeout)

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).to have_http_status(:ok)
        expect(parsed_json_response['rp']).to be_truthy
        expect(parsed_json_response['email']).to eq(user.email)
      end

      xit 'lets unrelated mail-delivery errors propagate' do
        expect_any_instance_of(User).to receive(:send_reset_password_instructions)
          .and_raise(Net::SMTPAuthenticationError, 'bad credentials')

        put "/api/v1/admin/users/#{user.id}/resetPassword", params: { random: false }

        expect(response).not_to have_http_status(:ok)
      end
    end
  end

  describe 'DELETE /api/v1/admin/users/:id' do
    it 'destroys a user with no admin relationships' do
      delete "/api/v1/admin/users/#{user.id}"

      expect(response).to have_http_status(:no_content)
      expect(User.unscoped.find(user.id)).to be_deleted
    end

    # Regression: Person#users_admins is dependent: :destroy, so deleting the sole admin
    # of a group used to silently orphan it. Person#before_destroy now blocks this.
    it 'refuses to destroy the sole admin of a group with 422', :aggregate_failures do
      group = create(:group, admins: [user], users: [user])

      delete "/api/v1/admin/users/#{user.id}"

      expect(response).to have_http_status(:unprocessable_entity)
      expect(parsed_json_response['error']).to include(group.name)
      expect(User.unscoped.find(user.id)).not_to be_deleted
      expect(group.reload.admins).to include(user)
    end
  end

  describe 'PUT /api/v1/admin/users/:id/profile (role writer)' do
    let(:url) { "/api/v1/admin/users/#{user.id}/profile" }

    it 'grants an unscoped role from a legacy flag param and keeps the response shape', :aggregate_failures do
      put url, params: { is_templates_moderator: true }

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['is_templates_moderator']).to be true
      expect(user.reload.has_role?(UserRole::TEMPLATES_MODERATOR)).to be true
      expect(user.user_roles.find_by(name: UserRole::TEMPLATES_MODERATOR).granted_by).to eq(admin.id)
    end

    it 'revokes on false and leaves unrelated roles alone', :aggregate_failures do
      user.grant_role!(UserRole::TEMPLATES_MODERATOR)
      user.grant_role!(UserRole::MOLECULE_EDITOR)

      put url, params: { is_templates_moderator: false }

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['is_templates_moderator']).to be false
      expect(parsed_json_response['molecule_editor']).to be true
      expect(user.has_role?(UserRole::TEMPLATES_MODERATOR)).to be false
      expect(user.has_role?(UserRole::MOLECULE_EDITOR)).to be true
    end

    it 'grants and revokes scoped generic_admin roles from the auth_generic_admin hash', :aggregate_failures do
      user.grant_role!(UserRole::GENERIC_ADMIN, scope_type: 'datasets')

      put url, params: { auth_generic_admin: { elements: true, datasets: false } }

      expect(response).to have_http_status(:ok)
      expect(parsed_json_response['generic_admin']).to eq('elements' => true)
      expect(user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'elements')).to be true
      expect(user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'datasets')).to be false
    end

    it 'mirrors converter_admin into profile.data for the labimotion direct read' do
      put url, params: { converter_admin: true }

      expect(user.reload.profile.data['converter_admin']).to be true
    end
  end
end
