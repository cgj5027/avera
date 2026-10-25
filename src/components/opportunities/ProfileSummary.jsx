import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusPill from '@/components/states/StatusPill';
import { experienceLevelLabel, jobTypeLabel, workModeLabel } from './jobTypes';

function Row({ label, value }) {
  return (
    <div className="sm:grid sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-base font-medium text-foreground sm:mt-0">{value || '—'}</dd>
    </div>
  );
}

/**
 * Read-only view of a saved work profile. Editing is explicit: the user
 * chooses Edit profile to return to the editable form.
 */
export default function ProfileSummary({ profile, onEdit }) {
  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill tone="success">Saved</StatusPill>
        <Button type="button" variant="outline" className="min-h-11 rounded-xl" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit profile
        </Button>
      </div>
      <dl className="mt-4 space-y-3">
        <Row label="Skills" value={profile.skills} />
        {profile.interests && <Row label="Interests and industries" value={profile.interests} />}
        {profile.experience && <Row label="Professional experience" value={profile.experience} />}
        <Row label="Experience level" value={experienceLevelLabel(profile.experience_level)} />
        <Row label="Role type" value={jobTypeLabel(profile.job_type) ?? 'Any'} />
        {profile.preferred_roles && <Row label="Preferred jobs or gigs" value={profile.preferred_roles} />}
        <Row label="Work preference" value={workModeLabel(profile.work_mode)} />
        {profile.location && <Row label="Location" value={profile.location} />}
      </dl>
    </div>
  );
}