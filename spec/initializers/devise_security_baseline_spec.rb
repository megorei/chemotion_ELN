# frozen_string_literal: true

require 'rails_helper'

# WP 05 (REQ-ELN-10): the Devise security baseline is boot-time configuration.
# The honest way to test it is the same mechanism the app itself uses to apply
# matrices config changes (app/api/chemotion/admin_user_api.rb): re-`load` the
# initializer and read the effective Devise.* values. Every example restores
# pristine ENV and re-loads the initializer afterwards.
RSpec.describe 'config/initializers/devise.rb security baseline' do # rubocop:disable RSpec/DescribeClass
  env_keys = %w[
    DEVISE_BCRYPT_COST
    DEVISE_PASSWORD_MIN_LENGTH
    DEVISE_PASSWORD_MAX_LENGTH
    DEVISE_MAXIMUM_ATTEMPTS
  ].freeze

  def load_devise_initializer
    load Rails.root.join('config/initializers/devise.rb')
  end

  around do |example|
    example.run
  ensure
    env_keys.each { |key| ENV.delete(key) }
    load_devise_initializer
  end

  context 'without DEVISE_* environment variables (single-tenant default)' do
    before { load_devise_initializer }

    it 'keeps the bcrypt fast path in test' do
      expect(Devise.stretches).to eq(1)
    end

    it 'keeps the shipped password length 8..72' do
      expect(Devise.password_length).to eq(8..72)
    end

    it 'keeps the shipped lockout threshold of 5 attempts' do
      expect(Devise.maximum_attempts).to eq(5)
    end
  end

  context 'with DEVISE_* environment variables (operator baseline)' do
    before do
      ENV['DEVISE_BCRYPT_COST'] = '12'
      ENV['DEVISE_PASSWORD_MIN_LENGTH'] = '12'
      ENV['DEVISE_PASSWORD_MAX_LENGTH'] = '64'
      ENV['DEVISE_MAXIMUM_ATTEMPTS'] = '3'
      load_devise_initializer
    end

    it 'applies the configured bcrypt cost' do
      expect(Devise.stretches).to eq(12)
    end

    it 'applies the configured password length range' do
      expect(Devise.password_length).to eq(12..64)
    end

    it 'applies the configured lockout threshold' do
      expect(Devise.maximum_attempts).to eq(3)
    end

    it 'exposes the effective minimum password length through the User model' do
      expect(User.password_length.min).to eq(12)
    end
  end

  describe 'OmniAuth registration with encrypted client_secret (REQ-ELN-5)' do
    let(:user_provider) { Matrice.find_or_create_by!(name: 'userProvider') }

    after do
      Devise.omniauth_configs.delete(:github)
      user_provider.matrice_secrets.destroy_all
      user_provider.update_columns(configs: {}) # rubocop:disable Rails/SkipsModelValidations
    end

    it 'merges the decrypted secret from matrice_secrets into the provider args' do
      user_provider.update!(
        configs: { 'github' => { 'enable' => true, 'client_id' => 'gh-id', 'client_secret' => 'gh-plain-secret' } },
      )
      expect(user_provider.reload.configs.dig('github', 'client_secret')).to be_nil

      load_devise_initializer

      expect(Devise.omniauth_configs[:github].args).to include('gh-id', 'gh-plain-secret')
    end
  end
end
