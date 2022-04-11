import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Panel, Button, ButtonGroup, Tooltip, Overlay, OverlayTrigger, Table, Glyphicon } from 'react-bootstrap';
import Aviator from 'aviator';
import UIStore from './stores/UIStore';
import { wellplateShowOrNew } from './routesUtils';
import ElementCollectionLabels from './ElementCollectionLabels';
import WellplatesFetcher from './fetchers/WellplatesFetcher';
import Wellplate from './models/Wellplate';

export default class EmbeddedWellplate extends Component {
  constructor(props) {
    super(props);
    this.cellStyle = { padding: 0 };

    this.state = {
      expanded: false,
      confirmRemove: false,
      showImportConfirm: false,
    };
  }

  openWellplate() {
    const { currentCollection, isSync } = UIStore.getState();
    const wellplateID = this.props.wellplate.id;
    const uri = `/${isSync ? 's' : ''}collection/${currentCollection.id}/wellplate/${wellplateID}`;
    Aviator.navigate(uri, { silent: true });
    wellplateShowOrNew({ params: { wellplateID } });
  }

  showImportConfirm() {
    this.setState({ showImportConfirm: true });
  }

  hideImportConfirm() {
    this.setState({ showImportConfirm: false });
  }

  confirmWellplateImport() {
    const { importWellplate } = this.props;

    importWellplate(this.props.wellplate.id);
    this.hideImportConfirm();
  }

  // render functions
  renderReadoutHeaders() {
    const readoutTitles = this.props.wellplate.readout_titles;
    return (
      readoutTitles && readoutTitles.map((title) => {
        const key = title.id;
        return ([
          <th style={this.cellStyle} key={`v_${key}`} width="15%">{title} Value</th>,
          <th style={this.cellStyle} key={`u_${key}`} width="10%">{title} Unit</th>
        ]);
      })
    );
  }

