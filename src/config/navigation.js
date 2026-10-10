import { LayoutDashboard, Receipt, CalendarDays, Briefcase, Building2, Sparkles, Settings } from 'lucide-react';

/**
 * Single source of truth for navigation labels and destinations.
 * Page titles must match these labels (design system §17).
 */
export const PRIMARY_NAV = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Bills & Budget', path: '/bills-budget', icon: Receipt },
  { label: 'Yearly Plan', path: '/yearly-plan', icon: CalendarDays },
  { label: 'Opportunities', path: '/opportunities', icon: Briefcase },
  { label: 'Properties', path: '/properties', icon: Building2 },
  { label: 'Ask Avera', path: '/ask-avera', icon: Sparkles },
];

export const SETTINGS_NAV = { label: 'Settings', path: '/settings', icon: Settings };