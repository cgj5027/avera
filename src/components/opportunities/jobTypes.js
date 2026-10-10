/** Role types shared by the profile form and the results list. */
export const JOB_TYPES = [
  { value: 'any', label: 'Any' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'contract', label: 'Contract / gig' },
];

/** Experience levels shared by the profile form and the read-only summary. */
export const EXPERIENCE_LEVELS = [
  { value: 'entry_level', label: 'Entry level (0–2 years)' },
  { value: 'mid_level', label: 'Mid level (3–9 years)' },
  { value: 'senior', label: 'Senior (10+ years)' },
];

/** Work modes shared by the profile form and the read-only summary. */
export const WORK_MODES = [
  { value: 'any', label: 'Any' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

/** Display label for a listing's role type; null when unknown or "any". */
export function jobTypeLabel(value) {
  return JOB_TYPES.find((t) => t.value === value && t.value !== 'any')?.label ?? null;
}

/** Display label for a saved profile's experience level. */
export function experienceLevelLabel(value) {
  return EXPERIENCE_LEVELS.find((l) => l.value === value)?.label ?? null;
}

/** Display label for a saved profile's work mode. */
export function workModeLabel(value) {
  return WORK_MODES.find((m) => m.value === value)?.label ?? null;
}