  renderImportWellplateButton() {
    const show = this.state.showImportConfirm;

    const importTooltip = <Tooltip id="import_tooltip">Import Wellplate data to ResearchPlan table</Tooltip>;

    const confirmTooltip = (
      <Tooltip placement="bottom" className="in" id="tooltip-bottom">
        Import data from Wellplate? This will create a table.<br />
        <ButtonGroup>
          <Button bsStyle="success" bsSize="xsmall" onClick={() => this.confirmWellplateImport()}>
            Yes
          </Button>
          <Button bsStyle="warning" bsSize="xsmall" onClick={() => this.hideImportConfirm()}>
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return ([
      <OverlayTrigger key="overlay_trigger_import_button" placement="bottom" overlay={importTooltip} >
        <Button
          bsSize="xsmall"
          bsStyle="success"
          className="button-right"
          ref={(button) => { this.target = button; }}
          onClick={() => this.showImportConfirm()}
        >
          <Glyphicon glyph="import" />
        </Button>
      </OverlayTrigger>,
      <Overlay
        key="overlay_import_button"
        show={show}
        placement="bottom"
        rootClose
        onHide={() => this.hideImportConfirm()}
        target={this.target}
      >
        { confirmTooltip }
      </Overlay>
    ]);
  }

  // eslint-disable-next-line class-methods-use-this
  renderReadoutFields(well) {
    const { readouts } = well;

    return (
      readouts && readouts.map((readout) => {
        const key = readout.id;
        return ([
          <td key={`v_${key}`} style={this.cellStyle}>
            {readout.value || ''}
          </td>,
          <td key={`u_${key}`} style={this.cellStyle}>
            {readout.unit || ''}
          </td>,
        ]);
      })
    );
  }

  // eslint-disable-next-line class-methods-use-this
  renderWellplateMain(wellplate) {
    const { wells } = wellplate;

    // Wellplates that were just dragged in do not have samples assigned.
    // Saving the research plan and reloading it reloads the wellplates and fetches the samples as well
    if (wells.every(well => well.is_new)) {
      return (<p>Please save the newly assigned wellplate to the research plan first</p>);
    }

    const wells_with_samples = wells.filter((well) => {
      return well.sample !== null; // comparison with undefined does not work here as the key is present but the value might be null
    });

    return (
      <Table striped bordered hover responsive style={{ fontSize: 12 }}>
        <thead>
          <tr>
            <th style={this.cellStyle} width="5%">Position</th>
            <th style={this.cellStyle} width="10%">Sample</th>
            {this.renderReadoutHeaders()}
          </tr>
        </thead>
        <tbody>
          {wells_with_samples && wells_with_samples.map((well) => {
            const { sample, position } = well;
            const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            const positionY = alphabet[position.y - 1];
            const positions = positionY + position.x;
            return (
              <tr key={well.id}>
                <td style={this.cellStyle}>{positions}</td>
                <td style={this.cellStyle}>{sample.short_label} {sample.name}</td>
                {this.renderReadoutFields(well)}
              </tr>
            );
          })}
        </tbody>
      </Table>
    );
  }

  renderPanelHeading(wellplate) {
    const { deleteWellplate } = this.props;
    const titleTooltip = `Created at: ${wellplate.created_at} \n Updated at: ${wellplate.updated_at}`;
    const expandIconClass = this.state.expanded ? 'fa fa-compress' : 'fa fa-expand';

    const popover = (
      <Tooltip placement="left" className="in" id="tooltip-bottom">
        Remove {wellplate.name} from ResearchPlan?<br />
        <ButtonGroup>
          <Button bsStyle="danger" bsSize="xsmall" onClick={() => deleteWellplate(wellplate.id)}>
            Yes
          </Button>
          <Button bsStyle="warning" bsSize="xsmall" onClick={() => this.setState({ confirmRemove: false })}>
            No
          </Button>
        </ButtonGroup>
      </Tooltip>
    );

    return (
      <Panel.Heading>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="WellplateDatesx">{titleTooltip}</Tooltip>}>
          <span>
            <i className="icon-wellplate" />
            &nbsp; <span>{wellplate.name}</span> &nbsp;
          </span>
        </OverlayTrigger>
        <ElementCollectionLabels element={wellplate} placement="right" />
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="remove_wellplate">Remove Wellplate from Screen</Tooltip>}>
          <Button ref={(button) => { this.target = button; }} bsStyle="danger" bsSize="xsmall" className="button-right" onClick={() => this.setState({ confirmRemove: !this.state.confirmRemove })}>
            <i className="fa fa-trash-o" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <Overlay
          rootClose
          target={this.target}
          show={this.state.confirmRemove}
          placement="bottom"
          onHide={() => this.setState({ confirmRemove: false })}
        >
          { popover }
        </Overlay>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="open_wellplate">Open Wellplate in Tab</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.openWellplate()}>
            <i className="fa fa-window-maximize" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        <OverlayTrigger placement="bottom" overlay={<Tooltip id="expand_wellplate">Show/hide Wellplate details</Tooltip>}>
          <Button bsStyle="info" bsSize="xsmall" className="button-right" onClick={() => this.setState({ expanded: !this.state.expanded })}>
            <i className={expandIconClass} aria-hidden="true" />
          </Button>
        </OverlayTrigger>
        {this.renderImportWellplateButton()}
      </Panel.Heading>
    );
  }

  render() {
    const { wellplate } = this.props;

    return (
      <Panel expanded={this.state.expanded} onToggle={() => {}} bsStyle="primary" className="eln-panel-detail wellplate-details">
        {this.renderPanelHeading(wellplate)}
        <Panel.Collapse>
          <Panel.Body>
            {this.renderWellplateMain(wellplate)}
          </Panel.Body>
        </Panel.Collapse>
      </Panel>
    );
  }
}

EmbeddedWellplate.propTypes = {
  wellplate: PropTypes.instanceOf(Wellplate).isRequired,
  importWellplate: PropTypes.func.isRequired,
  deleteWellplate: PropTypes.func.isRequired,
};