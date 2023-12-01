import React, { useContext } from 'react';
import {
  Button, ButtonToolbar, Modal, Checkbox, FormGroup, FormControl, InputGroup,
  OverlayTrigger, Tooltip, Glyphicon, ControlLabel, Tabs, Tab
} from 'react-bootstrap';
import Select from 'react-select3';
import CreatableSelect from 'react-select3/creatable';
import Draggable from "react-draggable";
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';


const ElementFormTypeEditorModal = () => {
  const elementFormTypesStore = useContext(StoreContext).elementFormTypes;
  let minimizedClass = elementFormTypesStore.modalMinimized ? ' minimized' : '';
  let elementType = elementFormTypesStore.elementFormType.element_type;
  let elementStructure = elementFormTypesStore.elementStructure.columns;

  const saveFormFields = () => {
    elementFormTypesStore.saveStructure();
  }

  const changeCheckboxField = (field) => (e) => {
    elementFormTypesStore.changeFieldVisibility(field, e.target.checked);
  }

  const casInput = (field, type, i) => {
    //disabled={!sample.can_update}
    let options = [{ value: field.default, label: field.default }];
    let defaultValue = field.default ? options[0] : '';

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        {checkboxInput(field, i)}
        <div className="grouped-addons">
          <InputGroup>
            <InputGroup.Addon>CAS</InputGroup.Addon>
            <CreatableSelect
              name="cas"
              value={defaultValue}
              options={options}
              disabled={true}
            />
            <InputGroup.Addon>
              <OverlayTrigger placement="bottom" overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
                <span data-clipboard-text=''><i className="fa fa-clipboard" /></span>
              </OverlayTrigger>
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const amountInput = (field, type, i) => {
    const infoMessage = (
      <Tooltip id="assignButton">
        Information mirrored to the reaction table describing the content of pure
        compound or amount of pure compound in a given solution
      </Tooltip>
    );
    const amount_g = {
      key: 'target_amount_value_amount_g',
      label: 'Amount G',
      addon: 'mg',
      default: '',
    };
    const amount_l = {
      key: 'target_amount_value_amount_l',
      label: 'Amount L',
      addon: 'ml',
      default: '',
    };
    const amount_mol = {
      key: 'target_amount_value_amount_mol',
      label: 'Amount mol',
      addon: 'mol',
      default: '',
    };

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel className="amount-label">{field.label}</ControlLabel>
        {checkboxInput(field, i)}
        <div className="grouped-addons">
          <div className="grouped-fields-row amount">
            <OverlayTrigger placement="top" overlay={infoMessage}>
              <Button className="btn btn-circle btn-sm btn-info">
                <Glyphicon glyph="info-sign" />
              </Button>
            </OverlayTrigger>
            {textWithAddOnWithoutLabelInput(amount_g, type, i, 'green')}
            {textWithAddOnWithoutLabelInput(amount_l, type, i)}
            {textWithAddOnWithoutLabelInput(amount_mol, type, i)}
          </div>
        </div>
      </FormGroup>
    );
  }

  const muleculeInput = (field, type, i) => {
    //disabled={!sample.can_update}
    let options = [{ value: field.default, label: field.default }];
    let defaultValue = field.default ? options[0] : '';

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        {checkboxInput(field, i)}
        <div className="grouped-addons">
          <InputGroup>
            <CreatableSelect
              name="moleculeName"
              value={defaultValue}
              options={options}
              disabled={true}
            />
            <InputGroup.Addon className="addon-white">
              <Glyphicon glyph="pencil" />
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const selectInput = (field, i) => {
    let options = [{ value: field.default, label: field.default }];
    let defaultValue = field.default ? options[0] : 'Select ...';

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        {checkboxInput(field, i)}
        <div className="grouped-addons">
          <Select
            name={field.key}
            key={field.key}
            clearable={false}
            disabled={true}
            options={options}
            value={defaultValue}
          />
        </div>
      </FormGroup>
    );
  }

  const textWithAddOnInput = (field, type, i, tab = false) => {
    let label = (<ControlLabel>{field.label}</ControlLabel>);
    if (tab) { label = ''; }

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        {label}
        {checkboxInput(field, i)}
        <div className="grouped-addons">
          <InputGroup>
            <FormControl
              type="text"
              key={`${field.key}-${i}-${type}`}
              value={field.default}
              disabled={true}
            />
            <InputGroup.Addon>{field.addon}</InputGroup.Addon>
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const textWithAddOnWithoutLabelInput = (field, type, i, color = 'grey') => {
    return (
      <FormGroup key={`${field.key}-${field.label}`}>
        <InputGroup>
          <FormControl
            type="text"
            key={`${field.key}-${i}-${type}`}
            value={field.default}
            disabled={true}
          />
          <InputGroup.Addon className={`addon-${color}`}>{field.addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  const textareaInput = (field, type, i) => {
    const infoButton = (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id="private-note">Only you can see this note</Tooltip>
        }
      >
        <span className="glyphicon glyphicon-info-sign with-padding" />
      </OverlayTrigger>
    );

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>
          {field.label}
          {type == 'privat_note' ? infoButton : ''}
        </ControlLabel>
        {checkboxInput(field, i)}
        <FormControl
          componentClass="textarea"
          value={field.default}
          rows={field.rows}
          disabled={true}
          key={`${field.key}-${i}-${type}`}
        />
      </FormGroup>
    );
  }

  const textInput = (field, type, i) => {
    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        {checkboxInput(field, i)}
        <FormControl
          id={`input_${field.key}`}
          type="text"
          key={`${field.key}-${i}-${type}`}
          disabled={true}
          value={field.default}
        />
      </FormGroup>
    );
  }

  const showCheckboxInput = (field, i) => {
    return (
      <FormGroup key={`${field.key}-${field.label}-checkbox`} className={`column-size-${field.column_size}`}>
        {checkboxInput(field, i, true)}
        <Checkbox
          key={`${field.key}-${i}-checkbox`}
          disabled={true}
        >
          {field.label}
        </Checkbox>
      </FormGroup>
    );
  }

  const checkboxInput = (field, i, showLabel = false) => {
    let label = field.label === undefined ? 'Show all fields of row' : (showLabel ? field.label : '');
    let rowCheckboxClassName = field.label === undefined ? ' full-row' : '';
    return (
      <Checkbox
        key={`${field.key}-${i}`}
        checked={field.visible}
        onChange={changeCheckboxField(field)}
        className={`checkbox-visibility${rowCheckboxClassName}`}
      >
        {label}
      </Checkbox>
    );
  }

  const fieldsByType = (field, fields, i, tab = false) => {
    switch (field.type) {
      case 'text':
        fields.push(textInput(field, 'text', i));
        break;
      case 'textarea':
      case 'privat_note':
        fields.push(textareaInput(field, field.type, i));
        break;
      case 'cas':
        fields.push(casInput(field, 'cas', i));
        break;
      case 'moleculeSelect':
        fields.push(muleculeInput(field, 'moleculeSelect', i));
        break;
      case 'select':
      case 'solventSelect':
        fields.push(selectInput(field, i));
        break;
      case 'checkbox':
        fields.push(showCheckboxInput(field, 'checkbox', i));
        break;
      case 'textWithAddOn':
      case 'system-defined':
        fields.push(textWithAddOnInput(field, 'textWithAddOn', i, tab));
        break;
      case 'amount':
        fields.push(amountInput(field, 'amount', i));
        break;
      default:
        fields.push(textInput(field, 'text', i));
    }
    return fields;
  }

  const tabsWithInput = (sub_fields, i) => {
    let tabs = [];
    let tabId = '';
    sub_fields.map((sub_field) => {
      tabId += `-${sub_field.key}`;
      tabs.push(
        <Tab eventKey={sub_field.key} title={sub_field.label} key={`tab-${sub_field.key}-${sub_field.label}`}>
          {fieldsByType(sub_field, [], i, true)}
        </Tab>
      );
    });

    return (
      <Tabs
        id={`tab${tabId}`}
        className={`tab column-size-${sub_fields[0].column_size}`}
        defaultActiveKey={sub_fields[0].key}
        key={`tabs-${tabId}`}>
        {tabs}
      </Tabs>
    );
  }

  const sectionHeadline = (section) => {
    if (section.label === '') { return '' }

    return (
      <div className="section-headline" key={section.key}>{section.label}</div>
    );
  }

  const groupedRowFields = (rowClassName, rowFields, index) => {
    return (
      <div className={rowClassName} key={`${rowClassName}-${index}`}>{rowFields}</div>
    );
  }

  const MapElementStructure = () => {
    if (!elementType || !elementStructure) { return ''; }

    let fields = [];
    let index = 1;

    elementStructure.map((section, i) => {
      let sectionFields = [];
      let toggleClass = section.toggle == true ? ' toggle' : '';
      if (section.label == '' && i !== 0) {
        sectionFields.push(<hr className='section-spacer' key={`spacer-${i}`} />);
      }
      sectionFields.push(sectionHeadline(section));

      section.rows.map((row, j) => {
        let rowClassName = `grouped-fields-row cols-${row.cols}`;
        let rowFields = [];
        if (row.cols !== 1 && row.visible !== undefined) {
          rowFields.push(checkboxInput(row, j));
        }

        row.fields.map((field, k) => {
          let subFields = [];
          if (field.sub_fields && field.type == 'tab') {
            subFields.push(tabsWithInput(field.sub_fields, index));
            index += 1;
          } else {
            fieldsByType(field, subFields, index);
            index += 1;
          }
          rowFields.push(subFields);
          index += 1;
        });
        sectionFields.push(groupedRowFields(rowClassName, rowFields, index));
        fields.push(<div className={`section${toggleClass}`} key={`section-${i}-${j}`}>{sectionFields}</div>);
        sectionFields = [];
      });
    });
    return fields;
  }

  return (
    <Draggable handle=".handle">
      <Modal
        show={elementFormTypesStore.editorModalVisible}
        onHide={() => elementFormTypesStore.handleCancel()}
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
              onClick={() => elementFormTypesStore.toggleModalMinimized()} />
          </div>
        </Modal.Header>
        <Modal.Body>
          <div className={`form-container${minimizedClass}`}>
            <div className="form-fields">
              <div className="scrollable-content">
                {MapElementStructure()}
              </div>
              <ButtonToolbar className="form-editor-buttons">
                <Button bsStyle="warning" onClick={() => elementFormTypesStore.handleCancel()}>
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

export default observer(ElementFormTypeEditorModal);
