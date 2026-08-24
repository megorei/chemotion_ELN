import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import { Alert } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
// RootStore must be required BEFORE the component under test (circular-import trap, see
// ElementCollectionLabels.spec.js).
import { StoreContext } from 'src/stores/mobx/RootStore';
import TenantSettings from 'src/apps/admin/tenantSettings/TenantSettings';

Enzyme.configure({ adapter: new Adapter() });

// Plain-object stand-in for the mobx TenantSettingsStore (§2 harness idiom): only the members
// the page touches, injected through StoreContext.Provider.
const storeFor = (overrides = {}) => ({
  tenantSettingsStore: {
    load: sinon.spy(),
    selectSection: sinon.spy(),
    setEdit: sinon.spy(),
    clearEdit: sinon.spy(),
    save: sinon.stub().resolves(true),
    sectionNames: ['converter', 'smtp'],
    selectedSection: 'converter',
    currentSection: {
      name: 'converter',
      entries: [
        {
          key: 'url', value: 'http://converter:4000', source: 'yml', read_only: false, secret: false, restart_required: false,
        },
        {
          key: 'timeout', value: 30, source: 'env-absolute', read_only: true, secret: false, restart_required: false,
        },
      ],
    },
    restartPendingKeys: [],
    savingKey: null,
    loading: false,
    loadError: false,
    restartPending: false,
    ...overrides,
  },
});

const mounted = [];

const render = (store) => {
  const wrapper = mount(
    <StoreContext.Provider value={store}>
      <TenantSettings />
    </StoreContext.Provider>
  );
  mounted.push(wrapper);
  return wrapper;
};

describe('TenantSettings (admin page)', () => {
  afterEach(() => {
    while (mounted.length > 0) mounted.pop().unmount();
  });

  it('loads the settings once on mount', () => {
    const store = storeFor();

    render(store);

    expect(store.tenantSettingsStore.load.calledOnce).toBe(true);
  });

  it('renders one section nav entry per section and switches sections through the store', () => {
    const store = storeFor();
    const wrapper = render(store);

    const navLinks = wrapper.find('.tenant-settings-nav a');
    expect(navLinks.map((link) => link.text())).toEqual(['converter', 'smtp']);

    navLinks.last().simulate('click');

    expect(store.tenantSettingsStore.selectSection.calledWith('smtp')).toBe(true);
  });

  it('renders a settings row per entry of the selected section', () => {
    const wrapper = render(storeFor());

    const rows = wrapper.find('tbody tr');
    expect(rows).toHaveLength(2);
    expect(rows.first().text()).toContain('url');
    // the read-only entry renders locked with the operator hint
    expect(rows.last().text()).toContain('Set by operator');
  });

  it('wires row saves to the store with the section name', () => {
    const store = storeFor();
    const wrapper = render(store);

    wrapper.find('tbody tr').first().find('input').simulate('change', { target: { value: 'http://other:4000' } });
    wrapper.update();

    expect(store.tenantSettingsStore.setEdit.calledWith('converter', 'url', 'http://other:4000')).toBe(true);

    wrapper.find('tbody tr').first().find('button').first()
      .simulate('click');

    expect(store.tenantSettingsStore.save.calledWith('converter', 'url', 'http://other:4000')).toBe(true);
  });

  it('shows the persistent restart-pending banner once a restart-required key was saved', () => {
    const wrapper = render(storeFor({ restartPendingKeys: ['smtp.address'], restartPending: true }));

    const alert = wrapper.find(Alert);
    expect(alert).toHaveLength(1);
    expect(alert.text()).toContain('Restart pending');
    expect(alert.text()).toContain('the operator has been notified');
    expect(alert.text()).toContain('smtp.address');
    // non-dismissable: it maps to the audited restart request, only the operator clears it
    expect(alert.prop('dismissible')).toBeFalsy();
  });

  it('shows no banner while nothing is pending', () => {
    const wrapper = render(storeFor());

    expect(wrapper.find('.tenant-settings-restart-pending')).toHaveLength(0);
  });

  it('surfaces a load failure with a retry affordance', () => {
    const store = storeFor({ loadError: true, currentSection: null, sectionNames: [] });
    const wrapper = render(store);

    expect(wrapper.find(Alert).text()).toContain('could not be loaded');

    wrapper.find('button').first().simulate('click');

    expect(store.tenantSettingsStore.load.callCount).toEqual(2);
  });
});
