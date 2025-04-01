import React, { useContext } from 'react';
import { Row, Col, Accordion, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import SequenceAndPostTranslationalModificationForm from './SequenceAndPostTranslationalModificationForm';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ReferenceAndModificationForm = ({ ident }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);

  const isProtein = sequenceBasedMacromolecule.sequence_based_macromolecule.sbmm_type === 'protein';
  const uniprotDerivationValue = sequenceBasedMacromolecule.sequence_based_macromolecule.uniprot_derivation;
  let parent = sequenceBasedMacromolecule.sequence_based_macromolecule;
  let disabled = false;

  let fieldPrefix = 'sequence_based_macromolecule';
  if (ident === 'reference' && sequenceBasedMacromolecule.sequence_based_macromolecule.parent) {
    fieldPrefix = `${fieldPrefix}.parent`;
    parent = sequenceBasedMacromolecule.sequence_based_macromolecule.parent;
    disabled = true;
  }
  if (ident === 'reference') {
    disabled = true;
  }

  const visibleForModification = isProtein && uniprotDerivationValue === 'uniprot_modified';

  const showIfReferenceSelected = isProtein && (parent?.primary_accession
    || parent?.parent_identifier || parent.other_reference_id || ident === 'sequence_modifications');

  const sequenceLengthValue = parent?.sequence_length || parent?.sequence.length || ''

  const heterologousExpression = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Unknown', value: 'unknown' },
  ]

  const referenceAccordionHeader = () => {
    if (ident === 'sequence_modifications') {
      return " Properties of the modified sequence or own protein";
    } else if (uniprotDerivationValue === 'uniprot') {
      return "Protein Identifiers and structural characteristics";
    } else if (uniprotDerivationValue === 'uniprot_modified') {
      return "Protein Identifiers and structural characteristics of reference entries"
    }
  }

  const handleCIFFileUpload = (field) => {
    console.log(field);
  }

  const handlePDBFileUpload = (field) => {
    console.log(field);
  }

  const handleDrop = (item, field) => {
    console.log(item, field);
  }

  return (
    <Accordion
      className="mb-4"
      activeKey={sequenceBasedMacromoleculeStore.toggable_contents[ident] && ident}
      onSelect={() => sequenceBasedMacromoleculeStore.toggleContent(ident)}
    >
      <Accordion.Item eventKey={ident}>
        <Accordion.Header>
          {referenceAccordionHeader()}
        </Accordion.Header>
        <Accordion.Body>
          <h5 className="mb-3">Identifiers and sequence characteristics:</h5>
          {
            ident === 'reference' && (
              <Row className="mb-4">
                <Col>
                  <label className="form-label">Reference</label>
                  {
                    formHelper.dropAreaForElement(
                      'SEQUENCE_BASED_MACROMOLECULE', handleDrop, `${fieldPrefix}.reference`,
                      'Drop sequence based macromolecule here'
                    )
                  }
                </Col>
              </Row>
            )
          }
          {
            showIfReferenceSelected && (
              <>
                <Row className="mb-4 align-items-end">
                  {ident === 'reference' && (
                    <Col>{formHelper.textInput(`${fieldPrefix}.primary_accession`, 'UniProt number', disabled, '')}</Col>
                  )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.other_reference_id`, 'Other reference ID', disabled, '')}</Col>
                  {
                    ident === 'sequence_modifications' && (
                      <Col>{formHelper.textInput(`${fieldPrefix}.own_id`, 'Own ID', disabled, '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.short_name`, 'Short name', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {
                      formHelper.readonlyInput(
                        `${fieldPrefix}.sequence_length`, 'Sequence length', sequenceLengthValue, ''
                      )
                    }
                  </Col>
                  <Col>
                    {formHelper.unitInput(
                      `${fieldPrefix}.molecular_weight`, 'Sequence mass (Da = g/mol)', 'molecular_weight', disabled, ''
                    )}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}.full_name`, 'Full name', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  {
                    visibleForModification && (
                      <Col>{formHelper.textInput(`${fieldPrefix}.pdb_doi`, 'Pdb DOI', disabled, '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}.ec_numbers`, 'EC number', disabled, '')}</Col>
                  <Col className="mb-2">
                    {
                      formHelper.checkboxInput(
                        `${fieldPrefix}.show_structure_details`, 'Show details about structural files', disabled
                      )
                    }
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col>
                    {formHelper.textareaInput(`${fieldPrefix}.sequence`, 'Sequence of the structure', 3, disabled, '')}
                  </Col>
                </Row>
                {
                  ident === 'reference' && sequenceBasedMacromolecule[fieldPrefix]?.show_structure_details && (
                    <Row className="mb-4 align-items-end">
                      <Col>
                        <label className="form-label">Structure file cif</label>
                        {formHelper.dropzone(`${fieldPrefix}.structure_file_cif`, handleCIFFileUpload)}
                      </Col>
                      <Col>
                        <label className="form-label">Structure file pdb</label>
                        {formHelper.dropzone(`${fieldPrefix}.structure_file_pdb`, handlePDBFileUpload)}
                      </Col>
                    </Row>
                  )
                }
                {
                  ident === 'sequence_modifications'
                  && sequenceBasedMacromolecule[fieldPrefix]?.show_structure_details && (
                    <Row className="mb-4 align-items-end">
                      <Col>
                        <label className="form-label">Structure file cif</label>
                        {formHelper.dropzone(`${fieldPrefix}.structure_file_cif`, handleCIFFileUpload)}
                      </Col>
                      <Col>
                        <label className="form-label">Structure file pdb</label>
                        {formHelper.dropzone(`${fieldPrefix}.structure_file_pdb`, handlePDBFileUpload)}
                      </Col>
                    </Row>
                  )
                }
                {
                  ident === 'reference' && (
                    <Row className="mb-4 align-items-end">
                      <Col>{formHelper.textInput(`${fieldPrefix}.link_uniprot`, 'Link UniProt', disabled, '')}</Col>
                      <Col>{formHelper.textInput(`${fieldPrefix}.link_pdb`, 'Link pdb', disabled, '')}</Col>
                    </Row>
                  )
                }

                <h5 className="mb-3">Details on Protein's source:</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      `${fieldPrefix}.heterologous_expression`, 'Heterologous expression',
                      heterologousExpression, disabled, ''
                    )}
                  </Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.organism`, 'Organism', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.taxon_id`, 'Taxon ID', disabled, '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}.strain`, 'Strain', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.tissue`, 'Tissue', disabled, '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}.localisation`, 'Localisation', disabled, '')}</Col>
                </Row>
              </>
            )
          }
          
          {
            ident === 'sequence_modifications' && (
              <SequenceAndPostTranslationalModificationForm key="sequence-and-post-translational-modification" />
            )
          }
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(ReferenceAndModificationForm);
