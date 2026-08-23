# frozen_string_literal: true

require 'rails_helper'

# P1 WP 01 (REQ-ELN-16): gated federated login.
#
# The test env registers no OmniAuth providers (they come from operator
# config), so the Devise-generated callback routes do not exist here. The spec
# draws a private route set with the callback route + the Devise/root routes
# the controller redirects to.
RSpec.describe Users::OmniauthController, type: :controller do
  def with_inbound_collaboration(value)
    old = ENV.fetch('TENANT_INBOUND_COLLABORATION', nil)
    value.nil? ? ENV.delete('TENANT_INBOUND_COLLABORATION') : ENV['TENANT_INBOUND_COLLABORATION'] = value
    TenantContext.reset!
    yield
  ensure
    old.nil? ? ENV.delete('TENANT_INBOUND_COLLABORATION') : ENV['TENANT_INBOUND_COLLABORATION'] = old
    TenantContext.reset!
  end

  let(:auth_extra) { {} }
  let(:auth_hash) do
    OmniAuth::AuthHash.new(
      provider: 'shibboleth',
      uid: 'gguest@remote.edu',
      info: { email: 'guest@remote.edu', first_name: 'Gill', last_name: 'Guest' },
      extra: auth_extra,
    )
  end

  # rubocop:disable RSpec/InstanceVariable
  # (@routes is ActionController::TestCase's routing override, not spec state)
  before do
    @routes = ActionDispatch::Routing::RouteSet.new
    @routes.draw do
      devise_for :users,
                 controllers: { registrations: 'users/registrations',
                                omniauth_callbacks: 'users/omniauth',
                                sessions: 'users/sessions' }
      devise_scope :user do
        get 'users/auth/shibboleth/callback', to: 'users/omniauth#shibboleth'
      end
      root to: 'pages#home'
    end
    request.env['devise.mapping'] = Devise.mappings[:user]
    request.env['omniauth.auth'] = auth_hash
  end
  # rubocop:enable RSpec/InstanceVariable

  context 'when the inbound collaboration policy is off (default)' do
    it 'redirects unknown identities into the registration flow (no gate, no record)' do
      with_inbound_collaboration(nil) do
        expect { get :shibboleth }.not_to change(User.with_deleted, :count)
        expect(response).to redirect_to(new_user_registration_url)
        expect(session['devise.omniauth.data']).to be_present
      end
    end

    it 'signs in an existing user matched by email and backfills the federated_id' do
      user = create(:person, email: 'guest@remote.edu')
      with_inbound_collaboration(nil) do
        get :shibboleth
        expect(response).to redirect_to(root_url)
        expect(controller.current_user.id).to eq(user.id)
        expect(user.reload.federated_id).to eq('shibboleth#gguest@remote.edu')
      end
    end

    it 'ignores existing grants (gate disengaged)' do
      grant = create(:guest_grant, federated_id: nil, email: 'guest@remote.edu')
      with_inbound_collaboration(nil) do
        expect { get :shibboleth }.not_to change(User.with_deleted, :count)
        expect(response).to redirect_to(new_user_registration_url)
        expect(grant.reload.state).to eq('pending')
      end
    end
  end

  context 'when the policy is federation and a pending grant exists (email invitation)' do
    let!(:grant) { create(:guest_grant, federated_id: nil, email: 'guest@remote.edu') }

    it 'provisions an external guest with no group memberships' do
      with_inbound_collaboration('federation') do
        expect { get :shibboleth }.to change(User, :count).by(1)

        guest = User.order(:id).last
        expect(guest).to have_attributes(
          type: 'Person',
          external: true,
          federated_id: 'shibboleth#gguest@remote.edu',
          email: 'guest@remote.edu',
          account_active: true,
        )
        expect(guest.groups).to be_empty
      end
    end

    it 'activates and attaches the grant and signs the guest in' do
      with_inbound_collaboration('federation') do
        get :shibboleth
        expect(grant.reload).to have_attributes(state: 'active',
                                                federated_id: 'shibboleth#gguest@remote.edu')
        expect(response).to redirect_to(root_url)
        expect(controller.current_user.id).to eq(User.order(:id).last.id)
      end
    end

    it 'audits guest.provisioned and guest.login' do
      with_inbound_collaboration('federation') do
        get :shibboleth
        expect(AuditEvent.where(action: 'guest.provisioned').count).to eq(1)
        expect(AuditEvent.where(action: 'guest.login').count).to eq(1)
      end
    end

    it 'reuses the guest on the next login (matched by federated_id, no second record)' do
      with_inbound_collaboration('federation') do
        get :shibboleth
        sign_out(:user)

        expect { get :shibboleth }.not_to change(User, :count)
        expect(response).to redirect_to(root_url)
        expect(AuditEvent.where(action: %w[guest.login guest.provisioned]).group(:action).count)
          .to eq('guest.login' => 2, 'guest.provisioned' => 1)
      end
    end
  end

  context 'when the policy is federation and no grant exists' do
    it 'denies the login: no user record, redirect to sign-in with an alert' do
      with_inbound_collaboration('federation') do
        expect { get :shibboleth }.not_to change(User.with_deleted, :count)
        expect(response).to redirect_to(new_user_session_url)
        expect(flash[:alert]).to match(/invitation/i)
      end
    end

    it 'audits guest.login_denied and stashes no registration session data' do
      with_inbound_collaboration('federation') do
        expect { get :shibboleth }
          .to change { AuditEvent.where(action: 'guest.login_denied').count }.by(1)
        expect(AuditEvent.order(:id).last.metadata['federated_id']).to eq('shibboleth#gguest@remote.edu')
        expect(session['devise.omniauth.data']).to be_nil
      end
    end

    it 'still signs in existing internal users normally' do
      user = create(:person, email: 'guest@remote.edu')
      with_inbound_collaboration('federation') do
        get :shibboleth
        expect(response).to redirect_to(root_url)
        expect(controller.current_user.id).to eq(user.id)
      end
    end
  end

  context 'when the policy is open' do
    it 'gates exactly like federation for now (differentiation is WP 03 scope)' do
      with_inbound_collaboration('open') do
        expect { get :shibboleth }.not_to change(User.with_deleted, :count)
        expect(response).to redirect_to(new_user_session_url)
      end
    end
  end

  context 'with entitlements in the auth hash (guest exemption)' do
    let(:auth_extra) { { raw_info: { entitlements: ['urn:x:group:uni:Complat Lab#idp'] } } }
    let!(:group) { create(:group, first_name: 'Complat Lab', last_name: 'uni') }
    let!(:grant) { create(:guest_grant, federated_id: nil, email: 'guest@remote.edu') }

    it 'never adds a provisioned guest to entitlement-mapped groups' do
      with_inbound_collaboration('federation') do
        get :shibboleth
        guest = User.order(:id).last
        expect(guest.reload).to have_attributes(external: true, groups: [])
        expect(grant.reload.state).to eq('active')
      end
    end

    it 'keeps entitlement mapping for existing internal users (policy off)' do
      user = create(:person, email: 'guest@remote.edu')
      with_inbound_collaboration(nil) do
        get :shibboleth
        expect(user.reload.groups).to include(group)
      end
    end
  end
end
