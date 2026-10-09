import { Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import AskAveraConversation from './AskAveraConversation';

/**
 * Ask Avera drawer: right drawer on desktop, full-width sheet on mobile.
 * Escape dismisses; the caller restores focus to the launcher.
 */
export default function AskAveraDrawer({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            Ask Avera
          </SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            One assistant for your money questions. Read-only, always.
          </SheetDescription>
        </SheetHeader>
        <AskAveraConversation />
      </SheetContent>
    </Sheet>
  );
}