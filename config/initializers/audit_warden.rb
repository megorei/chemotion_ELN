# frozen_string_literal: true

# WP 09 (§9 NFR Audit): session-based sign-in/out events (Devise/Warden —
# covers the HTML login form and the JSON login in Users::SessionsController,
# both of which authenticate through Warden). Scoped to real authentication
# (`only: :authentication`) so session restores from the cookie and Devise
# test-mode sign_in helpers do not emit events. The JWT login has its own
# call site (Chemotion::AuthenticationAPI → 'auth.login').
Warden::Manager.after_set_user only: :authentication do |user, auth, _opts|
  AuditEvent.record(action: 'auth.session_in', actor: user, ip: auth.request.ip) if user.is_a?(User)
end

Warden::Manager.before_logout do |user, auth, _opts|
  AuditEvent.record(action: 'auth.session_out', actor: user, ip: auth.request.ip) if user.is_a?(User)
end
