// Todo: break this file down into smaller utility files, grouping the methods by common tasks

export const genUnitsSystem = () => {
  const unitsSystem = (UserStore.getState() && UserStore.getState().unitsSystem) || {};
  return (unitsSystem.fields || []);
};

export const genUnits = field => (genUnitsSystem().find(u => u.field === field) || {}).units || [];

export const genUnit = (field, key) => {
  const units = genUnits(field);
  return units.find(u => u.key === key) || {};
};

export const molOptions = [{ label: 'InChiKey', value: 'inchikey' }, { label: 'SMILES', value: 'smiles' }, { label: 'IUPAC', value: 'iupac' }, { label: 'Mass', value: 'molecular_weight' }];
export const samOptions = [{ label: 'Name', value: 'name' }, { label: 'Ext. Label', value: 'external_label' }, { label: 'Mass', value: 'molecular_weight' }];

export const absOlsTermId = val => (val || '').split('|')[0].trim();
export const absOlsTermLabel = val => val.replace(absOlsTermId(val), '').replace('|', '').trim();

export const inputEventVal = (event, type) => {
  if (type === 'select') {
    return event ? event.value : null;
  } else if (type.startsWith('drag')) {
    return event;
  } else if (type === 'checkbox') {
    return event.target.checked;
  } else if (type === 'formula-field') {
    if (event.target) {
      return event.target.value;
    }
    return event;
  }
  return event.target && event.target.value;
};
