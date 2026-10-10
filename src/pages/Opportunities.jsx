import PageHeader from '@/components/layout/PageHeader';
import OpportunityDiscovery from '@/components/opportunities/OpportunityDiscovery';

/** Opportunities: find extra income or better-paying work, independent of goals. */
export default function Opportunities() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader title="Opportunities" subtitle="Find ways to earn more — extra income or a job that pays better." />
      <OpportunityDiscovery />
    </div>
  );
}