import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import { Badge, Button } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ExternalInvitations from 'src/apps/mydb/collections/ExternalInvitations';

Enzyme.configure({ adapter: new Adapter() });

const invitationWith = (overrides = {}) => ({
  id: 1,
  federated_id: 'idp.example#alice',
  email: null,
  state: 'pending',
  expires_at: null,
  permission_level: 0,
  ...overrides,
});

// The whole mocha run shares one jsdom — every mount has to be torn down.
const mounted = [];

// Plain-object store via StoreContext.Provider (the component-harness idiom
// from docs/ui-conventions.md) — the component only reads invitationsFor and
// calls the three flows.
const render = (collections) => {
  const wrapper = mount(
    <StoreContext.Provider value={{ collections }}>
      <ExternalInvitations collectionId={5} />
    </StoreContext.Provider>
  );
  mounted.push(wrapper);
  return wrapper;
};

const storeWith = (invitations, overrides = {}) => ({
  invitationsFor: () => (invitations === undefined ? undefined : { invitations }),
  getInvitations: sinon.spy(),
  addInvitation: sinon.stub().resolves(true),
  revokeInvitation: sinon.stub().resolves(true),
  ...overrides,
});

describe('ExternalInvitations', () => {
  afterEach(() => {
    while (mounted.length > 0) mounted.pop().unmount();
  });

  it('lazy-loads the invitations when none are cached', () => {
    const store = storeWith(undefined);
    render(store);
    expect(store.getInvitations.calledWith(5)).toBe(true);
  });

  it('lists pending and active invitations with identity and state, hiding revoked ones', () => {
    const store = storeWith([
      invitationWith(),
      invitationWith({ id: 2, federated_id: null, email: 'bob@remote.edu', state: 'active' }),
      invitationWith({ id: 3, state: 'revoked' }),
    ]);
    const wrapper = render(store);

    const text = wrapper.text();
    expect(text).toContain('idp.example#alice');
    expect(text).toContain('bob@remote.edu');
    expect(wrapper.find(Badge).map((badge) => badge.text())).toEqual(['pending', 'active']);
  });

  it('offers only permission levels below manage_shares (external guest ceiling)', () => {
    const wrapper = render(storeWith([]));
    const values = wrapper.find('select option').map((option) => Number(option.prop('value')));
    expect(Math.max(...values)).toBeLessThan(4);
    expect(values).toContain(0);
  });

  it('submits the trimmed invite params and only the filled-in identity fields', async () => {
    const store = storeWith([]);
    const wrapper = render(store);

    wrapper.find('input[type="text"]').simulate('change', { target: { value: '  idp.example#carol  ' } });
    wrapper.find(Button).filterWhere((button) => button.text().includes('Invite')).simulate('click');
    await new Promise((resolve) => { setTimeout(resolve, 0); });

    expect(store.addInvitation.calledOnce).toBe(true);
    expect(store.addInvitation.firstCall.args[0]).toEqual({
      collection_id: 5,
      permission_level: 0,
      identifier: 'idp.example#carol',
    });
  });

  it('disables the invite button while neither identifier nor email is filled in', () => {
    const wrapper = render(storeWith([]));
    const button = wrapper.find(Button).filterWhere((b) => b.text().includes('Invite'));
    expect(button.prop('disabled')).toBe(true);
  });

  it('revokes an invitation through the store flow', () => {
    const store = storeWith([invitationWith()]);
    const wrapper = render(store);

    wrapper.find(Button).filterWhere((button) => button.text().includes('revoke')).simulate('click');

    expect(store.revokeInvitation.calledWith(1, 5)).toBe(true);
  });
});
