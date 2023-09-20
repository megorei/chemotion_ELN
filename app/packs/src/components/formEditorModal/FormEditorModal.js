import React, { useContext } from 'react';
import { Button, ButtonToolbar, Modal, Checkbox, FormGroup, FormControl } from 'react-bootstrap';
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

  const textInput = (field, type, i) => {
    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        {checkboxInput(field, i)}
        <FormControl
          id={`input_${field.key}`}
          type="text"
          key={`${field.key}-${i}-${type}`}
        />
      </FormGroup>
    );
  }

  const checkboxInput = (field, i) => {
    return (
      <Checkbox
        key={`${field.key}-${i}`}
        checked={field.visible}
        onChange={changeCheckboxField(field)}
      >
        {field.label}
      </Checkbox>
    );
  }

  const fieldsByType = (field, fields, i) => {
    // switch (field.type) {
    //   case 'text':
    //   case 'textarea':
    //   case 'formula-field':
    //     fields.push(textInput(field, 'text', i));
    //     break;
    // }
    // return fields;
    fields.push(textInput(field, 'text', i));
    return fields;
  }

  const sectionHeadline = (section) => {
    if (section.label === '') { return '' }
    let toggleClass = section.toggle == true ? ' toggle' : '';

    return (
      <div className={`section-headline${toggleClass}`} key={section.key}>{section.label}</div>
    );
  }

  const groupedRowFields = (rowClassName, rowFields) => {
    return (
      <div className={rowClassName} key={`${rowClassName}-${Math.random() * 1000}`}>{rowFields}</div>
    );
  }

  const MapElementStructure = () => {
    if (!elementType || !elementStructure) { return ''; }

    let fields = [];

    elementStructure.map((section, j) => {
      if (section.label == '' && j !== 0) {
        fields.push(<hr className='section-spacer' key={`spacer-${j}`} />);
      } else {
        fields.push(sectionHeadline(section));
      }

      section.rows.map((row, i) => {
        let rowClassName = row.cols !== '4' ? `grouped-fields-row cols-${row.cols}` : 'grouped-fields-row';
        let rowFields = [];

        row.fields.map((field, i) => {
          let subFields = [];
          if (field.sub_fields) {
            field.sub_fields.map((sub_field) => {
              fieldsByType(sub_field, subFields, i);
            });
          } else {
            fieldsByType(field, subFields, i);
          }
          rowFields.push(subFields);
        });
        fields.push(groupedRowFields(rowClassName, rowFields));
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
