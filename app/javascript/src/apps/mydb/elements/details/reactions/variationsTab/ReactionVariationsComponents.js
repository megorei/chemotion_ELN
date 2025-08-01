/* eslint-disable react/display-name */
import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Modal, Form, OverlayTrigger, Tooltip, Table
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import { cloneDeep, isEqual } from 'lodash';
import {
  getVariationsRowName, convertUnit, getStandardUnits, getUserFacingUnit, getCurrentEntry,
  getUserFacingEntryName
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReferenceMaterial, getCatalystMaterial, getFeedstockMaterial, getMolFromGram, getGramFromMol,
  computeEquivalent, computePercentYield, computePercentYieldGas, getVolumeFromGram, getGramFromVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericString } from 'src/utilities/MathUtils';
import {
  calculateGasMoles, calculateTON, calculateFeedstockMoles, calculateFeedstockVolume, calculateGasVolume
} from 'src/utilities/UnitsConversion';

function MaterialEntry({ children, entry, isMain }) {
  function getEntryWidth() {
    switch (entry) {
      case 'temperature':
      case 'concentration':
      case 'turnoverNumber':
      case 'turnoverFrequency':
        return 140;
      default:
        return 110;
    }
  }
  return (
    <li
      className={`list-group-item rounded-0 overflow-hidden ${isMain ? 'bg-info-subtle' : ''}`}
      style={{ width: `${getEntryWidth()}px` }}
    >
      {children}
    </li>
  );
}

MaterialEntry.propTypes = {
  children: PropTypes.node.isRequired,
  entry: PropTypes.string.isRequired,
  isMain: PropTypes.bool.isRequired
};

function RowToolsCellRenderer({
  data: row, context
}) {
  const { reactionShortLabel, copyRow, removeRow } = context;
  return (
    <div>
      <ButtonGroup>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip>{getVariationsRowName(reactionShortLabel, row.id)}</Tooltip>}
        >
          <Button size="xsm" variant="secondary">{row.id}</Button>
        </OverlayTrigger>
        <Button size="xsm" variant="success" onClick={() => copyRow(row)}>
          <i className="fa fa-clone" />
        </Button>
        <Button size="xsm" variant="danger" onClick={() => removeRow(row)}>
          <i className="fa fa-trash-o" />
        </Button>
      </ButtonGroup>
    </div>
  );
}

RowToolsCellRenderer.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
    copyRow: PropTypes.func.isRequired,
    removeRow: PropTypes.func.isRequired,
  }).isRequired,
};

function EquivalentParser({ data: row, oldValue: cellData, newValue }) {
  let equivalent = parseNumericString(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return {
      ...cellData,
      equivalent: { ...cellData.equivalent, value: equivalent },
    };
  }

  const referenceMol = getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
  const mass = getGramFromMol(referenceMol * equivalent, cellData);
  const amount = getMolFromGram(mass, cellData);
  const volume = getVolumeFromGram(mass, cellData);

  return {
    ...cellData,
    mass: { ...cellData.mass, value: mass },
    amount: { ...cellData.amount, value: amount },
    volume: { ...cellData.volume, value: volume },
    equivalent: { ...cellData.equivalent, value: equivalent },
  };
}

function PropertyParser({
  oldValue: cellData, newValue, colDef
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = parseNumericString(newValue);
  if (currentEntry !== 'temperature' && value < 0) {
    value = 0;
  }
  value = convertUnit(value, displayUnit, cellData.unit);
  const updatedCellData = { ...cellData, value };

  return updatedCellData;
}

function convertValueToDisplayUnit(value, unit, displayUnit) {
  const valueInDisplayUnit = convertUnit(Number(value), unit, displayUnit);

  return parseFloat(Number(valueInDisplayUnit).toPrecision(4));
}

function PropertyFormatter({ value: cellData, colDef }) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];

  return convertValueToDisplayUnit(cellData.value, cellData.unit, displayUnit);
}

