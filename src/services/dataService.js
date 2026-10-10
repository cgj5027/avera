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
  jobProfile: 'JobProfile',
  plaidItem: 'PlaidItem',
};

const ent = (key) => {
  const name = DATA_ENTITIES[key];
  if (!name) throw new Error(`Unknown data entity: ${key}`);
  return base44.entities[name];
};

async function currentUser() {
  const user = await base44.auth.me();
  if (!user?.id) throw new Error('Sign in to access your financial records.');
  return user;
}

/** Explicit owner filtering complements, and never replaces, server RLS. */
export async function listPage(key, query = {}, opts = {}) {
  const user = await currentUser();
  return ent(key).filter({ ...query, created_by_id: user.id }, { limit: 100, ...opts });
}

export async function listRecords(key, query = {}) {
  const user = await currentUser();
  const scoped = { ...query, created_by_id: user.id };
  const items = [];
  const cursors = new Set();
  let cursor;
  do {
    const page = await ent(key).filter(scoped, { limit: 100, ...(cursor ? { cursor } : {}) });
    items.push(...page.items);
    if (!page.has_more) return items;
    if (!page.next_cursor || cursors.has(page.next_cursor)) throw new Error('Invalid pagination response');
    cursor = page.next_cursor;
    cursors.add(cursor);
  } while (cursor);
  return items;
}

function writable(data) {
  const { id, created_by_id, created_by, created_date, updated_date, ...fields } = data;
  return fields;
}

async function owned(key, id) {
  const user = await currentUser();
  const record = await ent(key).get(id);
  if (record.created_by_id !== user.id) throw new Error('You cannot access this record.');
  return record;
}

export async function createRecord(key, data) {
  await currentUser();
  if (key === 'budgetCategory' && (await listRecords(key, { name: data.name })).length) throw new Error('A category with this name already exists.');
  return ent(key).create(writable(data));
}
export async function updateRecord(key, id, data) {
  const before = await owned(key, id);
  if (key === 'budgetCategory' && data.name && data.name !== before.name) {
    const matches = await listRecords('budgetCategory', { name: data.name });
    if (matches.some(item => item.id !== id)) throw new Error('A category with this name already exists.');
    for (const transaction of await listRecords('transaction', { category: before.name })) {
      await ent('transaction').update(transaction.id, { category: data.name });
    }
  }
  return ent(key).update(id, writable(data));
}
export async function deleteRecord(key, id) {
  await owned(key, id);
  return ent(key).delete(id);
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) out.push(array.slice(i, i + size));
  return out;
}

/** Bulk create for seeding flows (demo workspaces). Owner-scoped like createRecord. */
export async function createRecords(key, rows) {
  await currentUser();
  const created = [];
  for (const batch of chunk(rows.map(writable), 200)) {
    created.push(...(await ent(key).bulkCreate(batch)));
  }
  return created;
}

/** Deletes every owned record matching the query, in small batches.
 *  Callers keep the query narrow (e.g. a demo_profile tag) on purpose. */
export async function deleteRecordsWhere(key, query) {
  const rows = await listRecords(key, query);
  for (const batch of chunk(rows, 10)) {
    await Promise.allSettled(batch.map((row) => ent(key).delete(row.id)));
  }
  return rows.length;
}

export async function getHouseholdProfile() {
  return (await listRecords('householdProfile'))[0] ?? null;
}
export async function saveHouseholdProfile(data) {
  const profile = await getHouseholdProfile();
  return profile ? updateRecord('householdProfile', profile.id, data) : createRecord('householdProfile', data);
}