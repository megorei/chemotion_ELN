# frozen_string_literal: true

require 'rails_helper'

RSpec.describe UserRole do
  let(:user) { create(:person) }

  describe 'validations' do
    it 'accepts an unscoped operator-defined role' do
      role = described_class.new(user: user, name: UserRole::TEMPLATES_MODERATOR)
      expect(role).to be_valid
    end

    it 'rejects a role name outside the operator-defined set' do
      role = described_class.new(user: user, name: 'made_up_role')
      expect(role).not_to be_valid
      expect(role.errors[:name]).to be_present
    end

    it 'rejects a scope on a tenant-wide role' do
      role = described_class.new(user: user, name: UserRole::MOLECULE_EDITOR, scope_type: 'elements')
      expect(role).not_to be_valid
      expect(role.errors[:scope_type]).to be_present
    end

    it 'requires a known scope_type for generic_admin' do
      expect(described_class.new(user: user, name: UserRole::GENERIC_ADMIN)).not_to be_valid
      expect(described_class.new(user: user, name: UserRole::GENERIC_ADMIN, scope_type: 'bogus')).not_to be_valid
      expect(described_class.new(user: user, name: UserRole::GENERIC_ADMIN, scope_type: 'elements')).to be_valid
    end

    it 'rejects a duplicate grant (same user, name, scope)' do
      described_class.create!(user: user, name: UserRole::CONVERTER_ADMIN)
      dup = described_class.new(user: user, name: UserRole::CONVERTER_ADMIN)
      expect(dup).not_to be_valid
      expect(dup.errors[:name]).to be_present
    end

    it 'allows the same role name with different scopes' do
      described_class.create!(user: user, name: UserRole::GENERIC_ADMIN, scope_type: 'elements')
      other = described_class.new(user: user, name: UserRole::GENERIC_ADMIN, scope_type: 'segments')
      expect(other).to be_valid
    end
  end

  describe 'paranoia' do
    it 'is deliberately not paranoid: revoked means deleted' do
      expect(described_class.new).not_to respond_to(:deleted_at)
    end
  end

  describe 'converter_admin compatibility mirror' do
    it 'mirrors a converter_admin grant into profile.data for the labimotion direct read' do
      user.grant_role!(UserRole::CONVERTER_ADMIN)
      expect(user.profile.reload.data['converter_admin']).to be true
    end

    it 'clears the mirror on revoke' do
      user.grant_role!(UserRole::CONVERTER_ADMIN)
      user.revoke_role!(UserRole::CONVERTER_ADMIN)
      expect(user.profile.reload.data['converter_admin']).to be false
    end

    it 'does not touch profile.data for other roles' do
      expect { user.grant_role!(UserRole::MOLECULE_EDITOR) }
        .not_to(change { user.profile.reload.data })
    end
  end

  describe '.backfill_from_profile_data!' do
    let(:flagged_user) { create(:person) }
    let(:plain_user) { create(:person) }

    before do
      profile = flagged_user.profile
      profile.update_columns( # rubocop:disable Rails/SkipsModelValidations
        data: (profile.data || {}).merge(
          'is_templates_moderator' => true,
          'molecule_editor' => false,
          'converter_admin' => true,
          'global_text_template_editor' => true,
          'generic_admin' => { 'elements' => true, 'segments' => false, 'datasets' => true },
        ),
      )
    end

    it 'creates roles for truthy flags and scoped roles for the generic_admin hash', :aggregate_failures do
      described_class.backfill_from_profile_data!

      expect(flagged_user.has_role?(UserRole::TEMPLATES_MODERATOR)).to be true
      expect(flagged_user.has_role?(UserRole::MOLECULE_EDITOR)).to be false
      expect(flagged_user.has_role?(UserRole::CONVERTER_ADMIN)).to be true
      expect(flagged_user.has_role?(UserRole::GLOBAL_TEXT_TEMPLATE_EDITOR)).to be true
      expect(flagged_user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'elements')).to be true
      expect(flagged_user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'segments')).to be false
      expect(flagged_user.has_role?(UserRole::GENERIC_ADMIN, scope_type: 'datasets')).to be true
    end

    it 'creates no roles for users without flags' do
      described_class.backfill_from_profile_data!

      expect(plain_user.user_roles).to be_empty
    end

    it 'is idempotent' do
      described_class.backfill_from_profile_data!
      expect { described_class.backfill_from_profile_data! }
        .not_to(change { described_class.order(:id).pluck(:id) })
    end

    it 'strips the extracted flags from profile.data but keeps the converter_admin mirror and layout data',
       :aggregate_failures do
      layout_before = flagged_user.profile.data['layout']
      described_class.backfill_from_profile_data!

      data = flagged_user.profile.reload.data
      expect(data).not_to have_key('is_templates_moderator')
      expect(data).not_to have_key('molecule_editor')
      expect(data).not_to have_key('generic_admin')
      expect(data).not_to have_key('global_text_template_editor')
      expect(data['converter_admin']).to be true
      expect(data['layout']).to eq(layout_before)
    end

    it 'remains idempotent after an admin revoked a backfilled role' do
      described_class.backfill_from_profile_data!
      flagged_user.revoke_role!(UserRole::TEMPLATES_MODERATOR)

      described_class.backfill_from_profile_data!

      expect(flagged_user.has_role?(UserRole::TEMPLATES_MODERATOR)).to be false
    end
  end
end
