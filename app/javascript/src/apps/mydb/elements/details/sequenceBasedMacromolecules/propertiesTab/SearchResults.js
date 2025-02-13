import React, { useContext, useState } from 'react';
import { Form, Row, Col, Accordion, Button, Modal, } from 'react-bootstrap';
import Draggable from "react-draggable";
import { initFormHelper } from 'src/utilities/FormHelper';

import { StoreContext } from 'src/stores/mobx/RootStore';

const SearchResults = () => {
  const sequenceBasedMacromoleculeStore = useContext(StoreContext).sequenceBasedMacromolecules;
  let sequenceBasedMacromolecule = sequenceBasedMacromoleculeStore.sequence_based_macromolecule;
  const formHelper = initFormHelper(sequenceBasedMacromolecule, sequenceBasedMacromoleculeStore);

  const [deltaPosition, setDeltaPosition] = useState({ x: 0, y: 0 });

  const Spinner = () => {
    return (
      <i className="fa fa-spinner fa-pulse fa-3x fa-fw" />
    );
  }

  const handleDrag = (e, ui) => {
    const { x, y } = deltaPosition;
    setDeltaPosition({
      x: x + ui.deltaX,
      y: y + ui.deltaY,
    });
  }

  return (
    <Draggable handle=".modal-header" onDrag={handleDrag}>
      <div>
        <Modal
          show={true}
          onHide={() => sequenceBasedMacromoleculeStore.closeSearchResult()}
          backdrop={false}
          keyboard={false}
          className="draggable-modal-dialog-xxxl"
          size="xxxl"
          dialogClassName="draggable-modal"
          contentClassName="draggable-modal-content"
          style={{
            transform: `translate(${deltaPosition.x}px, ${deltaPosition.y}px)`,
          }}
        >
          <Modal.Header className="ps-0 border-bottom border-gray-600 bg-gray-300" closeButton>
            <Modal.Title className="draggable-modal-stack-title">
              <i className="fa fa-arrows move" />
              Search Results
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Body
          </Modal.Body>
          <Modal.Footer>
            Footer
          </Modal.Footer>
        </Modal>
      </div>
    </Draggable>
  );
}

export default SearchResults;