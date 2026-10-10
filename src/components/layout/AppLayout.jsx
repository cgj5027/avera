import { Outlet } from 'react-router-dom';
import SidebarNav from './SidebarNav';
import MobileNav from './MobileNav';
import DemoModeBar from './DemoModeBar';

/** App shell: forest sidebar on desktop, labeled bar + More sheet on mobile. */
export default function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-base focus:font-medium focus:text-foreground focus:shadow-md"
      >
        Skip to main content
      </a>
      <SidebarNav />
      <div className="lg:pl-60">
        <MobileNav />
        <main id="main-content" className="pb-28 lg:pb-12">
          <DemoModeBar />
          <Outlet />
        </main>
      </div>
    </div>
  );
}