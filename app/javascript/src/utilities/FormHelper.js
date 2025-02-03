import React from 'react';
import {
  InputGroup, OverlayTrigger, Tooltip, Button, Form, Row, Col,
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import DatePicker from 'react-datepicker';
import { useDrop } from 'react-dnd';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ChevronIcon from 'src/components/common/ChevronIcon';
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
    { "key": "ug", "label": "µg", "nm": 1000000000 },
    { "key": "mg", "label": "mg", "nm": 0.001 },
    { "key": "g", "label": "g", "nm": 0.001 },
    { "key": "kg", "label": "kg", "nm": 0.001 },
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
            type="number"
            key={`${store.key_prefix}-${field}`}
            value={value !== '' ? parseFloat(value) : ''}
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
      value = type == 'number' && value !== '' ? parseFloat(value) : value;

      return (
        <Form.Group key={`${store.key_prefix}-${label}`}>
          {labelWithInfo(label, info)}
          <InputGroup key={`${store.key_prefix}-${label}-${text}`}>
            <InputGroup.Text key={`${store.key_prefix}-${text}`}>{text}</InputGroup.Text>
            <Form.Control
              name={field}
              type={type}
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              onChange={(event) => formHelper.onChange(field, event.target.value)}
            />
          </InputGroup>
        </Form.Group>
      );
    },

    unitInput: (field, label, option_type, type, info) => {
      // "molecular_weight" => g/mol
      // const { unitsSystem } = UserStore.getState();
      // console.log(unitsSystem.fields);
      // const systemOptions = unitsSystem?.fields.find((u) => { return u.field === option_type });
      // const units = systemOptions?.units;
      let value = elementField(element, field);
      value = type == 'number' && value !== '' ? parseFloat(value) : value;
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
              type={type}
              key={`${store.key_prefix}-${field}`}
              value={value || ''}
              onChange={(event) => formHelper.onChange(field, event.target.value)}
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

    onChange: (field, value) => {
      changeElement(store, field, value, element.type);
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





const valueByType = (type, event) => {
  let value = [];
  switch (type) {
    case 'text':
    case 'textarea':
    case 'textWithAddOn':
    case 'system-defined':
    case 'formula-field':
    case 'subGroupWithAddOn':
    case 'numeric':
      return event.target.value;
    case 'checkbox':
      return event.target.checked;
    case 'select':
      return event.value ? event.value : event.label;
    case 'multiselect':
      event.forEach((element) => {
        element?.value ? value.push(element.value) : value.push(element)
      });
      return value;
    case 'datetime':
      return moment(event, 'YYYY-MM-DD HH:mm:ss').toISOString();
    case 'date':
      return moment(event, 'YYYY-MM-DD').toISOString();
    case 'time':
      return moment(event, 'HH:mm').toISOString();
    default:
      return event;
  }
}

const fieldByType = (option, field, fields, element, store, info) => {
  switch (option.type) {
    case 'text':
      fields.push(textInput(element, store, field, option.label, info));
      break;
    case 'textarea':
      fields.push(textareaInput(element, store, field, option.label, option.rows, info));
      break;
    case 'checkbox':
      fields.push(checkboxInput(element, option.label, field, store));
      break;
    case 'select':
      fields.push(selectInput(element, store, field, option.label, option.options, info));
      break;
    case 'numeric':
      fields.push(numericInput(element, store, field, option.label, option.type, info));
      break;
    case 'time':
      fields.push(timePickerInput(element, store, field, option.label, info));
      break;
    case 'date':
      fields.push(datePickerInput(element, store, field, option.label, info))
      break;
  }
  return fields;
}



const toggleContent = (store, content) => {
  store.toggleContent(content);
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

const headlineWithToggle = (store, type, text) => {
  const direction = store.toggable_contents[type] ? 'down' : 'right';
  return (
    <div
      className="d-flex justify-content-between align-items-center bg-gray-200 py-2 px-3 border-bottom"
      onClick={() => toggleContent(store, type)}
      role="button"
    >
      <div className="fw-bold fs-5">{text}</div>
      <ChevronIcon
        direction={direction}
        color="primary"
        className="fs-5"
      />
    </div>
  );
}





// const handleDropDeviceDescription = (item, element, store, field, type, index) => {
//   let elementField = { ...element[field] };
//   Object.entries(element[field][type][index]).map(([key, value]) => {
//     if (key === 'device_description_id') { 
//       elementField[type][index][key] = item.element.id;
//     } else if (key === 'url') {
//       elementField[type][index][key] = item.element.short_label;
//     } else if (item.element[key] !== undefined) {
//       elementField[type][index][key] = item.element[key];
//     }
//   });
//   store.changeDeviceDescription(field, elementField[type], type);
// }

// const DropAreaForComponent = ({ index, element, store, field, type }) => {
//   const [{ isOver, canDrop }, drop] = useDrop({
//     accept: DragDropItemTypes.DEVICE_DESCRIPTION,
//     collect: (monitor) => ({
//       isOver: monitor.isOver(),
//       canDrop: monitor.canDrop(),
//     }),
//     drop: (item) => {
//       handleDropDeviceDescription(item, element, store, field, type, index);
//     },
//   });
// 
//   return (
//     <div
//       key={`component-dropzone-${type}-${index}`}
//       ref={(node) => drop(node)}
//       className={`p-2 dnd-zone text-center text-gray-600 ${isOver && canDrop ? 'dnd-zone-over' : ''}`}
//     >
//       Drop device description here
//     </div>
//   );
// };

// const LinkedComponent = ({ element, entry }) => {
//   return (
//     <div>
//       <label className="form-label">{entry.label}</label>
//       <div className="form-control border-0">
//         <Button
//           tabIndex={0}
//           variant="link"
//           className="text-nowrap p-0"
//           onClick={() => handleClickOnUrl('device_description', element.device_description_id)}
//         >
//           {element.url}
//         </Button>  
//       </div>
//     </div>
//   );
// }

// const addComponent = (element, store, field, type, rowFields) => {
//   let newRow = {};
//   rowFields.map((f) => {
//     newRow[f.key] = '';
//   });
//   newRow['device_description_id'] = '';
// 
//   let elementField = { ...element[field] };
//   if (elementField === null || elementField[type] === undefined) {
//     elementField = { [type]: [] };
//   }
//   const value = elementField[type].concat(newRow);
//   store.changeDeviceDescription(field, value, type);
// }

// const deleteComponent = (element, store, field, type, i) => {
//   element[field][type].splice(i, (i >= 0 ? 1 : 0));
// 
//   store.changeDeviceDescription(field, element[field][type], type);
// }

// const addComponentButton = (element, store, field, type, rowFields) => {
//   return (
//     <Button
//       size="xxsm"
//       variant="primary"
//       onClick={() => addComponent(element, store, field, type, rowFields)}
//       className="me-2 mb-2"
//     >
//       <i className="fa fa-plus" />
//     </Button>
//   );
// }

// const deleteComponentButton = (element, store, field, type, i) => {
//   return (
//     <Button
//       size="sm"
//       variant="danger"
//       onClick={() => deleteComponent(element, store, field, type, i)}
//       className="p-2"
//     >
//       <i className="fa fa-trash-o" />
//     </Button>
//   );
// }

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

//const componentInput = (element, store, label, field, type, rowFields, info) => {
//  let components = [];

//  if (element[field] !== null && Object.keys(element[field]).length > 0 && element[field][type]) {
//    element[field][type].forEach((row, i) => {
//      let fields = [];
//      rowFields.map((entry, j) => {
//        if (row['device_description_id'] === '') {
//          fields = [
//            <DropAreaForComponent
//              index={i}
//              element={element}
//              store={store}
//              field={field}
//              type={type}
//              key={`droparea-for-component-${i}-${j}`}
//            />
//          ];
//        } else {
//          if (entry.key === 'url') {
//            fields.push(
//              <LinkedComponent element={element[field][type][i]} key={`linked-component-${i}-${j}`} entry={entry} />
//            )
//          } else {
//            fields.push(
//              textInput(element, store, `${field}-${type}-${entry.key}-${i}`, entry.label, '')
//            );
//          }
//        }
//      });

//      components.push(
//       <div className="multiple-row-fields components" key={`${row}-${i}`}>
//         {fields}
//         {deleteComponentButton(element, store, field, type, i)}
//       </div>
//     );
//   });
// }

//   return (
//     <Form.Group key={`${store.key_prefix}-${label}`}>
//       <div className="d-flex align-items-center">
//         {addComponentButton(element, store, field, type, rowFields)}
//         {labelWithInfo(label, info)}
//       </div>
//       {components}
//     </Form.Group>
//   );
// }

// const addRow = (element, field, rowFields, store) => {
//   const elementField = element[field] || [];
//   let newRow = {};
//   rowFields.map((f) => {
//     newRow[f.value] = '';
//   });
//   const value = elementField.concat(newRow);
//   if (store === 'DeviceDescriptionsStore') {
//     store.changeDeviceDescription(field, value);
//   }
// }

// const deleteRow = (element, field, store, i) => {
//   element[field].splice(i, (i >= 0 ? 1 : 0));
//   if (store === 'DeviceDescriptionsStore') {
//     store.changeDeviceDescription(field, element[field]);
//   }
// }

// const addRowButton = (element, field, rowFields, store) => {
//   return (
//     <Button
//       size="xxsm"
//       variant="primary"
//       onClick={() => addRow(element, field, rowFields, store)}
//       className="me-2 mb-2"
//     >
//       <i className="fa fa-plus" />
//     </Button>
//   );
// }

// const deleteRowButton = (element, field, store, i) => {
//   return (
//     <Button
//       size="sm"
//       variant="danger"
//       onClick={() => deleteRow(element, field, store, i)}
//       className="p-2"
//     >
//       <i className="fa fa-trash-o" />
//     </Button>
//   );
// }

// const mulipleRowInput = (element, store, label, field, rowFields, info) => {
//   let rows = [];
// 
//   if (element[field]) {
//     element[field].forEach((row, i) => {
//       let fields = [];
//       rowFields.map((entry, j) => {
//         fieldByType(entry, `${field}-${entry.value}-${i}`, fields, element, store, info);
//       });
// 
//       rows.push(
//         <div className="multiple-row-fields" key={`${row}-${i}`}>
//           {fields}
//           {deleteRowButton(element, field, store, i)}
//         </div>
//       );
//     });
//   }
// 
//   return (
//     <Form.Group key={`${store.key_prefix}-${label}`}>
//       <div className="d-flex align-items-center">
//         {addRowButton(element, field, rowFields, store)}
//         {labelWithInfo(label, info)}
//       </div>
//       {rows}
//     </Form.Group>
//   );
// }

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

// const checkboxInput = (element, label, field, store) => {
//   return (
//     <Form.Check
//       type="checkbox"
//       id={field}
//       key={`${store.key_prefix}-${field}`}
//       label={label}
//       checked={element[field]}
//       onChange={handleFieldChanged(store, field, 'checkbox', element.type)}
//     />
//   );
// }

const identifierMultipleInputGroups = (element, label, options, store, info) => {
  let formGroupKey = 'version_identifier_type_doi_url';
  let idOrNew = element.id !== '' ? element.id : 'new';

  return (
    <Form.Group key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        <InputGroup.Text key={`${element.type}-version_identifier_type`} className="py-0 my-0">
          {basicSelectInputWithSpecialLabel(element, store, 'version_identifier_type', 'Type', options, 'Type')}
        </InputGroup.Text>
        <Form.Control
          name="version_doi"
          type="text"
          key={`${store.key_prefix}-version_doi`}
          value={element.version_doi}
          onChange={handleFieldChanged(store, 'version_doi', 'text', element.type)}
        />
        <InputGroup.Text key={`${element.type}-version_doi_url`}>Link</InputGroup.Text>
        <Form.Control
          name="version_doi_url"
          type="text"
          key={`${store.key_prefix}-version_doi_url`}
          value={element.version_doi_url}
          onChange={handleFieldChanged(store, 'version_doi_url', 'text', element.type)}
        />
      </InputGroup>
    </Form.Group>
  );
}

const multipleInputGroups = (element, label, fields, store, info) => {
  let inputGroupForms = [];
  let formGroupKey = '';
  let idOrNew = element.id !== '' ? element.id : 'new';

  fields.forEach((field, i) => {
    formGroupKey += `-${field.value}`;
    inputGroupForms.push(<InputGroup.Text key={`${field.label}-${i}`}>{field.label}</InputGroup.Text>);
    if (field.type === 'select') {
      inputGroupForms.push(
        basicSelectInputWithSpecialLabel(element, store, field.value, field.label, field.options, '')
      );
    } else {
      inputGroupForms.push(
        <Form.Control
          name={field.value}
          type="text"
          key={`${store.key_prefix}${field.value}`}
          value={element[field.value]}
          onChange={handleFieldChanged(store, field.value, field.type, element.type)}
        />
      );
    }
  });

  return (
    <Form.Group key={`${store.key_prefix}-${idOrNew}-${formGroupKey}`}>
      {labelWithInfo(label, info)}
      <InputGroup key={`${store.key_prefix}-${idOrNew}-${formGroupKey}-group`}>
        {inputGroupForms}
      </InputGroup>
    </Form.Group>
  );
}

//const selectInput = (element, store, field, label, options, info) => {
//  const elementValue = elementFieldValue(element, store, field);
//  let value = options.find((o) => { return o.value == elementValue });
//  value = value === undefined ? '' : value;
//
//  return (
//    <Form.Group key={`${store.key_prefix}-${label}-group`}>
//      {labelWithInfo(label, info)}
//      <Select
//        name={field}
//        key={`${store.key_prefix}-${field}`}
//        options={options}
//        value={value}
//        isClearable={true}
//        onChange={handleFieldChanged(store, field, 'select', element.type)}
//      />
//    </Form.Group>
//  );
//}

const changeMenuStatus = (store, field, value) => {
  store.setSelectIsOpen(field, value);
}

const menuLabel = (option, field, store) => {
  const index = store.selectIsOpen.findIndex((object) => { return object[field] !== undefined });
  let label = option.label;

  if (index !== -1 && store.selectIsOpen[index][field] && option?.description) {
    label = `${option.label} ${option.description}`;
  }
  return label;
}

const basicSelectInputWithSpecialLabel = (element, store, field, label, options, placeholder) => {
  const elementValue = elementFieldValue(element, field);
  let value = options.find((o) => { return o.value == elementValue });
  value = value === undefined ? (placeholder ? placeholder : '') : value;

  return (
    <Select
      name={field.value}
      key={`${store.key_prefix}-${field}`}
      options={options}
      value={value}
      isClearable={true}
      placeholder={placeholder}
      className="select-in-inputgroup-text"
      classNamePrefix="select-in-inputgroup-text"
      getOptionLabel={(option) => menuLabel(option, field, store)}
      onMenuOpen={() => changeMenuStatus(store, field, true)}
      onMenuClose={() => changeMenuStatus(store, field, false)}
      onChange={handleFieldChanged(store, field, 'select', element.type)}
    />
  );
}

const multiSelectInput = (element, store, field, label, options, info) => {
  const elementValue = elementFieldValue(element, field);
  let value = [];
  if (elementValue !== null && elementValue.length >= 1) {
    elementValue.forEach((element) => value.push({ value: element, label: element }));
  }

  return (
    <Form.Group key={`${store.key_prefix}-${label}`}>
      {labelWithInfo(label, info)}
      <Select
        name={field}
        isMulti={true}
        key={`${store.key_prefix}-${field}`}
        options={options}
        value={value}
        isClearable={true}
        onChange={handleFieldChanged(store, field, 'multiselect', element.type)}
      />
    </Form.Group>
  );
}

// const textareaInput = (element, store, field, label, rows, info) => {
//   return (
//     <Form.Group key={`${store.key_prefix}-${label}`}>
//       {labelWithInfo(label, info)}
//       <Form.Control
//         name={field}
//         as="textarea"
//         key={`${store.key_prefix}-${field}`}
//         value={element[field] || ''}
//         rows={rows}
//         onChange={handleFieldChanged(store, field, 'textarea', element.type)}
//       />
//     </Form.Group>
//   );
// }

// const numericInput = (element, store, field, label, type, info) => {
//   let value = elementFieldValue(element, field);
// 
//   return (
//     <Form.Group key={`${store.key_prefix}-${label}`}>
//       {labelWithInfo(label, info)}
//       <Form.Control
//         name={field}
//         type="number"
//         key={`${store.key_prefix}-${field}`}
//         value={value !== '' ? parseFloat(value) : ''}
//         onChange={handleFieldChanged(store, field, type, element.type)}
//       />
//     </Form.Group>
//   );
// }

// const textInput = (element, store, field, label, info) => {
//   let value = elementFieldValue(element, field);
// 
//   return (
//     <Form.Group key={`${store.key_prefix}-${label}-group`}>
//       {labelWithInfo(label, info)}
//       <Form.Control
//         name={field}
//         type="text"
//         key={`${store.key_prefix}-${field}`}
//         value={value}
//         onChange={handleFieldChanged(store, field, 'text', element.type)}
//       />
//     </Form.Group>
//   );
// }

export {
  initFormHelper, multiSelectInput, multipleInputGroups,
  dateTimePickerInput, headlineWithToggle,
  annotationButton,
  identifierMultipleInputGroups, toggleContent,
}
