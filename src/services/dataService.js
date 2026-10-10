/**
 * Persistence layer — the single seam between UI/business logic and the
 * Base44 database. All reads and writes go through base44.entities.* and are
 * scoped to the signed-in user by row-level security (every financial entity
 * anchors on created_by_id). Source labels travel with every record.
 */
import { base44 } from '@/api/base44Client';

export const DATA_STAGE = 'live';

export const DATA_ENTITIES = {
  householdProfile: 'HouseholdProfile',
  incomeSource: 'IncomeSource',
  account: 'Account',
  transaction: 'Transaction',
  bill: 'Bill',
  budgetCategory: 'BudgetCategory',
  goal: 'Goal',
  property: 'Property',
  mortgageRecord: 'MortgageRecord',
  forecastRecord: 'ForecastRecord',
};

const ent = (key) => {
  const name = DATA_ENTITIES[key];
  if (!name) throw new Error(`Unknown data entity: ${key}`);
  return base44.entities[name];
};

/** All of the signed-in user's records matching the query. */
export const listRecords = (key, query = {}) => ent(key).filter(query);

/** One page of records: { items, next_cursor, has_more }. */
export const listPage = (key, query = {}, opts = {}) => ent(key).filter(query, { limit: 50, ...opts });

export const createRecord = (key, data) => ent(key).create(data);

export const updateRecord = (key, id, data) => ent(key).update(id, data);

export const deleteRecord = (key, id) => ent(key).delete(id);

/** The user's household profile (single record), or null when none is saved yet. */
export async function getHouseholdProfile() {
  const items = await ent('householdProfile').filter({});
  return items[0] ?? null;
}

export async function saveHouseholdProfile(data) {
  const items = await ent('householdProfile').filter({});
  if (items[0]) return ent('householdProfile').update(items[0].id, data);
  return ent('householdProfile').create(data);
}