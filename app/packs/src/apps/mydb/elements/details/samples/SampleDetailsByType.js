import React, { useContext, useEffect, useRef } from 'react';

import SampleFormByType from 'src/apps/mydb/elements/details/samples/propertiesTab/SampleFormByType';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SampleDetailByType = ({ sample, toggleFullScreen }) => {
  
  return (
    <SampleFormByType
      sample={sample}
      parent={this}
      customizableField=''
      enableSampleDecoupled=''
      decoupleMolecule={true}
    />
  );
}

export default observer(SampleDetailByType);
