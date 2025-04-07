import React, { useContext } from 'react';

import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import ChevronIcon from 'src/components/common/ChevronIcon';

const SequenceBasedMacromoleculeSampleHeader = ({ elements }) => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;

  const toggleAllGroups = () => {
    sequenceBasedMacromoleculeStore.toggleAllGroups();
  }

  const toggleAllButton = () => {
    return (
      <ChevronIcon
        direction={sequenceBasedMacromoleculeStore.show_all_groups ? 'down' : 'right'}
        onClick={() => toggleAllGroups()}
        color="primary"
        className="fs-5"
        role="button"
      />
    );
  }

  return toggleAllButton();
}

export default observer(SequenceBasedMacromoleculeSampleHeader);
