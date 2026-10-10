/** Role types shared by the profile form and the results list. */
export const JOB_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'contract', label: 'Contract / gig' },
];

/** Display label for a listing's role type; null when unknown or "any". */
export function jobTypeLabel(value) {
  return JOB_TYPES.find((t) => t.value === value && t.value !== 'any')?.label ?? null;
}