import React, { Component } from 'react';
import PropTypes from 'prop-types';
import uuid from 'uuid';
import {
  Button, ButtonGroup, Tooltip, OverlayTrigger
} from 'react-bootstrap';

const buttonObjects = [
  { label: 'Add Text Editor', type: 'richtext', icon: 'fa fa-file-text-o' },
  { label: 'Add Table Editor', type: 'table', icon: 'fa fa-table' },
  { label: 'Add Ketcher Editor', type: 'ketcher', icon: 'fa fa-pencil-square-o' },
  { label: 'Add Image', type: 'image', icon: 'fa fa-picture-o' },
  { label: 'Add Sample', type: 'sample', icon: 'icon-sample' },
  { label: 'Add Reaction', type: 'reaction', icon: 'icon-reaction' },
];

// eslint-disable-next-line react/prefer-stateless-function
export default class ResearchPlanDetailsAddField extends Component {
  render() {
    const { onAdd } = this.props;
    return (
      <ButtonGroup size="sm">
        {
          buttonObjects.map((button) => (
            <OverlayTrigger
              key={uuid.v4()}
              placement="top"
              overlay={(
                <Tooltip id={`rp_tooptip_${button.type}`}>
                  {button.label}
                </Tooltip>
              )}
            >
              <Button onClick={() => onAdd(button.type)} variant="light" data-cy={`btn_${button.type}`}>
                <i className={button.icon} aria-hidden="true" />
                <i className="fa fa-plus ms-1" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
          ))
        }
      </ButtonGroup>
    );
  }
}

ResearchPlanDetailsAddField.propTypes = {
  onAdd: PropTypes.func.isRequired,
};
