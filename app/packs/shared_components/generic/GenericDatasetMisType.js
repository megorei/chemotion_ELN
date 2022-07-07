// imports from node_modules
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

// imports from other namespaces
import MatrixCheck from '/app/packs/src/components/common/MatrixCheck';
import UserStore from '/app/packs/src/components/stores/UserStore';

export default GenericDSMisType = () => {
  const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
  if (MatrixCheck(currentUser.matrix, 'genericDataset')) {
    let tooltip = <Tooltip id="tooltip">Type (Chemical Methods Ontology) has been changed. <br />Please review this Dataset content.</Tooltip>;
    return (
      <OverlayTrigger placement="top" overlay={tooltip}>
        <span style={{ color: 'red' }}><i className="fa fa-exclamation-triangle" />&nbsp;</span>
      </OverlayTrigger>
    );
  }
  return null;
};
