import React from 'react';
import PropTypes from 'prop-types';
import { Alert, Table } from 'react-bootstrap';
import { observer } from 'mobx-react';

import TenantSettingRow from 'src/apps/admin/tenantSettings/TenantSettingRow';

// One section's settings table plus the persistent restart-pending banner. Presentational —
// the page passes the store's data and wires the callbacks; keeping this store-free makes it
// directly usable in Storybook and component specs.
const TenantSettingsSectionPane = ({
  sectionName, entries, restartPendingKeys, savingKey, onEdit, onClearEdit, onSave
}) => (
  <div className="tenant-settings-pane">
    {restartPendingKeys.length > 0 && (
      // deliberately not dismissable: it maps to the audited config.restart_requested events
      // and only an operator-executed restart (chemop, ADR-007) clears the underlying state
      <Alert variant="warning" className="tenant-settings-restart-pending">
        <strong>Restart pending</strong>
        {' — the operator has been notified. The following changes take effect after the restart: '}
        {restartPendingKeys.map((key) => <code key={key} className="me-2">{key}</code>)}
      </Alert>
    )}
    <h4><code>{sectionName}</code></h4>
    {entries.length === 0 ? (
      <p className="text-muted">No settings resolved for this section.</p>
    ) : (
      <Table hover size="sm" className="align-middle">
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
          {entries.map((entry) => (
            <TenantSettingRow
              key={`${sectionName}|${entry.key}`}
              entry={entry}
              saving={savingKey === `${sectionName}|${entry.key}`}
              onEdit={onEdit}
              onClearEdit={onClearEdit}
              onSave={onSave}
            />
          ))}
        </tbody>
      </Table>
    )}
  </div>
);

TenantSettingsSectionPane.propTypes = {
  sectionName: PropTypes.string.isRequired,
  entries: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired })).isRequired,
  restartPendingKeys: PropTypes.arrayOf(PropTypes.string),
  savingKey: PropTypes.string,
  onEdit: PropTypes.func,
  onClearEdit: PropTypes.func,
  onSave: PropTypes.func,
};

TenantSettingsSectionPane.defaultProps = {
  restartPendingKeys: [],
  savingKey: null,
  onEdit: () => {},
  onClearEdit: () => {},
  onSave: () => Promise.resolve(false),
};

export default observer(TenantSettingsSectionPane);
