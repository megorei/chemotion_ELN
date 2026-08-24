import { flow, getRoot, types } from 'mobx-state-tree';

import TenantSettingsFetcher from 'src/fetchers/TenantSettingsFetcher';

// Mirrors TenantSetting::SECRET_PLACEHOLDER — the only value a secret ever has client-side.
export const SECRET_PLACEHOLDER = '********';

// Composite map key for the dirty-edit tracking. '|' cannot appear in either part
// (sections are simple names, keys match TenantSetting::KEY_FORMAT), so it is unambiguous.
const editKey = (section, key) => `${section}|${key}`;

// One effective setting as served by GET /api/v1/admin/tenant_settings: the resolved value
// plus its provenance. `source` is one of db | env-absolute | yml | env-default | template |
// static | nil; `read_only` marks the Absolute-ENV tier (REQ-ELN-8), `secret` values only ever
// arrive as SECRET_PLACEHOLDER, and `restart_required` is the reload class (ADR-007).
export const TenantSettingEntry = types.model('TenantSettingEntry', {
  key: types.identifier,
  value: types.frozen(),
  source: types.string,
  read_only: types.optional(types.boolean, false),
  secret: types.optional(types.boolean, false),
  restart_required: types.optional(types.boolean, false),
});

export const TenantSettingsSection = types.model('TenantSettingsSection', {
  name: types.identifier,
  entries: types.array(TenantSettingEntry),
});

export const TenantSettingsStore = types
  .model('TenantSettingsStore', {
    sections: types.array(TenantSettingsSection),
    selectedSection: types.maybeNull(types.string),
    // Draft values keyed by editKey(section, key). Secret drafts are NEVER stored here — only
    // the SECRET_PLACEHOLDER marker, so a typed secret cannot leak into an MST snapshot.
    edits: types.map(types.frozen()),
    // 'section.key' entries saved this session whose change only takes effect after an
    // operator-executed restart — drives the persistent "restart pending" banner.
    restartPendingKeys: types.array(types.string),
    // GET's restart_required map ({ section: 'all' | [keys] }): the enumerated boot-wired
    // surface, kept for status display; per-entry restart_required already rides on each entry.
    restartMap: types.frozen({}),
    loading: types.optional(types.boolean, false),
    loadError: types.optional(types.boolean, false),
    savingKey: types.maybeNull(types.string),
  })
  .actions((self) => ({
    load: flow(function* load() {
      self.loading = true;
      self.loadError = false;
      let response;
      try {
        response = yield TenantSettingsFetcher.fetchSettings();
      } catch (error) {
        // network/parse failures reject; map them onto the same failure path as a falsy body
        response = undefined;
      }
      self.loading = false;

      if (!response || !response.sections) {
        self.loadError = true;
        getRoot(self).notificationsStore.add({
          title: 'Tenant Settings',
          message: 'The settings could not be loaded. Please try again.',
          level: 'error',
          autoDismiss: 10,
        });
        return false;
      }

      self.setSections(response.sections);
      self.restartMap = response.restart_required || {};
      return true;
    }),
    setSections(sectionsPayload) {
      self.sections.clear();
      Object.keys(sectionsPayload).forEach((name) => {
        const entries = Object.keys(sectionsPayload[name]).map((key) => ({
          key,
          ...sectionsPayload[name][key],
        }));
        self.sections.push({ name, entries });
      });
      if (!self.selectedSection || !self.section(self.selectedSection)) {
        self.selectedSection = self.sections.length > 0 ? self.sections[0].name : null;
      }
    },
    selectSection(name) {
      self.selectedSection = name;
    },
    // Dirty tracking. For secret entries only the placeholder marker is stored (never the
    // typed value — see the `edits` field comment); dirtiness is what matters to the UI.
    setEdit(section, key, value) {
      const entry = self.entry(section, key);
      const secret = Boolean(entry && entry.secret);
      self.edits.set(editKey(section, key), secret ? SECRET_PLACEHOLDER : value);
    },
    clearEdit(section, key) {
      self.edits.delete(editKey(section, key));
    },
    // PUT one setting. Resolves true/false instead of throwing into the component (§3 failure
    // convention): a falsy response — the client's default error handler resolves undefined —
    // means the edit was NOT saved, so the dirty flag stays and the entry is left untouched.
    save: flow(function* save(section, key, value) {
      self.savingKey = editKey(section, key);
      let response;
      try {
        response = yield TenantSettingsFetcher.updateSetting({ section, key, value });
      } catch (error) {
        response = undefined;
      }
      self.savingKey = null;

      if (!response) {
        getRoot(self).notificationsStore.add({
          title: 'Tenant Settings',
          message: `"${section}.${key}" could not be saved. Please try again.`,
          level: 'error',
          autoDismiss: 10,
        });
        return false;
      }

      self.applySaved(section, key, value, response);

      const restart = Boolean(response.restart_required);
      getRoot(self).notificationsStore.add({
        title: 'Tenant Settings',
        message: restart
          ? `"${section}.${key}" saved — takes effect after the operator restarts the service.`
          : `"${section}.${key}" saved.`,
        level: 'success',
        autoDismiss: 5,
      });
      return true;
    }),
    applySaved(section, key, value, response) {
      const entry = self.entry(section, key);
      const secret = Boolean(response.secret || (entry && entry.secret));
      if (entry) {
        // never write the submitted secret back into the tree — the placeholder is all the
        // client keeps (round-trip contract: resubmitting it leaves the stored secret as is)
        entry.value = secret ? SECRET_PLACEHOLDER : value;
        entry.source = 'db';
      }
      self.edits.delete(editKey(section, key));
      if (response.restart_required) {
        const pending = `${section}.${key}`;
        if (!self.restartPendingKeys.includes(pending)) self.restartPendingKeys.push(pending);
      }
    },
  }))
  .views((self) => ({
    get sectionNames() {
      return self.sections.map((section) => section.name);
    },
    section(name) {
      return self.sections.find((section) => section.name === name) || null;
    },
    get currentSection() {
      return self.selectedSection ? self.section(self.selectedSection) : null;
    },
    entry(sectionName, key) {
      const section = self.section(sectionName);
      return (section && section.entries.find((entry) => entry.key === key)) || null;
    },
    isDirty(section, key) {
      return self.edits.has(editKey(section, key));
    },
    editValue(section, key) {
      return self.edits.get(editKey(section, key));
    },
    get restartPending() {
      return self.restartPendingKeys.length > 0;
    },
  }));

export default TenantSettingsStore;
