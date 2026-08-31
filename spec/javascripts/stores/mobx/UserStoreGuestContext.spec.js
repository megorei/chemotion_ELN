/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { rootStore } from 'src/stores/mobx/RootStore';
import UsersFetcher from 'src/fetchers/UsersFetcher';

// P1 WP 04 (REQ-ELN-19): guest fields on the current-user payload, the
// public instance identity, and the origin-change store-reset guard.
// RootStore is a module singleton: capture the pristine snapshot at load
// time and reapply it per test (same idiom as TenantSettingsStore.spec.js).
const pristineSnapshot = getSnapshot(rootStore.userStore);

const guestUserPayload = () => ({
  user: {
    id: 7,
    name: 'Guest User',
    external: true,
    home_tenant_hint: 'idp.home-uni.example',
  },
});

const instancePayload = (overrides = {}) => ({
  instance: {
    id: 'kit',
    name: 'KIT Karlsruhe',
    application_title: 'Chemotion ELN',
    guest_max_permission_level: 0,
    ...overrides,
  },
});

describe('UserStore guest context', () => {
  let currentUserStub;
  let instanceStub;
  let store;

  beforeEach(() => {
    currentUserStub = sinon.stub(UsersFetcher, 'fetchCurrentUser');
    instanceStub = sinon.stub(UsersFetcher, 'fetchInstanceInfo');
    applySnapshot(rootStore.userStore, pristineSnapshot);
    store = rootStore.userStore;
    localStorage.removeItem('chemotion-origin');
  });

  afterEach(() => {
    currentUserStub.restore();
    instanceStub.restore();
    localStorage.removeItem('chemotion-origin');
  });

  it('is not a guest by default', () => {
    expect(store.isGuest).toBe(false);
  });

  it('flags a fetched external user as guest with its home tenant hint', async () => {
    currentUserStub.resolves(guestUserPayload());
    await store.fetchCurrentUser();
    expect(store.isGuest).toBe(true);
    expect(store.currentUser.home_tenant_hint).toEqual('idp.home-uni.example');
  });

  it('treats a regular user as non-guest (external defaults to false)', async () => {
    currentUserStub.resolves({ user: { id: 8, name: 'Local User' } });
    await store.fetchCurrentUser();
    expect(store.isGuest).toBe(false);
    expect(store.currentUser.external).toBe(false);
  });

  it('stores the instance identity and persists the origin', async () => {
    instanceStub.resolves(instancePayload());
    await store.fetchInstance();
    expect(store.instanceDisplayName).toEqual('KIT Karlsruhe');
    expect(store.instance.guest_max_permission_level).toEqual(0);
    expect(localStorage.getItem('chemotion-origin')).toEqual('kit');
  });

  it('falls back to the application title when the tenant has no name', async () => {
    instanceStub.resolves(instancePayload({ name: '' }));
    await store.fetchInstance();
    expect(store.instanceDisplayName).toEqual('Chemotion ELN');
  });

  it('resets the root store when the served origin differs from the persisted one', async () => {
    localStorage.setItem('chemotion-origin', 'aachen');
    store.setAuthToken('token-from-old-origin');
    instanceStub.resolves(instancePayload());

    await store.fetchInstance();

    // RootStore.reset() ran: session state from the old origin is gone …
    expect(store.authToken).toBe(null);
    // … and the new origin is persisted for the next comparison.
    expect(localStorage.getItem('chemotion-origin')).toEqual('kit');
  });

  it('keeps session state when the origin is unchanged', async () => {
    localStorage.setItem('chemotion-origin', 'kit');
    store.setAuthToken('token-from-this-origin');
    instanceStub.resolves(instancePayload());

    await store.fetchInstance();

    expect(store.authToken).toEqual('token-from-this-origin');
  });
});
