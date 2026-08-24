/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { rootStore } from 'src/stores/mobx/RootStore';
import { SECRET_PLACEHOLDER } from 'src/stores/mobx/TenantSettingsStore';
import TenantSettingsFetcher from 'src/fetchers/TenantSettingsFetcher';

// Pins the WP 04 admin-UI contract over Chemotion::TenantSettingsAPI: GET's flat
// { 'dot.path' => { value, source, read_only, secret, restart_required } } payload is mapped
// into sections/entries, PUT's { restart_required } answer drives the restart-pending banner,
// and — the §9 ban — a typed secret value never enters an MST snapshot.
// RootStore is a module singleton: capture the pristine snapshot at load time and reapply it
// per test (same idiom as CollectionsStore.spec.js).
const pristineSnapshot = getSnapshot(rootStore.tenantSettingsStore);

const payload = () => ({
  sections: {
    converter: {
      url: {
        value: 'http://converter:4000', source: 'yml', read_only: false, secret: false, restart_required: false,
      },
      secret_key: {
        value: SECRET_PLACEHOLDER, source: 'db', read_only: false, secret: true, restart_required: false,
      },
    },
    smtp: {
      address: {
        value: 'relay.example.org', source: 'env-default', read_only: false, secret: false, restart_required: true,
      },
      port: {
        value: 587, source: 'env-absolute', read_only: true, secret: false, restart_required: true,
      },
    },
  },
  restart_required: { smtp: 'all', signup: ['disabled', 'allow_unconfirmed', 'sender'] },
});

describe('TenantSettingsStore', () => {
  let fetchStub;
  let updateStub;
  let store;

  beforeEach(() => {
    // Stub at the fetcher boundary (§2 harness idiom).
    fetchStub = sinon.stub(TenantSettingsFetcher, 'fetchSettings');
    updateStub = sinon.stub(TenantSettingsFetcher, 'updateSetting');
    applySnapshot(rootStore.tenantSettingsStore, pristineSnapshot);
    store = rootStore.tenantSettingsStore;
  });

  afterEach(() => {
    fetchStub.restore();
    updateStub.restore();
  });

  describe('.load', () => {
    it('maps the sections payload into entries with provenance and selects the first section', async () => {
      fetchStub.resolves(payload());

      const result = await store.load();

      expect(result).toBe(true);
      expect(store.sectionNames).toEqual(['converter', 'smtp']);
      expect(store.selectedSection).toEqual('converter');
      const entry = store.entry('smtp', 'address');
      expect(entry.value).toEqual('relay.example.org');
      expect(entry.source).toEqual('env-default');
      expect(entry.restart_required).toBe(true);
      expect(store.entry('smtp', 'port').read_only).toBe(true);
      expect(store.entry('converter', 'secret_key').secret).toBe(true);
      expect(store.loading).toBe(false);
      expect(store.loadError).toBe(false);
    });

    it('keeps the restart map from the payload', async () => {
      fetchStub.resolves(payload());

      await store.load();

      expect(store.restartMap.smtp).toEqual('all');
      expect(store.restartMap.signup).toEqual(['disabled', 'allow_unconfirmed', 'sender']);
    });

    it('maps a falsy (failed) response to loadError instead of throwing', async () => {
      fetchStub.resolves(undefined);

      const result = await store.load();

      expect(result).toBe(false);
      expect(store.loadError).toBe(true);
      expect(store.sections.length).toEqual(0);
    });

    it('maps a rejected request to loadError as well', async () => {
      fetchStub.rejects(new Error('network error'));

      const result = await store.load();

      expect(result).toBe(false);
      expect(store.loadError).toBe(true);
    });

    it('clears loadError again on a successful reload (the Retry path)', async () => {
      fetchStub.resolves(undefined);
      await store.load();
      fetchStub.resolves(payload());

      await store.load();

      expect(store.loadError).toBe(false);
      expect(store.sectionNames).toEqual(['converter', 'smtp']);
    });
  });

  describe('dirty tracking', () => {
    beforeEach(async () => {
      fetchStub.resolves(payload());
      await store.load();
    });

    it('marks an edited key dirty and clears it again', () => {
      expect(store.isDirty('converter', 'url')).toBe(false);

      store.setEdit('converter', 'url', 'http://other:4000');

      expect(store.isDirty('converter', 'url')).toBe(true);
      expect(store.editValue('converter', 'url')).toEqual('http://other:4000');

      store.clearEdit('converter', 'url');

      expect(store.isDirty('converter', 'url')).toBe(false);
    });

    it('never stores a typed secret in the tree — only the placeholder marker (§9 ban)', () => {
      store.setEdit('converter', 'secret_key', 'a-typed-secret-value');

      expect(store.isDirty('converter', 'secret_key')).toBe(true);
      expect(store.editValue('converter', 'secret_key')).toEqual(SECRET_PLACEHOLDER);
      expect(JSON.stringify(getSnapshot(store))).not.toContain('a-typed-secret-value');
    });
  });

  describe('.save', () => {
    beforeEach(async () => {
      fetchStub.resolves(payload());
      await store.load();
    });

    it('updates the entry to the saved value with db provenance and clears the dirty flag', async () => {
      store.setEdit('converter', 'url', 'http://tenant-converter:4000');
      updateStub.resolves({
        section: 'converter', key: 'url', secret: false, restart_required: false,
      });

      const result = await store.save('converter', 'url', 'http://tenant-converter:4000');

      expect(result).toBe(true);
      expect(updateStub.calledWith({
        section: 'converter', key: 'url', value: 'http://tenant-converter:4000',
      })).toBe(true);
      const entry = store.entry('converter', 'url');
      expect(entry.value).toEqual('http://tenant-converter:4000');
      expect(entry.source).toEqual('db');
      expect(store.isDirty('converter', 'url')).toBe(false);
      expect(store.restartPending).toBe(false);
    });

    it('raises the restart-pending flag after saving a restart_required key, without duplicates', async () => {
      updateStub.resolves({
        section: 'smtp', key: 'address', secret: false, restart_required: true,
      });

      await store.save('smtp', 'address', 'relay2.example.org');
      await store.save('smtp', 'address', 'relay3.example.org');

      expect(store.restartPending).toBe(true);
      expect(store.restartPendingKeys.slice()).toEqual(['smtp.address']);
    });

    it('keeps the placeholder — never the submitted secret — on the entry after a secret save', async () => {
      updateStub.resolves({
        section: 'converter', key: 'secret_key', secret: true, restart_required: false,
      });

      const result = await store.save('converter', 'secret_key', 'new-secret-value');

      expect(result).toBe(true);
      const entry = store.entry('converter', 'secret_key');
      expect(entry.value).toEqual(SECRET_PLACEHOLDER);
      expect(entry.source).toEqual('db');
      expect(JSON.stringify(getSnapshot(store))).not.toContain('new-secret-value');
    });

    it('leaves the entry and the dirty flag untouched on a falsy (failed) response', async () => {
      store.setEdit('converter', 'url', 'http://attempted:4000');
      updateStub.resolves(undefined);

      const result = await store.save('converter', 'url', 'http://attempted:4000');

      expect(result).toBe(false);
      expect(store.entry('converter', 'url').value).toEqual('http://converter:4000');
      expect(store.isDirty('converter', 'url')).toBe(true);
      expect(store.restartPending).toBe(false);
    });

    it('maps a rejected request to the same failure result', async () => {
      updateStub.rejects(new Error('network error'));

      const result = await store.save('converter', 'url', 'http://attempted:4000');

      expect(result).toBe(false);
      expect(store.entry('converter', 'url').value).toEqual('http://converter:4000');
    });
  });
});
