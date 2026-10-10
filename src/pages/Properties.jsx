import { useEffect, useState } from 'react';
import { Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/layout/PageHeader';
import ConfirmDeleteDialog from '@/components/finance/ConfirmDeleteDialog';
import LoadingState from '@/components/states/LoadingState';
import ErrorState from '@/components/states/ErrorState';
import EmptyState from '@/components/states/EmptyState';
import PropertyCard from '@/components/properties/PropertyCard';
import PropertyDialog from '@/components/properties/PropertyDialog';
import { base44 } from '@/api/base44Client';
import { createRecord, updateRecord, deleteRecord } from '@/services/dataService';
import { propertyMonthlyCostsTotal } from '@/services/financialCalculations';
import { formatCurrency } from '@/utils/format';

/** Properties: properties, manual valuations, mortgages, equity, and monthly costs. */
export default function Properties() {
  const [properties, setProperties] = useState(null);
  const [mortgages, setMortgages] = useState(null);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState({ open: false, property: null });
  const [deleteProperty, setDeleteProperty] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setError(null);
    Promise.all([base44.entities.Property.filter({}), base44.entities.MortgageRecord.filter({})])
      .then(([p, m]) => {
        if (!cancelled) {
          setProperties(p);
          setMortgages(m);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const saveProperty = async ({ property, mortgage }) => {
    setBusy(true);
    try {
      const existing = dialog.property ? mortgages.find((m) => m.property_id === dialog.property.id) : null;
      let saved;
      if (dialog.property) {
        await updateRecord('property', dialog.property.id, property);
        saved = dialog.property;
      } else {
        saved = await createRecord('property', property);
      }
      const hasMortgage = mortgage.outstanding_balance != null || mortgage.monthly_payment != null || mortgage.lender != null;
      if (hasMortgage) {
        if (existing) await updateRecord('mortgageRecord', existing.id, mortgage);
        else await createRecord('mortgageRecord', { ...mortgage, property_id: saved.id });
      } else if (existing) {
        await deleteRecord('mortgageRecord', existing.id);
      }
      toast({ title: dialog.property ? 'Property updated' : 'Property added' });
      setDialog({ open: false, property: null });
      reload();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteProperty) return;
    setBusy(true);
    try {
      const mortgage = mortgages.find((m) => m.property_id === deleteProperty.id);
      if (mortgage) await deleteRecord('mortgageRecord', mortgage.id);
      await deleteRecord('property', deleteProperty.id);
      setDeleteProperty(null);
      toast({ title: 'Property deleted' });
      reload();
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <ErrorState message="We couldn't load your properties. Your data is safe — try again." onRetry={reload} />
      </div>
    );
  }
  if (!properties || !mortgages) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <LoadingState label="Loading Properties" />
      </div>
    );
  }

  const totalMonthly = propertyMonthlyCostsTotal(properties, mortgages);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <PageHeader
        title="Properties"
        subtitle="Property values, liabilities, equity, and monthly ownership costs."
        actions={
          <Button onClick={() => setDialog({ open: true, property: null })} className="min-h-11 rounded-xl px-4">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add property
          </Button>
        }
      />

      {totalMonthly > 0 && (
        <p className="mb-4 text-base text-muted-foreground">
          All properties cost <span className="tabular-nums text-foreground">{formatCurrency(totalMonthly)}</span>/mo combined
          — included in your monthly expenses and yearly plan.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {properties.length === 0 ? (
          <EmptyState
            heading="No properties yet"
            description="Add a residential or investment property with a user-provided value estimate — always labeled Manual — plus optional mortgage details. Equity is calculated as value minus outstanding debt."
          />
        ) : (
          properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              mortgage={mortgages.find((m) => m.property_id === property.id)}
              busy={busy}
              onEdit={(property, mortgage) => setDialog({ open: true, property: { ...property, _mortgage: mortgage } })}
              onDelete={setDeleteProperty}
            />
          ))
        )}
      </div>

      <section className="mt-6 flex items-start gap-2 rounded-2xl border border-border bg-info-surface p-4">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <p className="text-base text-info">
          Valuations are provider-agnostic: today they are your own estimates, clearly labeled Manual. When a verified
          valuation provider is connected, its results will be labeled separately and never mixed with your estimates.
        </p>
      </section>

      <PropertyDialog
        open={dialog.open}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        property={dialog.property}
        mortgage={dialog.property?._mortgage ?? null}
        onSave={saveProperty}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteProperty)}
        onOpenChange={(open) => {
          if (!open) setDeleteProperty(null);
        }}
        title={`Delete ${deleteProperty?.nickname ?? 'property'}?`}
        description="This removes the property, its valuation, and its mortgage record. This cannot be undone."
        onConfirm={confirmDelete}
        busy={busy}
      />
    </div>
  );
}