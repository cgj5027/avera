/**
 * Persistence layer — the single seam between UI/business logic and the
 * Base44 database (entities). Stage 0 stores no financial data; this module
 * defines the access pattern later stages follow:
 * - All reads/writes go through base44.entities.* with the user's own scope.
 * - Source labels (Manual / Sample data / Plaid Sandbox / Estimated) travel
 *   with every record (see src/utils/constants.js).
 */
export const DATA_STAGE = 'stub';

const notImplemented = (name) =>
  new Error(`${name} is a Stage 0 stub — implement against base44.entities.* with user-scoped queries.`);

export function listUserRecords() {
  throw notImplemented('listUserRecords');
}

export function saveUserRecord() {
  throw notImplemented('saveUserRecord');
}