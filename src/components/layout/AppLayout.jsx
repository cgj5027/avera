import { Outlet, useLocation } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import MobileNav from './MobileNav';
import DemoModeBar from './DemoModeBar';

/** App shell: forest sidebar on desktop, labeled bar + More sheet on mobile. */
export default function AppLayout() {
  const isChat = useLocation().pathname.replace(/\/$/, '') === '/ask-avera';
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-base focus:font-medium focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      <SidebarNav />
      <div className={isChat ? 'flex h-dvh flex-col lg:pl-60' : 'lg:pl-60'}>
        <MobileNav />
        <main id="main-content" className={isChat ? 'flex min-h-0 flex-1 flex-col pb-16 lg:pb-0' : 'pb-28 lg:pb-12'}>
          <DemoModeBar compact={isChat} />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
