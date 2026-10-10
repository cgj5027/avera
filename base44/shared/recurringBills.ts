/** Conservative evidence gate. AI can reject candidates, never invent amounts or dates. */
export const merchantKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const day = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value ? Date.parse(value + 'T00:00:00Z') / 86400000 : NaN;
const median = values => [...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
export function recurringCandidates(transactions, bills, mortgages, dismissed = [], now = new Date()) {
  const blocked = new Set([...bills.flatMap(b=>[merchantKey(b.name),b.suggestion_merchant]), ...transactions.filter(t=>t.not_recurring).map(t=>merchantKey(t.description))]);
  const groups = new Map(); const seen = new Set();
  for (const t of transactions) {
    const key = merchantKey(t.description);
    const identity = t.plaid_transaction_id ? `${t.plaid_item_id}:${t.plaid_transaction_id}` : t.id;
    if (!key || blocked.has(key) || t.type !== 'expense' || t.pending || t.exclude_from_cashflow || typeof t.amount !== 'number' || !Number.isFinite(t.amount) || t.amount <= 0 || !Number.isFinite(day(t.date)) || day(t.date)>now.getTime()/86400000 || (identity && seen.has(identity))) continue;
    if (identity) seen.add(identity);
    const group = groups.get(key) || []; group.push(t); groups.set(key,group);
  }
  const results = [];
  for (const [key, records] of groups) {
    const rows = records.sort((a,b)=>a.date.localeCompare(b.date));
    if (rows.length < 3 || new Set(rows.map(t=>t.date)).size !== rows.length) continue;
    // Regular shopping is not a contractual obligation, even with a regular cadence.
    if (/grocer|dining|restaurant|coffee|shopping|entertainment|fuel|gas station|travel/i.test(rows.map(t=>t.category).join(' '))) continue;
    if (mortgages.some(m=>Number(m.monthly_payment)>0 && ((merchantKey(m.lender) && (key===merchantKey(m.lender) || key.includes(merchantKey(m.lender)))) || (/mortgage/i.test(key+' '+rows.at(-1).category) && Math.abs(Number(m.monthly_payment)-median(rows.map(t=>t.amount)))<=Math.max(5,Number(m.monthly_payment)*.05))))) continue;
    const gaps = rows.slice(1).map((t,i)=>day(t.date)-day(rows[i].date));
    const interval = median(gaps);
    const cadence = [{frequency:'weekly',days:7,tolerance:1},{frequency:'biweekly',days:14,tolerance:2},{frequency:'monthly',days:30.44,tolerance:4},{frequency:'quarterly',days:91.3,tolerance:7},{frequency:'semiannual',days:182.6,tolerance:10},{frequency:'annual',days:365.25,tolerance:10}].find(c=>Math.abs(interval-c.days)<=c.tolerance && gaps.every(g=>Math.abs(g-c.days)<=c.tolerance));
    if (!cadence || now.getTime()/86400000-day(rows.at(-1).date)>cadence.days*1.5) continue;
    const amount = median(rows.map(t=>t.amount));
    if (rows.some(t=>Math.abs(t.amount-amount)>Math.max(5,amount*.2))) continue;
    const fingerprint = `${key}:${cadence.frequency}:${Math.round(amount*100)}:${rows.at(-1).date}`;
    if (dismissed.some(d=>d.fingerprint===fingerprint)) continue;
    let next = new Date(rows.at(-1).date+'T00:00:00Z');
    const anchor = next.getUTCDate();
    const advance = () => {
      if (cadence.frequency==='weekly' || cadence.frequency==='biweekly') next.setUTCDate(next.getUTCDate()+cadence.days);
      else { const months={monthly:1,quarterly:3,semiannual:6,annual:12}[cadence.frequency]; next.setUTCDate(1); next.setUTCMonth(next.getUTCMonth()+months); next.setUTCDate(Math.min(anchor,new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate())); }
    };
    advance(); while(next.toISOString().slice(0,10)<now.toISOString().slice(0,10)) advance();
    results.push({fingerprint,name:String(rows.at(-1).description).slice(0,150),amount:Math.round(amount*100)/100,frequency:cadence.frequency,category:String(rows.at(-1).category || '').slice(0,100),next_due_date:next.toISOString().slice(0,10),confidence:rows.length>=4?'High':'Moderate',evidence:rows.map(t=>({date:t.date,amount:t.amount,source:t.source || 'Manual'})),reason:`${rows.length} payments with a consistent ${cadence.frequency} interval and similar amounts.`});
  }
  return results;
}
