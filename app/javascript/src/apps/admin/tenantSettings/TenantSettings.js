import React, { useContext, useEffect } from 'react';
import {
  Alert, Button, Col, Nav, Row, Spinner
} from 'react-bootstrap';
import { observer } from 'mobx-react';

import TenantSettingsSectionPane from 'src/apps/admin/tenantSettings/TenantSettingsSectionPane';
import { StoreContext } from 'src/stores/mobx/RootStore';

// Admin page for the REQ-ELN-7 tenant settings (P0 WP 04): the effective configuration of
// every tenant-settable section with per-key provenance, editable per row through
// TenantSettingsStore -> TenantSettingsFetcher -> Chemotion::TenantSettingsAPI.
const TenantSettings = () => {
  const { tenantSettingsStore } = useContext(StoreContext);

  /* eslint-disable react-hooks/exhaustive-deps */
  // load once when the page is opened (same idiom as AdminHome's fetchCurrentUser)
  useEffect(() => {
    tenantSettingsStore.load();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  const section = tenantSettingsStore.currentSection;

  return (
    <div className="tenant-settings">
      <h3>Tenant Settings</h3>
      <p className="text-muted">
        Effective configuration per section. Changes marked
        {' '}
        <strong>Save &amp; Restart</strong>
        {' '}
        persist immediately but only take effect after an operator-executed restart.
      </p>
      {tenantSettingsStore.loading && (
        <div className="text-muted">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading settings…
        </div>
      )}
      {tenantSettingsStore.loadError && (
        <Alert variant="danger">
          The settings could not be loaded.
          <Button variant="light" size="sm" className="ms-2" onClick={() => tenantSettingsStore.load()}>
            Retry
          </Button>
        </Alert>
      )}
      {!tenantSettingsStore.loading && !tenantSettingsStore.loadError && (
        <Row>
          <Col xs={4} md={3} xl={2}>
            <Nav variant="pills" className="flex-column tenant-settings-nav">
              {tenantSettingsStore.sectionNames.map((name) => (
                <Nav.Link
                  key={name}
                  active={name === tenantSettingsStore.selectedSection}
                  onClick={() => tenantSettingsStore.selectSection(name)}
                >
                  {name}
                </Nav.Link>
              ))}
            </Nav>
          </Col>
          <Col>
            {section && (
              <TenantSettingsSectionPane
                sectionName={section.name}
                entries={section.entries.slice()}
                restartPendingKeys={tenantSettingsStore.restartPendingKeys.slice()}
                savingKey={tenantSettingsStore.savingKey}
                onEdit={(key, value) => tenantSettingsStore.setEdit(section.name, key, value)}
                onClearEdit={(key) => tenantSettingsStore.clearEdit(section.name, key)}
                onSave={(key, value) => tenantSettingsStore.save(section.name, key, value)}
              />
            )}
          </Col>
        </Row>
      )}
    </div>
  );
};

export default observer(TenantSettings);
