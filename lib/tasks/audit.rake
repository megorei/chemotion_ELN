# frozen_string_literal: true

namespace :audit do
  desc 'Delete audit_events rows older than the retention window (P0 WP 09: ' \
       'append-only table has no FK/app invariant on old rows, so a plain ' \
       'DELETE is safe). ENV: RETENTION_DAYS (default 365), DRY_RUN (any ' \
       'value = count only, delete nothing).'
  task prune: :environment do
    retention_days = Integer(ENV['RETENTION_DAYS'].presence || 365)
    cutoff = retention_days.days.ago
    scope = AuditEvent.where(created_at: ...cutoff)
    count = scope.count

    if ENV['DRY_RUN'].present?
      puts "audit:prune: #{count} row(s) older than #{retention_days}d (#{cutoff}) — dry run, nothing deleted."
      next
    end

    deleted = scope.delete_all
    AuditEvent.record(action: 'audit.pruned', actor: :system,
                      meta: { retention_days: retention_days, deleted: deleted, cutoff: cutoff.iso8601 })
    puts "audit:prune: deleted #{deleted} row(s) older than #{retention_days}d (#{cutoff})."
  end
end
