/** Shared category-inclusive planning policy. Actual transactions are not added. */
export const planningRound = value => Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON * Math.abs(value)) * 100) / 100;
export function categoryPlan(bills, categories, propertyCosts = 0) {
  const groups = new Map();
  const group = name => {
    const label = typeof name === 'string' && name.trim() ? name.trim() : 'Uncategorized';
    const key = label.toLocaleLowerCase('en-US');
    if (!groups.has(key)) groups.set(key, {key:`category:${key}`,name:label,obligations:0,limit:0});
    return groups.get(key);
  };
  categories.forEach((c,index) => { group(c.name || `Uncategorized budget ${index+1}`).limit += Number(c.limit) || 0; });
  bills.forEach(b => { group(b.category).obligations += Number(b.amount) || 0; });
  if (propertyCosts > 0) group('').obligations += propertyCosts;
  return [...groups.values()].map(g => ({key:g.key,name:g.name,value:planningRound(Math.max(g.obligations,g.limit))}));
}
export function planningTotal(bills, categories, propertyCosts = 0) {
  return planningRound(categoryPlan(bills,categories,propertyCosts).reduce((sum,g)=>sum+g.value,0));
}
