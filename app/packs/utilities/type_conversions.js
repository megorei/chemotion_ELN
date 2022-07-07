export const toNum = (val) => {
  const parse = Number((val || ''));
  return Number.isNaN(parse) ? 0 : parse;
};

export const toBool = (val) => {
  const valLower = String(val).toLowerCase();
  return !(!valLower || valLower === 'false' || valLower === '0');
};
