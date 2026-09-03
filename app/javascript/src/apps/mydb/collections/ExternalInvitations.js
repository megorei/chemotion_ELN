import React, { useEffect, useContext, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Badge,
  Button,
  Col,
  Form,
  Row,
} from 'react-bootstrap';
import { observer } from 'mobx-react';

import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { StoreContext } from 'src/stores/mobx/RootStore';

// External guests never reach manage_shares (4) — hard server ceiling; the
// effective maximum may be lower still (TENANT_GUEST_MAX_PERMISSION_LEVEL,
// default read-only). The server answers 403 above the cap; the store maps
// that onto the error toast.
const GUEST_PERMISSION_OPTIONS = Object.entries(PermissionConst)
  .filter(([, level]) => level < PermissionConst.ManageShares)
  .sort(([, a], [, b]) => a - b);

const identityLabel = (invitation) => invitation.federated_id || invitation.email;

const stateVariant = { pending: 'secondary', active: 'success' };

// REQ-ELN-17: the "External guests" section of the manage-shares modal — lists
// a collection's invitations/grants and creates new ones. An unknown identity
// becomes a pending grant (converts on first federated login); a known guest
// is shared with immediately.
const ExternalInvitations = ({ collectionId }) => {
  const collectionsStore = useContext(StoreContext).collections;
  const entry = collectionsStore.invitationsFor(collectionId);
  const invitations = (entry ? entry.invitations : [])
    .filter((invitation) => invitation.state !== 'revoked');

  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState(PermissionConst.ReadElements);
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (entry === undefined) {
      collectionsStore.getInvitations(collectionId);
    }
  }, [collectionId]);

  const submit = async () => {
    const params = { collection_id: collectionId, permission_level: permissionLevel };
    if (identifier.trim() !== '') params.identifier = identifier.trim();
    if (email.trim() !== '') params.email = email.trim();
    if (expiresAt !== '') params.expires_at = expiresAt;

    const saved = await collectionsStore.addInvitation(params);
    if (saved) {
      setIdentifier('');
      setEmail('');
      setPermissionLevel(PermissionConst.ReadElements);
      setExpiresAt('');
    }
  };

  return (
    <div className="mt-4">
      <h6>External guests</h6>
      <div className="d-flex flex-column gap-2 mb-3">
        {invitations.length === 0 && (
          <span className="text-muted small">No external guests invited to this collection.</span>
        )}
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="d-flex gap-3 justify-content-between align-items-center"
          >
            <span className="d-flex gap-2 align-items-baseline">
              <i className="fa fa-globe" title="external guest" />
              {identityLabel(invitation)}
              <Badge bg={stateVariant[invitation.state] || 'secondary'}>{invitation.state}</Badge>
              <PermissionIcons pl={invitation.permission_level} />
              {invitation.expires_at && (
                <span className="text-muted small">
                  expires
                  {' '}
                  {invitation.expires_at.slice(0, 10)}
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant="danger"
              onClick={() => collectionsStore.revokeInvitation(invitation.id, collectionId)}
            >
              <i className="fa fa-trash-o me-1" />
              revoke
            </Button>
          </div>
        ))}
      </div>

      <Form>
        <Row className="g-2 align-items-end">
          <Col md={4}>
            <Form.Label className="small mb-1">Federated identifier</Form.Label>
            <Form.Control
              size="sm"
              type="text"
              placeholder="issuer#id (eppn / ORCID)"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Label className="small mb-1">Email</Form.Label>
            <Form.Control
              size="sm"
              type="email"
              placeholder="guest@remote.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Col>
          <Col md={2}>
            <Form.Label className="small mb-1">Permission</Form.Label>
            <Form.Select
              size="sm"
              value={permissionLevel}
              onChange={(event) => setPermissionLevel(Number(event.target.value))}
            >
              {GUEST_PERMISSION_OPTIONS.map(([name, level]) => (
                <option key={level} value={level}>{name}</option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label className="small mb-1">Expires</Form.Label>
            <Form.Control
              size="sm"
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Col>
          <Col md={1}>
            <Button
              size="sm"
              variant="primary"
              disabled={identifier.trim() === '' && email.trim() === ''}
              onClick={submit}
            >
              Invite
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

ExternalInvitations.propTypes = {
  collectionId: PropTypes.number.isRequired,
};

export default observer(ExternalInvitations);
