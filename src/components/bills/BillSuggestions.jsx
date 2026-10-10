import { useState } from 'react';
import { Sparkles, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { billSuggestionRequest } from '@/services/billSuggestions';
import { FREQUENCIES } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

export default function BillSuggestions({ onAdded }) {
  const [rows,setRows]=useState(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  const [mortgages,setMortgages]=useState(0);
  const scan=async()=>{
    setBusy(true);setError('');setMessage('');
    try {
      const data=await billSuggestionRequest('scan');
      if(!Array.isArray(data.suggestions)) throw new Error('Invalid suggestion response.');
      setRows(data.suggestions.map(s=>({...s,keep:false})));
      setMortgages(data.mortgages_tracked || 0);
      setMessage(data.ai_available ? (data.suggestions.length?'Review each suggestion. Nothing is selected automatically.':'No clear recurring bills found. At least three recent, regularly spaced payments are required.'):'AI review is unavailable. Try again later; nothing was added.');
    } catch(e){setError(e.message);} finally{setBusy(false);}
  };
  const update=(fingerprint,fields)=>setRows(current=>current.map(r=>r.fingerprint===fingerprint?{...r,...fields}:r));
  const dismiss=async(row)=>{
    setBusy(true);setError('');
    try{await billSuggestionRequest('dismiss',{fingerprint:row.fingerprint});setRows(current=>current.filter(r=>r.fingerprint!==row.fingerprint));setMessage('Suggestion dismissed. It stays hidden until a newer payment changes the evidence.');}
    catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const add=async()=>{
    setBusy(true);setError('');let added=0;
    try {
      for(const row of rows.filter(r=>r.keep)) {
        await billSuggestionRequest('add',{fingerprint:row.fingerprint,bill:{name:row.name,amount:Number(row.amount),frequency:row.frequency,category:row.category,next_due_date:row.next_due_date}});
        added++;setRows(current=>current.filter(r=>r.fingerprint!==row.fingerprint));
      }
      setMessage(`${added} selected bill${added===1?'':'s'} added.`);
    } catch(e){setError(`${added?`${added} bills were added. `:''}${e.message} Remaining suggestions have not been added.`);}
    finally{if(added)onAdded();setBusy(false);}
  };
  return <section aria-labelledby="bill-suggestions-title" aria-busy={busy} className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="bill-suggestions-title" className="text-lg font-semibold">AI bill suggestions</h2><p className="text-base text-muted-foreground">Review recurring payments from your active transaction history. You decide what to include.</p></div><Button variant="outline" className="min-h-11 rounded-xl" disabled={busy} onClick={scan}><Sparkles className="mr-2 h-4 w-4" aria-hidden="true"/>{busy?'Working…':'Suggest bills'}</Button></div>
    <p className="text-base text-muted-foreground">Amounts and next payment dates are estimates, not confirmed bills or contractual due dates. Regular shopping and one-off purchases are excluded.</p>
    {message && <p role="status" className="text-base">{message}</p>}
    {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
    {mortgages>0 && <p className="text-base text-muted-foreground">{mortgages} mortgage payment{mortgages===1?'':'s'} already tracked in Properties and forecasts. Matching lender payments are excluded to prevent double counting. Mortgage records do not contain due dates.</p>}
    {rows?.map((row,index)=><article key={row.fingerprint} className="rounded-2xl border border-border p-4 space-y-3">
      <div className="flex flex-wrap justify-between gap-3"><h3 className="text-lg font-semibold break-words">{row.name}</h3><span className="text-base">Estimated · {row.confidence} confidence</span></div>
      <p className="text-base">{row.reason}</p>
      <details><summary className="cursor-pointer min-h-11 text-base rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Supporting payments</summary><ul className="space-y-1 text-base">{row.evidence.map((t,i)=><li key={i} className="tabular-nums">{t.date} · {formatCurrency(t.amount)} · {t.source}</li>)}</ul></details>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[['name','Bill name','text'],['amount','Amount (estimated)','number'],['category','Category','text'],['next_due_date','Next due date (estimated)','date']].map(([field,label,type])=><div key={field} className="space-y-1"><Label htmlFor={`suggest-${index}-${field}`}>{label}</Label><Input id={`suggest-${index}-${field}`} type={type} step={type==='number'?'0.01':undefined} min={type==='number'?'0.01':undefined} className="min-h-11 rounded-xl" disabled={busy} value={row[field]} onChange={e=>update(row.fingerprint,{[field]:e.target.value})}/></div>)}
        <div className="space-y-1"><Label htmlFor={`suggest-${index}-frequency`}>Frequency</Label><select id={`suggest-${index}-frequency`} className="w-full min-h-11 rounded-xl border border-input bg-background px-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" disabled={busy} value={row.frequency} onChange={e=>update(row.fingerprint,{frequency:e.target.value})}>{Object.entries(FREQUENCIES).map(([value,f])=><option key={value} value={value}>{f.label}</option>)}</select></div>
      </div>
      <div className="flex flex-wrap gap-3"><Button variant={row.keep?'default':'outline'} aria-pressed={row.keep} disabled={busy} className="min-h-11 rounded-xl" onClick={()=>update(row.fingerprint,{keep:!row.keep})}><Check className="mr-2 h-4 w-4" aria-hidden="true"/>{row.keep?'Selected to keep':'Keep'}</Button><Button variant="outline" className="min-h-11 rounded-xl" disabled={busy} onClick={()=>dismiss(row)}><X className="mr-2 h-4 w-4" aria-hidden="true"/>Dismiss</Button></div>
    </article>)}
    {rows?.length>0 && <Button className="min-h-11 rounded-xl" disabled={busy || !rows.some(r=>r.keep)} onClick={add}>Add selected bills ({rows.filter(r=>r.keep).length})</Button>}
  </section>;
}
