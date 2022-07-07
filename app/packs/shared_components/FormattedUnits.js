export default FormattedUnits = (val) => {
  if (typeof val === 'undefined' || val === null) return '';
  const vals = val.match(/<\s*(\w+\b)(?:(?!<\s*\/\s*\1\b)[\s\S])*<\s*\/\s*\1\s*>|[^<]+/g);
  const reV = vals.map((v) => {
    const supVal = v.match(/<sup[^>]*>([^<]+)<\/sup>/);
    if (supVal) return <sup key={uuid.v4()}>{supVal[1]}</sup>;
    const subVal = v.match(/<sub[^>]*>([^<]+)<\/sub>/);
    if (subVal) return <sub key={uuid.v4()}>{subVal[1]}</sub>;
    return v;
  });
  return <span>{reV}</span>;
};
