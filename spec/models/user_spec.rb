# frozen_string_literal: true

# == Schema Information
#
# Table name: users
#
#  id                        :integer          not null, primary key
#  account_active            :boolean
#  allocated_space           :bigint           default(0)
#  confirmation_sent_at      :datetime
#  confirmation_token        :string
#  confirmed_at              :datetime
#  consumed_timestep         :integer
#  counters                  :hstore           not null
#  current_sign_in_at        :datetime
#  current_sign_in_ip        :inet
#  deleted_at                :datetime
#  email                     :string           default(""), not null
#  encrypted_otp_secret      :string
#  encrypted_otp_secret_iv   :string
#  encrypted_otp_secret_salt :string
#  encrypted_password        :string           default(""), not null
#  failed_attempts           :integer          default(0), not null
#  first_name                :string           not null
#  last_name                 :string           not null
#  last_sign_in_at           :datetime
#  last_sign_in_ip           :inet
#  layout                    :hstore           not null
#  locked_at                 :datetime
#  matrix                    :integer          default(0)
#  name                      :string
#  name_abbreviation         :string(12)
#  otp_backup_codes          :string           is an Array
#  otp_required_for_login    :boolean
#  providers                 :jsonb
#  reaction_name_prefix      :string(3)        default("R")
#  remember_created_at       :datetime
#  reset_password_sent_at    :datetime
#  reset_password_token      :string
#  sign_in_count             :integer          default(0), not null
#  type                      :string           default("Person")
#  unconfirmed_email         :string
#  unlock_token              :string
#  used_space                :bigint           default(0)
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  selected_device_id        :integer
#
# Indexes
#
#  index_users_on_confirmation_token    (confirmation_token) UNIQUE
#  index_users_on_deleted_at            (deleted_at)
#  index_users_on_email                 (email) UNIQUE
#  index_users_on_name_abbreviation     (name_abbreviation) UNIQUE WHERE (name_abbreviation IS NOT NULL)
#  index_users_on_reset_password_token  (reset_password_token) UNIQUE
#  index_users_on_unlock_token          (unlock_token) UNIQUE
#
require 'rails_helper'

