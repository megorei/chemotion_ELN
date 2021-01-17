import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Panel,
  ControlLabel,
  Form,
  FormControl,
  FormGroup,
  Button,
  Row,
  Col
} from 'react-bootstrap';
import ResearchPlansFetcher from './fetchers/ResearchPlansFetcher';

require('@citation-js/plugin-isbn');

export default class ResearchPlansMetadata extends Component {
  constructor(props) {
    super(props);
    this.state = {
      researchPlan: {},
      researchPlanMetadata: {
        title: '',
        subject: '',
        alternate_identifier: '',
        related_identifier: '',
        description: '',
        dates: [],
        geo_location: [],
        funding_reference: []
      }
    };
  }

  handleFieldChange(event) {
    const { researchPlanMetadata } = this.state;

    researchPlanMetadata[event.target.id] = event.target.value;

    this.setState({ researchPlanMetadata });
  }

  componentDidMount() {
    const { parentResearchPlan, parentResearchPlanMetadata } = this.props;
    this.setState({
      researchPlan: parentResearchPlan
    });
    if (parentResearchPlanMetadata) {
      this.setState({
        researchPlanMetadata: parentResearchPlanMetadata
      });
    }
  }

  saveResearchPlanMetadata() {
    const { researchPlan, researchPlanMetadata } = this.state;

    ResearchPlansFetcher.postResearchPlanMetadata({

      research_plan_id: researchPlan.id,
      title: researchPlanMetadata.title.trim(),
      subject: researchPlanMetadata.subject.trim(),
      alternate_identifier: researchPlanMetadata.alternate_identifier.trim(),
      related_identifier: researchPlanMetadata.related_identifier.trim(),
      description: researchPlanMetadata.description.trim(),

      format: this.format.value.trim(),
      version: this.version.value.trim(),
      geo_location: this.state.researchPlanMetadata.geo_location,
      funding_reference: this.state.researchPlanMetadata.funding_reference,

      url: this.url.value.trim(),
      landing_page: this.landing_page.value.trim()

    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else if (result.research_plan_metadata) {
        this.setState({
          researchPlanMetadata: result.research_plan_metadata
        })
      }
    });
  }

