import React, { useContext, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import { initFormHelper } from 'src/utilities/FormHelper';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SequenceAndPostTranslationalModificationForm = () => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);

  useEffect(() => {
    if (sequenceBasedMacromolecule?.id !== undefined) {
      // init buttons
      // sequenceBasedMacromoleculeStore

      // 'phosphorylation', fieldPrefixPostTransitional, 'details', phosphorylationDetailButtonGroups
      // glycosylation
      // 'hydroxylation', fieldPrefixPostTransitional, 'details', hydroxylationDetailButtonGroups
      // 'methylation', fieldPrefixPostTransitional, 'details', methylationDetailButtonGroups,

      // if (self.sequence_based_macromolecule.modification_toggle_buttons[field].length < 1) {
      //   const { lastObject, lastKey } = self.getLastObjectAndKeyByField(fieldPrefix, self.sequence_based_macromolecule);
      //   let buttons = [];
      //   group.options.map((option) => {
      //     if (lastObject[lastKey][option.field]) {
      //       buttons.push(option.field);
      //     }
      //   });
      //   self.setModificationToggleButtons(fieldPrefix, field, buttons);
      // }
      // return self.sequence_based_macromolecule.modification_toggle_buttons[field];

    }
  }, []);

  const fieldPrefixSequence = 'sequence_based_macromolecule.protein_sequence_modifications';
  const fieldPrefixPostTransitional = 'sequence_based_macromolecule.post_translational_modifications';
  const proteinSequenceModification = sequenceBasedMacromolecule.sequence_based_macromolecule.protein_sequence_modifications;
  const postTranslationalModifications = sequenceBasedMacromolecule.sequence_based_macromolecule.post_translational_modifications;

  const phosphorylationAminoAcids = [
    { label: 'Ser', field: 'phosphorylation_ser_enabled' },
    { label: 'Thr', field: 'phosphorylation_thr_enabled' },
    { label: 'Tyr', field: 'phosphorylation_tyr_enabled' },
  ];

  const glycosylationAminoAcids = [
    { label: 'Asn', related: 'linkage', only: 'n_linked', field: 'glycosylation_n_linked_asn_enabled' },
    { label: 'Lys', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_lys_enabled' },
    { label: 'Ser', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_ser_enabled' },
    { label: 'Thr', related: 'linkage', only: 'o_linked', field: 'glycosylation_o_linked_thr_enabled' },
  ];

  const hydroxylationAminoAcids = [
    { label: 'Lys', field: 'hydroxylation_lys_enabled' },
    { label: 'Pro', field: 'hydroxylation_pro_enabled' },
  ];

  const methylationAminoAcids = [
    { label: 'Arg', field: 'methylation_arg_enabled' },
    { label: 'Glu', field: 'methylation_glu_enabled' },
    { label: 'Lys', field: 'methylation_lys_enabled' },
  ];

  const linkage = [
    { label: 'N-linked', field: 'n_linked' },
    { label: 'O-linked', field: 'o_linked' },
  ]

  const phosphorylationDetailButtonGroups = [
    { label: 'Amino Acids', options: phosphorylationAminoAcids },
  ];

  const glycosylationDetailRowFields = [
    { label: 'Linkage', options: linkage },
    { label: 'Amino Acids', options: glycosylationAminoAcids },
  ];

  const hydroxylationDetailButtonGroups = [
    { label: 'Amino Acids', options: hydroxylationAminoAcids },
  ];

  const methylationDetailButtonGroups = [
    { abel: 'Amino Acids', options: methylationAminoAcids },
  ];

  return (
    <>
      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Sequence modifications</h5>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_n_terminal`, 'N-terminal')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_c_terminal`, 'C-terminal')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_insertion`, 'Insertion')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_deletion`, 'Deletion')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_mutation`, 'Mutation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixSequence}.modification_other`, 'Others')}
        </Col>
      </Row>
      {
        (proteinSequenceModification?.modification_n_terminal || proteinSequenceModification?.modification_c_terminal) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_n_terminal && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_n_terminal_details`,
                      'Details for N-terminal modifications', ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_c_terminal && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_c_terminal_details`,
                      'Details for C-terminal modifications', ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }
      {
        (proteinSequenceModification?.modification_deletion || proteinSequenceModification?.modification_insertion) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_insertion && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_insertion_details`, 'Details for insertion', ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_deletion && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_deletion_details`, 'Details for deletion', ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }
      {
        (proteinSequenceModification?.modification_mutation || proteinSequenceModification?.modification_other) && (
          <Row className="mb-4 align-items-end">
            {
              proteinSequenceModification?.modification_mutation && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_mutation_details`, 'Details for mutation', ''
                    )
                  }
                </Col>
              )
            }
            {
              proteinSequenceModification?.modification_other && (
                <Col>
                  {
                    formHelper.textInput(
                      `${fieldPrefixSequence}.modification_other_details`, 'Details for other modifications', ''
                    )
                  }
                </Col>
              )
            }
          </Row>
        )
      }

      <Row className="mb-4 align-items-end">
        <h5 className="mb-3">Posttranslational modifications</h5>
        <Col>
          {formHelper.textInput(`${fieldPrefixPostTransitional}.name`, 'Name of the post modification ', '')}
        </Col>
      </Row>
      <Row className="mb-4 align-items-end">
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.phosphorylation_enabled`, 'Phosphorylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.glycosylation_enabled`, 'Glycosylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.acetylation_enabled`, 'Acetylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.hydroxylation_enabled`, 'Hydroxylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.methylation_enabled`, 'Methylation')}
        </Col>
        <Col>
          {formHelper.checkboxInput(`${fieldPrefixPostTransitional}.other_modifications_enabled`, 'Others')}
        </Col>
      </Row>

      {
        postTranslationalModifications?.phosphorylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'phosphorylation', fieldPrefixPostTransitional, 'details', phosphorylationDetailButtonGroups,
          'Details for Phosphorylation'
        )
      }

      {
        postTranslationalModifications?.glycosylation_enabled && 
        formHelper.multipleRowInput(
          `${fieldPrefixPostTransitional}.glycosylation_details`, glycosylationDetailRowFields,
          'Details for Glycosylation'
        )
      }
      {
        postTranslationalModifications?.acetylation_enabled && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for Acetylation</h5>
              {formHelper.inputGroupTextOrNumericInput(
                `${fieldPrefixPostTransitional}.acetylation_lysin_number`, '', 'Lysin No', 'number', ''
              )}
            </Col>
          </Row>
        )
      }
      {
        postTranslationalModifications?.hydroxylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'hydroxylation', fieldPrefixPostTransitional, 'details', hydroxylationDetailButtonGroups,
          'Details for Hydroxylation'
        )
      }
      {
        postTranslationalModifications?.methylation_enabled &&
        formHelper.multiToggleButtonsWithDetailField(
          'methylation', fieldPrefixPostTransitional, 'details', methylationDetailButtonGroups,
          'Details for Methylation'
        )
      }
      {
        postTranslationalModifications?.other_modifications_enabled && (
          <Row className="mb-4">
            <Col>
              <h5 className="mb-3">Details for other modifications</h5>
              {formHelper.textInput(
                `${fieldPrefixPostTransitional}.other_modifications_details`, 'Detail', ''
              )}
            </Col>
          </Row>
        )
      }
    </>
  );
}

export default observer(SequenceAndPostTranslationalModificationForm);
