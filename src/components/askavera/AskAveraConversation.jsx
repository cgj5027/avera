import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusPill from '@/components/states/StatusPill';
import { askAvera, MAX_QUESTION_LENGTH } from '@/services/assistantService';
import { useAuth } from '@/lib/AuthContext';

const SUGGESTIONS = [
  'How much money could I save this month?',
  'Which expenses are consuming the most income?',
  'Can my household afford an additional $300 monthly expense?',
  'How much additional income do I need to reach my goal?',
  'How do my mortgage payments affect my budget?',
];

const SERVICE_UNAVAILABLE =
  'Ask Avera could not reach its AI service just now. No changes were requested to your financial records. Data may already have been sent to the service. Please try again — if this keeps happening, the AI service may not be configured yet.';

const READ_ONLY_NOTE =
  'Ask Avera requests explanations from an external assistant. Response grounding is not yet verified. Check financial figures against your saved records. This interface requests no changes to records or movement of money.';

/**
 * Ask Avera conversation (Stage 2). Questions go to the `askAvera` backend
 * function. Its implementation is absent from this repository, so server
 * authorization and grounding must be verified separately.
 */
export default function AskAveraConversation() {
  const { user } = useAuth();
  return user ? <Conversation key={user.id} /> : <p role="status" className="p-4 text-base text-muted-foreground">Sign in to ask about your finances.</p>;
}

function Conversation() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);

  const send = async (text) => {
    const value = (text ?? draft).trim();
    if (!value || pending) return;
    setDraft('');
    setMessages((m) => [...m, { role: 'user', text: value }, { role: 'assistant', text: null }]);
    setPending(true);
    try {
      const answer = await askAvera(value);
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: 'assistant', text: answer ?? 'I could not generate an answer just now. Please try again.' },
      ]);
    } catch {
      setMessages((m) => [...m.slice(0, -1), { role: 'assistant', text: SERVICE_UNAVAILABLE }]);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" tabIndex={0} role="log" aria-label="Ask Avera conversation" aria-live="polite">
        <div className="rounded-2xl border border-border bg-info-surface p-4">
          <StatusPill tone="info" icon={ShieldCheck}>
            Read-only
          </StatusPill>
          <p className="mt-2 text-base text-info">{READ_ONLY_NOTE}</p>
        </div>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="min-w-0 break-words max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-base text-primary-foreground">
                {m.text}
              </div>
            </div>
          ) : m.text === null ? (
            <div key={i} className="flex items-center gap-2 rounded-2xl border border-border bg-surface-subtle px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
              <span className="text-base text-muted-foreground">Waiting for an answer…</span>
            </div>
          ) : (
            <div key={i} className="min-w-0 break-words max-w-[90%] rounded-2xl border border-border bg-surface-subtle px-4 py-2.5 text-base text-foreground">
              <div className="avera-prose space-y-2 [&_p]:m-0 [&_strong]:font-semibold">
                <ReactMarkdown components={{ a: ({ children }) => <span>{children}</span>, img: () => null, pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre> }}>{m.text}</ReactMarkdown>
              </div>
            </div>
          )
        )}
      </div>
      <div className="max-h-[50%] shrink-0 overflow-y-auto border-t border-border p-4">
        <p className="text-sm text-muted-foreground">Try a question</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={pending}
              className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-base text-foreground transition-colors duration-200 hover:bg-surface-subtle disabled:opacity-60"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Input
            maxLength={MAX_QUESTION_LENGTH}
            disabled={pending}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your finances"
            aria-label="Ask Avera"
            className="min-h-11 rounded-xl bg-surface"
          />
          <Button type="submit" disabled={pending || !draft.trim()} className="min-h-11 rounded-xl px-4" aria-label="Send question">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}