// imports from node_modules
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

// imports from other namespaces
import FormattedUnits from '/app/packs/shared_components/FormattedUnits';

// imports from own namespace
import { genUnit } from '/app/packs/utilities/utilities';

const UConverterRenderer = (props) => {
  const { sField, onChange, node } = props;
  if (sField.type !== 'system-defined') return null;
  const { data } = node;
  return (
    <Button key={`ucr_${data.id}`} active onClick={() => onChange(sField, node)} bsStyle="success">
      {FormattedUnits(genUnit(sField.option_layers, data[sField.id].value_system).label) || ''}
    </Button>
  );
};

UConverterRenderer.propTypes = {
  sField: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  node: PropTypes.object.isRequired
};

export default UConverterRenderer;
