# frozen_string_literal: true

require 'rails_helper'
require 'rake'

# rubocop:disable RSpec/BeforeAfterAll
# rubocop:disable RSpec/DescribeClass
describe 'tenant:seed_admin' do
  before(:all) do
    Rake.application.rake_require('tenant') # path relative to lib/tasks (omit .rake)
    Rake::Task.define_task(:environment)
  end

  let(:task) { Rake::Task['tenant:seed_admin'] }

  around do |example|
    keys = %w[EMAIL NAME_ABBR FIRST_NAME LAST_NAME PASSWORD]
    saved = keys.index_with { |key| ENV.fetch(key, nil) }
    keys.each { |key| ENV.delete(key) }
    example.run
  ensure
    saved.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  before { task.reenable }

  def invoke_capturing_stdout
    original_stdout = $stdout
    $stdout = StringIO.new
    task.invoke
    $stdout.string
  ensure
    $stdout = original_stdout
  end

  context 'when EMAIL is missing' do
    it 'aborts without creating an admin' do
      expect { invoke_capturing_stdout }.to raise_error(SystemExit)
      expect(User.where(type: 'Admin').count).to eq(0)
    end
  end

  context 'when no admin exists yet' do
    before { ENV['EMAIL'] = 'ops@example.com' }

    # WP 09 (§9 NFR Audit)
    it 'records a tenant.admin_seeded audit event with the system actor' do
      expect { invoke_capturing_stdout }
        .to change { AuditEvent.where(action: 'tenant.admin_seeded').count }.by(1)

      event = AuditEvent.order(:id).last
      admin = User.find_by(type: 'Admin')
      expect(event).to have_attributes(actor_type: 'system', actor_id: nil,
                                       subject_type: 'Admin', subject_id: admin.id)
      expect(event.metadata['email']).to eq('ops@example.com')
    end

    it 'creates an active, confirmed Admin with the given email and defaults' do
      expect { invoke_capturing_stdout }.to change { User.where(type: 'Admin').count }.from(0).to(1)

      admin = User.find_by(type: 'Admin')
      expect(admin).to have_attributes(
        email: 'ops@example.com',
        name_abbreviation: 'ADM',
        first_name: 'ELN',
        last_name: 'Admin',
        account_active: true,
      )
      expect(admin.confirmed_at).to be_present
    end

    it 'generates and prints a password when PASSWORD is not given' do
      output = invoke_capturing_stdout

      match = output.match(/password:\s+([A-Za-z0-9]{24})/)
      expect(match).to be_present
      admin = User.find_by(type: 'Admin')
      expect(admin.valid_password?(match[1])).to be true
    end

    it 'uses the provided PASSWORD without printing it' do
      ENV['PASSWORD'] = 'SuperSecretPassw0rd'

      output = invoke_capturing_stdout

      admin = User.find_by(type: 'Admin')
      expect(admin.valid_password?('SuperSecretPassw0rd')).to be true
      expect(output).not_to include('SuperSecretPassw0rd')
    end

    it 'honors NAME_ABBR, FIRST_NAME and LAST_NAME' do
      ENV['NAME_ABBR'] = 'OPS'
      ENV['FIRST_NAME'] = 'Ops'
      ENV['LAST_NAME'] = 'Team'

      invoke_capturing_stdout

      admin = User.find_by(type: 'Admin')
      expect(admin.name_abbreviation).to eq('OPS')
      expect(admin.first_name).to eq('Ops')
      expect(admin.last_name).to eq('Team')
    end
  end

  context 'when an admin already exists' do
    let!(:existing_admin) { create(:admin) }

    before { ENV['EMAIL'] = 'ops@example.com' }

    it 'does not create another admin and reports the existing one' do
      output = nil
      expect { output = invoke_capturing_stdout }.not_to(change { User.where(type: 'Admin').count })
      expect(output).to include(existing_admin.email)
    end
  end
end
# rubocop:enable RSpec/BeforeAfterAll
# rubocop:enable RSpec/DescribeClass
