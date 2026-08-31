# frozen_string_literal: true

require 'rails_helper'

# P1 WP 04 (REQ-ELN-19): guest journey — login as external guest, the
# persistent context banner is visible; a local user never sees it.
describe 'Guest UI context' do
  describe 'as external guest' do
    let!(:guest) do
      create(:person, external: true, federated_id: 'idp.home-uni.example#guest',
                      home_tenant_hint: 'idp.home-uni.example')
    end

    before do
      guest.update!(confirmed_at: Time.now, account_active: true)
      sign_in(guest)
    end

    it 'shows the persistent guest banner with the home tenant hint', js: true do
      visit '/mydb'
      expect(page).to have_css('[data-testid="guest-banner"]', wait: 20)
      within('[data-testid="guest-banner"]') do
        expect(page).to have_content('Guest access')
        expect(page).to have_content('idp.home-uni.example')
      end
    end
  end

  describe 'as regular local user' do
    let!(:local_user) { create(:person) }

    before do
      local_user.update!(confirmed_at: Time.now, account_active: true)
      sign_in(local_user)
    end

    it 'shows no guest banner', js: true do
      visit '/mydb'
      expect(page).to have_css('.mydb-app', wait: 20)
      expect(page).to have_no_css('[data-testid="guest-banner"]')
    end
  end
end
