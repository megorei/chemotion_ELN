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
  const disabled = false;
  const generalAccordionIdent = `${sequenceBasedMacromolecule.id}-general`;
  const sampleAccordionIdent = `${sequenceBasedMacromolecule.id}-sample`;
  const primaryAccessionErrorIdent = `${sequenceBasedMacromolecule.id}-sequence_based_macromolecule.primary_accession`;
  const parentIdentifierErrorIdent = `${sequenceBasedMacromolecule.id}-sequence_based_macromolecule.parent_identifier`;

  if (!sequenceBasedMacromoleculeStore.toggable_contents.hasOwnProperty(generalAccordionIdent)) {
    sequenceBasedMacromoleculeStore.toggleContent(generalAccordionIdent);
  }

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
    { label: 'Name', value: 'protein_name' },
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
    isProtein && (parent?.primary_accession || parent?.id
      || sequenceBasedMacromolecule.sequence_based_macromolecule?.parent_identifier
      || parent?.other_reference_id || uniprotDerivationValue === 'uniprot_unknown');

  const showIfEnzymeIsSelected = sequenceBasedMacromolecule.function_or_application === 'enzyme';

  const noPrimaryAccession = uniprotDerivationValue === 'uniprot'
    && sequenceBasedMacromoleculeStore.error_messages[primaryAccessionErrorIdent]
    && !sequenceBasedMacromolecule.sequence_based_macromolecule?.primary_accession

  const noParentIdentifier = uniprotDerivationValue === 'uniprot_modified'
    && sequenceBasedMacromoleculeStore.error_messages[parentIdentifierErrorIdent]
    && !sequenceBasedMacromolecule.sequence_based_macromolecule?.parent_identifier

  const searchable = ['uniprot', 'uniprot_modified'].includes(uniprotDerivationValue)
    && sequenceBasedMacromolecule.sequence_based_macromolecule.search_field
    && sequenceBasedMacromolecule.sequence_based_macromolecule.search_term;

  const derivationLabelWithIcon = (
    <>
      Existence in UniProt or reference
      <i className="text-danger ms-1 fa fa-exclamation-triangle" />
    </>
  )

  const searchSequenceBasedMolecules = () => {
    if (searchable) {
      sequenceBasedMacromoleculeStore.searchForSequenceBasedMacromolecule(
        sequenceBasedMacromolecule.sequence_based_macromolecule.search_term,
        sequenceBasedMacromolecule.sequence_based_macromolecule.search_field
      );
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
        activeKey={sequenceBasedMacromoleculeStore.toggable_contents[generalAccordionIdent] && generalAccordionIdent}
        onSelect={() => sequenceBasedMacromoleculeStore.toggleContent(generalAccordionIdent)}
      >
        <Accordion.Item eventKey={generalAccordionIdent}>
          <Accordion.Header>
            General description
          </Accordion.Header>
          <Accordion.Body>
            <Row className="mb-4 align-items-end">
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_type', 'Type', sbmmType, disabled,
                    sequenceBasedMacromoleculeStore.error_messages, ''
                  )
                }
              </Col>
              <Col>
                {
                  formHelper.selectInput(
                    'sequence_based_macromolecule.sbmm_subtype', 'Subtype of protein', sbmmSubType, disabled,
                    sequenceBasedMacromoleculeStore.error_messages, ''
                  )
                }
              </Col>
              <Col>
                {formHelper.selectInput(
                  'sequence_based_macromolecule.uniprot_derivation',
                  derivationLabelWithIcon,
                  uniprotDerivation, (sequenceBasedMacromolecule.isNew ? false : true),
                  sequenceBasedMacromoleculeStore.error_messages, 'Can only be changed during creation'
                )}
              </Col>
            </Row>

            {
              visibleForUniprotOrModification && (
                <Row className="mb-4 align-items-end">
                  <Col>
                    {
                      formHelper.selectInput(
                        'sequence_based_macromolecule.search_field', 'Search UniProt or Reference', sbmmSearchBy,
                        disabled, '', ''
                      )
                    }
                  </Col>
                  <Col>
                    {formHelper.textInput('sequence_based_macromolecule.search_term', 'Search term', disabled, '')}
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
            {
              (noPrimaryAccession || noParentIdentifier) && (
                <div className="text-danger">
                  Please choose a reference
                </div>
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
            activeKey={sequenceBasedMacromoleculeStore.toggable_contents[sampleAccordionIdent] && sampleAccordionIdent}
            onSelect={() => sequenceBasedMacromoleculeStore.toggleContent(sampleAccordionIdent)}
          >
            <Accordion.Item eventKey={sampleAccordionIdent}>
              <Accordion.Header>
                Sample Characteristics
              </Accordion.Header>
              <Accordion.Body>
                <h5 className="mb-3">Application</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      'function_or_application', 'Function or application', sampleFunctionOrApplication, disabled, '', ''
                    )}
                  </Col>
                </Row>

                <h5 className="mb-3">Sample stocks characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('concentration_value', 'Concentration', 'concentration', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('molarity_value', 'Molarity', 'molarity', disabled, '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_volume_value', 'Activity in U/L', 'activity_per_volume', disabled, ''
                          )}
                        </Col>
                        <Col>
                          {formHelper.unitInput(
                            'activity_per_mass_value', 'Activity in U/g', 'activity_per_mass', disabled, ''
                          )}
                        </Col>
                      </>
                    )
                  }
                </Row>

                <h5 className="mb-3">Sample characteristics</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.textInput('short_label', 'Short label', disabled, '')}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.unitInput('volume_as_used_value', 'Volume as used', 'volumes', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mol_value', 'Amount as used', 'amount_substance', disabled, '')}
                  </Col>
                  <Col>
                    {formHelper.unitInput('amount_as_used_mass_value', '', 'amount_mass', disabled, '')}
                  </Col>
                  {
                    showIfEnzymeIsSelected && (
                      <Col>
                        {formHelper.unitInput('activity_value', 'Activity', 'activity', disabled, '')}
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
