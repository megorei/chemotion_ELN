/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { mount } from 'enzyme';
import ServiceStatus from 'src/apps/admin/ServiceStatus';
import ServiceStatusFetcher from 'src/fetchers/ServiceStatusFetcher';

// P0 WP 04: shared-service status page — mismatch banner + table.
describe('ServiceStatus', () => {
  let fetchStub;
  const mounted = [];

  const payload = (indigoOk) => ({
    services: [
      {
        service: 'indigo', configured: true, reachable: true,
        version: '2.0.0', expected: '1.35.0-rc.2', ok: indigoOk, error: null,
      },
      {
        service: 'converter', configured: true, reachable: true,
        version: null, expected: 'v1.9.3', ok: 'unknown', error: null,
      },
    ],
  });

  afterEach(() => {
    fetchStub.restore();
    while (mounted.length) { mounted.pop().unmount(); }
  });

  const mountPage = async (indigoOk) => {
    fetchStub = sinon.stub(ServiceStatusFetcher, 'fetchStatus').resolves(payload(indigoOk));
    const wrapper = mount(<ServiceStatus />);
    mounted.push(wrapper);
    await new Promise((resolve) => { setTimeout(resolve, 0); });
    wrapper.update();
    return wrapper;
  };

  it('renders one row per service with version info', async () => {
    const wrapper = await mountPage(true);
    const table = wrapper.find('[data-testid="service-status-table"]').hostNodes();
    expect(table.text()).toContain('indigo');
    expect(table.text()).toContain('1.35.0-rc.2');
    expect(table.text()).toContain('converter');
  });

  it('shows the config-error banner on a mismatch', async () => {
    const wrapper = await mountPage(false);
    const banner = wrapper.find('[data-testid="mismatch-banner"]').hostNodes();
    expect(banner).toHaveLength(1);
    expect(banner.text()).toContain('indigo');
  });

  it('shows no banner when everything is ok or unknown', async () => {
    const wrapper = await mountPage(true);
    expect(wrapper.find('[data-testid="mismatch-banner"]').hostNodes()).toHaveLength(0);
  });
});
