// imports from own namespace
import { genUnits } from '/app/packs/utilities/utilities';

export const unitConvToBase = (field = {}) => {
  const units = genUnits(field.option_layers);
  if (units.length <= 1) {
    return field.value;
  }
  const idx = findIndex(units, u => u.key === field.value_system);
  if (idx <= 0) return field.value;
  return ((field.value * units[0].nm) / ((units[idx] && units[idx].nm) || 1) || 0);
};

export const unitConversion = (field, key, val) => {
  if (typeof val === 'undefined' || val == null || val === 0 || val === '') {
    return val;
  }
  if (field === 'temperature') {
    return convertTemp(key, val);
  }
  const units = genUnits(field);
  if (units.length <= 1) {
    return val;
  }
  const idx = findIndex(units, u => u.key === key);
  if (idx === -1) {
    return val;
  }
  const pIdx = idx === 0 ? (units.length) : idx;
  const pre = (units[pIdx - 1] && units[pIdx - 1].nm) || 1;
  const curr = (units[idx] && units[idx].nm) || 1;
  return parseFloat((parseFloat(val) * (curr / pre)).toFixed(5));
};

export const convertTemp = (key, val) => {
  switch (key) {
    case 'F':
      return ((parseFloat(val) * 1.8) + 32).toFixed(2);
    case 'K':
      return (((parseFloat(val) + 459.67) * 5) / 9).toFixed(2);
    case 'C':
      return (parseFloat(val) - 273.15).toFixed(2);
    default:
      return val;
  }
};
