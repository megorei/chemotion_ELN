import React, { useState, useEffect, useContext } from 'react';
import {
  ButtonToolbar, Button, Tabs, Tab, Tooltip, OverlayTrigger, Card
} from 'react-bootstrap';

import PropertiesForm from './propertiesTab/PropertiesForm';
import AnalysesContainer from './analysesTab/AnalysesContainer';
import AttachmentForm from './attachmentsTab/AttachmentForm';

import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import HeaderCommentSection from 'src/components/comments/HeaderCommentSection';
import CommentSection from 'src/components/comments/CommentSection';
import CommentActions from 'src/stores/alt/actions/CommentActions';
import CommentModal from 'src/components/common/CommentModal';
import { commentActivation } from 'src/utilities/CommentHelper';
import MatrixCheck from 'src/components/common/MatrixCheck';
import ConfirmClose from 'src/components/common/ConfirmClose';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import ElementDetailSortTab from 'src/apps/mydb/elements/details/ElementDetailSortTab';
import OpenCalendarButton from 'src/components/calendar/OpenCalendarButton';
import CopyElementModal from 'src/components/common/CopyElementModal';
import Immutable from 'immutable';
import { formatTimeStampsOfElement } from 'src/utilities/timezoneHelper';

import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionUtils from 'src/models/collection/CollectionUtils';

