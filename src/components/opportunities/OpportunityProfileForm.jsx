import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const WORK_MODES = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const EXPERIENCE_LEVELS = [
  { value: 'entry_level', label: 'Entry level (0–2 years)' },
  { value: 'mid_level', label: 'Mid level (3–9 years)' },
  { value: 'senior', label: 'Senior (10+ years)' },
];

/**
 * Income-opportunity profile form (Stage 2). Values persist to the user's own
 * JobProfile record; nothing here contacts an external service.
 */
export default function OpportunityProfileForm({ profile, saving, onSave }) {
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (saving) return;
    const f = new FormData(e.currentTarget);
    const skills = String(f.get('skills') ?? '').trim();
    const hours = Number(f.get('weekly_hours'));
    const target = Number(f.get('target_monthly_income'));
    if (!skills || !Number.isInteger(hours) || hours < 0 || hours > 80 || !Number.isFinite(target) || target < 0) {
      setError('Enter skills, 0–80 whole hours per week, and a non-negative income target.');
      return;
    }
    setError('');
    onSave({
      skills,
      experience: String(f.get('experience') ?? '').trim(),
      experience_level: EXPERIENCE_LEVELS.some((l) => l.value === f.get('experience_level'))
        ? String(f.get('experience_level'))
        : 'entry_level',
      preferred_roles: String(f.get('preferred_roles') ?? '').trim(),
      work_mode: String(f.get('work_mode') ?? 'any'),
      location: String(f.get('location') ?? '').trim(),
      weekly_hours: hours,
      target_monthly_income: target,
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Label htmlFor="opp-skills">Skills</Label>
        <Textarea
          id="opp-skills"
          name="skills"
          required
          rows={2}
          defaultValue={profile?.skills ?? ''}
          placeholder="e.g. bookkeeping, tutoring, licensed driver"
          className="mt-1.5 rounded-xl bg-surface"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="opp-experience">Professional experience</Label>
        <Textarea
          id="opp-experience"
          name="experience"
          rows={2}
          defaultValue={profile?.experience ?? ''}
          placeholder="Brief summary — years, roles, certifications"
          className="mt-1.5 rounded-xl bg-surface"
        />
      </div>
      <div>
        <Label htmlFor="opp-level">Experience level</Label>
        <Select name="experience_level" defaultValue={profile?.experience_level ?? 'entry_level'}>
          <SelectTrigger id="opp-level" className="mt-1.5 min-h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="opp-roles">Preferred jobs or gigs</Label>
        <Input
          id="opp-roles"
          name="preferred_roles"
          defaultValue={profile?.preferred_roles ?? ''}
          placeholder="e.g. bookkeeping, weekend tutoring"
          className="mt-1.5 min-h-11 rounded-xl bg-surface"
        />
      </div>
      <div>
        <Label htmlFor="opp-mode">Work preference</Label>
        <Select name="work_mode" defaultValue={profile?.work_mode ?? 'any'}>
          <SelectTrigger id="opp-mode" className="mt-1.5 min-h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORK_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="opp-location">Location</Label>
        <Input
          id="opp-location"
          name="location"
          defaultValue={profile?.location ?? ''}
          placeholder="City, state — or leave blank for remote only"
          className="mt-1.5 min-h-11 rounded-xl bg-surface"
        />
      </div>
      <div>
        <Label htmlFor="opp-hours">Available hours per week</Label>
        <Input
          id="opp-hours"
          name="weekly_hours"
          type="number"
          min="0"
          max="80"
          defaultValue={profile?.weekly_hours ?? ''}
          className="mt-1.5 min-h-11 rounded-xl bg-surface tabular-nums"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="opp-target">Target additional income (per month)</Label>
        <Input
          id="opp-target"
          name="target_monthly_income"
          type="number"
          min="0"
          step="0.01"
          defaultValue={profile?.target_monthly_income ?? ''}
          className="mt-1.5 min-h-11 rounded-xl bg-surface tabular-nums"
        />
      </div>
      {error && <p role="alert" className="text-base text-danger-text sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving} className="min-h-11 rounded-xl px-4">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Save profile
        </Button>
      </div>
    </form>
  );
}