RSpec.describe User do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to have_many(:vessels).through(:collections) }
  it { is_expected.to have_many(:created_vessels).class_name('Vessel').inverse_of(:creator).dependent(nil) }

  describe 'creation' do
    let(:user) { build(:user) }
    let(:person) { build(:person) }
    let(:group) { build(:group) }
    let!(:user_deleted) { create(:person, email: 'user_deleted@eln.edu', name_abbreviation: 'UD') }

    it 'is possible to create a valid user' do
      expect(user.valid?).to be true
    end

    it 'is possible to create a valid person' do
      expect(person.valid?).to be true
    end

    it 'is possible to create a valid group' do
      expect(group.valid?).to be true
    end

    it 'validates the presence of email' do
      expect(build(:user, email: '')).not_to be_valid
    end

    it 'validates the presence of first_name' do
      expect(build(:user, first_name: '')).not_to be_valid
    end

    it 'validates the presence of last_name' do
      expect(build(:user, last_name: '')).not_to be_valid
    end

    it 'validates the presence of name_abbreviation' do
      expect(build(:user, name_abbreviation: '')).not_to be_valid
    end

    it 'validates the uniqueness of name_abbreviation' do
      user.save!
      expect(build(:user, name_abbreviation: user.name_abbreviation)).not_to be_valid
    end

    it 'validates the length of name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'asd')).to be_valid
      expect(build(:user, name_abbreviation: 'asdf')).not_to be_valid
    end

    it 'validates the format of valid name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'a-d')).to be_valid
      expect(build(:user, name_abbreviation: 'a1d')).to be_valid
      expect(build(:user, name_abbreviation: 'as1')).to be_valid
    end

    it 'validates the format of invalid name_abbreviation for user' do
      expect(build(:user, name_abbreviation: 'as_')).not_to be_valid
      expect(build(:user, name_abbreviation: 'as-')).not_to be_valid
    end

    it 'validates the format of valid name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'a1-1d')).to be_valid
      expect(build(:group, name_abbreviation: 'a_0_a')).to be_valid
      expect(build(:group, name_abbreviation: 'asdf1')).to be_valid
    end

    it 'validates the format of invalid name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'asdf-')).not_to be_valid
      expect(build(:group, name_abbreviation: 'asdf_')).not_to be_valid
    end

    it 'validates the length of name_abbreviation for group' do
      expect(build(:group, name_abbreviation: 'asdfg')).to be_valid
      expect(build(:group, name_abbreviation: 'asdfgh')).not_to be_valid
    end

    it 'creates an All collection' do
      user.save!
      expect(user.collections.find_by(label: 'All', is_locked: true)).not_to be_nil
    end

    # The All collection backs the MyDB element paths, and config/routes.rb sends a Group session to
    # the command-and-control view for /mydb, so a group can never use one.
    it 'creates no All collection for a group' do
      group = create(:group)

      expect(group.collections.find_by(label: 'All')).to be_nil
    end

    it 'reset email after soft deletion' do
      user_deleted.destroy!
      expect(User.with_deleted.find_by(email: 'user_deleted@eln.edu')).to be_nil
      expect(User.only_deleted.where('email LIKE ?', "#{user_deleted.id}_%").where('email LIKE ?',
                                                                                   '%@deleted').present?).to be true
    end
  end

  describe 'try_find_by_name_abbreviation' do
    let!(:user) { create(:group, name_abbreviation: 'UzER') }
    let!(:user_lower) { create(:group, name_abbreviation: 'UZZEr') }
    let!(:user_upper) { create(:group, name_abbreviation: 'UZZER') }

    it 'finds a user by name_abbreviation' do
      expect(User.try_find_by_name_abbreviation(user_upper.name_abbreviation)).to eq user_upper
      expect(User.try_find_by_name_abbreviation(user.name_abbreviation)).to eq user
    end

    it 'finds a user by name_abbreviation with different case' do
      expect(User.try_find_by_name_abbreviation(user.name_abbreviation.upcase)).to eq user
    end

    it 'can not find a uniq user by name_abbreviation with different case' do
      expect(User.try_find_by_name_abbreviation(user_lower.name_abbreviation.downcase)).to be_nil
    end
  end

  describe '.default_admin' do
    let(:user) { create(:person, name_abbreviation: 'ADM') }
    let(:admins) { create_list(:admin, 2) }
    let(:admin) { create(:admin, name_abbreviation: 'ADM') }

    it 'returns the default admin - first admin' do
      user
      admins
      expect(described_class.default_admin).to eq admins.first
    end

    it 'returns the default admin - ADM' do
      admins
      admin
      expect(described_class.default_admin).to eq admin
    end

    it 'returns nil if no admin' do
      expect(described_class.default_admin).to be_nil
    end
  end

  describe '#generate_qr_code' do
    let(:user) { create(:user) }

    it 'generates an otp_secret and a QR code svg' do
      svg = nil
      expect { svg = user.generate_qr_code }.to change { user.reload.encrypted_otp_secret }.from(nil)
      expect(svg).to include('<svg')
    end

    it 're-enrolls instead of raising when the stored ciphertext can no longer be decrypted' do
      user.generate_qr_code
      previous_secret = user.reload.otp_secret
      # simulate a corrupted/undecryptable ciphertext (e.g. after an OTP_SECRET_KEY rotation)
      # while keeping the iv/salt otherwise well-formed.
      user.update_columns(encrypted_otp_secret: user.encrypted_otp_secret.reverse)
      user.instance_variable_set(:@otp_secret, nil)

      expect { user.generate_qr_code }.not_to raise_error
      expect(user.reload.otp_secret).to be_present
      expect(user.otp_secret).not_to eq(previous_secret)
    end
  end

  describe '#validate_and_consume_otp!' do
    let(:user) { create(:user) }

    before do
      user.generate_qr_code
      user.update!(otp_required_for_login: true)
    end

    def corrupt_otp_secret!(user)
      # simulate a corrupted/undecryptable ciphertext (e.g. after an OTP_SECRET_KEY rotation) -
      # this is what login, the account settings form, and the 2FA verify endpoint all hit.
      user.update_columns(encrypted_otp_secret: user.encrypted_otp_secret.reverse) # rubocop:disable Rails/SkipsModelValidations
      user.instance_variable_set(:@otp_secret, nil)
    end

    it 'discards the secret and returns false instead of raising when undecryptable' do
      corrupt_otp_secret!(user)

      result = nil
      expect { result = user.validate_and_consume_otp!('123456') }.not_to raise_error
      expect(result).to be false
      expect(user.reload.encrypted_otp_secret).to be_nil
    end

    it 'disables otp_required_for_login so the user is not locked in an unwinnable OTP loop' do
      # with no secret left to validate against, leaving 2FA required would strand the user:
      # every self-service 2FA endpoint requires an authenticated current_user, which login
      # can no longer grant.
      corrupt_otp_secret!(user)

      user.validate_and_consume_otp!('123456')

      expect(user.reload.otp_required_for_login).to be false
    end
  end

  describe 'role management (user_roles RBAC)' do
    let(:user) { create(:person) }
    let(:admin) { create(:admin) }

    describe '#has_role? / #grant_role! / #revoke_role!' do
      it 'is false without a grant' do
        expect(user.has_role?(UserRole::MOLECULE_EDITOR)).to be false
      end

      it 'is true after a grant and records who granted' do
        user.grant_role!(UserRole::MOLECULE_EDITOR, granted_by: admin.id)

        expect(user.has_role?(UserRole::MOLECULE_EDITOR)).to be true
        expect(user.user_roles.find_by(name: UserRole::MOLECULE_EDITOR).granted_by).to eq(admin.id)
      end

      it 'distinguishes scopes' do
        user.grant_role!(UserRole::GENERIC_ADMIN, scope_type: 'elements')

        expect(user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'elements')).to be true
        expect(user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'segments')).to be false
      end

      it 'grants idempotently' do
        user.grant_role!(UserRole::MOLECULE_EDITOR)
        expect { user.grant_role!(UserRole::MOLECULE_EDITOR) }.not_to change(UserRole, :count)
      end

      it 'revokes a granted role and is a no-op when absent' do
        user.grant_role!(UserRole::MOLECULE_EDITOR)

        expect { user.revoke_role!(UserRole::MOLECULE_EDITOR) }.to change(UserRole, :count).by(-1)
        expect(user.has_role?(UserRole::MOLECULE_EDITOR)).to be false
        expect { user.revoke_role!(UserRole::MOLECULE_EDITOR) }.not_to change(UserRole, :count)
      end

      it 'rejects a role name outside the operator-defined set' do
        expect { user.grant_role!('self_invented') }.to raise_error(ActiveRecord::RecordInvalid)
      end
    end

    describe 'audit trail' do
      it 'logs a structured line on grant' do
        allow(Rails.logger).to receive(:info)

        user.grant_role!(UserRole::MOLECULE_EDITOR, granted_by: admin.id)

        expect(Rails.logger).to have_received(:info).with(
          a_string_including('"event":"user_role.granted"')
            .and(a_string_including("\"user_id\":#{user.id}"))
            .and(a_string_including('"role":"molecule_editor"'))
            .and(a_string_including("\"by\":#{admin.id}")),
        )
      end

      it 'logs a structured line on revoke' do
        user.grant_role!(UserRole::MOLECULE_EDITOR)
        allow(Rails.logger).to receive(:info)

        user.revoke_role!(UserRole::MOLECULE_EDITOR, revoked_by: admin.id)

        expect(Rails.logger).to have_received(:info).with(
          a_string_including('"event":"user_role.revoked"')
            .and(a_string_including("\"by\":#{admin.id}")),
        )
      end
    end

    describe 'profile-flag facade' do
      it 'keeps the boolean reader contract', :aggregate_failures do
        expect(user.is_templates_moderator).to be false
        expect(user.molecule_editor).to be false
        expect(user.converter_admin).to be false
        expect(user.global_text_template_editor).to be false

        user.grant_role!(UserRole::TEMPLATES_MODERATOR)
        user.grant_role!(UserRole::MOLECULE_EDITOR)
        user.grant_role!(UserRole::CONVERTER_ADMIN)
        user.grant_role!(UserRole::GLOBAL_TEXT_TEMPLATE_EDITOR)

        expect(user.is_templates_moderator).to be true
        expect(user.molecule_editor).to be true
        expect(user.converter_admin).to be true
        expect(user.global_text_template_editor).to be true
      end

      it 'keeps the generic_admin hash contract (string keys, granted scopes true)' do
        expect(user.generic_admin).to eq({})

        user.grant_role!(UserRole::GENERIC_ADMIN, scope_type: 'elements')
        user.grant_role!(UserRole::GENERIC_ADMIN, scope_type: 'datasets')

        expect(user.generic_admin).to eq('elements' => true, 'datasets' => true)
        expect(user.generic_admin.values_at('elements', 'segments', 'datasets').any?).to be true
      end

      it 'returns the same values after backfill as the legacy profile.data read did', :aggregate_failures do
        profile = user.profile
        profile.update_columns( # rubocop:disable Rails/SkipsModelValidations
          data: (profile.data || {}).merge(
            'is_templates_moderator' => true,
            'molecule_editor' => false,
            'converter_admin' => true,
            'global_text_template_editor' => false,
            'generic_admin' => { 'elements' => true, 'segments' => false },
          ),
        )
        legacy = profile.reload.data

        UserRole.backfill_from_profile_data!

        expect(user.is_templates_moderator).to eq(legacy['is_templates_moderator'])
        expect(user.molecule_editor).to eq(legacy['molecule_editor'])
        expect(user.converter_admin).to eq(legacy['converter_admin'])
        expect(user.global_text_template_editor).to eq(legacy['global_text_template_editor'])
        # hash contract: absent key instead of stored false — same truthiness per scope
        expect(!user.generic_admin['elements']).to eq(!legacy['generic_admin']['elements'])
        expect(!user.generic_admin['segments']).to eq(!legacy['generic_admin']['segments'])
      end
    end
  end

  describe '#increment_counter' do
    let(:described_method) { :increment_counter }
    let(:element) { described_class::COUNTER_KEYS.sample }
    let(:some_key) { Faker::Lorem.word }
    let(:counters) { { some_key => '0' } }
    let(:user) { create(:user, counters: counters) }

    it 'increments the counter when no value is set for default elements' do
      expect { user.send(described_method, element) }.to change { user.reload.counters[element].to_i }.by(1)
    end

    it 'increments the counter for non default element when a value preset' do
      expect { user.send(described_method, some_key) }.to change { user.reload.counters[some_key].to_i }.by(1)
    end
  end
end
