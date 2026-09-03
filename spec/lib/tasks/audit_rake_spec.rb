# frozen_string_literal: true

require 'rails_helper'
require 'rake'

# rubocop:disable RSpec/BeforeAfterAll
# rubocop:disable RSpec/DescribeClass
describe 'audit:prune' do
  before(:all) do
    Rake.application.rake_require('audit') # path relative to lib/tasks (omit .rake)
    Rake::Task.define_task(:environment)
  end

  let(:task) { Rake::Task['audit:prune'] }
  let!(:old_event) { event_at(400) }
  let!(:recent_event) { event_at(10) }

  around do |example|
    keys = %w[RETENTION_DAYS DRY_RUN]
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

  def event_at(days_ago)
    event = AuditEvent.record(action: 'auth.login', actor: :system)
    # AuditEvent is append-only (readonly? true post-create) — update_all
    # bypasses that at the relation level, same pattern as the guest-audit
    # spec's dedupe-window backdating.
    AuditEvent.where(id: event.id).update_all(created_at: days_ago.days.ago) # rubocop:disable Rails/SkipsModelValidations
    event
  end

  it 'deletes only rows older than the default 365-day window' do
    invoke_capturing_stdout
    expect(AuditEvent.exists?(old_event.id)).to be false
    expect(AuditEvent.exists?(recent_event.id)).to be true
  end

  it 'records an audit.pruned system event with the count' do
    invoke_capturing_stdout

    event = AuditEvent.where(action: 'audit.pruned').sole
    expect(event.actor_type).to eq('system')
    expect(event.metadata['deleted']).to eq(1)
    expect(event.metadata['retention_days']).to eq(365)
  end

  it 'honors RETENTION_DAYS' do
    ENV['RETENTION_DAYS'] = '5'

    invoke_capturing_stdout
    expect(AuditEvent.exists?(old_event.id)).to be false
    expect(AuditEvent.exists?(recent_event.id)).to be false
  end

  it 'deletes nothing and prints a count when DRY_RUN is set' do
    ENV['DRY_RUN'] = '1'

    output = nil
    expect { output = invoke_capturing_stdout }.not_to change(AuditEvent, :count)
    expect(output).to include('1 row(s)')
    expect(output).to include('dry run')
  end
end
# rubocop:enable RSpec/BeforeAfterAll
# rubocop:enable RSpec/DescribeClass
