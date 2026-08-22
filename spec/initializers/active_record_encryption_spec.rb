# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'config/initializers/active_record_encryption.rb' do # rubocop:disable RSpec/DescribeClass
  it 'configures ActiveRecord::Encryption in test without any ENV set (zero-setup)' do
    expect(MatriceSecret.encryption_configured?).to be(true)
  end

  it 'derives a stable primary key from secret_key_base when ENV keys are absent' do
    derived = OpenSSL::HMAC.hexdigest(
      'SHA256', Rails.application.secret_key_base, 'active_record_encryption.primary_key'
    )
    expect(ActiveRecord::Encryption.config.primary_key).to eq(derived)
  end
end
