/**
 * Persistence layer — the single seam between UI/business logic and the
 * Base44 database. All reads and writes go through base44.entities.* and are
 * scoped to the signed-in user by row-level security (every financial entity
 * anchors on created_by_id). Source labels travel with every record.
 */
import { withGoalContributions } from '../../base44/shared/goalSavings';
import { base44 } from '@/api/base44Client';
import { setModeOwner, getDataMode, getDemoWorkspace } from '@/lib/mode';

export const DATA_STAGE = 'live';

export const DATA_ENTITIES = {
  householdProfile: 'HouseholdProfile',
  incomeSource: 'IncomeSource',
  account: 'Account',
  transaction: 'Transaction',
  bill: 'Bill',
  billSuggestionDismissal: 'BillSuggestionDismissal',
  budgetCategory: 'BudgetCategory',
  goal: 'Goal',
  goalContribution: 'GoalContribution',
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
  setModeOwner(user.id);
  return user;
}

/** Dataset filters supplement, never replace, authenticated server RLS. */
function financialScope(user, key, query, allDatasets = false) {
  const scoped = { ...query, created_by_id:user.id };
  if (!allDatasets && key !== 'plaidItem') {
    if (getDataMode() === 'demo') {
      const ws=getDemoWorkspace();
      if (!ws) throw new Error('Select a demo profile.');
      scoped.demo_profile=ws.profile;
    } else {
      // Optional schema fields can be stored as null or an empty string.
      const ordinary = {$or:[{demo_profile:{$exists:false}},{demo_profile:null},{demo_profile:''}]};
      if (scoped.$or) {
        const {$or,...rest}=scoped;
        return {...rest,$and:[...(scoped.$and || []),{$or},ordinary]};
      }
      return {...scoped,...ordinary};
    }
  }
  return scoped;
}
export async function listPage(key, query = {}, opts = {}) {
  const user=await currentUser();
  const {allDatasets=false,...options}=opts;
  return ent(key).filter(financialScope(user,key,query,allDatasets), {limit:100,...options});
}
export async function listRecords(key, query = {}, { allDatasets = false } = {}) {
  const user = await currentUser();
  const scoped=financialScope(user,key,query,allDatasets);
  const items = [];
  const cursors = new Set();
  let cursor;
  do {
    const page = await ent(key).filter(scoped, { limit: 100, ...(cursor ? { cursor } : {}) });
    items.push(...page.items);
    if (!page.has_more) return key === 'goal' ? withGoalContributions(items, await listRecords('goalContribution', {}, {allDatasets})) : items;
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
  if (!record || record.created_by_id !== user.id) throw new Error('You cannot access this record.');
  if (key !== 'plaidItem') {
    const profile=getDataMode()==='demo'?getDemoWorkspace()?.profile:'';
    if ((record.demo_profile || '') !== profile) throw new Error('This record is outside your active dataset.');
  }
  return record;
}

export async function createRecord(key, data) {
  await currentUser();
  if (key === 'budgetCategory' && (await listRecords(key, { name: data.name })).length) throw new Error('A category with this name already exists.');
  const fields = writable(data);
  if (key !== 'plaidItem') {
    const workspace = getDemoWorkspace();
    if (getDataMode() === 'demo' && !workspace) throw new Error('Select a demo profile.');
    fields.demo_profile = getDataMode() === 'demo' ? workspace.profile : '';
  }
  return ent(key).create(fields);
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
  const fields=writable(data);
  delete fields.demo_profile;
  return ent(key).update(id, fields);
}
export async function deleteRecord(key, id) {
  await owned(key, id);
  if (key === 'goal') await deleteRecordsWhere('goalContribution', {goal_id:id});
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
  const rows = await listRecords(key, query, {allDatasets:true});
  for (const batch of chunk(rows, 10)) {
    await Promise.all(batch.map((row) => ent(key).delete(row.id)));
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
/** Use the most recently saved work profile if older duplicates exist. */
export async function getJobProfile() {
  const profiles = await listRecords('jobProfile');
  const timestamp = profile => {
    const date = Date.parse(profile.updated_date || profile.created_date || '');
    return Number.isFinite(date) ? date : 0;
  };
  return profiles.sort((a,b) => timestamp(b)-timestamp(a))[0] ?? null;
}

/** Each request writes an independent idempotent row, never a stale total. */
export async function logGoalContribution(goalId, amount, requestId) {
  await owned('goal',goalId);
  const dataset=getDataMode()==='demo'?{mode:'demo',profile:getDemoWorkspace()?.profile}:{mode:'ordinary'};
  const response=await base44.functions.invoke('logGoalContribution',{goal_id:goalId,amount,request_id:requestId,dataset});
  if (response.data?.saved!==true) throw new Error('Contribution was not saved.');
}
