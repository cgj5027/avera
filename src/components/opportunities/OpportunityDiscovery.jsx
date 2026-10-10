import { useEffect, useState } from 'react';
import { Briefcase, Search } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import InfoHint from '@/components/states/InfoHint';
import { Button } from '@/components/ui/button';
import OpportunityProfileForm from './OpportunityProfileForm';
import ProfileSummary from './ProfileSummary';
import ResumeUpload from './ResumeUpload';
import OpportunityResults from './OpportunityResults';
import { listRecords, createRecord, updateRecord } from '@/services/dataService';

/**
 * Income-opportunity discovery: a saved, read-until-edited work profile plus
 * opportunity search in its own card, both against the backend function.
 */
export default function OpportunityDiscovery() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [applyKey, setApplyKey] = useState(0);

  /** Resume suggestions land in the editable form; nothing saves until the user confirms. */
  const applySuggestions = (suggestions) => {
    setProfile((p) => ({ ...(p ?? {}), ...suggestions }));
    setEditing(true);
    setApplyKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(false);
    listRecords('jobProfile')
      .then((items) => {
        if (!cancelled) setProfile(items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const save = async (values) => {
    if (saving || loadError) return;
    setSaving(true);
    setSaveError(false);
    try {
      // Resume suggestions can sit on `profile` before any record exists, so key off the saved id.
      const saved = profile?.id
        ? await updateRecord('jobProfile', profile.id, values)
        : await createRecord('jobProfile', values);
      setProfile(saved);
      setEditing(false);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-heading text-base font-semibold text-foreground">Work profile</h2>
          <InfoHint text="Your skills and job preferences are used to match job and gig listings. The profile is saved read-only; use Edit profile to change it." />
          <StatusPill tone="neutral">Optional</StatusPill>
        </div>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Describes your skills and the work you want. Saved read-only; edit it any time.
        </p>
        {saveError && (
          <div className="mt-3" role="alert">
            <StatusPill tone="danger">Profile could not be saved — please try again</StatusPill>
          </div>
        )}
        {loadError ? (
          <div className="mt-4" role="alert">
            <p className="text-base text-danger-text">Your profile could not be loaded. Retry before saving changes.</p>
            <Button type="button" variant="outline" className="mt-2" onClick={() => setReloadKey(k => k + 1)}>Retry loading profile</Button>
          </div>
        ) : loaded && profile?.id && !editing ? (
          <ProfileSummary
            profile={profile}
            onEdit={() => {
              setSaveError(false);
              setEditing(true);
            }}
          />
        ) : loaded ? (
          <div className="mt-4">
            <ResumeUpload onApply={applySuggestions} />
            <OpportunityProfileForm
              key={applyKey}
              profile={profile}
              saving={saving}
              onSave={save}
              onCancel={profile?.id ? () => setEditing(false) : undefined}
            />
          </div>
        ) : (
          <div className="mt-4">
            <StatusPill tone="info">Loading your profile</StatusPill>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Search className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="font-heading text-base font-semibold text-foreground">Job search</h2>
          <InfoHint text="Searches current postings on the public web using your work profile. Results link to the source; availability and pay are not verified." />
        </div>
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">
          Request current job and gig listings matched to your profile.
        </p>
        <OpportunityResults key={JSON.stringify(profile)} profile={profile} />
      </section>
    </div>
  );
}