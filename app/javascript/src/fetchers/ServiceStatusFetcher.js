import ApiClient from 'src/api_clients/ChemotionApiClient';

// Admin-only shared-service contract status (Chemotion::ServiceStatusAPI,
// P0 WP 04): one row per service with configured/reachable/version/expected/ok.
export default class ServiceStatusFetcher {
  static fetchStatus() {
    return ApiClient.getJson('/api/v1/admin/service_status');
  }
}
