import { useEffect, useId, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
 * Shared page/drawer conversation. The backend remains responsible for
 * authorization and response grounding.
 */
export default function AskAveraConversation() {
  const { user } = useAuth();
  return user ? <Conversation key={user.id} /> : <p role="status" className="p-4 text-base text-muted-foreground">Sign in to ask about your finances.</p>;
}

function Conversation() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const logRef = useRef(null);
  const followLatest = useRef(true);
  const questionId = useId();

  useEffect(() => {
    if (messages.length && followLatest.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async (text) => {
    const value = (text ?? draft).trim();
    if (!value || pending) return;
    followLatest.current = true;
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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div ref={logRef} onScroll={e => {
        const log = e.currentTarget;
        followLatest.current = log.scrollHeight - log.scrollTop - log.clientHeight < 96;
      }} className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6" tabIndex={0} role="log" aria-label="Ask Avera conversation" aria-live="polite">
        <div className="rounded-2xl border border-border bg-info-surface p-4">
          <StatusPill tone="info" icon={ShieldCheck}>
            Read-only
          </StatusPill>
          <p className="mt-2 text-base text-info">{READ_ONLY_NOTE}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Try a question</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map(s => (
              <button key={s} type="button" onClick={() => send(s)} disabled={pending}
                className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-left text-base text-foreground transition-colors duration-200 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60">
                {s}
              </button>
            ))}
          </div>
        </div>
        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="min-w-0 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-base text-primary-foreground">
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
              <div className="avera-prose space-y-3 leading-relaxed [&_p]:m-0 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_li>ul]:mt-2 [&_li>ol]:mt-2 [&_h1]:text-lg [&_h2]:text-lg [&_h3]:text-base [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4">
                <ReactMarkdown components={{ a: ({ children }) => <span>{children}</span>, img: () => null, pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre> }}>{m.text}</ReactMarkdown>
              </div>
            </div>
          )
        )}
      </div>
      <div className="shrink-0 border-t border-border bg-surface p-4 sm:p-6">
        <p className="mb-3 text-center text-sm text-muted-foreground">AI can make mistakes. Verify important information and consult a financial advisor before making financial decisions.</p>
        <form
          aria-label="Send a message to Ask Avera"
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <label htmlFor={questionId} className="block text-sm font-medium text-foreground">Ask Avera</label>
          <div className="flex items-end gap-2">
          <Textarea
            id={questionId}
            rows={2}
            maxLength={MAX_QUESTION_LENGTH}
            disabled={pending}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your finances"
            aria-label="Ask Avera"
            aria-describedby={`${questionId}-hint`}
            className="min-h-20 min-w-0 resize-none rounded-xl bg-surface text-base md:text-base"
          />
          <Button type="submit" disabled={pending || !draft.trim()} className="min-h-11 shrink-0 rounded-xl px-4" aria-label="Send question">
            Send
          </Button>
          </div>
          <p id={`${questionId}-hint`} className="text-sm text-muted-foreground">Enter to send · Shift + Enter for a new line</p>
        </form>
      </div>
    </div>
  );
}
