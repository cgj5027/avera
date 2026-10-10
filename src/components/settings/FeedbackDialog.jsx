import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import FeedbackForm from './FeedbackForm';

export default function FeedbackDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Give app feedback" title="Give app feedback" className="shrink-0 bg-surface text-primary">
          <MessageSquare aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface p-4 sm:p-6">
        <DialogHeader className="pr-9 text-left">
          <DialogTitle>App feedback</DialogTitle>
          <DialogDescription className="text-base">Share your experience with the app team.</DialogDescription>
        </DialogHeader>
        <FeedbackForm />
      </DialogContent>
    </Dialog>
  );
}
