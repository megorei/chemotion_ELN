/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { mount } from 'enzyme';
import AuditEvents from 'src/apps/admin/AuditEvents';
import AuditEventsFetcher from 'src/fetchers/AuditEventsFetcher';

// P1 WP 05: admin audit-events page — fetch, render, guest filter.
describe('AuditEvents', () => {
  let fetchEvents;
  let fetchActions;
  const mounted = [];

  const eventsPayload = {
    audit_events: [
      {
        id: 2,
        action: 'guest.login',
        actor_type: 'user',
        actor_id: 7,
        actor_name: 'Guest User (guest)',
        subject_type: null,
        subject_id: null,
        metadata: { federated_id: 'idp.example#g', guest: true },
        ip: '10.0.0.1',
        created_at: '2026-08-31T10:00:00Z',
      },
      {
        id: 1,
        action: 'config.changed',
        actor_type: 'system',
        actor_id: null,
        actor_name: 'system',
        subject_type: null,
        subject_id: null,
        metadata: {},
        ip: null,
        created_at: '2026-08-31T09:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    fetchEvents = sinon.stub(AuditEventsFetcher, 'fetchEvents').resolves(eventsPayload);
    fetchActions = sinon.stub(AuditEventsFetcher, 'fetchActions').resolves({ actions: ['guest.login'] });
  });

  afterEach(() => {
    fetchEvents.restore();
    fetchActions.restore();
    while (mounted.length) { mounted.pop().unmount(); }
  });

  const mountPage = async () => {
    const wrapper = mount(<AuditEvents />);
    mounted.push(wrapper);
    // let the fetch promises resolve
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    wrapper.update();
    return wrapper;
  };

  it('renders fetched events with actions and actor names', async () => {
    const wrapper = await mountPage();
    const table = wrapper.find('[data-testid="audit-events-table"]').hostNodes();
    expect(table.text()).toContain('guest.login');
    expect(table.text()).toContain('Guest User (guest)');
    expect(table.text()).toContain('config.changed');
  });

  it('refetches with actor_type=guest when the guest filter is chosen', async () => {
    const wrapper = await mountPage();
    fetchEvents.resetHistory();
    wrapper.find('[data-testid="actor-type-filter"]').hostNodes()
      .simulate('change', { target: { value: 'guest' } });
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    expect(fetchEvents.called).toBe(true);
    expect(fetchEvents.lastCall.args[0].actor_type).toEqual('guest');
  });
});
