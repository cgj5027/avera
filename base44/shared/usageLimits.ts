import { RequestFailure } from './requestSafety.ts';
const LIMITS = {
  askAvera: [6, 60], parseResume: [2, 10], searchJobOpportunities: [3, 30],
  demoSandboxConnect: [12, 120], suggestBills: [6, 60], suggestCategories: [6, 60],
};
// Private, durable counters. Never reset used through upsert. updateMany uses a
// conditional predicate and $inc; hosted atomicity/unique-key behavior needs verification.
export async function claimUsage(client, user, endpoint: keyof typeof LIMITS, now = Date.now()) {
  if (!user?.id || !Object.hasOwn(LIMITS, endpoint)) throw new RequestFailure(503, 'Service limits are unavailable.', 'SERVICE_LIMITS_UNAVAILABLE');
  try {
    const entity = client.asServiceRole.entities.ServiceUsage;
    for (const [index, duration] of [60000, 86400000].entries()) {
      const bucket = Math.floor(now / duration);
      const usage_key = `${user.id}:${endpoint}:${duration}:${bucket}`;
      await entity.upsert([{ usage_key, owner_id: user.id, endpoint,
        expires_at: new Date((bucket + 1) * duration).toISOString() }], { key: 'usage_key' });
      // Initialize missing/null counters atomically. Platforms may materialize
      // optional numeric fields as null; an unset value is not an exhausted quota.
      const initialized = await entity.updateMany({ usage_key, owner_id: user.id,
        $or: [{ used: { $exists: false } }, { used: null }] }, { $set: { used: 0 } });
      if (![0, 1].includes(initialized?.updated) || initialized?.has_more) throw new Error('Invalid quota initialization');
      const result = await entity.updateMany({ usage_key, owner_id: user.id,
        used: { $gte: 0, $lt: LIMITS[endpoint][index] } }, { $inc: { used: 1 } });
      if (result?.updated === 0) {
        const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * duration - now) / 1000));
        throw new RequestFailure(429, index === 0 ? 'Request limit reached. Please try again shortly.' : 'Daily request limit reached. Please try again after the reset.', 'REQUEST_LIMITED', retryAfter);
      }
      if (result?.updated !== 1 || result?.has_more) throw new Error('Invalid quota result');
    }
  } catch (error) {
    if (error instanceof RequestFailure) throw error;
    // No provider call when quota persistence is unavailable.
    throw new RequestFailure(503, 'Service limits are unavailable. Please retry later.', 'SERVICE_LIMITS_UNAVAILABLE');
  }
}
