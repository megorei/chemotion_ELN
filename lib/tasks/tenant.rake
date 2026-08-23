# frozen_string_literal: true

# rubocop:disable Metrics/BlockLength
namespace :tenant do
  desc 'Seed the first Admin account (idempotent). ' \
       'ENV: EMAIL (required), NAME_ABBR (default ADM), FIRST_NAME (default ELN), ' \
       'LAST_NAME (default Admin), PASSWORD (generated and printed once if absent)'
  task seed_admin: :environment do
    existing_admins = User.where(type: 'Admin').order(:id)
    if existing_admins.exists?
      puts 'tenant:seed_admin: Admin account(s) already present - no changes made.'
      existing_admins.each do |admin|
        puts "  - #{admin.email} (#{admin.name_abbreviation})"
      end
      next
    end

    email = ENV['EMAIL'].presence
    abort 'tenant:seed_admin: EMAIL is required (e.g. rake tenant:seed_admin EMAIL=admin@example.com)' if email.nil?

    password = ENV['PASSWORD'].presence
    password_generated = password.nil?
    password ||= SecureRandom.alphanumeric(24)

    admin = User.create!(
      email: email,
      first_name: ENV['FIRST_NAME'].presence || 'ELN',
      last_name: ENV['LAST_NAME'].presence || 'Admin',
      password: password,
      name_abbreviation: ENV['NAME_ABBR'].presence || 'ADM',
      type: 'Admin',
    )
    admin.update!(account_active: true)
    admin.update!(confirmed_at: DateTime.now)
    AuditEvent.record(action: 'tenant.admin_seeded', actor: :system, subject: admin, meta: { email: admin.email })

    puts '=' * 60
    puts 'tenant:seed_admin: Admin account created'
    puts "  email:        #{admin.email}"
    puts "  abbreviation: #{admin.name_abbreviation}"
    if password_generated
      puts "  password:     #{password}"
      puts '                (generated - store it now, it will not be shown again)'
    else
      puts '  password:     (as provided via PASSWORD)'
    end
    puts '=' * 60
  end
end
# rubocop:enable Metrics/BlockLength
