import React, { useContext } from 'react';
import { Row, Col, Accordion, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';
import PostTranslationalModificationForm from './PostTranslationalModificationForm';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ReferenceForm = ({ ident }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);
  const fieldPrefix = ident === 'sequence_modifications' ? 'sequence_modifications.' : '';

  const heterologousExpression = [
    { label: 'Yes', value: 'yes' },
    { label: 'No', value: 'no' },
    { label: 'Unknown', value: 'unknown' },
  ]

  const referenceAccordionHeader = () => {
    if (ident === 'sequence_modifications') {
      return " Properties of the modified sequence or own protein";
    } else if (sequenceBasedMacromolecule.uniprot_derivation === 'uniprot') {
      return "Protein Identifiers and structural characteristics";
    } else if (sequenceBasedMacromolecule.uniprot_derivation === 'uniprot_modified') {
      return "Protein Identifiers and structural characteristics of reference entries"
    }
  }

  const visibleForModification = sequenceBasedMacromolecule.sbmm_type === 'protein'
    && sequenceBasedMacromolecule.uniprot_derivation === 'uniprot_modified';

  const showIfReferenceSelected = sequenceBasedMacromolecule.sbmm_type === 'protein'
    && (sequenceBasedMacromolecule.uniprot_number || sequenceBasedMacromolecule.other_reference_id
      || ident === 'sequence_modifications');

  const handleCIFFileUpload = (field) => {
    console.log(field);
  }

  const handlePDBFileUpload = (field) => {
    console.log(field);
  }

  const handleDrop = (item, field) => {
    console.log(item);
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
                      'SEQUENCE_BASED_MACROMOLECULE', handleDrop, `${fieldPrefix}reference`,
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
                    <Col>{formHelper.textInput('uniprot_number', 'UniProt number', '')}</Col>
                  )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}other_reference_id`, 'Other reference ID', '')}</Col>
                  {
                    ident === 'sequence_modifications' && (
                      <Col>{formHelper.textInput(`${fieldPrefix}own_id`, 'Own ID', '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}short_name`, 'Short name', '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.numberInput(`${fieldPrefix}molecular_length`, 'Sequence length', '')}</Col>
                  <Col>
                    {formHelper.unitInput(
                      `${fieldPrefix}molecular_weight`, 'Sequence mass (Da = g/mol)', 'molecular_weight', ''
                    )}
                  </Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}systematic_name`, 'Full name', '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  {
                    visibleForModification && (
                      <Col>{formHelper.textInput(`${fieldPrefix}pdb_doi`, 'Pdb DOI', '')}</Col>
                    )
                  }
                  <Col>{formHelper.textInput(`${fieldPrefix}ec_number`, 'EC number', '')}</Col>
                  <Col className="mb-2">
                    {formHelper.checkboxInput(`${fieldPrefix}show_structure_details`, 'Show details about structural files')}
                  </Col>
                </Row>
                <Row className="mb-4">
                  <Col>
                    {formHelper.textareaInput(`${fieldPrefix}sequence`, 'Sequence of the structure', 2, '')}
                  </Col>
                </Row>
                {
                  ident === 'reference' && sequenceBasedMacromolecule.show_structure_details && (
                    <Row className="mb-4 align-items-end">
                      <Col>
                        <label className="form-label">Structure file cif</label>
                        {formHelper.dropzone(`${fieldPrefix}structure_file_cif`, handleCIFFileUpload)}
                      </Col>
                      <Col>
                        <label className="form-label">Structure file pdb</label>
                        {formHelper.dropzone(`${fieldPrefix}structure_file_pdb`, handlePDBFileUpload)}
                      </Col>
                    </Row>
                  )
                }
                {
                  ident === 'sequence_modifications'
                  && sequenceBasedMacromolecule.sequence_modifications?.show_structure_details && (
                    <Row className="mb-4 align-items-end">
                      <Col>
                        <label className="form-label">Structure file cif</label>
                        {formHelper.dropzone(`${fieldPrefix}structure_file_cif`, handleCIFFileUpload)}
                      </Col>
                      <Col>
                        <label className="form-label">Structure file pdb</label>
                        {formHelper.dropzone(`${fieldPrefix}structure_file_pdb`, handlePDBFileUpload)}
                      </Col>
                    </Row>
                  )
                }
                {
                  ident === 'reference' && (
                    <Row className="mb-4 align-items-end">
                      <Col>{formHelper.textInput(`${fieldPrefix}link_uniprot`, 'Link UniProt', '')}</Col>
                      <Col>{formHelper.textInput(`${fieldPrefix}link_pdb`, 'Link pdb', '')}</Col>
                    </Row>
                  )
                }

                <h5 className="mb-3">Details on Protein's source:</h5>
                <Row className="mb-4 align-items-end">
                  <Col>
                    {formHelper.selectInput(
                      `${fieldPrefix}heterologous_expression`, 'Heterologous expression', heterologousExpression, ''
                    )}
                  </Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}organism`, 'Organism', '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}taxon_id`, 'Taxon ID', '')}</Col>
                </Row>
                <Row className="mb-4 align-items-end">
                  <Col>{formHelper.textInput(`${fieldPrefix}strain`, 'Strain', '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}tissue`, 'Tissue', '')}</Col>
                  <Col>{formHelper.textInput(`${fieldPrefix}localisation`, 'Localisation', '')}</Col>
                </Row>
              </>
            )
          }
          
          {
            ident === 'sequence_modifications' && (
              <PostTranslationalModificationForm key="post-translational-modification" />
            )
          }
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default observer(ReferenceForm);
