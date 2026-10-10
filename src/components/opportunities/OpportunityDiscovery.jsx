import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
import { Button } from '@/components/ui/button';
import OpportunityProfileForm from './OpportunityProfileForm';
import OpportunityResults from './OpportunityResults';
import { listRecords, createRecord, updateRecord } from '@/services/dataService';

/**
 * Income-opportunity discovery (Stage 2): an optional profile of skills,
 * preferences, hours, and target income, saved to the user's own record, plus
 * opportunity search against the backend function. Self-contained.
 */
export default function OpportunityDiscovery() {
  const [profile, setProfile] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

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
      const saved = profile
        ? await updateRecord('jobProfile', profile.id, values)
        : await createRecord('jobProfile', values);
      setProfile(saved);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Briefcase className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="font-heading text-base font-semibold text-foreground">Income opportunities</h2>
        <StatusPill tone="neutral">Optional</StatusPill>
      </div>
      <p className="mt-2 max-w-2xl text-base text-muted-foreground">
        Describe your skills and availability to request job and gig listings. Search is optional. Results show source links; availability is not yet verified.
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
      ) : loaded ? (
        <>
          <OpportunityProfileForm profile={profile} saving={saving} onSave={save} />
          <OpportunityResults key={JSON.stringify(profile)} profile={profile} />
        </>
      ) : (
        <div className="mt-4">
          <StatusPill tone="info">Loading your profile</StatusPill>
        </div>
      )}
    </section>
  );
}