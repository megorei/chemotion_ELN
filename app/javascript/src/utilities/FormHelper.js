import React from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Button, Form, Row, Col,
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import DatePicker from 'react-datepicker';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import Dropzone from 'react-dropzone';
import moment from 'moment';
import { v4 as uuid } from 'uuid';

import { elementShowOrNew } from 'src/utilities/routesUtils';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

const unitSystems = {
  activity: [
    { key: "u", label: "U", nm: 0.05 },
    { key: "mu", label: "mU", nm: 1000 },
    { key: "kat", label: "kat", nm: 0.00000000002 },
    { key: "mkat", label: "mkat", nm: 1000 },
    { key: "µkat", label: "µkat", nm: 1000 },
    { key: "nkat", label: "nkat", nm: 1000 },
  ],
  activity_x: [
    { key: "u", label: "U", nm: 1.67e-8 },
    { key: "mu", label: "mU", nm: 1.67e-11 },
    { key: "kat", label: "kat", nm: 1 },
    { key: "mkat", label: "mkat", nm: 1e-3 },
    { key: "µkat", label: "µkat", nm: 1e-6 },
    { key: "nkat", label: "nkat", nm: 1e-9 },
  ],
  amount_substance: [
    { key: "mol", label: "mol", nm: 0.000000000001 },
    { key: "mmol", label: "mmol", nm: 1000 },
    { key: "umol", label: "µmol", nm: 1000 },
    { key: "nmol", label: "nmol", nm: 1000 },
    { key: "pmol", label: "pmol", nm: 1000 },
  ],
  amount_weight: [
    { "key": "g", "label": "g", "nm": 0.001 },
    { "key": "kg", "label": "kg", "nm": 0.001 },
    { "key": "ug", "label": "µg", "nm": 1000000000 },
    { "key": "mg", "label": "mg", "nm": 0.001 },
  ],
  concentration: [
    { key: "ng_l", label: "ng/L", nm: 1000000 },
    { key: "mg_l", label: "mg/L", nm: 0.001 },
    { key: "g_l", label: "g/L", nm: 0.001 },
  ],
  activity_ul: [
    { key: "u_l", label: "U/L", nm: 100 },
    { key: "u_ml", label: "U/mL", nm: 0.01 },
  ],
  activity_ug: [
    { key: "u_g", label: "U/g", nm: 1000 },
    { key: "u_mg", label: "U/mg", nm: 0.001 },
  ],
  // mass_molecule: [
  //   { key: "dalton", label: "D", nm: 0.001 },
  //   { key: "kilo_dalton", label: "kD", nm: 1000 },
  // ],
  molarity: [
    { key: "mol_l", label: "mol/L", nm: 0.000000000001 },
    { key: "mmol_l", label: "mmol/L", nm: 1000 },
    { key: "umol_l", label: "µmol/L", nm: 1000 },
    { key: "nmol_l", label: "nmol/L", nm: 1000 },
    { key: "pmol_l", label: "pmol/L", nm: 1000 },
  ],
  molecular_weight: [
    { key: 'g_mol', label: 'g/mol' },
  ],
  volumes: [
    { key: "l", label: "l", nm: 0.000000001 },
    { key: "ml", label: "ml", nm: 1000 },
    { key: "ul", label: "µl", nm: 1000 },
    { key: "nl", label: "nl", nm: 1000 },
  ],
};

const inputByType = (object, field, index, formHelper) => {
  const fullFieldName = `${field}.${index}.${object.value}`
  switch (object.type) {
    case 'text':
      return formHelper.textInput(fullFieldName, '', object.info);
    case 'select':
      return formHelper.selectInput(fullFieldName, '', object.options, object.info);
  } 
}

const labelWithInfo = (label, info) => {
  if (label === '') { return null; }

  let formLabel = <Form.Label>{label}</Form.Label>;

  if (info) {
    formLabel = (
      <OverlayTrigger
        placement="top"
        overlay={<Tooltip id={uuid()}>{info}</Tooltip>}
      >
        <Form.Label>{label}</Form.Label>
      </OverlayTrigger>
    );
  }
  return formLabel;
}

const elementField = (element, field) => {
  let fieldParts = field.split('.');
  return fieldParts.reduce((accumulator, currentValue) => accumulator?.[currentValue], element);
}

