import { RequestFailure } from './requestSafety.ts';
const LIMITS = {
  askAvera: [6, 60], parseResume: [2, 10], searchJobOpportunities: [3, 30],
  demoSandboxConnect: [2, 10], suggestBills: [6, 60], suggestCategories: [6, 60],
};
// Private, durable counters. Never reset used through upsert. updateMany uses a
// conditional predicate and $inc; hosted atomicity/unique-key behavior needs verification.
export async function claimUsage(client, user, endpoint: keyof typeof LIMITS, now = Date.now()) {
  if (!user?.id || !Object.hasOwn(LIMITS, endpoint)) throw new RequestFailure(503, 'Service limits are unavailable.');
  try {
    const entity = client.asServiceRole.entities.ServiceUsage;
    for (const [index, duration] of [60000, 86400000].entries()) {
      const bucket = Math.floor(now / duration);
      const usage_key = `${user.id}:${endpoint}:${duration}:${bucket}`;
      await entity.upsert([{ usage_key, owner_id: user.id, endpoint,
        expires_at: new Date((bucket + 1) * duration).toISOString() }], { key: 'usage_key' });
      const result = await entity.updateMany({ usage_key, owner_id: user.id,
        $or: [{ used: { $exists: false } }, { used: { $lt: LIMITS[endpoint][index] } }] }, { $inc: { used: 1 } });
      if (result?.updated === 0) throw new RequestFailure(429, 'Request limit reached. Please try again later.');
      if (result?.updated !== 1 || result?.has_more) throw new Error('Invalid quota result');
    }
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    // No provider call when quota persistence is unavailable.
    throw new RequestFailure(503, 'Service limits are unavailable. Please retry later.');
  }
}