function MaterialFormatter({ value: cellData, colDef }) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];

  return convertValueToDisplayUnit(cellData[currentEntry].value, cellData[currentEntry].unit, displayUnit);
}
function MaterialRenderer({ value: cellData, colDef }) {
  const { entryDefs } = colDef;
  return (
    <ol className="list-group list-group-horizontal w-100">
      {Object.entries(entryDefs).map(([entry, entryDef]) => {
        const entryData = cellData[entry];
        return (
          entryData
          && typeof entryData === 'object'
          && 'value' in entryData
          && entryDef.isSelected ? (
            <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
              {convertValueToDisplayUnit(entryData.value, entryData.unit, entryDef.displayUnit)}
            </MaterialEntry>
            ) : null
        );
      })}
    </ol>
  );
}

MaterialRenderer.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    ).isRequired
  }).isRequired
};

function MaterialParser({
  data: row, oldValue: cellData, newValue, colDef, context
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'mass': {
      const amount = getMolFromGram(value, updatedCellData);
      const volume = getVolumeFromGram(value, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        amount: { ...updatedCellData.amount, value: amount },
        volume: { ...updatedCellData.volume, value: volume }
      };
      break;
    }
    case 'amount': {
      const mass = getGramFromMol(value, updatedCellData);
      const volume = getVolumeFromGram(mass, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        volume: { ...updatedCellData.volume, value: volume }
      };
      break;
    }
    case 'volume': {
      const mass = getGramFromVolume(value, updatedCellData);
      const amount = getMolFromGram(mass, updatedCellData);
      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount }
      };
      break;
    }
    default:
      break;
  }
  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }

  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return updatedCellData;
  }

  // Adapt equivalent to updated mass.
  if ('equivalent' in updatedCellData) {
    const equivalent = computeEquivalent(updatedCellData, referenceMaterial);
    updatedCellData = { ...updatedCellData, equivalent: { ...updatedCellData.equivalent, value: equivalent } };
  }

  // Adapt yield to updated mass.
  if ('yield' in updatedCellData) {
    const percentYield = computePercentYield(updatedCellData, referenceMaterial, context.reactionHasPolymers);
    updatedCellData = { ...updatedCellData, yield: { ...updatedCellData.yield, value: percentYield } };
  }

  return updatedCellData;
}

function GasParser({
  data: row, oldValue: cellData, newValue, colDef
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (currentEntry !== 'temperature' && value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'concentration':
    case 'temperature': {
      const temperatureInKelvin = convertUnit(
        updatedCellData.temperature.value,
        updatedCellData.temperature.unit,
        'K'
      );
      const concentration = updatedCellData.concentration.value;
      const { vesselVolume } = updatedCellData.aux;

      const amount = calculateGasMoles(vesselVolume, concentration, temperatureInKelvin);
      const mass = getGramFromMol(amount, updatedCellData);
      const volume = calculateGasVolume(
        amount,
        { part_per_million: concentration, temperature: { value: temperatureInKelvin, unit: 'K' } }
      );

      const catalyst = getCatalystMaterial(row);
      const catalystAmount = catalyst?.amount.value ?? 0;
      const turnoverNumber = calculateTON(amount, catalystAmount);

      const percentYield = computePercentYieldGas(amount, getFeedstockMaterial(row), vesselVolume);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount },
        volume: { ...updatedCellData.volume, value: volume },
        yield: { ...updatedCellData.yield, value: percentYield },
        turnoverNumber: { ...updatedCellData.turnoverNumber, value: turnoverNumber },
      };
      break;
    }
    default:
      break;
  }

  const durationInHours = convertUnit(
    updatedCellData.duration.value,
    updatedCellData.duration.unit,
    'Hour(s)'
  );
  const turnoverNumber = updatedCellData.turnoverNumber.value;
  const turnoverFrequency = turnoverNumber / (durationInHours || 1);

  return {
    ...updatedCellData,
    turnoverFrequency: { ...updatedCellData.turnoverFrequency, value: turnoverFrequency }
  };
}

