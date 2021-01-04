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
import Immutable from 'immutable';
import moment from 'moment';
import Cite from 'citation-js';
import {
  doiValid,
  sanitizeDoi
} from './LiteratureCommon';
import Sample from './models/Sample';
import Reaction from './models/Reaction';
import ResearchPlan from './models/ResearchPlan';
import NotificationActions from './actions/NotificationActions';
import LoadingActions from './actions/LoadingActions';

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
      researchPlanMetadata
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.fetchDOIMetadata = this.fetchDOIMetadata.bind(this);
    this.fetchMetadata = this.fetchMetadata.bind(this);
  }

  // componentDidMount() {
  //   if (this.props.researchPlan && this.props.researchPlan.size > 0) {
  //     this.setState(prevState => ({
  //     //   ...prevState,
  //       researchPlan: this.props.researchPlan,
  //       researchPlanMetadata: this.props.researchPlan.research_plan_metadata
  //     }));
  //   }
  // }

  handleInputChange(type, event) {
    const { literature } = this.state;
    const { value } = event.target;
    literature[type] = value.trim();
    // this.setState(prevState => ({ ...prevState, literature }));
  }

  fetchMetadata() {
    const { element } = this.props;
    if (!checkElementStatus(element)) {
      return;
    }
    const { doi_isbn } = this.state.literature;
    if (doiValid(doi_isbn)) {
      this.fetchDOIMetadata(doi_isbn);
    } else {
      this.fetchISBNMetadata(doi_isbn);
    }
  }

  fetchDOIMetadata(doi) {
    NotificationActions.removeByUid('literature');
    LoadingActions.start();
    Cite.inputAsync(sanitizeDoi(doi)).then((json) => {
      LoadingActions.stop();
      if (json[0]) {
        const citation = new Cite(json[0]);
        const { title, year } = json[0];
        // this.setState(prevState => ({
        //   ...prevState,
        //   literature: {
        //     ...prevState.literature,
        //     doi,
        //     title,
        //     year,
        //     refs: {
        //       citation,
        //       bibtex: citation.format('bibtex')
        //     }
        //   }
        // }));
        this.handleLiteratureAdd(this.state.literature);
      }
    }).catch((errorMessage) => {
      LoadingActions.stop();
      NotificationActions.add(notification(`unable to fetch metadata for this doi: ${doi}`));
    });
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
      </Panel>
    );
  }
}

ResearchPlansMetadata.propTypes = {
  researchPlan: PropTypes.object.isRequired,
  researchPlanMetadata: PropTypes.object.isRequired
};

