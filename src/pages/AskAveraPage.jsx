import PageHeader from '@/components/layout/PageHeader';
import AskAveraConversation from '@/components/askavera/AskAveraConversation';

/** Dedicated Ask Avera destination, preserving the conversation shell. */
export default function AskAveraPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Ask Avera"
        subtitle="One assistant for your money questions. Read-only, always."
      />
      <div className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <AskAveraConversation />
      </div>
    </div>
  );
}