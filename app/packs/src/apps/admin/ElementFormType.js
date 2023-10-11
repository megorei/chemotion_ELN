import React, { useContext, useEffect } from 'react';
import {
  Table, Button, Modal, Form, FormGroup, InputGroup, FormControl,
  Checkbox, OverlayTrigger, Tooltip, Popover, Alert
} from 'react-bootstrap';
import Select from 'react-select';
import JSONInput from 'react-json-editor-ajrm';
import ElementFormTypeEditorModal from 'src/components/elementFormTypes/ElementFormTypeEditorModal';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const ElementFormType = () => {
  const elementFormTypesStore = useContext(StoreContext).elementFormTypes;
  let tbody = null;
  const editTooltip = <Tooltip id="edit_tooltip">Edit Element form type</Tooltip>;
  const jsonTooltip = <Tooltip id="json_tooltip">Edit JSON</Tooltip>;
  const formTooltip = <Tooltip id="form_tooltip">Edit form fields</Tooltip>

  const deletePopover = (id, name) => {
    return (
      <Popover id="popover-positioned-scrolling-left">
        Delete {name}<br />
        <div className="btn-toolbar">
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => deleteElementFormType(id)}>
            Yes
          </Button>
          &nbsp;&nbsp;
          <Button bsSize="xsmall" bsStyle="warning" >
            No
          </Button>
        </div>
      </Popover>
    );
  }

  useEffect(() => {
    elementFormTypesStore.load();
  }, []);

  const openModal = (content, id, type) => {
    if (content == 'form') {
      elementFormTypesStore.showEditorModal(type, id);
    } else {
      elementFormTypesStore.showAdminModal();
      elementFormTypesStore.changeAdminModalContent(content, id);
    }
  }

  const saveElementFormType = () => {
    elementFormTypesStore.changeErrorMessage('Please type in a name and select an Element');

    if (elementFormTypesStore.elementFormType.name !== '' && elementFormTypesStore.elementFormType.element_type !== '') {
      if (elementFormTypesStore.adminModalContent == 'add-object') {
        elementFormTypesStore.createElementFormType(elementFormTypesStore.elementFormType);
      } else {
        elementFormTypesStore.updateElementFormType(elementFormTypesStore.elementFormType);
      }

      elementFormTypesStore.handleAdminCancel();
      elementFormTypesStore.changeErrorMessage('');
    }
  }

  const deleteElementFormType = (id) => {
    elementFormTypesStore.deleteElementFormType(id);
  }

  const showErrorMessage = () => {
    if (elementFormTypesStore.errorMessage) {
      return <Alert bsStyle="danger" className='element-form-type-alert'>{elementFormTypesStore.errorMessage}</Alert>;
    }
  }

  const showSuccessMessage = () => {
    if (elementFormTypesStore.showSuccessMessage) {
      return <Alert bsStyle="success" className='element-form-type-success'>Sucessfully saved</Alert>;
    }
  }

  const modalTitleByContent = () => {
    switch (elementFormTypesStore.adminModalContent) {
      case 'edit-object':
        return 'Edit Element Form Type';
        break;
      case 'add-object':
        return 'Add new Element Form Type';
        break;
      case 'json':
        return 'Edit json';
        break;
    }
  }

  const contentForm = () => {
    switch (elementFormTypesStore.adminModalContent) {
      case 'edit-object':
      case 'add-object':
        return ElementFormTypeForm();
        break;
      case 'json':
        return StructureJsonForm();
        break;
    }
  }

  const fieldValue = (field, e) => {
    switch (field) {
      case 'name':
      case 'description':
        return e.target.value;
        break;
      case 'element_type':
        return e.value;
        break;
      case 'enabled':
        return e.target.checked;
        break;
      case 'structure':
        return e.jsObject;
        break;
    }
  }

  const onChange = (field) => (e) => {
    let value = fieldValue(field, e);
    let elementFormType = { ...elementFormTypesStore.elementFormType }
    elementFormType[field] = value;
    elementFormTypesStore.addElementFormTypeValues(elementFormType);
  }

  const ElementFormTypeForm = () => {
    const elementOptions = [
      { label: 'Sample', value: 'sample' },
    ];

    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlName">
          <InputGroup className='element-form-type-group'>
            <InputGroup.Addon className='element-form-type-label'>Name *</InputGroup.Addon>
            <FormControl type="text" name="name" value={elementFormTypesStore.elementFormType.name} onChange={onChange('name')} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlDescription">
          <InputGroup className='element-form-type-group'>
            <InputGroup.Addon className='element-form-type-label'>Description</InputGroup.Addon>
            <FormControl type="text" name="description" value={elementFormTypesStore.elementFormType.description} onChange={onChange('description')} />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlElementType">
          <InputGroup className='element-form-type-group'>
            <InputGroup.Addon className='element-form-type-label'>Element *</InputGroup.Addon>
            <Select
              name="element_type"
              options={elementOptions}
              placeholder="Select Element"
              value={elementFormTypesStore.elementFormType.element_type}
              isClearable={true}
              onChange={onChange('element_type')}
            />
          </InputGroup>
        </FormGroup>
        <FormGroup controlId="formControlEnabled">
          <Checkbox inline type="checkbox" name="enabled" checked={elementFormTypesStore.elementFormType.enabled} onChange={onChange('enabled')}>Enable globally</Checkbox>
        </FormGroup>
        <FormGroup>
          <span>* Required</span>
        </FormGroup>
        <FormGroup>
          <Button bsStyle="warning" onClick={elementFormTypesStore.handleAdminCancel} >
            Cancel&nbsp;
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => saveElementFormType()} >
            Save&nbsp;
            <i className="fa fa-save" />
          </Button>
        </FormGroup>
      </Form>
    );
  }

  const StructureJsonForm = () => {
    return (
      <Form horizontal className="input-form">
        <FormGroup controlId="formControlName">
          <b>
            Name:&nbsp;
            {elementFormTypesStore.elementFormType.name}
          </b>
        </FormGroup>
        <FormGroup controlId="formControlJson">
          <JSONInput
            placeholder={elementFormTypesStore.elementFormType.structure}
            width="100%"
            onChange={onChange('structure')}
          />
        </FormGroup>
        <FormGroup>
          <Button bsStyle="warning" onClick={elementFormTypesStore.handleAdminCancel} >
            Cancel&nbsp;
          </Button>
          &nbsp;
          <Button bsStyle="primary" onClick={() => saveElementFormType()} >
            Save&nbsp;
            <i className="fa fa-save" />
          </Button>
        </FormGroup>
      </Form>
    );
  }

  const renderModal = () => {
    return (
      <Modal show={elementFormTypesStore.adminModalVisible} onHide={elementFormTypesStore.handleAdminCancel}>
        <Modal.Header closeButton><Modal.Title>{modalTitleByContent()}</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            {showErrorMessage()}
            {contentForm()}
          </div>
        </Modal.Body>
      </Modal>
    );
  }

  const renderList = () => {
    if (elementFormTypesStore.elementFormTypes.length >= 1) {
      tbody = Object.values(elementFormTypesStore.elementFormTypes).map((row, i) => {
        return (
          <tbody key={`tbody_${row.id}`}>
            <tr key={`row_${row.id}`} id={`row_${row.id}`} style={{ fontWeight: 'bold' }}>
              <td>{i + 1}</td>
              <td>
                <OverlayTrigger placement="bottom" overlay={editTooltip} >
                  <Button
                    bsSize="xsmall"
                    bsStyle="info"
                    onClick={() => openModal('edit-object', row.id, row.element_type)}
                  >
                    <i className="fa fa-pencil-square-o" />
                  </Button>
                </OverlayTrigger>
                &nbsp;
                <OverlayTrigger placement="bottom" overlay={formTooltip} >
                  <Button
                    bsSize="xsmall"
                    bsStyle="primary"
                    onClick={() => openModal('form', row.id, row.element_type)}
                  >
                    <i className="fa fa-cog" />
                  </Button>
                </OverlayTrigger>
                &nbsp;
                <OverlayTrigger placement="bottom" overlay={jsonTooltip} >
                  <Button
                    bsSize="xsmall"
                    onClick={() => openModal('json', row.id, row.element_type)}
                  >
                    <i className="fa fa-code" />
                  </Button>
                </OverlayTrigger>
                &nbsp;
                <OverlayTrigger
                  placement="bottom"
                  overlay={deletePopover(row.id, row.name)}
                  trigger="focus"
                  root
                >
                  <Button bsSize="xsmall" bsStyle="danger">
                    <i className="fa fa-trash-o" />
                  </Button>
                </OverlayTrigger>
              </td>
              <td>{row.name}</td>
              <td>{row.description}</td>
              <td>{row.element_type}</td>
              <td>{row.enabled === true ? 'true' : 'false'}</td>
            </tr>
          </tbody>
        );
      });
      return tbody;
    }
  }

  return (
    <>
      <Button bsStyle="primary" bsSize="small" className="element-form-type-add-button" onClick={() => openModal('add-object', null)} data-cy="create-element-form-type">
        New Element Form Type&nbsp;
        <i className="fa fa-plus" />
      </Button>
      {showSuccessMessage()}
      <Table responsive condensed hover>
        <thead>
          <tr style={{ backgroundColor: '#ddd' }}>
            <th width="5%">#</th>
            <th width="15%">Actions</th>
            <th width="20%">Name</th>
            <th width="30%">Description</th>
            <th width="20%">Element type</th>
            <th width="10%">Enabled</th>
          </tr>
        </thead>
        {renderList()}
      </Table>
      {renderModal()}
      <ElementFormTypeEditorModal />
    </>
  );
};

export default observer(ElementFormType);
