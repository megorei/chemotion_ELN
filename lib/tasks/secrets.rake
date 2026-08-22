# frozen_string_literal: true

namespace :secrets do
  desc 'Move plaintext secrets out of matrices.configs into the encrypted matrice_secrets store (idempotent)'
  task migrate_matrices: :environment do
    stats = { migrated: 0, without_secrets: 0 }
    failed = []
    Matrice.with_deleted.order(:id).each do |matrice|
      paths = matrice.plaintext_secret_paths
      next stats[:without_secrets] += 1 if paths.empty?

      begin
        matrice.save! # before_save extracts the secrets into matrice_secrets
        stats[:migrated] += 1
        suffix = matrice.deleted_at ? ', soft-deleted' : ''
        puts "secrets:migrate_matrices: migrated '#{matrice.name}' (id=#{matrice.id}#{suffix}): #{paths.join(', ')}"
      rescue StandardError => e
        failed << matrice
        warn "secrets:migrate_matrices: WARNING - could not migrate '#{matrice.name}' " \
             "(id=#{matrice.id}): #{e.class}: #{e.message}"
      end
    end
    puts "secrets:migrate_matrices: done - migrated: #{stats[:migrated]}, " \
         "no plaintext secrets: #{stats[:without_secrets]}, failed: #{failed.size}"
    next if failed.empty?

    warn 'secrets:migrate_matrices: WARNING - plaintext secrets remain in ' \
         "matrices.configs for: #{failed.map(&:name).join(', ')}"
  end
end
