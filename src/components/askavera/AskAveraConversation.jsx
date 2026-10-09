import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusPill from '@/components/states/StatusPill';

const SUGGESTIONS = [
  'Where did my money go this month?',
  'How much can I save?',
  'What bills are due?',
  'How does my mortgage affect my budget?',
  'How much extra income do I need?',
];

const NOT_AVAILABLE =
  'Ask Avera is not available yet. It arrives in a later stage and will explain your authorized financial information — read-only, with sources and assumptions.';

/**
 * Ask Avera conversation shell (Stage 0): honest not-yet-available state.
 * Read-only by design — the assistant never offers payment execution.
 */
export default function AskAveraConversation() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');

  const send = (text) => {
    const value = (text ?? draft).trim();
    if (!value) return;
    setMessages((m) => [...m, { role: 'user', text: value }, { role: 'assistant', text: NOT_AVAILABLE }]);
    setDraft('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
        <div className="rounded-2xl border border-border bg-info-surface p-4">
          <StatusPill tone="info" icon={Info}>
            Not yet available
          </StatusPill>
          <p className="mt-2 text-base text-foreground">
            Ask Avera arrives in a later stage. Your data stays private until then — nothing is analyzed in Stage 0.
          </p>
        </div>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-base text-primary-foreground">
                {m.text}
              </div>
            ) : (
              <div className="max-w-[90%] rounded-2xl border border-border bg-surface-subtle px-4 py-2.5 text-base text-foreground">
                {m.text}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <p className="text-sm text-muted-foreground">Try a question</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition-colors duration-200 hover:bg-surface-subtle"
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your finances"
            aria-label="Ask Avera"
            className="min-h-11 rounded-xl bg-surface"
          />
          <Button type="submit" className="min-h-11 rounded-xl px-4" aria-label="Send question">
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}