  updateResearchPlanMetadataDataCiteState(value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata.data_cite_state = value

      return {
        researchPlanMetadata
      }
    })
  }

  // GeoLocation Actions
  addResearchPlanMetadataGeoLocation() {
    this.setState(state => {
      const newGeoLocationItem = {
        geoLocationPoint: {
          latitude: '',
          longitude: ''
        }
      }
      const researchPlanMetadata = state.researchPlanMetadata
      const currentGeoLocations = researchPlanMetadata.geo_location ? researchPlanMetadata.geo_location : []
      const newGeoLocations = currentGeoLocations.concat(newGeoLocationItem)
      researchPlanMetadata.geo_location = newGeoLocations

      return researchPlanMetadata
    })
  }

  removeResearchPlanMetadataGeoLocation(index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      const currentGeoLocations = researchPlanMetadata.geo_location ? researchPlanMetadata.geo_location : []
      const removedItem = currentGeoLocations.splice(index, 1)

      researchPlanMetadata.geo_location = currentGeoLocations

      return researchPlanMetadata
    })
  }

  updateResearchPlanMetadataGeoLocation(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata.geo_location[index]['geoLocationPoint'][fieldname] = value

      return researchPlanMetadata
    })
  }

  // FundingReference Actions
  addResearchPlanMetadataFundingReference() {
    this.setState(state => {
      const newFundingReferenceItem = {
        funderName: '',
        funderIdentifier: ''
      }
      const researchPlanMetadata = state.researchPlanMetadata
      const currentFundingReferences = researchPlanMetadata.funding_reference ? researchPlanMetadata.funding_reference : []
      const newFundingReferences = currentFundingReferences.concat(newFundingReferenceItem)
      researchPlanMetadata.funding_reference = newFundingReferences

      return researchPlanMetadata
    })
  }

  removeResearchPlanMetadataFundingReference(index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      const currentFundingReferences = researchPlanMetadata.funding_reference ? researchPlanMetadata.funding_reference : []
      const removedItem = currentFundingReferences.splice(index, 1)

      researchPlanMetadata.funding_reference = currentFundingReferences

      return researchPlanMetadata
    })
  }

  updateResearchPlanMetadataFundingReference(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata.funding_reference[index][fieldname] = value

      return researchPlanMetadata
    })
  }

  render() {
    const { researchPlanMetadata } = this.state;
    return (
      <Panel>
        <Panel.Body>
          <Form>
            <FormGroup controlId="title">
              <ControlLabel>Title*</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.title}
                onChange={(event) => this.handleFieldChange(event)}
                placeholder="Title"
              />
            </FormGroup>
            <FormGroup controlId="subject">
              <ControlLabel>Subject</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.subject}
                onChange={(event) => this.handleFieldChange(event)}
                placeholder="Subject"
              />
            </FormGroup>
            <FormGroup controlId="alternate_identifier">
              <ControlLabel>Alternate Identifier</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.alternate_identifier}
                onChange={(event) => this.handleFieldChange(event)}
                inputRef={(m) => { this.alternate_identifier = m; }}
                placeholder="Alternate Identifier"
              />
            </FormGroup>
            <FormGroup controlId="related_identifier">
              <ControlLabel>Related Identifier</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                value={researchPlanMetadata?.related_identifier}
                onChange={(event) => this.handleFieldChange(event)}
                placeholder="Related Identifier"
              />
            </FormGroup>
            <FormGroup controlId="description">
              <ControlLabel>Description</ControlLabel>
              <FormControl
                type="text"
                value={researchPlanMetadata?.description}
                onChange={(event) => this.handleFieldChange('description', event.target.value)}
                placeholder="Description"
              />
            </FormGroup>

            <FormGroup controlId="metadataFormFormat">
              <ControlLabel>Format</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.format}
                inputRef={(m) => { this.format = m; }}
                placeholder="Format"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormVersion">
              <ControlLabel>Version</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.version}
                inputRef={(m) => { this.version = m; }}
                placeholder="Version"
              />
            </FormGroup>
            <ControlLabel style={{ marginTop: 5 }}>Geolocations</ControlLabel><br />
            {researchPlanMetadata?.geo_location && researchPlanMetadata?.geo_location.map((locationItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Longitude</ControlLabel>
                      <FormControl
                        type="text"
                        value={locationItem?.geoLocationPoint?.longitude}
                        placeholder="Longitude e.g. '71.43703438955458'"
                        onChange={(event) => this.updateResearchPlanMetadataGeoLocation(index, 'longitude', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Latitude</ControlLabel>
                      <FormControl
                        type="text"
                        value={locationItem?.geoLocationPoint?.latitude}
                        placeholder="Latitude e.g. '-62.85961569975635'"
                        onChange={(event) => this.updateResearchPlanMetadataGeoLocation(index, 'latitude', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataGeoLocation(index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataGeoLocation()}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <ControlLabel style={{ marginTop: 5 }}>Funding References</ControlLabel>
            {researchPlanMetadata?.funding_reference && researchPlanMetadata?.funding_reference.map((fundingReferenceItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Funder Name</ControlLabel>
                      <FormControl
                        type="text"
                        value={fundingReferenceItem?.funderName}
                        placeholder="Funder Name e.g. 'Gordon and Betty Moore Foundation'"
                        onChange={(event) => this.updateResearchPlanMetadataFundingReference(index, 'funderName', event.target.value)}
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={5}>
                    <FormGroup>
                      <ControlLabel>Funder Identifier</ControlLabel>
                      <FormControl
                        type="text"
                        value={fundingReferenceItem?.funderIdentifier}
                        placeholder="Funder Identifier e.g. 'https://doi.org/10.13039/100000936'"
                        onChange={(event) => this.updateResearchPlanMetadataFundingReference(index, 'funderIdentifier', event.target.value)}
                      />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={2}>
                    <ControlLabel>Action</ControlLabel>
                    <Button bsStyle="danger" className="pull-right" bsSize="small" onClick={() => this.removeResearchPlanMetadataFundingReference(index)}>
                      <i className="fa fa-trash-o" />
                    </Button>
                  </Col>
                </Row>
              </div>
            ))}
            <Row>
              <Col smOffset={0} sm={12}>
                <Button className="pull-right" bsStyle="success" bsSize="small" onClick={() => this.addResearchPlanMetadataFundingReference()}>
                  <i className="fa fa-plus" />
                </Button>
              </Col>
            </Row>

            <FormGroup controlId="metadataFormState">
              <ControlLabel>State*</ControlLabel>
              <FormControl
                componentClass="select"
                value={researchPlanMetadata?.data_cite_state}
                onChange={(event) => this.updateResearchPlanMetadataDataCiteState(event.target.value)}
                inputRef={(m) => { this.dataCiteState = m; }}
              >
                <option value="draft">Draft</option>
                <option value="registered">Registered</option>
                <option value="findable">Findable</option>
              </FormControl>
            </FormGroup>
            <FormGroup controlId="metadataFormURL">
              <ControlLabel>URL*</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.url}
                inputRef={(m) => { this.url = m; }}
                placeholder="https://<device.url>"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormLandingPage">
              <ControlLabel>Landing Page*</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.landing_page}
                inputRef={(m) => { this.landing_page = m; }}
                placeholder="https://<device.landing.page>"
              />
            </FormGroup>

            {/* Disabled Attributes, display only */}
            <FormGroup controlId="metadataFormDOI">
              <ControlLabel>DOI</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.doi}
                placeholder="DOI"
                readOnly
              />
            </FormGroup>
            <FormGroup controlId="metadataFormPublicationYear">
              <ControlLabel>Publication Year</ControlLabel>
              <FormControl
                type="number"
                defaultValue={researchPlanMetadata?.publication_year}
                inputRef={(m) => { this.publication_year = m; }}
                placeholder="Publication Year"
                readOnly
              />
            </FormGroup>
            { researchPlanMetadata?.dates ? <ControlLabel style={{ marginTop: 5 }}>Dates</ControlLabel>: '' }
            {researchPlanMetadata?.dates && researchPlanMetadata?.dates.map((dateItem, index) => (
              <div key={index}>
                <Row>
                  <Col smOffset={0} sm={6}>
                    <FormGroup>
                      <ControlLabel>Date</ControlLabel>
                      <FormControl
                        type="text"
                        defaultValue={dateItem.date}
                        placeholder="Date"
                        readOnly
                        />
                    </FormGroup>
                  </Col>
                  <Col smOffset={0} sm={6}>
                    <FormGroup>
                      <ControlLabel>DateType</ControlLabel>
                      <FormControl
                        type="text"
                        defaultValue={dateItem.dateType}
                        placeholder="DateType"
                        readOnly
                      />
                    </FormGroup>
                  </Col>
                </Row>
              </div>
            ))}

            <FormGroup>
              <Button className="pull-right" bsStyle="success" style={{ marginTop: 20 }} onClick={() => this.saveResearchPlanMetadata()}>
                Save Metadata
              </Button>
            </FormGroup>

          </Form>
        </Panel.Body>
      </Panel>
    );
  }
}

ResearchPlansMetadata.propTypes = {
  parentResearchPlan: PropTypes.object.isRequired,
  parentResearchPlanMetadata: PropTypes.object
};

