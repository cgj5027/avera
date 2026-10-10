/**
 * Demo Mode orchestration — Stage 3B.
 *
 * Loads, resets, and exits demo workspaces. Every demo record is stamped with
 * demo_profile (and, for linked Plaid Sandbox custom users, tracked through a
 * demo-tagged PlaidItem), so reset and exit remove ONLY the signed-in user's
 * demo workspace records — never their ordinary financial records.
 * All entity access flows through dataService, which filters by the
 * authenticated user's id on top of server-side row-level security.
 */
import { base44 } from '@/api/base44Client';
import { listRecords, createRecords, deleteRecordsWhere } from './dataService';
import { buildDemoDataset, createDemoRecords, DEMO_PROFILES, DEMO_PROFILE_KEYS } from './demoProfiles';
import { getDemoWorkspace, setDemoWorkspace, clearDemoWorkspace, setModeOwner } from '@/lib/mode';

/** Entities a demo workspace seeds. PlaidItem is handled alongside its imports. */
const DEMO_ENTITIES = [
  'transaction',
  'account',
  'bill',
  'budgetCategory',
  'goal',
  'property',
  'mortgageRecord',
  'incomeSource',
  'householdProfile',
  'jobProfile',
];

/** Removes every record tagged to the given demo profile(s) for this user,
 *  plus the Plaid Sandbox Items created for those profiles and their imports. */
export async function removeDemoData(profileKeys, plaidItemIds = []) {
  const keys = Array.isArray(profileKeys) ? profileKeys : [profileKeys];
  const validKeys = keys.filter((k) => DEMO_PROFILE_KEYS.includes(k));
  if (validKeys.length) {
    for (const key of DEMO_ENTITIES) {
      await deleteRecordsWhere(key, { demo_profile: { $in: validKeys } });
    }
  }
  /* Remembered Item ids are untrusted; only owned, demo-tagged connections
     may be removed. The backend also verifies the private credential tag. */
  const demoItems = await listRecords('plaidItem', { demo_profile: { $in: validKeys } }, {allDatasets:true});
  const itemIds = [...new Set([...demoItems.map((i) => i.item_id)].filter(Boolean))];
  for (const itemId of itemIds) {
    await base44.functions.invoke('plaidDisconnect', { item_id:itemId, demo_only:true });
  }
  return itemIds;
}

async function seedStructuralRecords(profileKey, includeTransactionData) {
  const dataset = buildDemoDataset(profileKey, new Date(), { includeTransactionData });
  await createDemoRecords(
    dataset,
    (key, rows) => createRecords(key, rows)
  );
}

/** Connects the profile's Plaid Sandbox custom user, syncs it, and returns the item id. */
async function connectPlaidDemo(profileKey) {
  const res = await base44.functions.invoke('demoSandboxConnect', { profile_key: profileKey });
  const itemId = res.data?.item_id ?? null;
  if (!itemId) throw new Error(res.data?.error || 'Plaid Sandbox connection failed.');
  /* The first sync can return before the sandbox publishes the custom
     transactions; retry once after a short wait so the profile loads fully. */
  const syncResult = await base44.functions.invoke('plaidSync', {item_id:itemId});
  const check = result => {
    const own = result.data?.results?.find(r => r.item_id === itemId);
    if (!own || own.status !== 'synced') throw new Error('Demo sync failed');
    return own.transactions || 0;
  };
  let imported = check(syncResult);
  if (imported === 0) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    const retry = await base44.functions.invoke('plaidSync', {item_id:itemId});
    imported = check(retry);
  }
  if (!imported) throw new Error('Demo transactions are not ready');
  return itemId;
}

/**
 * Loads a demo profile: clears any existing demo workspace for this user,
 * optionally connects the matching Plaid Sandbox custom user, and seeds the
 * profile. Returns { plaid_used, warning } — the warning is shown when Plaid
 * failed and the labeled Avera sample dataset was used instead.
 */
export async function loadDemoProfile(profileKey, { viaPlaid = false } = {}) {
  const user = await base44.auth.me();
  if (!user?.id) throw new Error('Sign in to load demo data.');
  setModeOwner(user.id);
  if (!DEMO_PROFILES[profileKey]) throw new Error('Unknown demo profile.');
  /* A demo workspace holds exactly one profile: clear every demo tag first. */
  await removeDemoData(DEMO_PROFILE_KEYS, getDemoWorkspace()?.plaid_item_id ? [getDemoWorkspace().plaid_item_id] : []);

  let plaidItemId = null;
  let warning = '';
  if (viaPlaid) {
    try {
      plaidItemId = await connectPlaidDemo(profileKey);
    } catch {
      await removeDemoData(profileKey);
      plaidItemId = null;
      warning = 'Plaid Sandbox connection failed — loaded the labeled Avera sample dataset instead.';
    }
  }

  await seedStructuralRecords(profileKey, !plaidItemId);
  setDemoWorkspace({ profile: profileKey, plaid_item_id: plaidItemId });
  return { plaid_used: Boolean(plaidItemId), warning };
}

/** Resets the ACTIVE demo workspace only: this user, this profile, nothing else. */
export async function resetDemoProfile() {
  const ws = getDemoWorkspace();
  if (!ws?.profile) throw new Error('No demo profile is active.');
  const viaPlaid = Boolean(ws.plaid_item_id);
  await removeDemoData(ws.profile, viaPlaid ? [ws.plaid_item_id] : []);
  return loadDemoProfile(ws.profile, { viaPlaid });
}

/** Exits Demo Mode: removes the active workspace's demo data and clears the mode. */
export async function exitDemoMode(clearMode) {
  const ws = getDemoWorkspace();
  if (ws?.profile) {
    await removeDemoData(ws.profile, ws.plaid_item_id ? [ws.plaid_item_id] : []);
  }
  clearDemoWorkspace();
  if (clearMode) clearMode();
}