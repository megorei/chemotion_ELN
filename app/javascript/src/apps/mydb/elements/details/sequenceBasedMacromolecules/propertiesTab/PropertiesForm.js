import React, { useContext } from 'react';
import { Form, Row, Col, Accordion, Button, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import ReferenceAndModificationForm from './ReferenceAndModificationForm';
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
    { label: 'UniProt ID', value: 'accession' },
    { label: 'Name', value: 'systematic_name' },
    { label: 'EC-Number', value: 'ec' },
  ];
  const sampleFunctionOrApplication = [
    { label: 'Enzyme', value: 'enzyme' },
    { label: 'Hormone', value: 'hormone' },
    { label: 'Structural', value: 'structural' },
    { label: 'Component', value: 'component' },
    { label: 'Energy source', value: 'energy_source' },
  ];

  const isProtein = sequenceBasedMacromolecule.sequence_based_macromolecule?.sbmm_type === 'protein';
  const uniprotDerivationValue = sequenceBasedMacromolecule.sequence_based_macromolecule?.uniprot_derivation;
  const parent = sequenceBasedMacromolecule.sequence_based_macromolecule?.parent
    ? sequenceBasedMacromolecule.sequence_based_macromolecule.parent
    : sequenceBasedMacromolecule.sequence_based_macromolecule;

  const visibleForUniprotOrModification =
    isProtein && !['', undefined, 'uniprot_unknown'].includes(uniprotDerivationValue);

  const visibleForUnkownOrModification = isProtein && !['', undefined, 'uniprot'].includes(uniprotDerivationValue);

  const showIfReferenceSelected =
    isProtein && (parent?.identifier || parent?.other_reference_id || uniprotDerivationValue === 'uniprot_unknown');

  const showIfEnzymeIsSelected = sequenceBasedMacromolecule.function_or_application === 'enzyme';

  const searchable = ['uniprot', 'uniprot_modified'].includes(uniprotDerivationValue)
    && sequenceBasedMacromolecule.sequence_based_macromolecule.search_field
    && sequenceBasedMacromolecule.sequence_based_macromolecule.search_term;

  const searchSequenceBasedMolecules = () => {
    if (searchable) {
      // todo: search at uniprot and local db
      sequenceBasedMacromoleculeStore.openSearchResult();
    }
  }

  console.log(sequenceBasedMacromolecule);

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
                {formHelper.selectInput('sequence_based_macromolecule.sbmm_type', 'Type', sbmmType, '')}
              </Col>
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_subtype', 'Subtype of protein', sbmmSubType, ''
                  )
                }
              </Col>
              <Col>
                {formHelper.selectInput(
                  'sequence_based_macromolecule.uniprot_derivation', 'Existence in UniProt or reference',
                  uniprotDerivation, ''
                )}
              </Col>
            </Row>

            {
              visibleForUniprotOrModification && (
                <Row className="mb-4 align-items-end">
                  <Col>
                    {
                      formHelper.selectInput(
                        'sequence_based_macromolecule.search_field', 'Search UniProt or Reference', sbmmSearchBy, ''
                      )
                    }
                  </Col>
                  <Col>
                    {formHelper.textInput('sequence_based_macromolecule.search_term', 'Search term', '')}
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
          <ReferenceAndModificationForm
            ident="reference"
            key="reference_uniprot"
          />
        )
      }
      {
        showIfReferenceSelected && visibleForUnkownOrModification && (
          <ReferenceAndModificationForm
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
                      'function_or_application', 'Function or application', sampleFunctionOrApplication, ''
                    )}
                  </Col>
                </Row>

                <h5 className="mb-3">Sample stocks characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('concentration_value', 'Concentration', 'concentration', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('molarity_value', 'Molarity', 'molarity', '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_volume_value', 'Activity in U/L', 'activity_per_volume', ''
                          )}
                        </Col>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_mass_value', 'Activity in U/g', 'activity_per_mass', ''
                          )}
                        </Col>
                      </>
                    )
                  }
                </Row>

                <h5 className="mb-3">Sample characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.textInput('short_label', 'Short label', '')}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('volume_as_used_value', 'Volume as used', 'volumes', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mol_value', 'Amount as used', 'amount_substance', '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mass_value', '', 'amount_mass', '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <Col>
                        {formHelper.unitInput('activity_value', 'Activity', 'activity', '')}
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
