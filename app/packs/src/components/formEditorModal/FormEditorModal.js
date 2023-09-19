import React, { useContext } from 'react';
import { Button, ButtonToolbar, Modal, Checkbox } from 'react-bootstrap';
import Draggable from "react-draggable";
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const FormEditorModal = () => {
  const formEditorStore = useContext(StoreContext).formEditor;
  let minimizedClass = formEditorStore.modalMinimized ? ' minimized' : '';
  let elementType = formEditorStore.elementType;
  let elementStructure = formEditorStore.elementStructure.elements[elementType];

  const saveFormFields = () => {

  }

  const changeCheckboxField = (field) => (e) => {
    formEditorStore.changeFieldVisibility(field, e.target.checked);
  }

  const checkboxInput = (field, i) => {
    let column = field.opt ? `${field.column}-${field.opt}` : field.column;
    //console.log(field);
    return (
      <Checkbox
        key={`${column}-${i}`}
        checked={field.visible}
        onChange={changeCheckboxField(field)}
      >
        {field.label}
      </Checkbox>
    );
  }

  const MapElementStructure = () => {
    //console.log(elementStructure);
    if (!elementType || !elementStructure) { return ''; }

    let fields = [];
    let i = 0;
    elementStructure.map((section) => {
      section.rows.map((row) => {
        row.fields.map((field) => {
          i = i + 1;
          if (field.sub_fields) {
            field.sub_fields.map((sub_field) => {
              fields.push(checkboxInput(sub_field, i));
            });
          } else {
            fields.push(checkboxInput(field, i));
          }
        });
      });
    });
    return fields;
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
              {`Edit ${elementType} form`}
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
                {`List of all form fields of ${elementType}`}
                <br />
                {MapElementStructure()}
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
