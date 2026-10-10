import PageHeader from '@/components/layout/PageHeader';
import AskAveraConversation from '@/components/askavera/AskAveraConversation';

/** Dedicated Ask Avera destination, preserving the conversation shell. */
export default function AskAveraPage() {
  return (
    <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
      <PageHeader
        title="Ask Avera"
        subtitle="One assistant for your money questions. Read-only, always."
        className="mb-4 shrink-0 [&_p]:hidden sm:[&_p]:block"
      />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AskAveraConversation />
      </div>
    </div>
  );
}
