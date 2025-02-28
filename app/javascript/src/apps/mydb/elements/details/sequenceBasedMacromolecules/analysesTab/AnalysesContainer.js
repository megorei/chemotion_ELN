import React, { useContext, useEffect } from 'react';
import {
  Form, Button, ButtonGroup, ButtonToolbar,
  OverlayTrigger, Tooltip, Accordion, Card,
} from 'react-bootstrap';

import ContainerComponent from 'src/components/container/ContainerComponent';
import AnalysisHeader from './AnalysisHeader';
import AnalysesSortableContainer from './AnalysesSortableContainer';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import NMRiumDisplayer from 'src/components/nmriumWrapper/NMRiumDisplayer';
import ButtonGroupToggleButton from 'src/components/common/ButtonGroupToggleButton';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

import TextTemplateActions from 'src/stores/alt/actions/TextTemplateActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const AnalysesContainer = ({ readonly }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  const sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const containers = sequenceBasedMacromolecule.container.children[0].children;

  useEffect(() => {
    TextTemplateActions.fetchTextTemplates('sequenceBasedMacromolecule');
  }, []);

  const handleSpectraChange = () => {
    // TODO: spectra change
  }

  const handleSpectraSubmit = () => {
    // TODO: spectra submit
  }

  const addButton = () => {
    return (
      <div className="add-button">
        <Button
          size="xsm"
          variant="success"
          onClick={() => sequenceBasedMacromoleculeStore.addEmptyAnalysisContainer()}
          disabled={readonly}
        >
          <i className="fa fa-plus me-1" />
          Add analysis
        </Button>
      </div>
    );
  }

  const modeButton = () => {
    const isReadonly = !readonly && containers.length < 1 ? true : false;

    return (
      <ButtonGroup>
        <ButtonGroupToggleButton
          size="xsm"
          active={sequenceBasedMacromoleculeStore.analysis_mode === 'edit'}
          onClick={() => sequenceBasedMacromoleculeStore.changeAnalysisMode()}
          disabled={isReadonly}
        >
          <i className="fa fa-edit me-1" />
          Edit mode
        </ButtonGroupToggleButton>
        <ButtonGroupToggleButton
          size="xsm"
          active={sequenceBasedMacromoleculeStore.analysis_mode === 'order'}
          onClick={() => sequenceBasedMacromoleculeStore.changeAnalysisMode()}
          disabled={isReadonly}
        >
          <i className="fa fa-reorder me-1" />
          Order mode
        </ButtonGroupToggleButton>
      </ButtonGroup>
    );
  }

  const analysisContainer = () => {
    let items = [];

    containers.forEach((container, index) => {
      items.push(
        <Card key={`container_${container.id}`} className={`rounded-0 border-0${index === 0 ? '' : ' border-top'}`}>
          <Card.Header className="rounded-0 p-0 border-bottom-0">
            <AccordionHeaderWithButtons eventKey={container.id}>
              <AnalysisHeader container={container} readonly={readonly} />
            </AccordionHeaderWithButtons>
          </Card.Header>
          {
            !container.is_deleted && sequenceBasedMacromoleculeStore.analysis_mode === 'edit' && (
              <Accordion.Collapse eventKey={container.id}>
                <Card.Body>
                  <ContainerComponent
                    disabled={readonly}
                    readOnly={readonly}
                    templateType="sequenceBasedMacromolecule"
                    container={container}
                    onChange={() => sequenceBasedMacromoleculeStore.changeAnalysisContainerContent(container)}
                  />
                  <ViewSpectra
                    sample={sequenceBasedMacromolecule}
                    handleSampleChanged={handleSpectraChange}
                    handleSubmit={handleSpectraSubmit}
                  />
                  <NMRiumDisplayer
                    sample={sequenceBasedMacromolecule}
                    handleSampleChanged={handleSpectraChange}
                    handleSubmit={handleSpectraSubmit}
                  />
                </Card.Body>
              </Accordion.Collapse>
            )
          }
        </Card>
      );
    });
    return items;
  }

  return (
    <>
      {
        containers.length > 0 ? (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              {modeButton()}
              <ButtonToolbar className="gap-2">
                <CommentButton
                  toggleCommentBox={sequenceBasedMacromoleculeStore.toggleAnalysisCommentBox}
                  size="xsm"
                />
                {addButton()}
              </ButtonToolbar>
            </div>
            <CommentBox
              isVisible={sequenceBasedMacromoleculeStore.analysis_comment_box}
              value={sequenceBasedMacromolecule.container.description}
              handleCommentTextChange={sequenceBasedMacromoleculeStore.changeAnalysisComment}
            />
            {sequenceBasedMacromoleculeStore.analysis_mode === 'edit' ? (
              <Accordion className="border rounded overflow-hidden">
                {analysisContainer()}
              </Accordion>
            ) : (
              <AnalysesSortableContainer
                readonly={readonly}
                key={`analyses-sortable-${container.id}`}
              />
            )}
          </div>
        ) : (
          <div className='d-flex justify-content-between align-items-center'>
            <p className='m-0'>There are currently no Analyses.</p>
            {addButton()}
          </div>
        )
      }
    </>
  );
}

export default observer(AnalysesContainer);
