import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/** Light / dark / system theme control backed by next-themes. */
export default function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Color theme">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => setTheme(o.value)}
          aria-pressed={theme === o.value}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-base transition-colors duration-200',
            theme === o.value
              ? 'bg-surface-selected font-medium text-foreground'
              : 'bg-surface text-muted-foreground hover:text-foreground'
          )}
        >
          <o.icon className="h-4 w-4" aria-hidden="true" />
          {o.label}
        </button>
      ))}
    </div>
  );
}