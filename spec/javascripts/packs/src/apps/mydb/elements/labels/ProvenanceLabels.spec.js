/* eslint-disable import/no-unresolved */
import React from 'react';
import expect from 'expect';
import { mount } from 'enzyme';
import ProvenanceLabels from 'src/apps/mydb/elements/labels/ProvenanceLabels';

// P2 WP 01: provenance badges in element detail headers.
describe('ProvenanceLabels', () => {
  const mounted = [];
  afterEach(() => { while (mounted.length) { mounted.pop().unmount(); } });

  const mountWith = (provenances) => {
    const wrapper = mount(<ProvenanceLabels element={{ provenances }} />);
    mounted.push(wrapper);
    return wrapper;
  };

  it('renders an origin badge ("copy from …")', () => {
    const wrapper = mountWith([{
      id: 1, direction: 'origin', tenant: 'kit',
      remote_ref: 'chemotion://fiz/kit/Sample/12@2026-09-01T10:00:00Z',
      created_at: '2026-09-01T10:00:00Z',
    }]);
    const badge = wrapper.find('[data-testid="provenance-origin"]').hostNodes();
    expect(badge).toHaveLength(1);
    expect(badge.text()).toContain('Copy from kit');
  });

  it('renders a copy badge ("copied to …")', () => {
    const wrapper = mountWith([{
      id: 2, direction: 'copy', tenant: 'aachen',
      remote_ref: 'chemotion://fiz/aachen/Sample/77@2026-09-01T10:00:00Z',
      created_at: '2026-09-01T10:00:00Z',
    }]);
    expect(wrapper.find('[data-testid="provenance-copy"]').hostNodes().text())
      .toContain('Copied to aachen');
  });

  it('renders nothing without provenance rows', () => {
    const wrapper = mountWith([]);
    expect(wrapper.find('.badge')).toHaveLength(0);
  });
});
