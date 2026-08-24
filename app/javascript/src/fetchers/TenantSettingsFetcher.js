import ApiClient from 'src/api_clients/ChemotionApiClient';

// Admin-only surface over the AppConfig resolver (Chemotion::TenantSettingsAPI, WP 03/04):
// GET returns { sections: { <section>: { '<dot.path>': { value, source, read_only, secret,
// restart_required } } }, restart_required: { <section>: 'all' | [keys] } }; PUT writes one
// tenant setting ({ section, key, value }) and answers { section, key, secret, restart_required }.
export default class TenantSettingsFetcher {
  static fetchSettings() {
    return ApiClient.getJson('/api/v1/admin/tenant_settings');
  }

  static updateSetting(params = {}) {
    return ApiClient.putJson('/api/v1/admin/tenant_settings', { body: params });
  }
}
