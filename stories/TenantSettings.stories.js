import React from 'react';
import { Table } from 'react-bootstrap';
import TenantSettingRow from 'src/apps/admin/tenantSettings/TenantSettingRow';
import TenantSettingsSectionPane from 'src/apps/admin/tenantSettings/TenantSettingsSectionPane';

// Fixtures mirror GET /api/v1/admin/tenant_settings entries. Secrets only ever appear as the
// '********' placeholder — never a real or realistic value (UI conventions §9).
const entries = {
  editable: {
    key: 'url', value: 'http://converter:4000', source: 'yml', read_only: false, secret: false, restart_required: false,
  },
  readOnly: {
    key: 'docserver.callback_server',
    value: 'http://eln/callback',
    source: 'env-absolute',
    read_only: true,
    secret: false,
    restart_required: false,
  },
  secret: {
    key: 'secret_key', value: '********', source: 'db', read_only: false, secret: true, restart_required: false,
  },
  restartRequired: {
    key: 'address',
    value: 'relay.example.org',
    source: 'env-default',
    read_only: false,
    secret: false,
    restart_required: true,
  },
};

const inTable = (entry) => (
  <Table hover size="sm" style={{ maxWidth: '60rem' }}>
    <thead>
      <tr>
        <th>Setting</th>
        <th>Value</th>
        <th>Source</th>
        <th>Effect</th>
        <th aria-label="actions" />
      </tr>
    </thead>
    <tbody>
      <TenantSettingRow entry={entry} onSave={() => Promise.resolve(true)} />
    </tbody>
  </Table>
);

export default {
  title: 'Organisms/TenantSettings',
  component: TenantSettingRow,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
  One row of the Tenant Settings admin page (P0 WP 04): the resolved value with a provenance
  badge (which tier of the AppConfig resolver produced it), a reload-class badge
  (**request-time** vs **Save & Restart**), and per-row Save/Reset once edited.

  Notable states: **editable** (any non-Absolute tier), **read-only** (Absolute-ENV,
  operator-fixed — disabled control, lock, no save affordance), **secret** (write-only:
  the field is pre-filled with the \`********\` placeholder and only a newly typed value is
  ever submitted; the API never returns a secret), and **restart-required** (saving queues an
  operator-executed restart and raises the persistent restart-pending banner).
        `,
      },
    },
  },
};

export const EditableRow = { render: () => inTable(entries.editable) };

export const ReadOnlyRow = { render: () => inTable(entries.readOnly) };
ReadOnlyRow.parameters = {
  docs: {
    description: {
      story: 'Absolute-ENV tier (operator-fixed, REQ-ELN-8): disabled control, lock icon and '
        + '"set by operator" hint — never an editable control the backend would ignore.',
    },
  },
};

export const SecretRow = { render: () => inTable(entries.secret) };
SecretRow.parameters = {
  docs: {
    description: {
      story: 'Write-only secret: password field pre-filled with the placeholder; submitting the '
        + 'placeholder verbatim keeps the stored secret unchanged. No reveal toggle, no copy button.',
    },
  },
};

export const RestartRequiredRow = { render: () => inTable(entries.restartRequired) };

export const SectionWithRestartPending = {
  render: () => (
    <TenantSettingsSectionPane
      sectionName="smtp"
      entries={[entries.restartRequired, {
        key: 'port', value: 587, source: 'env-absolute', read_only: true, secret: false, restart_required: true,
      }, {
        key: 'password', value: '********', source: 'db', read_only: false, secret: true, restart_required: true,
      }]}
      restartPendingKeys={['smtp.address']}
      onSave={() => Promise.resolve(true)}
    />
  ),
};
SectionWithRestartPending.parameters = {
  docs: {
    description: {
      story: 'After saving a Save & Restart key the pane shows the persistent (non-dismissable) '
        + 'restart-pending banner listing the affected keys until the operator restarts the service.',
    },
  },
};
