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
import uuid from 'uuid';
import ResearchPlansFetcher from './fetchers/ResearchPlansFetcher';
import NotificationActions from './actions/NotificationActions';

require('@citation-js/plugin-isbn');

const notification = message => ({
  title: 'Add Literature',
  message,
  level: 'error',
  dismissible: 'button',
  autoDismiss: 5,
  position: 'tr',
  uid: uuid.v4()
});

const checkElementStatus = (element) => {
  const type = element.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  if (element.isNew) {
    NotificationActions.add(notification(`Create ${type} first.`));
    return false;
  }
  return true;
};

export default class ResearchPlansMetadata extends Component {
  constructor(props) {
    super(props);
    const { researchPlan, researchPlanMetadata } = props;
    this.state = {
      researchPlan,
      researchPlanMetadata: {
        doi: '',
        url: '',
        dates: []
      }
    };
  }

  saveResearchPlanMetadata(researchPlanId) {
    ResearchPlansFetcher.postResearchPlanMetadata({

      research_plan_id: researchPlanId,
      data_cite_state: this.state.researchPlanMetadata.data_cite_state,
      url: this.url.value.trim(),
      landing_page: this.landing_page.value.trim(),
      name: this.name.value.trim(),
      description: this.description.value.trim(),
      publication_year: this.publication_year.value.trim(),
      dates: this.state.researchPlanMetadata.dates

    }).then((result) => {
      if (result.error) {
        alert(result.error);
      } else {
        if (result.research_plan_metadata) {
          this.setState({
            researchPlanMetadata: result.research_plan_metadata
          })
        }
      }
    });
  }

  addResearchPlanMetadataDate() {
    this.setState(state => {
      const newDateItem = {
        date: this.dateDate.value.trim(),
        dateType: this.dateDateType.value.trim()
      }
      const researchPlanMetadata = state.researchPlanMetadata
      const currentDates = researchPlanMetadata.dates ? researchPlanMetadata.dates : []
      const newDates = currentDates.concat(newDateItem)
      researchPlanMetadata.dates = newDates

      this.dateDate.value = ''
      this.dateDateType.value = ''

      return {
        researchPlanMetadata
      }
    })
  }

  removeResearchPlanMetadataDate(index) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      const currentDates = researchPlanMetadata.dates ? researchPlanMetadata.dates : []
      const newDates = currentDates.length > 1 ? currentDates.splice(index, 1) : []
      researchPlanMetadata.dates = newDates

      return {
        researchPlanMetadata
      }
    })
  }

  updateResearchPlanMetadataDate(index, fieldname, value) {
    this.setState(state => {
      const researchPlanMetadata = state.researchPlanMetadata
      researchPlanMetadata.dates[index][fieldname] = value

      return {
        researchPlanMetadata
      }
    })
  }



  render() {
    const { researchPlan, researchPlanMetadata } = this.state;
    return (
      <Panel>
        <Panel.Body>
          <Form>
            {/* {!this.researchPlanMetadataDoiExists() &&
              <p class="text-center">Get Metadata from DataCite</p>
            } */}
            <FormGroup controlId="metadataFormDOI">
              <ControlLabel>DOI*</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.doi}
                inputRef={(m) => { this.doi = m; }}
                placeholder="10.*****/**********"
                // disabled={this.researchPlanMetadataDoiExists()}
              />
            </FormGroup>
            <FormGroup controlId="metadataFormState">
              <ControlLabel>State*</ControlLabel>
              <FormControl
                componentClass="select"
                value={researchPlanMetadata?.data_cite_state}
                onChange={(event) => this.updateresearchPlanMetadataDataCiteState(event.target.value)}
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
            <FormGroup controlId="metadataFormName">
              <ControlLabel>Name*</ControlLabel>&nbsp;&nbsp;
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.name}
                inputRef={(m) => { this.name = m; }}
                placeholder="Name"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormPublicationYear">
              <ControlLabel>Publication Year*</ControlLabel>
              <FormControl
                type="number"
                defaultValue={researchPlanMetadata?.publication_year}
                inputRef={(m) => { this.publication_year = m; }}
                placeholder="Publication Year e.g. '2020'"
              />
            </FormGroup>
            <FormGroup controlId="metadataFormDescription">
              <ControlLabel>Description</ControlLabel>
              <FormControl
                type="text"
                defaultValue={researchPlanMetadata?.description}
                inputRef={(m) => { this.description = m; }}
                placeholder="Description"
              />
            </FormGroup>

            {researchPlanMetadata?.dates && researchPlanMetadata?.dates.map((dateItem, index) => (
              <div key={index}>
                <Col smOffset={0} sm={5}>
                  <FormGroup>
                    <ControlLabel>Date</ControlLabel>
                    <FormControl
                      type="text"
                      defaultValue={dateItem.date}
                      placeholder="Date e.g. '2020-01-01'"
                      onChange={(event) => this.updateResearchPlanMetadataDate(index, 'date', event.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col smOffset={0} sm={5}>
                  <FormGroup>
                    <ControlLabel>DateType</ControlLabel>
                    <FormControl
                      type="text"
                      defaultValue={dateItem.dateType}
                      placeholder="DateType e.g. 'Created'"
                      onChange={(event) => this.updateResearchPlanMetadataDate(index, 'dateType', event.target.value)}
                    />
                  </FormGroup>
                </Col>
                <Col smOffset={0} sm={2}>
                  <ControlLabel>Action</ControlLabel>
                  <Button bsStyle="danger" onClick={() => this.removeResearchPlanMetadataDate(index)}>
                    X
                  </Button>
                </Col>
              </div>
            ))}

            <Row>
              <Col smOffset={0} sm={6}>
                <FormGroup>
                  <ControlLabel>Date</ControlLabel>
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.dateDate = m; }}
                    placeholder="Date e.g. '2020-01-01'"
                  />
                </FormGroup>
              </Col>
              <Col smOffset={0} sm={6}>
                <FormGroup>
                  <ControlLabel>DateType</ControlLabel>
                  <FormControl
                    type="text"
                    inputRef={(m) => { this.dateDateType = m; }}
                    placeholder="DateType e.g. 'Created'"
                  />
                </FormGroup>
              </Col>
            </Row>
            <Row>
              <Col smOffset={0} sm={12}>
                <Button bsStyle="success" onClick={() => this.addResearchPlanMetadataDate()}>
                  Add date
                </Button>
              </Col>
            </Row>
          </Form>
        </Panel.Body>
        <Panel.Footer>
          <Col smOffset={0} sm={6} />
          <Col smOffset={0} sm={6}>
            <Button className="pull-right" bsStyle="success" onClick={() => this.saveResearchPlanMetadata(researchPlan.id)}>
              Save Metadata
            </Button>
          </Col>
        </Panel.Footer>
      </Panel>
    );
  }
}

ResearchPlansMetadata.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  researchPlanMetadata: PropTypes.object
};

