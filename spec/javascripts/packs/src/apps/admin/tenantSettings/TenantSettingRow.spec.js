import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { mount } from 'enzyme';
import { Badge } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
// RootStore must be required BEFORE the component under test (circular-import trap, see
// ElementCollectionLabels.spec.js) — kept even though this presentational row takes only props.
// eslint-disable-next-line no-unused-vars
import { StoreContext } from 'src/stores/mobx/RootStore';
import { SECRET_PLACEHOLDER } from 'src/stores/mobx/TenantSettingsStore';
import TenantSettingRow from 'src/apps/admin/tenantSettings/TenantSettingRow';

Enzyme.configure({ adapter: new Adapter() });

const entryWith = (overrides = {}) => ({
  key: 'url',
  value: 'http://converter:4000',
  source: 'yml',
  read_only: false,
  secret: false,
  restart_required: false,
  ...overrides,
});

// The whole mocha run shares one jsdom — every mount has to be torn down.
const mounted = [];

const render = (entry, callbacks = {}) => {
  const wrapper = mount(
    <table>
      <tbody>
        <TenantSettingRow entry={entry} {...callbacks} />
      </tbody>
    </table>
  );
  mounted.push(wrapper);
  return wrapper;
};

const flushPromises = () => new Promise((resolve) => { setTimeout(resolve, 0); });

const badgeTexts = (wrapper) => wrapper.find(Badge).map((badge) => badge.text());

describe('TenantSettingRow', () => {
  afterEach(() => {
    while (mounted.length > 0) mounted.pop().unmount();
  });

  describe('editable state', () => {
    it('renders the resolved value and no save affordance while pristine', () => {
      const wrapper = render(entryWith());

      expect(wrapper.find('input').prop('value')).toEqual('http://converter:4000');
      expect(wrapper.find('button')).toHaveLength(0);
    });

    it('reports the edit, shows Save/Reset, and submits the typed value', async () => {
      const onEdit = sinon.spy();
      const onSave = sinon.stub().resolves(true);
      const wrapper = render(entryWith(), { onEdit, onSave });

      wrapper.find('input').simulate('change', { target: { value: 'http://other:4000' } });
      wrapper.update();

      expect(onEdit.calledWith('url', 'http://other:4000')).toBe(true);
      const buttons = wrapper.find('button');
      expect(buttons.map((b) => b.text())).toEqual(['Save', 'Reset']);

      buttons.first().simulate('click');
      await flushPromises();

      expect(onSave.calledWith('url', 'http://other:4000')).toBe(true);
    });

    it('clears the dirty state again via Reset', () => {
      const onClearEdit = sinon.spy();
      const wrapper = render(entryWith(), { onClearEdit });

      wrapper.find('input').simulate('change', { target: { value: 'http://other:4000' } });
      wrapper.update();
      wrapper.find('button').last().simulate('click');
      wrapper.update();

      expect(onClearEdit.called).toBe(true);
      expect(wrapper.find('input').prop('value')).toEqual('http://converter:4000');
      expect(wrapper.find('button')).toHaveLength(0);
    });

    it('submits a numeric value as a number', async () => {
      const onSave = sinon.stub().resolves(true);
      const wrapper = render(entryWith({ key: 'port', value: 587 }), { onSave });

      expect(wrapper.find('input').prop('type')).toEqual('number');
      wrapper.find('input').simulate('change', { target: { value: '2525' } });
      wrapper.update();
      wrapper.find('button').first().simulate('click');
      await flushPromises();

      expect(onSave.calledWith('port', 2525)).toBe(true);
    });

    it('renders an object value as a JSON textarea and refuses to save an unparsable draft', async () => {
      const onSave = sinon.stub().resolves(true);
      const wrapper = render(entryWith({ key: 'services', value: { a: 1 } }), { onSave });

      expect(wrapper.find('textarea').prop('value')).toEqual(JSON.stringify({ a: 1 }, null, 2));

      wrapper.find('textarea').simulate('change', { target: { value: '{ not json' } });
      wrapper.update();
      wrapper.find('button').first().simulate('click');
      await flushPromises();
      wrapper.update();

      expect(onSave.called).toBe(false);
      expect(wrapper.find('textarea').hasClass('is-invalid')).toBe(true);

      wrapper.find('textarea').simulate('change', { target: { value: '{"a": 2}' } });
      wrapper.update();
      wrapper.find('button').first().simulate('click');
      await flushPromises();

      expect(onSave.calledWith('services', { a: 2 })).toBe(true);
    });
  });

  describe('read-only state (Absolute-ENV tier)', () => {
    it('disables the control and shows the lock with the set-by-operator hint, with no save affordance', () => {
      const wrapper = render(entryWith({ source: 'env-absolute', read_only: true }));

      expect(wrapper.find('input').prop('disabled')).toBe(true);
      expect(wrapper.find('i.fa-lock')).toHaveLength(1);
      expect(wrapper.text()).toContain('Set by operator');
      expect(wrapper.find('button')).toHaveLength(0);
    });
  });

  describe('secret state (write-only round trip)', () => {
    it('renders a password field pre-filled with the placeholder and stays pristine', () => {
      const wrapper = render(entryWith({ key: 'secret_key', value: SECRET_PLACEHOLDER, secret: true, source: 'db' }));

      const input = wrapper.find('input');
      expect(input.prop('type')).toEqual('password');
      expect(input.prop('value')).toEqual(SECRET_PLACEHOLDER);
      expect(wrapper.find('button')).toHaveLength(0);
    });

    it('reports only the placeholder through onEdit, submits the typed value, and never echoes it back', async () => {
      const onEdit = sinon.spy();
      const onSave = sinon.stub().resolves(true);
      const wrapper = render(
        entryWith({ key: 'secret_key', value: SECRET_PLACEHOLDER, secret: true, source: 'db' }),
        { onEdit, onSave }
      );

      wrapper.find('input').simulate('change', { target: { value: 'new-secret-value' } });
      wrapper.update();

      // the dirty-tracking callback never carries the typed secret — only the marker
      expect(onEdit.calledWith('secret_key', SECRET_PLACEHOLDER)).toBe(true);
      expect(onEdit.calledWith('secret_key', 'new-secret-value')).toBe(false);

      wrapper.find('button').first().simulate('click');
      await flushPromises();
      wrapper.update();

      expect(onSave.calledWith('secret_key', 'new-secret-value')).toBe(true);
      // after save the field returns to the placeholder — a saved secret is never displayed
      expect(wrapper.find('input').prop('value')).toEqual(SECRET_PLACEHOLDER);
      expect(wrapper.find('button')).toHaveLength(0);
    });
  });

  describe('badges', () => {
    it('renders the provenance badge for the resolving tier', () => {
      const wrapper = render(entryWith({ source: 'env-default' }));

      expect(badgeTexts(wrapper)).toContain('env-default');
    });

    it('labels a request-time key as such', () => {
      const wrapper = render(entryWith({ restart_required: false }));

      expect(badgeTexts(wrapper)).toContain('request-time');
      expect(badgeTexts(wrapper).join(' ')).not.toContain('Restart');
    });

    it('labels a boot-wired key Save & Restart', () => {
      const wrapper = render(entryWith({ key: 'address', restart_required: true }));

      expect(badgeTexts(wrapper)).toContain('Save & Restart');
    });
  });
});