function FeedstockParser({
  data: row, oldValue: cellData, newValue, colDef
}) {
  const currentEntry = getCurrentEntry(colDef.entryDefs);
  const { displayUnit } = colDef.entryDefs[currentEntry];
  let value = convertUnit(parseNumericString(newValue), displayUnit, cellData[currentEntry].unit);
  if (value < 0) {
    value = 0;
  }
  let updatedCellData = { ...cellData, [currentEntry]: { ...cellData[currentEntry], value } };

  switch (currentEntry) {
    case 'amount': {
      const amount = updatedCellData.amount.value;
      const mass = getGramFromMol(amount, updatedCellData);

      const purity = updatedCellData.aux.purity || 1;
      const volume = calculateFeedstockVolume(amount, purity);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        volume: { ...updatedCellData.volume, value: volume },
      };
      break;
    }
    case 'volume': {
      const volume = updatedCellData.volume.value;
      const purity = updatedCellData.aux.purity || 1;
      const amount = calculateFeedstockMoles(volume, purity);

      const mass = getGramFromMol(amount, updatedCellData);

      updatedCellData = {
        ...updatedCellData,
        mass: { ...updatedCellData.mass, value: mass },
        amount: { ...updatedCellData.amount, value: amount },
      };
      break;
    }
    case 'equivalent': {
      return updatedCellData;
    }
    default:
      break;
  }

  if (updatedCellData.aux.isReference) {
    return updatedCellData;
  }

  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return updatedCellData;
  }

  const equivalent = computeEquivalent(updatedCellData, referenceMaterial);

  return { ...updatedCellData, equivalent: { ...updatedCellData.equivalent, value: equivalent } };
}

function NoteCellRenderer(props) {
  return (
    <OverlayTrigger
      placement="right"
      overlay={(
        <Tooltip id={`note-tooltip-${props.data.id}`}>
          double click to edit
        </Tooltip>
      )}
    >
      <span>{props.value ? props.value : '_'}</span>
    </OverlayTrigger>
  );
}

function NoteCellEditor({
  data: row,
  value,
  onValueChange,
  stopEditing,
  context
}) {
  const [note, setNote] = useState(value);
  const { reactionShortLabel } = context;

  const onClose = () => {
    stopEditing();
  };

  const onSave = () => {
    onValueChange(note);
    stopEditing();
  };

  const cellContent = (
    <Modal show onHide={onClose}>
      <Modal.Header closeButton>
        {`Edit note for ${getVariationsRowName(reactionShortLabel, row.id)}`}
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          as="textarea"
          placeholder="Start typing your note..."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  );

  return cellContent;
}

NoteCellEditor.propTypes = {
  data: PropTypes.shape({
    id: PropTypes.number.isRequired,
  }).isRequired,
  value: PropTypes.string.isRequired,
  onValueChange: PropTypes.func.isRequired,
  stopEditing: PropTypes.func.isRequired,
  context: PropTypes.shape({
    reactionShortLabel: PropTypes.string.isRequired,
  }).isRequired,
};

function MaterialOverlay({ value: cellData }) {
  const { aux = null } = cellData;

  return (
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        {aux?.isReference && <div>Reference</div>}
        {aux?.coefficient !== null && (
        <div>
          Coefficient:
          {' '}
          {aux.coefficient.toPrecision(4)}
        </div>
        )}
        {aux?.molecularWeight !== null && (
        <div>
          Molar mass:
          {' '}
          {aux.molecularWeight.toPrecision(2)}
          {' '}
          g/mol
        </div>
        )}
        {Object.entries(cellData).map(
          ([key, entry]) => (entry && typeof entry === 'object' && 'value' in entry ? (
            <div key={key}>
              {`${getUserFacingEntryName(key)}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`}
            </div>
          ) : null)
        )}
      </div>
    </div>
  );
}

MaterialOverlay.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    entryDefs: PropTypes.objectOf(
      PropTypes.shape({
        isMain: PropTypes.bool.isRequired,
        isSelected: PropTypes.bool.isRequired,
        displayUnit: PropTypes.string.isRequired
      })
    )
    ,
  }).isRequired,
};

