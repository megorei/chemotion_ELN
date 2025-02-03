import React, { useContext } from 'react';
import { Row, Col, } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const PostTranslationalModificationForm = () => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);
  const fieldName = 'post_translational_modifications';

  const phosphorylationAminoAcids = [
    { label: 'Ser', value: 'ser' },
    { label: 'Thr', value: 'thr' },
    { label: 'Tyr', value: 'tyr' },
  ];

  const glycosylationAminoAcids = [
    { label: 'Asn', value: 'asn' },
    { label: 'Lys', value: 'lys' },
    { label: 'Ser', value: 'ser' },
    { label: 'Thr', value: 'thr' },
  ]

  const hydroxylationAminoAcids = [
    { label: 'Lys', value: 'lys' },
    { label: 'Pro', value: 'pro' },
  ];

  const methylationAminoAcids = [
    { label: 'Arg', value: 'arg' },
    { label: 'Glu', value: 'glu' },
    { label: 'Lys', value: 'lys' },
  ];

  const linkage = [
    { label: 'N-linked', value: 'n_linked' },
    { label: 'O-linked', value: 'o_linked' },
  ]

  const phosphorylationDetailRowFields = [
    { value: 'amino_acids', label: 'Amino Acids', type: 'select', options: phosphorylationAminoAcids, info: '' },
    { value: 'details', label: 'Details', type: 'text', info: '' },
  ];

  const glycosylationDetailRowFields = [
    { value: 'linkage', label: 'Linkage', type: 'select', options: linkage, info: '' },
    { value: 'amino_acids', label: 'Amino Acids', type: 'select', options: glycosylationAminoAcids, info: '' },
    { value: 'details', label: 'Details', type: 'text', info: '' },
  ];

  const hydroxylationDetailRowFields = [
    { value: 'amino_acids', label: 'Amino Acids', type: 'select', options: hydroxylationAminoAcids, info: '' },
    { value: 'details', label: 'Details', type: 'text', info: '' },
  ];

  const methylationDetailRowFields = [
    { value: 'amino_acids', label: 'Amino Acids', type: 'select', options: methylationAminoAcids, info: '' },
    { value: 'details', label: 'Details', type: 'text', info: '' },
  ];

  return (
    <>
      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Sequence modifications</h5>
        <Col>
          {formHelper.checkboxInput('modification_n_terminal', 'N-terminal')}
        </Col>
        <Col>
          {formHelper.checkboxInput('modification_insertion', 'Insertion')}
        </Col>
        <Col>
          {formHelper.checkboxInput('modification_deletion', 'Deletion')}
        </Col>
        <Col>
          {formHelper.checkboxInput('modification_mutation', 'Mutation')}
        </Col>
        <Col>
          {formHelper.checkboxInput('modification_other', 'Others')}
        </Col>
      </Row>
      {
        (sequenceBasedMacromolecule.modification_n_terminal || sequenceBasedMacromolecule.modification_insertion) && (
          <Row className="mb-4 align-items-end">
            {
              sequenceBasedMacromolecule.modification_n_terminal && (
                <Col>
                  {formHelper.textInput('modification_n_terminal_details', 'Details for N-terminal modifications', '')}
                </Col>
              )
            }
            {
              sequenceBasedMacromolecule.modification_insertion && (
                <Col>
                  {formHelper.textInput('modification_insertion_details', 'Details for insertion', '')}
                </Col>
              )
            }
          </Row>
        )
      }
      {
        (sequenceBasedMacromolecule.modification_deletion || sequenceBasedMacromolecule.modification_mutation) && (
          <Row className="mb-4 align-items-end">
            {
              sequenceBasedMacromolecule.modification_deletion && (
                <Col>
                  {formHelper.textInput('modification_deletion_details', 'Details for deletion', '')}
                </Col>
              )
            }
            {
              sequenceBasedMacromolecule.modification_mutation && (
                <Col>
                  {formHelper.textInput('modification_mutation_details', 'Details for mutation', '')}
                </Col>
              )
            }
          </Row>
        )
      }
      {
        sequenceBasedMacromolecule.modification_other && (
          <Row className="mb-4 align-items-end">
            <Col>
              {formHelper.textInput('modification_other_details', 'Details for other modifications', '')}
            </Col>
          </Row>
        )
      }

      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Posttranslational modifications</h5>
        <Col>
          {formHelper.textInput(`${fieldName}.name`, 'Name of the post modification ', '')}
        </Col>
      </Row>
      <Row className="mb-4 align-items-end">
        <Col>
          {formHelper.checkboxInput(`${fieldName}.phosphorylation`, 'Phosphorylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldName}.glycosylation`, 'Glycosylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldName}.acetylation`, 'Acetylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldName}.hydroxylation`, 'Hydroxylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldName}.methylation`, 'Methylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldName}.others`, 'Others')}
        </Col>
      </Row>
      {
        sequenceBasedMacromolecule.post_translational_modifications?.phosphorylation && 
        formHelper.multipleRowInput(
          `${fieldName}.phosphorylation_details`, phosphorylationDetailRowFields, 'Details for Phosphorylation'
        )
      }
      {
        sequenceBasedMacromolecule.post_translational_modifications?.glycosylation && 
        formHelper.multipleRowInput(
          `${fieldName}.glycosylation_details`, glycosylationDetailRowFields, 'Details for Glycosylation'
        )
      }
      {
        sequenceBasedMacromolecule.post_translational_modifications?.acetylation && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for Acetylation</h5>
              {formHelper.inputGroupTextOrNumericInput(
                `${fieldName}.acetylation_details`, '', 'Lysin No', 'number', ''
              )}
            </Col>
          </Row>
        )
      }
      {
        sequenceBasedMacromolecule.post_translational_modifications?.hydroxylation && 
        formHelper.multipleRowInput(
          `${fieldName}.hydroxylation_details`, hydroxylationDetailRowFields, 'Details for Hydroxylation'
        )
      }
      {
        sequenceBasedMacromolecule.post_translational_modifications?.methylation &&
        formHelper.multipleRowInput(
          `${fieldName}.methylation_details`, methylationDetailRowFields, 'Details for Methylation'
        )
      }
      {
        sequenceBasedMacromolecule.post_translational_modifications?.others && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for other modifications</h5>
              {formHelper.textInput(
                `${fieldName}.other_details`, 'Detail', ''
              )}
            </Col>
          </Row>
        )
      }
    </>
  );
}

export default observer(PostTranslationalModificationForm);
