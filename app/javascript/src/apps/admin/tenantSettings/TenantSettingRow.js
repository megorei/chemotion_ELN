import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Button, Form, InputGroup
} from 'react-bootstrap';

import { SECRET_PLACEHOLDER } from 'src/stores/mobx/TenantSettingsStore';

// Presentational row for one effective tenant setting (no store access — the page wires the
// callbacks to TenantSettingsStore). Four notable states: editable, read-only (Absolute-ENV,
// REQ-ELN-8), secret (write-only round trip) and restart-required (reload class, ADR-007).

// Badge per provenance tier of the AppConfig resolver (see AppConfig#resolution_layers).
const SOURCE_BADGES = {
  db: { bg: 'primary', label: 'db' },
  'env-absolute': { bg: 'dark', label: 'env-absolute' },
  yml: { bg: 'secondary', label: 'yml' },
  'env-default': { bg: 'info', label: 'env-default' },
  template: { bg: 'light', text: 'dark', label: 'template' },
  static: { bg: 'light', text: 'dark', label: 'static' },
  nil: { bg: 'light', text: 'dark', label: 'unset' },
};

// Editor kind from the resolved value's JSON type; secrets always get the password editor.
const valueKind = (entry) => {
  if (entry.secret) return 'secret';
  if (typeof entry.value === 'boolean') return 'boolean';
  if (typeof entry.value === 'number') return 'number';
  if (entry.value !== null && entry.value !== undefined && typeof entry.value === 'object') return 'json';
  return 'text';
};

// The draft the editor starts from (and returns to on reset / after save).
const initialDraft = (kind, value) => {
  switch (kind) {
    case 'secret': return SECRET_PLACEHOLDER;
    case 'boolean': return value;
    case 'number': return String(value);
    case 'json': return JSON.stringify(value, null, 2);
    default: return value == null ? '' : String(value);
  }
};

// Draft string -> value to submit. Returns { value } or { error } for an unparsable draft.
const parseDraft = (kind, draft) => {
  switch (kind) {
    case 'boolean': return { value: draft };
    case 'number': {
      const parsed = Number(draft);
      return Number.isNaN(parsed) ? { error: 'not a number' } : { value: parsed };
    }
    case 'json': {
      try {
        return { value: JSON.parse(draft) };
      } catch (error) {
        return { error: `invalid JSON: ${error.message}` };
      }
    }
    default: return { value: draft };
  }
};

const TenantSettingRow = ({
  entry, saving, onEdit, onClearEdit, onSave
}) => {
  const kind = valueKind(entry);
  const pristine = initialDraft(kind, entry.value);
  const [draft, setDraft] = useState(pristine);
  const [parseError, setParseError] = useState(null);

  const readOnly = entry.read_only;
  const dirty = !readOnly && draft !== pristine;

  const updateDraft = (next) => {
    setDraft(next);
    setParseError(null);
    if (next === pristine) {
      onClearEdit(entry.key);
    } else {
      // a typed secret never leaves the row through the dirty tracking — only the marker does
      onEdit(entry.key, kind === 'secret' ? SECRET_PLACEHOLDER : next);
    }
  };

  const reset = () => {
    setDraft(pristine);
    setParseError(null);
    onClearEdit(entry.key);
  };

  const handleSave = async () => {
    const { value, error } = parseDraft(kind, draft);
    if (error) {
      setParseError(error);
      return;
    }
    const saved = await onSave(entry.key, value);
    if (saved) {
      // never echo a typed secret after save; non-secret drafts re-seed from the saved value
      setDraft(kind === 'secret' ? SECRET_PLACEHOLDER : initialDraft(kind, value));
      setParseError(null);
    }
  };

  const editor = () => {
    if (kind === 'boolean') {
      return (
        <Form.Check
          type="switch"
          id={`tenant-setting-${entry.key}`}
          checked={draft === true}
          disabled={readOnly || saving}
          onChange={(event) => updateDraft(event.target.checked)}
        />
      );
    }
    if (kind === 'json') {
      return (
        <>
          <Form.Control
            as="textarea"
            rows={4}
            size="sm"
            className="font-monospace"
            value={draft}
            disabled={readOnly || saving}
            isInvalid={Boolean(parseError)}
            onChange={(event) => updateDraft(event.target.value)}
          />
          <Form.Control.Feedback type="invalid">{parseError}</Form.Control.Feedback>
        </>
      );
    }
    return (
      <>
        <Form.Control
          size="sm"
          type={kind === 'secret' ? 'password' : kind === 'number' ? 'number' : 'text'}
          autoComplete={kind === 'secret' ? 'new-password' : undefined}
          value={draft}
          disabled={readOnly || saving}
          isInvalid={Boolean(parseError)}
          onChange={(event) => updateDraft(event.target.value)}
        />
        <Form.Control.Feedback type="invalid">{parseError}</Form.Control.Feedback>
      </>
    );
  };

  const sourceBadge = SOURCE_BADGES[entry.source] || { bg: 'light', text: 'dark', label: entry.source };

  return (
    <tr className={`tenant-setting-row${readOnly ? ' tenant-setting-row--read-only' : ''}`}>
      <td className="align-middle">
        <code>{entry.key}</code>
        {readOnly && (
          <div className="text-muted small tenant-setting-row__operator-hint">
            <i className="fa fa-lock me-1" aria-hidden="true" />
            Set by operator (absolute ENV) — read-only
          </div>
        )}
      </td>
      <td className="align-middle w-50">
        <InputGroup hasValidation size="sm">{editor()}</InputGroup>
      </td>
      <td className="align-middle">
        <Badge bg={sourceBadge.bg} text={sourceBadge.text}>{sourceBadge.label}</Badge>
      </td>
      <td className="align-middle">
        {entry.restart_required
          ? <Badge bg="warning" text="dark">Save &amp; Restart</Badge>
          : <Badge bg="success">request-time</Badge>}
      </td>
      <td className="align-middle text-nowrap">
        {dirty && (
          <>
            <Button variant="primary" size="xsm" disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button variant="ghost" size="xsm" className="ms-1" disabled={saving} onClick={reset}>
              Reset
            </Button>
          </>
        )}
      </td>
    </tr>
  );
};

TenantSettingRow.propTypes = {
  entry: PropTypes.shape({
    key: PropTypes.string.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    value: PropTypes.any,
    source: PropTypes.string.isRequired,
    read_only: PropTypes.bool,
    secret: PropTypes.bool,
    restart_required: PropTypes.bool,
  }).isRequired,
  saving: PropTypes.bool,
  onEdit: PropTypes.func,
  onClearEdit: PropTypes.func,
  onSave: PropTypes.func,
};

TenantSettingRow.defaultProps = {
  saving: false,
  onEdit: () => {},
  onClearEdit: () => {},
  onSave: () => Promise.resolve(false),
};

export default TenantSettingRow;
