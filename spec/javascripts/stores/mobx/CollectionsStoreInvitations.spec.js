/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { applySnapshot, getSnapshot } from 'mobx-state-tree';
import { rootStore } from 'src/stores/mobx/RootStore';
import CollectionSharesFetcher from 'src/fetchers/CollectionSharesFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';

// Pins the REQ-ELN-17 invitation flows over /collection_shares/invitations:
// getInvitations upserts per collection, addInvitation resolves true/false
// (policy refusals arrive as a falsy body and must NOT throw into the
// component), revokeInvitation refreshes both the invitation and share lists.
// Same harness idiom as CollectionsStore.spec.js: rootStore singleton,
// pristine snapshot per test, sinon stubs at the fetcher boundary.
const pristineCollectionsSnapshot = getSnapshot(rootStore.collectionsStore);

const invitationWith = (overrides = {}) => ({
  id: 1,
  collection_id: 5,
  federated_id: 'idp.example#alice',
  email: null,
  state: 'pending',
  expires_at: null,
  celllinesample_detail_level: 0,
  devicedescription_detail_level: 0,
  element_detail_level: 0,
  permission_level: 0,
  reaction_detail_level: 0,
  researchplan_detail_level: 0,
  sample_detail_level: 0,
  screen_detail_level: 0,
  sequencebasedmacromoleculesample_detail_level: 0,
  wellplate_detail_level: 0,
  ...overrides,
});

describe('CollectionsStore invitations', () => {
  let store;
  let getStub;

  beforeEach(() => {
    applySnapshot(rootStore.collectionsStore, pristineCollectionsSnapshot);
    store = rootStore.collectionsStore;
    getStub = sinon.stub(CollectionSharesFetcher, 'getInvitations');
    // keep the refresh fan-out quiet
    sinon.stub(CollectionSharesFetcher, 'getCollectionSharedWithUsers').resolves([]);
    sinon.stub(CollectionsFetcher, 'fetchCollections').resolves({ own: [], shared_with_me: [] });
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('.getInvitations', () => {
    it('stores the fetched invitations per collection', async () => {
      getStub.resolves([invitationWith()]);

      const loaded = await store.getInvitations(5);

      expect(loaded).toBe(true);
      expect(store.invitationsFor(5).invitations.length).toBe(1);
      expect(store.invitationsFor(5).invitations[0].federated_id).toBe('idp.example#alice');
    });

    it('replaces an already-cached list instead of stacking entries', async () => {
      getStub.onFirstCall().resolves([invitationWith()]);
      getStub.onSecondCall().resolves([invitationWith({ id: 2, state: 'active' })]);

      await store.getInvitations(5);
      await store.getInvitations(5);

      expect(store.collection_invitations.length).toBe(1);
      expect(store.invitationsFor(5).invitations.map((i) => i.id)).toEqual([2]);
    });

    it('resolves false and stores nothing when the fetch fails (e.g. 404 not administrable)', async () => {
      getStub.rejects(new Error('boom'));

      const loaded = await store.getInvitations(5);

      expect(loaded).toBe(false);
      expect(store.invitationsFor(5)).toBe(undefined);
    });
  });

  describe('.addInvitation', () => {
    it('resolves true and refreshes the invitation list on success', async () => {
      sinon.stub(CollectionSharesFetcher, 'addInvitation').resolves(invitationWith());
      getStub.resolves([invitationWith()]);

      const saved = await store.addInvitation({ collection_id: 5, identifier: 'idp.example#alice' });

      expect(saved).toBe(true);
      expect(store.invitationsFor(5).invitations.length).toBe(1);
    });

    it('resolves false on a policy refusal (falsy body) without touching the cache', async () => {
      // inbound collaboration off / cap exceeded: the client resolves undefined
      sinon.stub(CollectionSharesFetcher, 'addInvitation').resolves(undefined);

      const saved = await store.addInvitation({ collection_id: 5, identifier: 'idp.example#alice' });

      expect(saved).toBe(false);
      expect(store.invitationsFor(5)).toBe(undefined);
    });
  });

  describe('.revokeInvitation', () => {
    it('refreshes invitations after a successful revoke', async () => {
      sinon.stub(CollectionSharesFetcher, 'revokeInvitation').resolves(true);
      getStub.resolves([]);

      const revoked = await store.revokeInvitation(1, 5);

      expect(revoked).toBe(true);
      expect(getStub.calledWith(5)).toBe(true);
    });

    it('resolves false and skips the refresh when the server refuses', async () => {
      sinon.stub(CollectionSharesFetcher, 'revokeInvitation').resolves(undefined);

      const revoked = await store.revokeInvitation(1, 5);

      expect(revoked).toBe(false);
      expect(getStub.called).toBe(false);
    });
  });
});
