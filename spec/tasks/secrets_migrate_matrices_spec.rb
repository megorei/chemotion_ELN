# frozen_string_literal: true

require 'rails_helper'
require 'rake'

RSpec.describe 'secrets:migrate_matrices' do # rubocop:disable RSpec/DescribeClass
  def run_task
    Rake::Task['secrets:migrate_matrices'].execute
  end

  before do
    unless Rake::Task.task_defined?('secrets:migrate_matrices')
      Rake.application.rake_require('tasks/secrets', [Rails.root.join('lib').to_s])
    end
    Rake::Task.define_task(:environment) unless Rake::Task.task_defined?(:environment)
  end

  let(:live_matrice) { create(:matrice) }
  let(:deleted_matrice) { create(:matrice) }

  def seed_plaintext(matrice, configs)
    matrice.update_column(:configs, configs) # rubocop:disable Rails/SkipsModelValidations -- bypass extraction: simulate pre-WP-05 rows
  end

  it 'moves plaintext secrets of live and soft-deleted matrices into the encrypted store', :aggregate_failures do
    seed_plaintext(live_matrice, { 'github' => { 'client_id' => 'id', 'client_secret' => 'live-secret' } })
    seed_plaintext(deleted_matrice, { 'cas_api_key' => 'deleted-secret' })
    deleted_matrice.destroy

    expect { run_task }.to output(/migrated: 2/).to_stdout

    expect(live_matrice.reload.configs.dig('github', 'client_secret')).to be_nil
    expect(live_matrice.configs_with_secrets.dig('github', 'client_secret')).to eq('live-secret')

    reloaded_deleted = Matrice.with_deleted.find(deleted_matrice.id)
    expect(reloaded_deleted.deleted_at).to be_present
    expect(reloaded_deleted.configs['cas_api_key']).to be_nil
    expect(reloaded_deleted.configs_with_secrets['cas_api_key']).to eq('deleted-secret')
  end

  it 'is idempotent' do
    seed_plaintext(live_matrice, { 'hmac_secret' => 'once' })

    expect { run_task }.to output(/migrated: 1/).to_stdout
    expect { run_task }.to output(/migrated: 0/).to_stdout
    expect(live_matrice.reload.matrice_secrets.where(key: 'hmac_secret').count).to eq(1)
  end

  it 'warns about unmigratable records and keeps going' do
    seed_plaintext(live_matrice, { 'hmac_secret' => 'will-fail' })
    allow_any_instance_of(Matrice).to receive(:save!).and_raise(ActiveRecord::RecordInvalid) # rubocop:disable RSpec/AnyInstance

    expect { run_task }.to output(/WARNING - could not migrate/).to_stderr
  end
end
