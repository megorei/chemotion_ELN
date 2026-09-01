import React from 'react';
import PropTypes from 'prop-types';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';

// P2 WP 01 (REQ-ELN-22, 21c): origin/copy provenance badges in the element
// detail header. Inert metadata — "Kopie aus kit …" on a copy, "kopiert
// nach aachen am …" on a source. No live links, tooltip shows the full ref.
const directionLabel = (provenance) => {
  const when = provenance.created_at
    ? new Date(provenance.created_at).toLocaleDateString()
    : '';
  if (provenance.direction === 'origin') {
    return `Copy from ${provenance.tenant || provenance.instance || 'remote'}${when ? ` (${when})` : ''}`;
  }
  return `Copied to ${provenance.tenant || provenance.instance || 'remote'}${when ? ` on ${when}` : ''}`;
};

const ProvenanceLabels = ({ element }) => {
  const provenances = element?.provenances || [];
  if (provenances.length === 0) { return null; }

  return (
    <>
      {provenances.map((provenance) => (
        <OverlayTrigger
          key={`provenance-${provenance.id}`}
          placement="top"
          overlay={(
            <Tooltip id={`provenance-tip-${provenance.id}`}>
              {provenance.remote_ref}
            </Tooltip>
          )}
        >
          <Badge
            bg={provenance.direction === 'origin' ? 'info' : 'light'}
            text="dark"
            className="ms-1"
            data-testid={`provenance-${provenance.direction}`}
          >
            <i className={`fa ${provenance.direction === 'origin' ? 'fa-download' : 'fa-upload'} me-1`} />
            {directionLabel(provenance)}
          </Badge>
        </OverlayTrigger>
      ))}
    </>
  );
};

ProvenanceLabels.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
};

export default ProvenanceLabels;