function MaterialEntrySelection({ entryDefs, onChange }) {
  const [showModal, setShowModal] = useState(false);

  const handleEntrySelection = (item) => {
    const updated = { ...entryDefs };
    const wasMain = updated[item].isMain;
    const wasSelected = updated[item].isSelected;
    const selectedCount = Object.values(updated).filter((entry) => entry.isSelected).length;

    // Prevent deselection if this is the last selected item
    if (wasSelected && selectedCount <= 1) {
      return;
    }

    // Toggle the selection state
    updated[item] = {
      ...updated[item],
      isSelected: !wasSelected,
      isMain: wasSelected ? false : wasMain // Clear isMain if deselecting
    };

    // If we're deselecting the current main entry, find a new main entry
    if (wasMain && wasSelected) {
      const firstAvailable = Object.keys(updated).find(
        (key) => key !== item && updated[key].isSelected
      );
      if (firstAvailable) {
        updated[firstAvailable].isMain = true;
      }
    }

    onChange(updated);
  };

  const handleUnitChange = (item, unit) => {
    const updated = {
      ...entryDefs,
      [item]: {
        ...entryDefs[item],
        displayUnit: unit
      }
    };

    onChange(updated);
  };

  const handleMainEntryChange = (item) => {
    const updated = { ...entryDefs };

    Object.keys(updated).forEach((key) => {
      // Clear previous main entry
      if (updated[key].isMain) {
        updated[key].isMain = false;
      }
    });

    // Set new main entry
    updated[item].isMain = true;

    onChange(updated);
  };

  return (
    <div className="w-100">
      <div className="d-inline-block">
        <Button className="w-100" onClick={() => setShowModal(true)}>
          Entries
        </Button>
        <ol className="list-group list-group-horizontal w-100">
          {Object.entries(entryDefs).map(([entry, entryDef]) => (!entryDef.isSelected ? null : (
            <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
              {getUserFacingEntryName(entry)}
              {' '}
              {entryDef.displayUnit === null ? '' : `(${getUserFacingUnit(entryDef.displayUnit)})` }
            </MaterialEntry>

          )))}
        </ol>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Select entries</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table striped bordered hover className="table-layout-fixed">
            <thead>
              <tr>
                <th>Selected</th>
                <th>Entry</th>
                <th>Unit</th>
                <th>Main entry (editable, sortable)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(entryDefs).map(([entry, entryDef]) => {
                const units = getStandardUnits(entry);
                return (
                  <tr key={entry}>
                    <td className="text-center">
                      <Form.Check
                        type="checkbox"
                        checked={entryDef.isSelected || false}
                        onChange={() => handleEntrySelection(entry)}
                      />
                    </td>
                    <td>{getUserFacingEntryName(entry)}</td>
                    <td>
                      {units.length > 1 ? (
                        <Form.Select
                          size="sm"
                          value={entryDef.displayUnit || ''}
                          onChange={(e) => handleUnitChange(entry, e.target.value)}
                        >
                          {units.map((unit) => (
                            <option key={unit} value={unit}>{getUserFacingUnit(unit)}</option>
                          ))}
                        </Form.Select>
                      ) : getUserFacingUnit(units[0])}
                    </td>
                    <td className="text-center">
                      <Form.Check
                        type="radio"
                        name="default"
                        checked={entryDef.isMain || false}
                        onChange={() => handleMainEntryChange(entry)}
                        disabled={!entryDef.isSelected}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

MaterialEntrySelection.propTypes = {
  entryDefs: PropTypes.objectOf(
    PropTypes.shape({
      isMain: PropTypes.bool.isRequired,
      isSelected: PropTypes.bool.isRequired,
      displayUnit: PropTypes.string.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
};

function MenuHeader({
  column, context, setSort, names, gasType = 'off'
}) {
  const { setColumnDefinitions } = context;
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');
  const [name, setName] = useState(names[0]);
  const { field, entryDefs } = column.colDef;

  const onSortChanged = () => {
    setAscendingSort(column.isSortAscending() ? 'sort_active' : 'inactive');
    setDescendingSort(column.isSortDescending() ? 'sort_active' : 'inactive');
    setNoSort(
      !column.isSortAscending() && !column.isSortDescending()
        ? 'sort_active'
        : 'inactive'
    );
  };

  useEffect(() => {
    column.addEventListener('sortChanged', onSortChanged);
    onSortChanged();
  }, []);

  const onSortRequested = (order, event) => {
    setSort(order, event.shiftKey);
  };

  const onEntryDefChange = (updatedEntryDefs) => {
    setColumnDefinitions(
      {
        type: 'update_entry_defs',
        field,
        entryDefs: updatedEntryDefs,
        gasType
      }
    );
  };

  const sortMenu = (
    <div>
      <div
        onClick={(event) => onSortRequested('asc', event)}
        onTouchEnd={(event) => onSortRequested('asc', event)}
        className={`customSortDownLabel ${ascendingSort}`}
      >
        <i className="fa fa-chevron-up fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('desc', event)}
        onTouchEnd={(event) => onSortRequested('desc', event)}
        className={`customSortUpLabel ${descendingSort}`}
      >
        <i className="fa fa-chevron-down fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('', event)}
        onTouchEnd={(event) => onSortRequested('', event)}
        className={`customSortRemoveLabel ${noSort}`}
      >
        <i className="fa fa-times fa-fw" />
      </div>
    </div>
  );

  return (
    <div className="d-grid gap-1">
      <span
        className="header-title"
        onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}
      >
        {`${name} ${gasType !== 'off' ? `(${gasType})` : ''}`}
      </span>
      {sortMenu}
      <MaterialEntrySelection entryDefs={entryDefs} onChange={onEntryDefChange} />
    </div>
  );
}

MenuHeader.propTypes = {
  column: PropTypes.instanceOf(AgGridReact.column).isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
  setSort: PropTypes.func.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  gasType: PropTypes.string,
};

MenuHeader.defaultProps = {
  gasType: 'off',
};

function ColumnSelection(selectedColumns, availableColumns, onApply) {
  const [showModal, setShowModal] = useState(false);
  const [currentColumns, setCurrentColumns] = useState(selectedColumns);

  useEffect(() => {
    // Remove currently selected columns that are no longer available.
    const updatedCurrentColumns = cloneDeep(currentColumns);

    Object.entries(updatedCurrentColumns).forEach(([key, values]) => {
      const { [key]: availableValues } = availableColumns;
      updatedCurrentColumns[key] = values.filter((value) => availableValues.includes(value));
    });
    if (!isEqual(updatedCurrentColumns, currentColumns)) {
      setCurrentColumns(updatedCurrentColumns);
    }
  }, [availableColumns]);

  const handleApply = () => {
    onApply(currentColumns);
    setShowModal(false);
  };

  const handleSelectChange = (key) => (selectedOptions) => {
    const updatedCurrentColumns = { ...currentColumns };
    updatedCurrentColumns[key] = selectedOptions ? selectedOptions.map((option) => option.value) : [];
    setCurrentColumns(updatedCurrentColumns);
  };

  const splitCamelCase = (str) => str.replace(/([a-z])([A-Z])/g, '$1 $2');
  const toUpperCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="mb-2">
        Select Columns
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Column Selection</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {Object.entries(availableColumns).map(([key, values]) => (
            <div key={key}>
              <h5>{toUpperCase(splitCamelCase(key))}</h5>
              <Select
                isMulti
                options={values.map((value) => ({ value, label: toUpperCase(value) }))}
                value={currentColumns[key]?.map((value) => ({ value, label: toUpperCase(value) })) || []}
                onChange={handleSelectChange(key)}
              />
            </div>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleApply}>
            Apply
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export {
  RowToolsCellRenderer,
  EquivalentParser,
  PropertyFormatter,
  PropertyParser,
  MaterialRenderer,
  MaterialFormatter,
  MaterialParser,
  GasParser,
  FeedstockParser,
  NoteCellRenderer,
  NoteCellEditor,
  MaterialOverlay,
  MenuHeader,
  ColumnSelection,
};
