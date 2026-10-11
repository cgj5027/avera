import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import { base44 } from '@/api/base44Client';

const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt'];
const MAX_BYTES = 5 * 1024 * 1024;

const FIELDS = [
  ['skills', 'Skills'],
  ['experience', 'Experience'],
  ['preferred_roles', 'Preferred jobs or gigs'],
  ['location', 'Location'],
];

/**
 * Optional resume upload. The file is stored privately (no public URL);
 * Avera extracts field suggestions only, and nothing is saved to the profile
 * until the user reviews them and chooses to apply.
 */
export default function ResumeUpload({ onApply }) {
  const [status, setStatus] = useState('idle'); // idle | parsing | suggestions | error
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const inputRef = useRef(null);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError('Use a PDF, Word, or text file up to 5 MB.');
      setStatus('error');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 5 MB. Try a smaller copy.');
      setStatus('error');
      return;
    }
    setError('');
    setStatus('parsing');
    try {
      // The file bytes go straight to the parser; the storage location is
      // decided server-side, so no caller-chosen private URI is ever involved.
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(file);
      });
      const file_base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
      const response = await base44.functions.invoke('parseResume', {
        file_name: file.name,
        file_base64,
      });
      const sug = response.data?.suggestions;
      if (!sug || typeof sug.skills !== 'string' || !sug.skills.trim()) {
        throw new Error('No profile fields found in this document.');
      }
      setSuggestions(sug);
      setStatus('suggestions');
    } catch {
      setSuggestions(null);
      setError('We could not read that resume. You can fill the profile manually instead.');
      setStatus('error');
    }
  };

  const apply = () => {
    if (!suggestions) return;
    onApply(suggestions);
    setStatus('idle');
    setSuggestions(null);
  };

  const discard = () => {
    setStatus('idle');
    setSuggestions(null);
    setError('');
  };

  return (
    <div className="mt-4 rounded-2xl border border-border bg-surface-subtle p-4" aria-live="polite" aria-busy={status === 'parsing'}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'parsing'}
          className="min-h-11 rounded-xl px-4"
        >
          {status === 'parsing'
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            : <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />}
          {status === 'parsing' ? 'Reading resume' : 'Upload resume (optional)'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          className="hidden"
          onChange={pick}
          aria-label="Upload resume"
        />
        <StatusPill tone="info">Suggestions only — you review before saving</StatusPill>
      </div>

      {status === 'suggestions' && suggestions && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4">
          <p className="font-heading text-base font-semibold text-foreground">Suggested profile fields</p>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {FIELDS.map(([key, label]) =>
              suggestions[key] ? (
                <div key={key}>
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-base text-foreground">{suggestions[key]}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={apply} className="min-h-11 rounded-xl px-4">Apply to form</Button>
            <Button type="button" variant="outline" onClick={discard} className="min-h-11 rounded-xl px-4">
              Discard suggestions
            </Button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <p role="alert" className="mt-3 text-base text-danger-text">{error}</p>
      )}
    </div>
  );
}