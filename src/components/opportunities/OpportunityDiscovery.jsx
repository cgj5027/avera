import { useEffect, useState } from 'react';
import { Briefcase } from 'lucide-react';
import StatusPill from '@/components/states/StatusPill';
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

  useEffect(() => {
    let cancelled = false;
    listRecords('jobProfile')
      .then((items) => {
        if (!cancelled) setProfile(items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setSaveError(true);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async (values) => {
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
        Describe your skills and availability to search for real jobs and one-off gigs. Search is optional — your
        profile is saved only for you, and results always show their source.
      </p>
      {saveError && (
        <div className="mt-3">
          <StatusPill tone="danger">Profile could not be saved — please try again</StatusPill>
        </div>
      )}
      {loaded ? (
        <>
          <OpportunityProfileForm profile={profile} saving={saving} onSave={save} />
          <OpportunityResults profile={profile} />
        </>
      ) : (
        <div className="mt-4">
          <StatusPill tone="info">Loading your profile</StatusPill>
        </div>
      )}
    </section>
  );
}