const numberValue = (value) => {
  if (value === '' || value === undefined) { return ''; }

  let cleanedValue = value;
  let changeToFloat = typeof cleanedValue === 'number';

  if (typeof value === 'string') {
    cleanedValue = value.replace(/[^0-9.,]/g, '').replace(/,/g, '.');

    const points = cleanedValue.split('.');
    cleanedValue = points.length > 2 ? `${points[0]}.${points[1]}` : cleanedValue;
    const lastChar = cleanedValue.charAt(cleanedValue.length - 1);
    changeToFloat = lastChar !== '.' && lastChar !== '0';
  }

  return changeToFloat ? parseFloat(cleanedValue) : cleanedValue;
}

const changeElement = (store, field, value, element_type) => {
  if (element_type == 'device_description') {
    store.changeDeviceDescription(field, value);
  }
  if (element_type == 'sequence_based_macromolecule') {
    store.changeSequenceBasedMacromolecule(field, value);
  }
}

const addRow = (store, element, field, rowFields) => {
  let newRow = {};
  rowFields.map((f) => {
    newRow[f.value] = '';
  });

  const fieldArray = elementField(element, field) || [];
  const value = fieldArray.concat(newRow);
  changeElement(store, field, value, element.type);
}

const deleteRow = (store, element, field, index) => {
  const fieldArray = elementField(element, field);
  fieldArray.splice(index, 1);
  changeElement(store, field, fieldArray, element.type);
}

// const handleFieldChanged = (store, field, field_type, element_type) => (event) => {
//   let value = event === null ? '' : valueByType(field_type, event);
//   changeElement(store, field, value, element_type);
// }

const changeUnit = (store, element, units, field, value, unitField, unitValue) => {
  const activeUnitIndex = units.findIndex((f) => { return f.label === unitValue });
  const nextUnitIndex = activeUnitIndex === units.length - 1 ? 0 : activeUnitIndex + 1;
  const newUnitValue = units[nextUnitIndex].label;

  if (unitValue === newUnitValue) { return null; }

  let newValue = value * units[nextUnitIndex].nm;
  newValue = parseFloat(newValue.toFixed(5));

  //const fromFactor = unitSystems['activity_x'][activeUnitIndex].nm;
  //const toFactor = unitSystems['activity_x'][nextUnitIndex].nm;

  //const convertedValue = value * (fromFactor / toFactor);
  //console.log(fromFactor, toFactor, convertedValue);

  changeElement(store, unitField, newUnitValue, element.type);
  changeElement(store, field, newValue, element.type);
}

