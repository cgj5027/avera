export function matches(row,query) {
  return Object.entries(query).every(([key,value]) => {
    if (key==='$or') return value.some(q=>matches(row,q));
    if (value && typeof value==='object') {
      if ('$exists' in value) return Object.hasOwn(row,key)===value.$exists;
      if ('$in' in value) return value.$in.includes(row[key]);
    }
    return row[key]===value;
  });
}
