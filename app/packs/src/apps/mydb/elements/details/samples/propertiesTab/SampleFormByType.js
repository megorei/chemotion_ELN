import React, { useContext, useEffect, useRef } from 'react';
import {
  Button, ButtonToolbar, form, Checkbox, FormGroup, FormControl, InputGroup,
  OverlayTrigger, Tooltip, Glyphicon, ControlLabel, Tabs, Tab
} from 'react-bootstrap';
import Select from 'react-select3';
import CreatableSelect from 'react-select3/creatable';
import VirtualizedSelect from 'react-virtualized-select';
import ElementFormTypeEditorModal from 'src/components/elementFormTypes/ElementFormTypeEditorModal';
import PrivateNoteElement from 'src/apps/mydb/elements/details/PrivateNoteElement';
import { metPreConv } from 'src/utilities/metricPrefix';
import { useDrop } from 'react-dnd';
import DragDropItemTypes from 'src/components/DragDropItemTypes';
import UserStore from 'src/stores/alt/stores/UserStore';
import * as FieldOptions from 'src/components/staticDropdownOptions/options';
import { ionic_liquids } from 'src/components/staticDropdownOptions/ionic_liquids';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const SampleFormByType = ({ sample, parent, customizableField, enableDecoupled, decoupleMolecule }) => {
  const elementFormTypesStore = useContext(StoreContext).elementFormTypes;

  let elementType = elementFormTypesStore.elementFormType.element_type;
  let elementStructure = elementFormTypesStore.elementStructure.columns;
  let element = elementFormTypesStore.element;
  let units = elementFormTypesStore.activeUnits;
  let elementHasFocus = elementFormTypesStore.ElementHasFocus;
  
  const { unitsSystem } = UserStore.getState();
  //console.log(unitsSystem);
  //console.log(FieldOptions);

  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: [
      DragDropItemTypes.SAMPLE,
      DragDropItemTypes.MOLECULE
    ],
    drop: (item, monitor) => {
      const tagGroup = monitor.getItemType() === 'molecule' ? true : '';
      elementFormTypesStore.addSolventValues(element, tagGroup);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  useEffect(() => {
    elementFormTypesStore.initFormByElementType('sample', sample);
    console.log(elementFormTypesStore.element);
  }, []);

  const valueByType = (type, e) => {
    switch (type) {
      case 'text':
      case 'textarea':
      case 'textWithAddOn':
      case 'textRangeWithAddOn':
      case 'flashPoint':
      case 'system-defined':
      case 'formula-field':
      case 'subGroupWithAddOn':
      case 'amount':
      case 'numeric':
        return e.target.value;
      case 'checkbox':
        return e.target.checked;
      case 'select':
        return e.value ? e.value : e.label;
      case 'solventSelect':
        return e.label;
      default:
        return e;
    }
  }

  const handleNumericValue = (e, field, metric) => {
    let { value, selectionStart } = e.target;
    const fieldValue = field.opt ? element[field.column][field.opt] : element[field.column];
    const lastChar = value[selectionStart - 1] || '';

    if (lastChar !== '' && !lastChar.match(/-|\d|\.|(,)/)) return 0;

    const decimal = lastChar.match(/-|\d/);
    const comma = lastChar.match(/\.|(,)/);

    if (comma && comma[1]) {
      value = `${value.slice(0, selectionStart - 1)}.${value.slice(selectionStart)}`;
    }

    value = value.replace('--', '');
    value = value.replace('..', '.');
    const matchMinus = value.match(/\d+(-+)\d*/);
    if (matchMinus && matchMinus[1]) { value = value.replace(matchMinus[1], '') };

    if (decimal || comma) {
      return value;
    } else {
      return metPreConv(fieldValue, 'n', metric);;
    }
  }

  const handleNumRangeValue = (e) => {
    let { value, selectionStart } = e.target;
    const lastChar = value[selectionStart - 1] || '';
    let lower = '';
    let upper = '';

    if (lastChar !== '' && !lastChar.match(/-|\d|\.| |(,)/)) {
      const reg = new RegExp(lastChar, 'g');
      value = value.replace(reg, '');
    } else {
      value = value.replace(/--/g, '');
      value = value.replace(/,/g, '.');
      value = value.replace(/\.+\./g, '.');
      value = value.replace(/ - /g, ' ');
    }

    lower = value;
    upper = value;

    const result = value.match(/[-.0-9]+|[0-9]/g);
    if (result) {
      const nums = result.filter(r => !isNaN(r));
      if (nums.length > 0) {
        if (nums.length === 1) {
          lower = nums.shift();
          upper = lower;
        } else {
          lower = nums.shift();
          upper = nums.pop();
        }
        lower = Number.parseFloat(lower);
        upper = Number.parseFloat(upper);
      }
    }

    return { lower, upper, value };
  }

  const handleFieldChanged = (field, type) => (e) => {
    let value = e === null ? '' : valueByType(type, e);
    const { unit, metric } = unitAndMeticByField(field);

    if (field == 'element_form_type_id') {
      elementFormTypesStore.changeElementFormType(value);
    } else if (field.prefixes && field.precision) {
      value = metPreConv(value, metric, 'n');
      const numericValue = handleNumericValue(e, field, metric);
      elementFormTypesStore.changeNumericValues(field, value, unit, metric, numericValue);
    } else if (type == 'textRangeWithAddOn') {
      const { lower, upper, value } = handleNumRangeValue(e);
      elementFormTypesStore.changeNumRangeValues(field, lower, upper, unit, metric, value);
    } else if (type == 'flashPoint') {
      elementFormTypesStore.changeFlashPointValues(field, value, unit, metric);
    } else {
      elementFormTypesStore.changeElementValues(field, value);
    }
  }

  const changeSolventRatio = (solvent) => (e) => {
    solvent.ratio = e.target.value;
    elementFormTypesStore.changeSolventValues(solvent);
  }

  const deleteSolvent = (solvent) => {
    elementFormTypesStore.deleteSolvent(solvent);
  }

  const createDefaultSolvents = (e) => {
    const solvent = e.value;
    const smiles = solvent.smiles;
    elementFormTypesStore.fetchMoleculeBySmiles(smiles, solvent);
    console.log(elementFormTypesStore.solventErrorMessage);
  };

  const fieldHasFocusAndBlurOptions = (field, type) => {
    const columns = [
      'molecular_mass', 'molarity_value', 'density', 'purity',
      'melting_point', 'boiling_point'
    ];
    return type == 'amount' || columns.includes(field.column) ? true : false;
  }

  const handleFieldFocus = (field, type) => (e) => {
    if (!fieldHasFocusAndBlurOptions(field, type)) { return null; }

    const { unit, metric } = unitAndMeticByField(field);
    let numericValue = handleNumericValue(e, field, metric);

    if (type == 'textRangeWithAddOn') {
      numericValue = e.target.value.trim().replace(/ – /g, ' ');
    }

    elementFormTypesStore.changeActiveUnits(field.key, unit, metric, numericValue);
    elementFormTypesStore.changeElementFocus(field.key, true);
  }

  const handleFieldBlur = (field, type) => (e) => {
    if (!fieldHasFocusAndBlurOptions(field, type)) { return null; }

    elementFormTypesStore.changeElementFocus(field.key, false);
  }

  const kelvinToCelsius = (value) => value - 273.15;
  const celsiusToFahrenheit = (value) => ((value * 9) / 5) + 32;
  const fahrenheitToKelvin = (value) => (((value - 32) * 5) / 9) + 273.15;

  const calculateTemperatures = (activeUnit, value) => {
    if (value == '') { return ''; }

    switch (activeUnit) {
      case '°C':
        return celsiusToFahrenheit(value);
      case '°F':
        return fahrenheitToKelvin(value);
      case 'K':
        return kelvinToCelsius(value);
    }
  }

  const changeUnit = (options, field) => (e) => {
    let activeUnit = e.target.innerHTML;
    let activeUnitIndex = options.findIndex((f) => { return f.value == activeUnit });
    let nextUnitIndex = activeUnitIndex === options.length - 1 ? 0 : activeUnitIndex + 1;
    let nextUnit = options[nextUnitIndex].value;
    let metric = field.prefixes[nextUnitIndex];
    let value = '';
    if (field.type == 'flashPoint') {
      value = calculateTemperatures(activeUnit, element[field.column][field.opt].value);
      elementFormTypesStore.changeFlashPointValues(field, value, nextUnit, metric);
    } else {
      elementFormTypesStore.changeActiveUnits(field.key, nextUnit, metric, value);
    }
  }

  const unitAndMeticByField = (field) => {
    const unitIndex = units.findIndex((unit) => { return unit.key == field.key });
    const unit = unitIndex !== -1 ? units[unitIndex].unit : field.addon;
    const metric = unitIndex !== -1 ? units[unitIndex].metric : (field.prefixes ? field.prefixes[0] : 'n');
    const fieldValue = field.opt ? element[field.column][field.opt] : element[field.column];
    const acitveUnitValue = unitIndex !== -1 && units[unitIndex].value !== undefined ? units[unitIndex].value : fieldValue;
    return { unit, metric, acitveUnitValue };
  }

  const valueOrCalculateNumericValue = (field) => {
    let value = field.opt ? element[field.column][field.opt] : element[field.column];
    const { focused } = isFieldFocused(field, '');

    if (field.prefixes && field.precision) {
      const { metric, acitveUnitValue } = unitAndMeticByField(field);

      if (focused) {
        value = acitveUnitValue ? acitveUnitValue : metPreConv(value, 'n', metric) || '';
      } else {
        value = metPreConv(value, 'n', metric).toPrecision(field.precision);
      }

      value = value === 'NaN' ? 0.0.toPrecision(field.precision) : value;
    }

    return value;
  }

  const numRangeValue = (field) => {
    const { focused } = isFieldFocused(field, '');
    const { acitveUnitValue } = unitAndMeticByField(field);
    return focused && acitveUnitValue ? acitveUnitValue : element[`${field.column}_display`];
  }

  const isFieldFocused = (field, amountKey) => {
    const focusIndex = elementHasFocus.findIndex((e) => { return Object.keys(e).indexOf(field.key) != -1 });
    let focusedKeys = [];
    if (amountKey !== '') {
      elementHasFocus.map((e) => {
        Object.entries(e).map(([k, v]) => {
          if (k.includes(amountKey) && v == true) {
            focusedKeys.push(k);
          }
        });
      });
    }
    const focused = focusIndex !== -1 && elementHasFocus[focusIndex][field.key] ? true : false;
    return { focused, focusedKeys };
  }

  const elementFormTypeSelect = () => {
    let options = elementFormTypesStore.elementTypeOptions;
    let value = options.find((o) => { return element.element_form_type_id && o.value == element.element_form_type_id });

    return (
      <FormGroup key={`sample-element-form-type-select`} className={`select-with-button column-size-column`}>
        <ControlLabel>Element form type</ControlLabel>
        <div className="grouped-fields-row">
          <Select
            name="element_form_type_id"
            clearable={true}
            options={options}
            key="element-form-type-select-key"
            onChange={handleFieldChanged('element_form_type_id', 'select')}
            value={value}
          />
          <Button bsStyle="primary"
            title="Edit form fields"
            className="edit-form-fields"
            onClick={() => elementFormTypesStore.showEditorModal('sample')}
          >
            <i className="fa fa-cog"></i>
          </Button>
        </div>
      </FormGroup>
    );
  }

  const allowToDisplayField = (field) => {
    let notAllowed = [];

    if (field.conditions) {
      Object.entries(field.conditions).map(([key, value]) => {
        const isMolarityDensity = ['has_molarity', 'has_density'].includes(key);
        const isPolymer = (element.molfile || '').indexOf(' R# ') !== -1;

        if (isMolarityDensity && !element['has_molarity'] && !element['has_density']) {
          notAllowed.push(key);
        } else if (key == 'isPolymer' && isPolymer != value) {
          notAllowed.push(key);
        } else if (element[key] !== undefined && element[key] != value && !isMolarityDensity) {
          notAllowed.push(key);
        }
        if (key == 'enable_decoupled' && enableDecoupled != value) {
          notAllowed.push(key);
        }
      });
    }
    return notAllowed;
  }

  const infoButton = (field) => {
    if (!field.description) { return null; }

    return (
      <OverlayTrigger
        placement="top"
        overlay={
          <Tooltip id={field.column}>{field.description}</Tooltip>
        }
      >
        <span className="glyphicon glyphicon-info-sign with-padding" />
      </OverlayTrigger>
    );
  }

  const numericInput = (field, type) => {
    let value = valueOrCalculateNumericValue(field);

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <FormControl
          name={`${field.key}-name`}
          type="text"
          key={field.key}
          value={value}
          disabled={!element.can_update}
          onChange={handleFieldChanged(field, type)}
          onFocus={handleFieldFocus(field, type)}
          onBlur={handleFieldBlur(field, type)}
        />
      </FormGroup>
    );
  }

  const addonButton = (field, color, elementUnit = '') => {
    let addon = (<InputGroup.Addon>{field.addon}</InputGroup.Addon>);

    if (field.option_layers) {
      const options = optionsForSelect(field);
      const { unit } = unitAndMeticByField(field);
      const fieldUnit = elementUnit && !unit ? elementUnit : unit;

      addon = (
        <InputGroup.Button>
          <Button
            className={`addon-${color}`}
            onClick={changeUnit(options, field)}
          >
            {fieldUnit}
          </Button>
        </InputGroup.Button>
      );
    }
    return addon;
  }

  const flashPointInput = (field, type) => {
    const column = element[field.column][field.opt];
    const unit = column ? column.unit : '';

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <div className="grouped-addons">
          <InputGroup>
            <FormControl
              type="text"
              key={field.key}
              value={column ? column.value : ''}
              onChange={handleFieldChanged(field, type)}
            />
            {addonButton(field, 'green', unit)}
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const textRangeWithAddOnInput = (field, type) => {
    const isDisabled = allowToDisplayField(field).length >= 1 ? true : false;
    const value = numRangeValue(field);

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>
          {field.label}
          {infoButton(field)}
        </ControlLabel>
        <InputGroup data-cy={`cy_${field.label}`}>
          <FormControl
            type="text"
            key={field.key}
            value={value}
            disabled={isDisabled}
            onChange={handleFieldChanged(field, type)}
            onFocus={handleFieldFocus(field, type)}
            onBlur={handleFieldBlur(field, type)}
          />
          <InputGroup.Addon>{field.addon}</InputGroup.Addon>
        </InputGroup>
      </FormGroup>
    );
  }

  const textWithAddOnInput = (field, type, tabOrAmount = false, color = 'green') => {
    if (field.conditions && field.conditions.decoupled && !element.decoupled) { return null; }

    let label = (<ControlLabel>{field.label}</ControlLabel>);
    const value = valueOrCalculateNumericValue(field);
    const className = type == 'amount' ? 'column-size-amount' : `column-size-${field.column_size}`;
    const residue = field.column == 'defined_part_amount' && element.contains_residues;
    const isDisabled = allowToDisplayField(field).length >= 1 || residue ? true : false;
    if (tabOrAmount && !residue) { label = ''; }

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={className}>
        {label}
        <div className="grouped-addons">
          <InputGroup>
            <FormControl
              type="text"
              key={field.key}
              value={value}
              disabled={isDisabled}
              onChange={handleFieldChanged(field, type)}
              onFocus={handleFieldFocus(field, type)}
              onBlur={handleFieldBlur(field, type)}
            />
            {addonButton(field, color)}
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const amountInput = (field) => {
    let fields = [];
    field.sub_fields.map((sub_field) => {
      if (element.amount_unit == 'l' && element.contains_residues) { return null; } 
      if (sub_field.column == 'defined_part_amount' && !element.contains_residues) { return null; }

      const { focused, focusedKeys } = isFieldFocused(sub_field, 'target_amount_value');
      const color = focused || (focusedKeys.length == 0 && sub_field.unit == element.amount_unit) ? 'green' : 'grey';
      fields.push(textWithAddOnInput(sub_field, 'amount', true, color));      
    });

    const infoMessage = (
      <Tooltip id="assignButton">
        Information mirrored to the reaction table describing the content of pure
        compound or amount of pure compound in a given solution
      </Tooltip>
    );

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel className="amount-label">{field.label}</ControlLabel>
        <div className="grouped-addons">
          <div className="grouped-fields-row amount">
            <OverlayTrigger placement="top" overlay={infoMessage}>
              <Button className="btn btn-circle btn-sm btn-info">
                <Glyphicon glyph="info-sign" />
              </Button>
            </OverlayTrigger>
            {fields}
          </div>
        </div>
      </FormGroup>
    );
  }

  const checkboxInput = (field, type, index) => {
    if (allowToDisplayField(field).length >= 1) { return null; }

    return (
      <Checkbox
        name={field.column}
        key={`${field.key}-${index}`}
        checked={element[field.column]}
        onChange={handleFieldChanged(field, type)}
      >
        {field.label}
      </Checkbox>
    );
  }

  const solventRowHeader = () => {
    return (
      <div className='selected-solvents' key='solvent_list_header'>
        <span>Label</span>
        <span>Ratio</span>
      </div>
    );
  }

  const solventRow = (solvent, i) => {
    return (
      <div className="selected-solvents" key={`${solvent.smiles}-${i}`}>
        <FormControl
          type="text"
          key={`${solvent.label}_${i}`}
          value={solvent.label}
          disabled
        />
        <FormControl
          type="number"
          key={`${solvent.ratio}_${i}`}
          value={solvent.ratio}
          onChange={changeSolventRatio(solvent)}
        />
        <Button
          bsStyle="danger"
          onClick={() => deleteSolvent(solvent)}
          key={`${solvent.inchikey}_${i}`}
          className='delete-solvent'
        >
          <i className="fa fa-trash-o fa-lg" />
        </Button>
      </div>
    );
  }

  const selectedSolvents = (index) => {
    const elementSolvents = element.solvent;
    let solvents = [];

    if (elementSolvents && elementSolvents.length == 0) { return solvents; }

    solvents.push(solventRowHeader());

    elementSolvents.map((solvent, i) => {
      solvents.push(solventRow(solvent, index + i));
    });
    return solvents;
  }

  const optionsForSelect = (field) => {
    let options = [];
    let systemOptions = unitsSystem.fields.find((u) => { return u.field === field.option_layers });

    options = systemOptions ? systemOptions.units : FieldOptions[field.option_layers];
    if (options && options[0] && options[0].value !== '') {
      options.unshift({ label: '', value: '' });
    }

    return options;
  }

  const ionicLiquidOptions = (defaultOptions) => {
    return Object.keys(ionic_liquids)
      .reduce((solvents, ionicLiquid) => solvents.concat({
        label: ionicLiquid,
        value: {
          external_label: ionicLiquid,
          smiles: ionic_liquids[ionicLiquid],
          density: 1.0
        }
      }), defaultOptions);
  }

  const dragAndDropStyle = () => {
    let style = { width: '100%' };
    if (canDrop) {
      style.borderStyle = 'dashed';
      style.padding = '0 10px';
    }
    if (isOver && canDrop) {
      style.borderColor = '#337ab7';
    }
    return style;
  }

  const solventSelectInput = (field, type, index) => {
    const defaultOptions = optionsForSelect(field);
    const options = ionicLiquidOptions(defaultOptions);
    const solvents = selectedSolvents(index);

    return (
      <div style={dragAndDropStyle()} ref={dropRef} key="solvent-drag-n-drop">
        <FormGroup key={`${field.key}-${field.label}`} className={`solvent-select column-size-${field.column_size}`}>
          <ControlLabel>{field.label}</ControlLabel>
          <div className="grouped-addons">
            <VirtualizedSelect
              name={field.column}
              key={`${field.key}-${index}`}
              multi={false}
              options={options}
              placeholder={field.default}
              onChange={createDefaultSolvents}
            />
          </div>
          {solvents}
        </FormGroup>
      </div>
    );
  }

  const selectInput = (field, type, index) => {
    const options = optionsForSelect(field);
    const columnValue = field.opt ? element[field.column][field.opt] : element[field.column];
    const value = options.find((o) => { return o.value == columnValue });

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <div className="grouped-addons">
          <Select
            name={field.key}
            key={`${field.key}-${index}`}
            options={options}
            value={value}
            disabled={!element.can_update}
            onChange={handleFieldChanged(field, type)}
          />
        </div>
      </FormGroup>
    );
  }

  const createMoleculeName = (MoleculeName) => {
    elementFormTypesStore.updateMoleculeNames(MoleculeName);
  };

  const showStructureEditor = (isDisabled) => {
    if (isDisabled) { return null; }

    parent.setState({
      showStructureEditor: true,
    });
  }

  const muleculeInput = (field, type, index) => {
    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <div className="grouped-addons">
          <InputGroup className="molecule-name">
            <CreatableSelect
              name="moleculeName"
              value={element.molecule_name}
              options={element.molecule_names}
              disabled={!element.can_update}
              onCreateOption={createMoleculeName}
              onChange={handleFieldChanged(field, type)}
            />
            <InputGroup.Addon className="addon-white">
              <Glyphicon glyph="pencil" onClick={() => showStructureEditor(!element.can_update)} />
            </InputGroup.Addon>
          </InputGroup>
        </div>
      </FormGroup>
    );
  }

  const textareaInput = (field, type, index) => {
    let value = valueOrCalculateNumericValue(field);

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <FormControl
          componentClass="textarea"
          value={value}
          rows={field.rows}
          disabled={!element.can_update}
          key={field.key}
          onChange={handleFieldChanged(field, type)}
        />
      </FormGroup>
    );
  }

  const textInput = (field, type) => {
    let value = valueOrCalculateNumericValue(field);
    if (field.conditions && field.conditions.decoupled && !element.decoupled) { return null; }

    return (
      <FormGroup key={`${field.key}-${field.label}`} className={`column-size-${field.column_size}`}>
        <ControlLabel>{field.label}</ControlLabel>
        <FormControl
          name={`${field.key}-name`}
          type="text"
          key={field.key}
          value={value}
          disabled={!element.can_update}
          onChange={handleFieldChanged(field, type)}
        />
      </FormGroup>
    );
  }

  const tabsWithInput = (sub_fields, index) => {
    let tabs = [];
    let tabId = '';
    let defaultActiveKey = sub_fields[0].key;

    sub_fields.map((sub_field) => {
      tabId += `-${sub_field.key}`;
      defaultActiveKey = element[sub_field.column] !== 0 ? sub_field.key : defaultActiveKey;
      tabs.push(
        <Tab eventKey={sub_field.key} title={sub_field.label} key={`tab-${sub_field.key}-${sub_field.label}`}>
          {fieldsByType(sub_field, [], index, true)}
        </Tab>
      );
      index += 1;
    });

    return (
      <Tabs
        id={`tab${tabId}`}
        className={`tab column-size-${sub_fields[0].column_size}`}
        defaultActiveKey={defaultActiveKey}
        key={`${tabId}-key`}>
        {tabs}
      </Tabs>
    );
  }

  const fieldsByType = (field, fields, index, tab = false) => {
    switch (field.type) {
      case 'text':
        fields.push(textInput(field, 'text'));
        break;
      case 'textarea':
        fields.push(textareaInput(field, field.type, index));
        break;
      case 'privat_note':
        fields.push(<PrivateNoteElement key={field.key} element={element} disabled={!element.can_update} />);
        break;
      // case 'cas':
      //   fields.push(casInput(field, 'cas', i));
      //   break;
      case 'moleculeSelect':
        fields.push(muleculeInput(field, 'moleculeSelect', index));
        break;
      case 'select':
        fields.push(selectInput(field, 'select', index));
        break;
      case 'solventSelect':
        fields.push(solventSelectInput(field, 'select', index));
        break;
      case 'checkbox':
        fields.push(checkboxInput(field, 'checkbox', index));
        break;
      // case 'system-defined':
      case 'textWithAddOn':
        fields.push(textWithAddOnInput(field, 'textWithAddOn', tab));
        break;
      case 'numeric':
        fields.push(numericInput(field, 'numeric'));
        break;
      case 'textRangeWithAddOn':
        fields.push(textRangeWithAddOnInput(field, 'textRangeWithAddOn'));
        break;
      case 'flashPoint':
        fields.push(flashPointInput(field, 'flashPoint'));
        break;
      default:
        fields.push(textInput(field, 'text'));
    }
    return fields;
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
    if (!element || !elementType || !elementStructure) { return ''; }

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
        if (row.visible !== undefined && !row.visible) { return; }

        row.fields.map((field) => {
          if (field.opt == 'cas') { return; }
          if (field.visible !== undefined && !field.visible) { return; }

          let subFields = [];
          if (field.sub_fields && field.type == 'tab') {
            subFields.push(tabsWithInput(field.sub_fields, index));
            index += 1;
          } else if (field.sub_fields && field.type == 'amount') {
            subFields.push(amountInput(field));
            index += 1;
          } else {
            fieldsByType(field, subFields, index);
          }
          rowFields.push(subFields);
          index += 1;
        });
        if (rowFields.length >= 1) {
          sectionFields.push(groupedRowFields(rowClassName, rowFields, index));
          fields.push(<div className={`section${toggleClass}`} key={`section-${i}-${j}`}>{sectionFields}</div>);
        }
        sectionFields = [];
      });
    });
    return fields;
  }

  return (
    <div className='sample-form-fields'>
      {elementFormTypeSelect()}
      {MapElementStructure()}
      <ElementFormTypeEditorModal />
      new form end
    </div>
  );
};

export default observer(SampleFormByType);
