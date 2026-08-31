import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge, Button, Form, Table
} from 'react-bootstrap';
import AuditEventsFetcher from 'src/fetchers/AuditEventsFetcher';

const PER_PAGE = 50;

const ACTOR_BADGE = {
  guest: 'info',
  system: 'secondary',
  user: 'light',
};

// P1 WP 05 / P0 WP 09 stage 1: read-only audit trail with the guest filter.
const AuditEvents = () => {
  const [events, setEvents] = useState([]);
  const [actions, setActions] = useState([]);
  const [eventAction, setEventAction] = useState('');
  const [actorType, setActorType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback((nextPage = 1) => {
    setLoading(true);
    AuditEventsFetcher.fetchEvents({
      event_action: eventAction, actor_type: actorType, page: nextPage, per_page: PER_PAGE,
    }).then((result) => {
      setEvents(result.audit_events || []);
      setPage(nextPage);
    }).finally(() => setLoading(false));
  }, [eventAction, actorType]);

  useEffect(() => {
    AuditEventsFetcher.fetchActions().then((result) => setActions(result.actions || []));
  }, []);

  useEffect(() => { load(1); }, [load]);

  const metaSummary = (metadata) => Object.entries(metadata || {})
    .filter(([key]) => !['tenant', 'guest'].includes(key))
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(' · ');

  return (
    <div className="p-3">
      <h4>Audit Events</h4>
      <div className="d-flex gap-2 mb-3 align-items-end">
        <Form.Group>
          <Form.Label>Action</Form.Label>
          <Form.Select value={eventAction} onChange={(e) => setEventAction(e.target.value)}>
            <option value="">all</option>
            {actions.map((name) => <option key={name} value={name}>{name}</option>)}
          </Form.Select>
        </Form.Group>
        <Form.Group>
          <Form.Label>Actor</Form.Label>
          <Form.Select
            value={actorType}
            onChange={(e) => setActorType(e.target.value)}
            data-testid="actor-type-filter"
          >
            <option value="">all</option>
            <option value="guest">guest activity</option>
            <option value="user">user</option>
            <option value="system">system</option>
          </Form.Select>
        </Form.Group>
        <Button variant="outline-secondary" size="sm" onClick={() => load(page)} disabled={loading}>
          <i className="fa fa-refresh" />
        </Button>
      </div>

      <Table size="sm" striped hover responsive data-testid="audit-events-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Actor</th>
            <th>Subject</th>
            <th>Details</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td className="text-nowrap">{new Date(event.created_at).toLocaleString()}</td>
              <td><code>{event.action}</code></td>
              <td>
                <Badge bg={ACTOR_BADGE[event.actor_type] || 'light'} text="dark">
                  {event.actor_name || event.actor_type}
                </Badge>
              </td>
              <td>{event.subject_type ? `${event.subject_type} #${event.subject_id}` : ''}</td>
              <td className="small">{metaSummary(event.metadata)}</td>
              <td className="small">{event.ip}</td>
            </tr>
          ))}
          {events.length === 0 && !loading && (
            <tr><td colSpan={6} className="text-muted">No events for this filter.</td></tr>
          )}
        </tbody>
      </Table>

      <div className="d-flex gap-2">
        <Button size="sm" variant="outline-secondary" disabled={page <= 1 || loading} onClick={() => load(page - 1)}>
          ‹ newer
        </Button>
        <span className="align-self-center small">page {page}</span>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={events.length < PER_PAGE || loading}
          onClick={() => load(page + 1)}
        >
          older ›
        </Button>
      </div>
    </div>
  );
};

export default AuditEvents;
