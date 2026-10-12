import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';

export default function AccountNameForm() {
  const { user, updateAccountName } = useAuth();
  const savedName = user?.display_name ?? user?.full_name ?? '';
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const name = draft ?? savedName;
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    if (!name.trim() || name.trim().length > 100) {
      setError('Enter a name of up to 100 characters.');
      return;
    }
    setBusy(true); setError(''); setSuccess(false);
    try {
      await updateAccountName(name);
      setDraft(null); setSuccess(true);
    } catch {
      setError('Your name could not be saved. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="space-y-3" aria-busy={busy}>
      <div>
        <Label htmlFor="account-name">Name</Label>
        <Input id="account-name" autoComplete="name" value={name} maxLength={100} required disabled={busy}
          className="mt-1.5 min-h-11 bg-surface"
          onChange={event => { setDraft(event.target.value); setError(''); setSuccess(false); }} />
      </div>
      <Button type="submit" disabled={busy || name.trim() === savedName} className="min-h-11 rounded-xl">
        {busy ? 'Saving…' : 'Save name'}
      </Button>
      {error && <p role="alert" className="text-base text-danger-text">{error}</p>}
      {success && <p role="status" className="text-base text-success-text">Name updated.</p>}
    </form>
  );
}
