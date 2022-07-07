// Todo: Split this file into more files with better naming

export const reUnit = (unitsSystem, optionLayers) => {
  const fields = (unitsSystem.fields || []);
  const object = fields.find(field => field.field === optionLayers);
  const unit = ((object && object.field) || '');
  const defaultUnit = fields.length > 0 ? fields[0].field : '';

  return unit === '' ? defaultUnit : unit;
};