const SequenceBasedMacromoleculeDetails = ({ toggleFullScreen }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;

  const { currentCollection, isSync } = UIStore.getState();
  const { currentUser } = UserStore.getState();

  const [visibleTabs, setVisibleTabs] = useState(Immutable.List());

  const submitLabel = sequenceBasedMacromolecule.isNew ? 'Create' : 'Save';
  let tabContents = [];

  useEffect(() => {
    if (sequenceBasedMacromolecule?.id && MatrixCheck(currentUser.matrix, commentActivation) && !sequenceBasedMacromolecule.isNew) {
      CommentActions.fetchComments(sequenceBasedMacromolecule);
    }
  }, []);

  const tabContentComponents = {
    properties: PropertiesForm,
    analyses: AnalysesContainer,
    attachments: AttachmentForm,
  };

  const tabTitles = {
    properties: 'Properties',
    analyses: 'Analyses',
    attachments: 'Attachment',
  };

  const isReadOnly = () => {
    if (!currentCollection) { return false; }

    return CollectionUtils.isReadOnly(
      currentCollection,
      currentUser.id,
      isSync
    );
  }

  const disabled = (index) => {
    return sequenceBasedMacromolecule.isNew && index !== 0 ? true : false;
  }

  visibleTabs.forEach((key, i) => {
    let title = tabTitles[key];
  
    tabContents.push(
      <Tab eventKey={key} title={title} key={`${key}_${sequenceBasedMacromolecule.id}`} disabled={disabled(i)}>
        {
          !sequenceBasedMacromolecule.isNew &&
          <CommentSection section={`sequence_based_macromolecule_sample_${key}`} element={sequenceBasedMacromolecule} />
        }
        {React.createElement(tabContentComponents[key], {
          key: `${sequenceBasedMacromolecule.id}-${key}`,
          readonly: isReadOnly()
        })}
      </Tab>
    );
  });

  const onTabPositionChanged = (visible) => {
    setVisibleTabs(visible);
  }

  const handleTabChange = (key) => {
    sequenceBasedMacromoleculeStore.setActiveTabKey(key);
  }

  const handleSubmit = () => {
    LoadingActions.start();
    if (sequenceBasedMacromolecule.is_new) {
      DetailActions.close(sequenceBasedMacromolecule, true);
      ElementActions.createSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    } else {
      ElementActions.updateSequenceBasedMacromolecule(sequenceBasedMacromolecule);
    }
  }

  const sequenceBasedMacromoleculeIsValid = () => {
    // TODO: validation
    return true;
  }

  // const handleExportAnalyses = () => {
  //   sequenceBasedMacromoleculesStore.toggleAnalysisStartExport();
  //   AttachmentFetcher.downloadZipBySequenceBasedMacromolecule(sequenceBasedMacromolecule.id)
  //     .then(() => { sequenceBasedMacromoleculeStore.toggleAnalysisStartExport(); })
  //     .catch((errorMessage) => { console.log(errorMessage); });
  // }

  const downloadAnalysisButton = () => {
    //   const hasNoAnalysis = sequenceBasedMacromolecule.analyses?.length === 0 || sequenceBasedMacromolecule.analyses?.length === undefined;
    //   if (sequenceBasedMacromolecule.isNew || hasNoAnalysis) { return null; }
    // 
    //   return (
    //     <Button
    //       variant="info"
    //       disabled={!sequenceBasedMacromoleculeIsValid()}
    //       onClick={() => handleExportAnalyses()}
    //     >
    //       Download Analysis
    //       {sequenceBasedMacromoleculesStore.analysis_start_export && <i className="fa fa-spin fa-spinner ms-1" />}
    //     </Button>
    //   );
  }

  const sequenceBasedMacromoleculeHeader = () => {
    const titleTooltip = formatTimeStampsOfElement(sequenceBasedMacromolecule || {});
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' ? currentCollection.id : null;

    return (
      <div className="d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="sequenceBasedMacromoleculeDates">{titleTooltip}</Tooltip>}
          >
            <span>
              <i className="icon-sequence_based_macromolecule me-1" />
              {sequenceBasedMacromolecule.name}
            </span>
          </OverlayTrigger>
          <ElementCollectionLabels element={sequenceBasedMacromolecule} placement="right" />
          <HeaderCommentSection element={sequenceBasedMacromolecule} />
        </div>
        <div className="d-flex align-items-center gap-1">
          <PrintCodeButton element={sequenceBasedMacromolecule} />
          {!sequenceBasedMacromolecule.isNew &&
            <OpenCalendarButton
              isPanelHeader
              eventableId={sequenceBasedMacromolecule.id}
              eventableType="SequenceBasedMacromoleculeSample"
            />}
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip id="fullSequenceBasedMacromolecule">FullScreen</Tooltip>}
          >
            <Button
              variant="info"
              size="xxsm"
              onClick={() => toggleFullScreen()}
            >
              <i className="fa fa-expand" />
            </Button>
          </OverlayTrigger>
          {sequenceBasedMacromolecule.can_copy && !sequenceBasedMacromolecule.isNew && (
            <CopyElementModal
              element={sequenceBasedMacromolecule}
              defCol={defCol}
            />
          )}
          {sequenceBasedMacromolecule.isEdited && (
            <OverlayTrigger
              placement="bottom"
              overlay={<Tooltip id="saveSequenceBasedMacromolecule">Save sequence based macromolecule</Tooltip>}
            >
              <Button
                variant="warning"
                size="xxsm"
                onClick={() => handleSubmit()}
              >
                <i className="fa fa-floppy-o " />
              </Button>
            </OverlayTrigger>
          )}
          <ConfirmClose el={sequenceBasedMacromolecule} />
        </div>
      </div>
    );
  }

  return (
    <Card className={"detail-card" + (sequenceBasedMacromolecule.isPendingToSave ? " detail-card--unsaved" : "")}>
      <Card.Header>
        {sequenceBasedMacromoleculeHeader()}
      </Card.Header>
      <Card.Body style={{ minHeight: '500px' }}>
        <ElementDetailSortTab
          type="sequence_based_macromolecule_sample"
          availableTabs={Object.keys(tabContentComponents)}
          tabTitles={tabTitles}
          onTabPositionChanged={onTabPositionChanged}
        />
        <div className="tabs-container--with-borders">
          <Tabs
            activeKey={sequenceBasedMacromoleculeStore.active_tab_key}
            onSelect={key => handleTabChange(key)}
            id="sequenceBasedMacromoleculeDetailsTab"
            unmountOnExit
          >
            {tabContents}
          </Tabs>
        </div>
        <CommentModal element={sequenceBasedMacromolecule} />
      </Card.Body>
      <Card.Footer>
        <ButtonToolbar className="gap-2">
          <Button variant="primary" onClick={() => DetailActions.close(sequenceBasedMacromolecule)}>
            Close
          </Button>
          <Button variant="warning" disabled={!sequenceBasedMacromoleculeIsValid()} onClick={() => handleSubmit()}>
            {submitLabel}
          </Button>
          {downloadAnalysisButton()}
        </ButtonToolbar>
      </Card.Footer>
    </Card>
  );
}

export default observer(SequenceBasedMacromoleculeDetails);
