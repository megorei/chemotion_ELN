# frozen_string_literal: true

require 'rails_helper'

# WP 09 (§9 NFR Audit): append-only event stream + never-raising emitter.
RSpec.describe AuditEvent do
  describe 'append-only contract' do
    let(:event) { described_class.record(action: 'spec.event') }

    it 'has no updated_at column (rows are never updated)' do
      expect(described_class.column_names).not_to include('updated_at')
    end

    it 'is readonly once persisted' do
      expect(event).to be_readonly
      expect { event.update!(action: 'tampered') }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it 'cannot be destroyed' do
      expect { event.destroy! }.to raise_error(ActiveRecord::ReadOnlyRecord)
    end

    it 'is deliberately not paranoid' do
      expect(described_class.new).not_to respond_to(:deleted_at)
    end
  end

  describe '.record' do
    it 'persists action, ip and metadata' do
      event = described_class.record(action: 'spec.event', meta: { foo: 'bar' }, ip: '10.0.0.1')

      expect(event).to be_persisted
      expect(event).to have_attributes(action: 'spec.event', ip: '10.0.0.1')
      expect(event.metadata).to eq('foo' => 'bar')
    end

    it 'resolves a User actor' do
      user = create(:person)
      event = described_class.record(action: 'spec.event', actor: user)
      expect(event).to have_attributes(actor_id: user.id, actor_type: 'user')
    end

    it 'resolves an Integer actor as a user id' do
      event = described_class.record(action: 'spec.event', actor: 42)
      expect(event).to have_attributes(actor_id: 42, actor_type: 'user')
    end

    it 'resolves :system and :guest actors without an id' do
      expect(described_class.record(action: 'spec.event', actor: :system))
        .to have_attributes(actor_id: nil, actor_type: 'system')
      expect(described_class.record(action: 'spec.event', actor: :guest))
        .to have_attributes(actor_id: nil, actor_type: 'guest')
    end

    it 'treats a nil actor as an unknown user (e.g. failed login)' do
      event = described_class.record(action: 'spec.event')
      expect(event).to have_attributes(actor_id: nil, actor_type: 'user')
    end

    it 'resolves an ActiveRecord subject' do
      group = create(:group)
      event = described_class.record(action: 'spec.event', subject: group)
      expect(event).to have_attributes(subject_type: 'Group', subject_id: group.id)
    end

    it 'accepts an explicit [type, id] subject pair' do
      event = described_class.record(action: 'spec.event', subject: ['Collection', 7])
      expect(event).to have_attributes(subject_type: 'Collection', subject_id: 7)
    end

    context 'with a tenant configured' do
      it 'stamps the tenant id into metadata' do
        tenant = instance_double(TenantContext, id: 'kit')
        allow(TenantContext).to receive(:current).and_return(tenant)

        event = described_class.record(action: 'spec.event', meta: { foo: 'bar' })
        expect(event.metadata).to eq('foo' => 'bar', 'tenant' => 'kit')
      end
    end

    context 'without a tenant (single-tenant)' do
      it 'adds no tenant key' do
        event = described_class.record(action: 'spec.event')
        expect(event.metadata).to eq({})
      end
    end

    describe 'never raises into the caller' do
      it 'swallows persistence failures, warns, and returns nil' do
        allow(described_class).to receive(:create!).and_raise(StandardError, 'db down')
        allow(Rails.logger).to receive(:warn)

        expect { described_class.record(action: 'spec.event') }.not_to raise_error
        expect(described_class.record(action: 'spec.event')).to be_nil
        expect(Rails.logger).to have_received(:warn).with(/AuditEvent\.record failed \(action=spec\.event\)/).twice
      end

      it 'swallows bad input (unsupported actor)' do
        expect(described_class.record(action: 'spec.event', actor: 3.14)).to be_nil
      end

      it 'swallows a missing action (validation failure)' do
        expect(described_class.record(action: nil)).to be_nil
      end
    end
  end
end
