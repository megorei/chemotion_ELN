import React, { useContext } from 'react';
import { Form, Row, Col, Accordion, Button, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import ReferenceForm from './ReferenceForm';
import SearchResults from './SearchResults';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PropertiesForm = ({ readonly }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  const sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);

  const sbmmType = [{ label: 'Protein', value: 'protein' }];
  const sbmmSubType = [
    { label: 'Unmodified', value: 'unmodified' },
    { label: 'Glycoprotein', value: 'glycoprotein' },
  ];
  const uniprotDerivation = [
    { label: 'Does not exist', value: 'uniprot_unknown' },
    { label: 'Protein used as described in Uniprot / reference', value: 'uniprot' },
    { label: 'Used modified protein', value: 'uniprot_modified' },
  ];
  const sbmmSearchBy = [
    { label: 'UniProt ID', value: 'uniprot_id' },
    { label: 'Name', value: 'uniprot_name' },
    { label: 'EC-Number', value: 'uniprot_ec_number' },
  ];
  const sampleFunctionOrApplication = [
    { label: 'Enzyme', value: 'enzyme' },
    { label: 'Hormone', value: 'hormone' },
    { label: 'Structural', value: 'structural' },
    { label: 'Component', value: 'component' },
    { label: 'Energy source', value: 'energy_source' },
  ];

  const visibleForUniprotOrModification = sequenceBasedMacromolecule.sbmm_type === 'protein'
    && !['', undefined, 'uniprot_unknown'].includes(sequenceBasedMacromolecule.uniprot_derivation);

  const visibleForUnkownOrModification = sequenceBasedMacromolecule.sbmm_type === 'protein'
    && !['', undefined, 'uniprot'].includes(sequenceBasedMacromolecule.uniprot_derivation);

  const showIfReferenceSelected = sequenceBasedMacromolecule.sbmm_type === 'protein'
    && (sequenceBasedMacromolecule.uniprot_number || sequenceBasedMacromolecule.other_reference_id
      || sequenceBasedMacromolecule.uniprot_derivation === 'uniprot_unknown');

  const showIfEnzymeIsSelected = sequenceBasedMacromolecule.sample?.function_or_application === 'enzyme';

  const searchable = ['uniprot', 'uniprot_modified'].includes(sequenceBasedMacromolecule.uniprot_derivation)
    && sequenceBasedMacromolecule.sbmm_search_by && sequenceBasedMacromolecule.sbmm_search_input;

  const searchSequenceBasedMolecules = () => {
    if (searchable) {
      // todo: search at uniprot and local db
      sequenceBasedMacromoleculeStore.openSearchResult();
    }
  }

  //console.log(sequenceBasedMacromolecule);

  return (
    <Form>
      <Row className="mb-4">
        <Col>
          {formHelper.textInput('name', 'Name', '')}
        </Col>
      </Row>

      <Accordion
        className="mb-4"
        activeKey={sequenceBasedMacromoleculeStore.toggable_contents.general && 'general'}
        onSelect={() => sequenceBasedMacromoleculeStore.toggleContent('general')}
      >
        <Accordion.Item eventKey="general">
          <Accordion.Header>
            General description
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4 align-items-end">
              <Col>
                {formHelper.selectInput('sbmm_type', 'Type', sbmmType, '')}
              </Col>
              <Col>
                {formHelper.selectInput('sbmm_subtype', 'Subtype of protein', sbmmSubType, '')}
              </Col>
              <Col>
                {formHelper.selectInput(
                  'uniprot_derivation', 'Existence in UniProt or reference', uniprotDerivation, ''
                )}
              </Col>
            </Row>

            {
              visibleForUniprotOrModification && (
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput('sbmm_search_by', 'Search UniProt or Reference', sbmmSearchBy, '')}
                  </Col>
                  <Col>
                    {formHelper.textInput('sbmm_search_input', 'Input', '')}
                  </Col>
                  <Col>
                    {
                      searchable && (
                        <Button
                          variant="primary"
                          onClick={() => searchSequenceBasedMolecules()}
                        >
                          Search
                        </Button>
                      )
                    }
                  </Col>
                </Row>
              )
            }
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

      {
        visibleForUniprotOrModification && (
          <ReferenceForm
            ident="reference"
            key="reference_uniprot"
          />
        )
      }
      {
        showIfReferenceSelected && visibleForUnkownOrModification && (
          <ReferenceForm
            ident="sequence_modifications"
            key="sequence_modifications_uniprot"
          />
        )
      }

      {
        showIfReferenceSelected && (
          <Accordion
            className="mb-4"
            activeKey={sequenceBasedMacromoleculeStore.toggable_contents.sample && 'sample'}
            onSelect={() => sequenceBasedMacromoleculeStore.toggleContent('sample')}
          >
            <Accordion.Item eventKey="sample">
              <Accordion.Header>
                Sample Characteristics
              </Accordion.Header>
              <Accordion.Body>
                <h5 className="mb-3">Application</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      'sample.function_or_application', 'Function or application', sampleFunctionOrApplication, ''
                    )}
                  </Col>
                </Row>

                <h5 className="mb-3">Sample stocks characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('sample.concentration', 'Concentration', 'concentration', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('sample.molarity', 'Molarity', 'molarity', '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <>
                        <Col>
                          {formHelper.unitInput(
                            'sample.stock_activity_ul', 'Activity in U/L', 'activity_ul', ''
                          )}
                        </Col>
                        <Col>
                          {formHelper.unitInput(
                            'sample.stock_activity_ug', 'Activity in U/g', 'activity_ug', ''
                          )}
                        </Col>
                      </>
                    )
                  }
                </Row>

                <h5 className="mb-3">Sample characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.textInput('sample.short_label', 'Short label', '')}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('sample.volume_as_used', 'Volume as used', 'volumes', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('sample.amount_as_used', 'Amount as used', 'amount_substance', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('sample.amount_as_used_weight', '', 'amount_weight', '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <Col>
                        {formHelper.unitInput('sample.activity', 'Activity', 'activity', '')}
                      </Col>
                    )
                  }
                </Row>
              </Accordion.Body>
            </Accordion.Item>
          </Accordion>
        )
      }
      {
        sequenceBasedMacromoleculeStore.show_search_result && (
          <SearchResults />
        )
      }
    </Form>
  );
}

export default observer(PropertiesForm);