const initFormHelper = (element, store) => {
  const formHelper = {
    textInput: (field, label, info) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}-group`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            type="text"
            key={`${store.key_prefix}-${field}`}
            value={value}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
        </Form.Group>
      );
    },

    checkboxInput: (field, label) => {
      const value = elementField(element, field);
      return (
        <Form.Check
          type="checkbox"
          id={field}
          key={`${store.key_prefix}-${field}`}
          label={label}
          checked={value}
          onChange={(event) => formHelper.onChange(field, event.target.checked)}
        />
      );
    },

    selectInput: (field, label, options, info) => {
      const elementValue = elementField(element, field);
      let value = options.find((o) => { return o.value == elementValue });
      value = value === undefined ? '' : value;

      return (
        <Form.Group key={`${store.key_prefix}-${label}-group`}>
          {labelWithInfo(label, info)}
          <Select
            name={field}
            key={`${store.key_prefix}-${field}`}
            options={options}
            value={value}
            isClearable={true}
            onChange={(event) => formHelper.onChange(field, (event?.value || event?.label || ''))}
          />
        </Form.Group>
      );
    },

    numberInput: (field, label, info) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            type="text"
            key={`${store.key_prefix}-${field}`}
            value={numberValue(value)}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
        </Form.Group>
      );
    },

    textareaInput: (field, label, rows, info) => {
      const value = elementField(element, field);
      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <Form.Control
            name={field}
            as="textarea"
            key={`${store.key_prefix}-${field}`}
            value={value || ''}
            rows={rows}
            onChange={(event) => formHelper.onChange(field, event.target.value)}
          />
        </Form.Group>
      );
    },

    inputGroupTextOrNumericInput: (field, label, text, type, info) => {
      let value = elementField(element, field);
      value = type == 'number' ? numberValue(value) : value || '';

      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <InputGroup key={`${store.key_prefix}-${label}-${text}`}>
            <InputGroup.Text key={`${store.key_prefix}-${text}`}>{text}</InputGroup.Text>
            <Form.Control
              name={field}
              type="text"
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              onChange={(event) => formHelper.onChange(field, event.target.value)}
            />
          </InputGroup>
        </Form.Group>
      );
    },

    unitInput: (field, label, option_type, info) => {
      const value = numberValue(elementField(element, field));
      const units = unitSystems[option_type];
      if (!units) { return null; }

      const unitField = `${field}_unit`;
      const unitValue = elementField(element, unitField) || units[0].label;

      let unitTextOrButton = (
        <InputGroup.Text key={`${store.key_prefix}-${units}`}>{units[0].label}</InputGroup.Text>
      );

      if (units.length > 1) {
        unitTextOrButton = (
          <Button
            key={`${units}-${field}-unit`}
            variant="success"
            onClick={() => changeUnit(store, element, units, field, value, unitField, unitValue)}
          >
            {unitValue}
          </Button>
        );
      }

      return (
        <Form.Group key={`${store.key_prefix}-${label}-${option_type}`}>
          {labelWithInfo(label, info)}
          <InputGroup key={`${store.key_prefix}-${label}-${field}`}>
            <Form.Control
              name={field}
              type="text"
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              onChange={(event) => formHelper.onChange(field, event.target.value, 'number')}
              className="flex-grow-1"
            />
            {unitTextOrButton}
          </InputGroup>
        </Form.Group>
      );
    },

    addRowButton: (field, rowFields) => {
      return (
        <Button
          size="xxsm"
          variant="primary"
          onClick={() => addRow(store, element, field, rowFields)}
          className="me-2 mb-2"
        >
          <i className="fa fa-plus" />
        </Button>
      );
    },

    deleteRowButton: (field, i) => {
      return (
        <Button
          size="sm"
          variant="danger"
          onClick={() => deleteRow(store, element, field, i)}
          className="py-2"
        >
          <i className="fa fa-trash-o" />
        </Button>
      );
    },

    multipleRowInput: (field, rowFields, headline) => {
      let rows = [];
      let headerCols = [];
      let colWidth = Math.round(12 / rowFields.length);
      const fieldArray = elementField(element, field);

      if (fieldArray) {
        fieldArray.map((row, i) => {
          let fields = [];

          rowFields.map((entry, j) => {
            const col = j === 0 ? colWidth - 1 : colWidth;
            fields.push(
              <Col xs={col}>
                {inputByType(entry, field, i, formHelper)}
              </Col>
            );
          });

          rows.push(
            <Row className="mb-2" key={`${row}-${i}`}>
              <Col>
                {formHelper.deleteRowButton(field, i)}
              </Col>
              {fields}
            </Row>
          );
        });
      }

      rowFields.map((entry, j) => {
        const col = j === 0 ? colWidth - 1 : colWidth;
        headerCols.push(<Col xs={col} className="fw-bold">{entry.label}</Col>);
      });

      return (
        <div className="mb-4">
          <h5 className="mb-3">{headline}</h5>
          <Row className="border-bottom mb-3">
            <Col>
              {formHelper.addRowButton(field, rowFields)}
            </Col>
            {headerCols}
          </Row>
          {rows}
        </div>
      );
    },

    dropzone: (field, onDrop) => {
      return (
        <Dropzone onDrop={() => onDrop(field)} className="attachment-dropzone">
          Drop files here, or click to upload.
        </Dropzone>
      );
    },

    dropAreaForElement: (dropType, handleDrop, field, description) => {
      const [{ isOver, canDrop }, drop] = useDrop({
        accept: DragDropItemTypes[dropType],
        collect: (monitor) => ({
          isOver: monitor.isOver(),
          canDrop: monitor.canDrop(),
        }),
        drop: (item) => {
          handleDrop(item, field);
        },
      });

      return (
        <div
          key={`element-dropzone-${dropType}`}
          ref={(node) => drop(node)}
          className={`p-2 dnd-zone text-center text-gray-600 ${isOver && canDrop ? 'dnd-zone-over' : ''}`}
        >
          {description}
        </div>
      );
    },

    onChange: (field, value, type) => {
      const newValue = type && type === 'number' ? numberValue(value) : value;
      changeElement(store, field, newValue, element.type);
    },
  };
  return formHelper;
}



const ButtonOrAddOn = (units, value, column, option, subFieldId) => {
  if (units.length > 1) {
    return (
      <Button key={units} variant="success"
        dangerouslySetInnerHTML={{ __html: value }}
        onClick={changeUnit(units, value, column, option, subFieldId)} />
    );
  } else {
    return (
      <InputGroup.Text dangerouslySetInnerHTML={{ __html: value }} />
    );
  }
}

const systemDefinedInput = (option, type, selectedValue, column, keyLabel) => {
  let systemOptions = unitsSystem.fields.find((u) => { return u.field === option.option_layers });
  let units = systemOptions.units;
  let value = selectedValue ? selectedValue[column].unit : units[0].label;
  let validationState = selectedValue !== undefined ? selectedValue[column].validationState : null;
  return (
    <Form.Group key={`${column}-${keyLabel}-${type}`}>
      {labelWithInfo(option)}
      <InputGroup>
        <Form.Control
          id={`input_${column}`}
          type="text"
          key={`${column}-${keyLabel}`}
          value={selectedValue ? selectedValue[column].value : ''}
          onChange={handleFieldChanged(option, column, type)}
          className={validationState}
        />
        {ButtonOrAddOn(units, value, column, option, '')}
      </InputGroup>
    </Form.Group>
  );
}


const allowedAnnotationFileTypes = ['png', 'jpg', 'bmp', 'tif', 'svg', 'jpeg', 'tiff'];

const annotationButton = (store, attachment) => {
  if (!attachment || !attachment.filename) { return null; }

  const extension = attachment.filename.split('.').pop();
  const isAllowedFileType = allowedAnnotationFileTypes.includes(extension);
  const isActive = isAllowedFileType && !attachment.isNew;
  const className = !isAllowedFileType ? 'attachment-gray-button' : '';
  const tooltipText = isActive
    ? 'Annotate image'
    : 'Cannot annotate - invalid file type or the image is new';

  return (
    <OverlayTrigger
      placement="top"
      overlay={<Tooltip id="annotate_tooltip">{tooltipText}</Tooltip>}
    >
      <span>
        <Button
          size="xs"
          variant="warning"
          className={`attachment-button-size ${className}`}
          onClick={() => {
            if (isActive) {
              store.toogleAttachmentModal();
              store.setAttachmentSelected(attachment);
            }
          }}
          disabled={!isActive}
        >
          <i className="fa fa-pencil-square-o" aria-hidden="true" />
        </Button>
      </span>
    </OverlayTrigger>
  );
}

const handleClickOnUrl = (type, id) => {
  const { currentCollection, isSync } = UIStore.getState();
  const uri = isSync
    ? `/scollection/${currentCollection.id}/${type}/${id}`
    : `/collection/${currentCollection.id}/${type}/${id}`;
  Aviator.navigate(uri, { silent: true });
  const e = { type, params: { collectionID: currentCollection.id } };
  e.params[`${type}ID`] = id;
  elementShowOrNew(e);

  return null;
}

const datePickerInput = (element, store, field, label, info) => {
  const value = elementFieldValue(element, field);
  const selectedDate = value ? value : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'date', element.type)}
        popperPlacement="bottom-start"
        isClearable
        dateFormat="dd-MM-YY"
      />
    </Form.Group>
  );
}

const timePickerInput = (element, store, field, label, info) => {
  const value = elementFieldValue(element, field);
  const selectedDate = value ? value : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'time', element.type)}
        popperPlacement="bottom-start"
        isClearable
        showTimeSelect
        showTimeSelectOnly
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="HH:mm"
      />
    </Form.Group>
  );
}

const dateTimePickerInput = (element, store, field, label, info) => {
  const selectedDate = element[field] ? new Date(element[field]) : null;

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <DatePicker
        isClearable
        showTimeSelect
        timeFormat="HH:mm"
        timeIntervals={15}
        timeCaption="Time"
        dateFormat="dd/MM/yyyy HH:mm"
        placeholderText="dd/MM/YYYY HH:mm"
        popperPlacement="bottom-end"
        selected={selectedDate}
        onChange={handleFieldChanged(store, field, 'datetime', element.type)}
      />
    </Form.Group>
  );
}



export { initFormHelper, }
