import { useState } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Outlet, useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import MobileNav from './MobileNav';
import DemoModeBar from './DemoModeBar';
import ModeIndicator from './ModeIndicator';
import SignOutButton from '@/components/SignOutButton';
import FeedbackDialog from '@/components/settings/FeedbackDialog';

/** App shell: forest sidebar on desktop, labeled bar + More sheet on mobile. */
export default function AppLayout() {
  const [navigationOpen, setNavigationOpen] = useState(true);
  const isChat = useLocation().pathname.replace(/\/$/, '') === '/ask-avera';
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-base focus:font-medium focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      <button
        type="button"
        aria-label={navigationOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={navigationOpen}
        aria-controls="desktop-navigation"
        onClick={() => setNavigationOpen((open) => !open)}
        className="fixed left-4 top-1.5 z-50 hidden h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground shadow-md transition-colors duration-200 hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:flex"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>
      <SidebarNav open={navigationOpen} />
      <div className={cn(
        'transition-[padding-left] duration-200 ease-in-out motion-reduce:transition-none',
        navigationOpen ? 'lg:pl-60' : 'lg:pl-0',
        isChat && 'flex h-dvh flex-col'
      )}>
        <header className="sticky top-0 z-40 shrink-0 border-b border-border bg-surface/95 backdrop-blur">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:justify-end lg:pl-20">
            <div className="flex shrink-0 items-center gap-2.5 lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">A</span>
              <span className="text-base font-semibold tracking-tight text-foreground">Avera</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <div className="lg:hidden"><ModeIndicator variant="inline" /></div>
              <FeedbackDialog />
              <SignOutButton />
            </div>
          </div>
        </header>
        <MobileNav />
        <main id="main-content" className={isChat ? 'flex min-h-0 flex-1 flex-col pb-16 lg:pb-0' : 'pb-28 lg:pb-12'}>
          <DemoModeBar compact={isChat} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
