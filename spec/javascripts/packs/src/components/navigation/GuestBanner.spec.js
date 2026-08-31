/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { mount } from 'enzyme';
import { StoreContext } from 'src/stores/mobx/RootStore';
import GuestBanner from 'src/components/navigation/GuestBanner';

// P1 WP 04 (REQ-ELN-19): persistent guest-context indicator.
// Harness idiom: plain-object fake store injected via StoreContext.Provider
// (same pattern as ExternalInvitations.spec.js).
describe('GuestBanner', () => {
  const mounted = [];
  afterEach(() => {
    while (mounted.length) { mounted.pop().unmount(); }
  });

  const mountWithStore = (userStore) => {
    const wrapper = mount(
      <StoreContext.Provider value={{ userStore }}>
        <GuestBanner />
      </StoreContext.Provider>
    );
    mounted.push(wrapper);
    return wrapper;
  };

  const guestStore = (overrides = {}) => ({
    currentUser: { external: true, home_tenant_hint: 'idp.home-uni.example' },
    instance: { name: 'KIT Karlsruhe' },
    instanceDisplayName: 'KIT Karlsruhe',
    fetchInstance: sinon.spy(),
    ...overrides,
  });

  it('renders the banner for a guest with instance name and home hint', () => {
    const wrapper = mountWithStore(guestStore());
    const banner = wrapper.find('[data-testid="guest-banner"]').hostNodes();
    expect(banner).toHaveLength(1);
    const text = banner.text();
    expect(text).toContain('Guest access');
    expect(text).toContain('KIT Karlsruhe');
    expect(text).toContain('idp.home-uni.example');
  });

  it('renders nothing for a regular local user', () => {
    const wrapper = mountWithStore(guestStore({
      currentUser: { external: false, home_tenant_hint: null },
    }));
    expect(wrapper.find('[data-testid="guest-banner"]').hostNodes()).toHaveLength(0);
  });

  it('renders nothing before the current user is known', () => {
    const wrapper = mountWithStore(guestStore({ currentUser: null }));
    expect(wrapper.find('[data-testid="guest-banner"]').hostNodes()).toHaveLength(0);
  });

  it('fetches the instance identity when it is not loaded yet', () => {
    const store = guestStore({ instance: null, instanceDisplayName: '' });
    mountWithStore(store);
    expect(store.fetchInstance.calledOnce).toBe(true);
  });

  it('does not refetch an already loaded instance', () => {
    const store = guestStore();
    mountWithStore(store);
    expect(store.fetchInstance.called).toBe(false);
  });
});
