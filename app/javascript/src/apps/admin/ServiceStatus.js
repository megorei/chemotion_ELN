import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Table } from 'react-bootstrap';
import ServiceStatusFetcher from 'src/fetchers/ServiceStatusFetcher';

const OK_BADGE = {
  true: { bg: 'success', label: 'ok' },
  false: { bg: 'danger', label: 'MISMATCH' },
  unknown: { bg: 'secondary', label: 'unknown' },
};

// P0 WP 04: shared-service version/contract status — a mismatch is an
// admin-visible config error, mirroring the restart-pending banner idiom.
const ServiceStatus = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ServiceStatusFetcher.fetchStatus()
      .then((result) => setServices(result.services || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const mismatches = services.filter((service) => service.ok === false);

  return (
    <div className="p-3">
      <h4>Shared Service Status</h4>
      {mismatches.length > 0 && (
        <Alert variant="danger" data-testid="mismatch-banner">
          <strong>Configuration error:</strong>
          {' '}
          {mismatches.map((s) => s.service).join(', ')}
          {' '}
          — version/contract mismatch or unreachable. The app degrades
          controlled; fix the service endpoint or the pinned version in
          Tenant Settings.
        </Alert>
      )}
      <Table size="sm" striped data-testid="service-status-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Configured</th>
            <th>Reachable</th>
            <th>Version</th>
            <th>Expected</th>
            <th>Status</th>
            <th>Detail</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => {
            const badge = OK_BADGE[String(service.ok)] || OK_BADGE.unknown;
            return (
              <tr key={service.service}>
                <td><code>{service.service}</code></td>
                <td>{service.configured ? 'yes' : 'no'}</td>
                <td>{service.reachable === null || service.reachable === undefined ? '—' : String(service.reachable)}</td>
                <td>{service.version || '—'}</td>
                <td>{service.expected || '—'}</td>
                <td><Badge bg={badge.bg}>{badge.label}</Badge></td>
                <td className="small">{service.error || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <Button size="sm" variant="outline-secondary" onClick={load} disabled={loading}>
        <i className="fa fa-refresh me-1" />
        Re-check
      </Button>
    </div>
  );
};

export default ServiceStatus;
