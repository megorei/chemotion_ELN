import React, { useContext } from 'react';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import Draggable from "react-draggable";
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const FormEditorModal = () => {
  const formEditorStore = useContext(StoreContext).formEditor;
  let minimizedClass = formEditorStore.modalMinimized ? ' minimized' : '';

  const saveFormFields = () => {

  }

  return (
    <Draggable handle=".handle">
      <Modal
        show={formEditorStore.formEditorModalVisible}
        onHide={() => formEditorStore.handleCancel()}
        backdrop={false}
        dialogas="form-editor"
      >
        <Modal.Header className="handle" closeButton>
          <div className="col-md-11 col-sm-11">
            <Modal.Title>
              <i className="fa fa-arrows move" />
              {`Edit ${formEditorStore.elementType} form`}
            </Modal.Title>
          </div>
          <div className="col-md-1 col-sm-1">
            <i
              className="fa fa-window-minimize window-minimize"
              onClick={() => formEditorStore.toggleModalMinimized()} />
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className={`form-container${minimizedClass}`}>
            <div className="form-fields">
              <div className="scrollable-content">
                {`List of all form fields of ${formEditorStore.elementType}`}
              </div>
              <ButtonToolbar className="form-editor-buttons">
                <Button bsStyle="warning" onClick={() => formEditorStore.handleCancel()}>
                  Cancel
                </Button>
                <Button bsStyle="primary" onClick={saveFormFields} >
                  Save
                </Button>
              </ButtonToolbar>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </Draggable>
  );
};

export default observer(FormEditorModal);
