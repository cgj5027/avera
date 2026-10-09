import { Link, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { PRIMARY_NAV, SETTINGS_NAV } from '@/config/navigation';
import ModeIndicator from './ModeIndicator';

const linkClass = (isActive) =>
  cn(
    'mb-1 flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors duration-200',
    isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'
  );

/** Desktop sidebar: Avera Forest, six destinations, Settings anchored at bottom. */
export default function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <Link to="/" className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-base font-semibold text-white">
          A
        </span>
        <span className="text-lg font-semibold tracking-tight text-white">Avera</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'} className={({ isActive }) => linkClass(isActive)}>
            <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <ModeIndicator variant="sidebar" />
      <div className="px-3 pb-4 pt-2">
        <NavLink to={SETTINGS_NAV.path} className={({ isActive }) => linkClass(isActive)}>
          <SETTINGS_NAV.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {SETTINGS_NAV.label}
        </NavLink>
      </div>
    </aside>
  );
}