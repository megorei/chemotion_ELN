import ApiClient from 'src/api_clients/ChemotionApiClient';

// Admin-only audit trail (Chemotion::AuditEventsAPI, P1 WP 05 / P0 WP 09):
// GET /admin/audit_events with optional filters (event_action, actor_type —
// 'guest' means guest ACTIVITY incl. external-user actors —, subject_type/
// subject_id, from/to, page/per_page); GET /actions serves the dropdown.
export default class AuditEventsFetcher {
  static fetchEvents(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
    return ApiClient.getJson(`/api/v1/admin/audit_events?${query}`);
  }

  static fetchActions() {
    return ApiClient.getJson('/api/v1/admin/audit_events/actions');
  }
}
