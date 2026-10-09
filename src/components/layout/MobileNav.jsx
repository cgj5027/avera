import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Sparkles, Target, MoreHorizontal, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PRIMARY_NAV, SETTINGS_NAV } from '@/config/navigation';
import ModeIndicator from './ModeIndicator';

/* Mobile bar shows 4 destinations; the rest sit one step away (design system §17). */
const BAR_ITEMS = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Bills', path: '/bills-budget', icon: Receipt },
  { label: 'Ask Avera', path: '/ask-avera', icon: Sparkles },
  { label: 'Goals', path: '/goals-opportunities', icon: Target },
];

const MORE_ITEMS = [PRIMARY_NAV[2], PRIMARY_NAV[4], SETTINGS_NAV];

export default function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              A
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">Avera</span>
          </div>
          <ModeIndicator variant="inline" />
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface lg:hidden" aria-label="Primary">
        <div className="grid grid-cols-5">
          {BAR_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-1 text-xs transition-colors duration-200',
                  isActive ? 'font-semibold text-primary' : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </NavLink>
          ))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <button
              onClick={() => setMoreOpen(true)}
              aria-expanded={moreOpen}
              className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              More
            </button>
            <SheetContent side="bottom" className="rounded-t-2xl p-0">
              <SheetHeader className="p-4 pb-0 text-left">
                <SheetTitle>More destinations</SheetTitle>
              </SheetHeader>
              <div className="p-2 pb-6">
                {MORE_ITEMS.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-base text-foreground transition-colors duration-200 hover:bg-surface-subtle"
                  >
                    <item.icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    {item.label}
                    <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}