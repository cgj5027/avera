import { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function FeedbackForm() {
  const [rating,setRating]=useState('');
  const [message,setMessage]=useState('');
  const [consent,setConsent]=useState(false);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const request=useRef(null);
  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setStatus('');setError('');
    if (!rating || !message.trim() || !consent) return setError('Choose a rating, enter feedback, and confirm consent.');
    const signature=JSON.stringify([rating,message.trim()]);
    if (request.current?.signature!==signature) request.current={signature,id:crypto.randomUUID()};
    setSaving(true);
    try {
      const response=await base44.functions.invoke('submitFeedback',{rating:Number(rating),message:message.trim(),consent:true,request_id:request.current.id});
      if (response.data?.saved!==true) throw new Error('Not confirmed');
      setStatus('Feedback saved. Thank you.');setMessage('');setRating('');setConsent(false);request.current=null;
    } catch {
      setError('Feedback was not confirmed. Please retry.');
    } finally {setSaving(false);}
  }
  return <form onSubmit={submit} className="space-y-4" aria-label="App feedback">
    <p id="feedback-privacy" className="text-base text-muted-foreground">Account balances, financial records, and chat content are not attached. Please avoid including personal or financial details in your message.</p>
    <fieldset disabled={saving}>
      <legend className="mb-2 text-base font-medium">How was your experience?</legend>
      <div className="flex flex-wrap gap-2">
        {[1,2,3,4,5].map(value=><label key={value} className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-base">
          <input className="accent-primary" type="radio" name="feedback-rating" value={value} checked={rating===String(value)} onChange={e=>setRating(e.target.value)} aria-label={`${value} of 5`} />{value}
        </label>)}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">1 = difficult · 5 = easy</p>
    </fieldset>
    <div className="space-y-2">
      <Label htmlFor="feedback-message">Your feedback</Label>
      <Textarea id="feedback-message" value={message} onChange={e=>setMessage(e.target.value)} maxLength={2000} disabled={saving} aria-describedby="feedback-privacy" className="min-h-28 rounded-xl text-base" />
    </div>
    <label className="flex min-h-11 items-center gap-3 text-base">
      <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={saving} />
      I agree to send this rating and message to the app team.
    </label>
    {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
    {status && <p role="status" className="text-base text-success-text">{status}</p>}
    <Button type="submit" disabled={saving} className="min-h-11 rounded-xl">{saving?'Sending feedback…':'Submit feedback'}</Button>
  </form>;
}
