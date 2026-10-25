import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EXPERIENCE_LEVELS, JOB_TYPES, WORK_MODES } from './jobTypes';

/**
 * Income-opportunity profile form. Values persist to the user's own
 * JobProfile record; nothing here contacts an external service.
 */
export default function OpportunityProfileForm({ profile, saving, onSave, onCancel }) {
  const [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (saving) return;
    const f = new FormData(e.currentTarget);
    const skills = String(f.get('skills') ?? '').trim();
    if (!skills) {
      setError('Enter your skills to save your profile.');
      return;
    }
    const distance = Number(f.get('distance_miles'));
    if (!Number.isInteger(distance) || distance < 1 || distance > 250) {
      setError('Choose a search distance from 1 to 250 miles.'); return;
    }
    setError('');
    onSave({
      skills,
      interests: String(f.get('interests') ?? '').trim(),
      experience: String(f.get('experience') ?? '').trim(),
      experience_level: EXPERIENCE_LEVELS.some((l) => l.value === f.get('experience_level'))
        ? String(f.get('experience_level'))
        : 'entry_level',
      preferred_roles: String(f.get('preferred_roles') ?? '').trim(),
      job_type: JOB_TYPES.some((t) => t.value === f.get('job_type')) ? String(f.get('job_type')) : 'any',
      work_mode: String(f.get('work_mode') ?? 'any'),
      location: String(f.get('location') ?? '').trim(),
      distance_miles: distance,
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
        <Label htmlFor="opp-interests">Interests and industries</Label>
        <Input id="opp-interests" name="interests" maxLength={400} defaultValue={profile?.interests ?? ''}
          placeholder="e.g. education, healthcare, helping customers" className="mt-1.5 min-h-11 rounded-xl bg-surface" />
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
        <Label htmlFor="opp-type">Role type</Label>
        <Select name="job_type" defaultValue={profile?.job_type ?? 'any'}>
          <SelectTrigger id="opp-type" className="mt-1.5 min-h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
      <div className="sm:col-span-2">
        <Label htmlFor="opp-location">Location</Label>
        <Input
          id="opp-location"
          name="location"
          defaultValue={profile?.location ?? ''}
          placeholder="City and state, or postal code"
          className="mt-1.5 min-h-11 rounded-xl bg-surface"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="opp-distance">Search distance (miles)</Label>
        <Input id="opp-distance" name="distance_miles" type="number" min={1} max={250} step={1} required
          defaultValue={profile?.distance_miles ?? 25} aria-describedby="opp-distance-hint" className="mt-1.5 min-h-11 rounded-xl bg-surface" />
        <p id="opp-distance-hint" className="mt-1 text-sm text-muted-foreground">Default 25 miles from your saved location. Distances use approximate place centres, not driving routes. Jobs without a resolvable location are excluded, including remote listings. Leave location blank to search without a distance limit.</p>
      </div>
      {error && <p role="alert" className="text-base text-danger-text sm:col-span-2">{error}</p>}
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <Button type="submit" disabled={saving} className="min-h-11 rounded-xl px-4">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Save profile
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={saving} className="min-h-11 rounded-xl px-4" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}