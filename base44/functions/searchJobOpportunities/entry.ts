// Employment discovery: finds real, current job/gig listings matching the
// user's opportunity profile. Source selection is isolated behind the shared
// provider adapter (base44/shared/opportunitySource.ts) so approved job-data
// APIs can be added without changing profile matching or result presentation.
// Read-only; listings are validated server-side before display.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { searchListings, JOB_TYPES } from '../../shared/opportunitySource.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const str = (v) => (typeof v === 'string' ? v.trim().slice(0, 400) : '');
    const profile = {
      skills: str(body.skills),
      experience: str(body.experience),
      experience_level: ['entry_level', 'mid_level', 'senior'].includes(body.experience_level)
        ? body.experience_level
        : 'entry_level',
      preferred_roles: str(body.preferred_roles),
      work_mode: ['any', 'remote', 'hybrid', 'onsite'].includes(body.work_mode) ? body.work_mode : 'any',
      location: str(body.location),
      job_type: JOB_TYPES.includes(body.job_type) ? body.job_type : 'any',
    };
    if (!profile.skills) return Response.json({ error: 'Describe your skills to search for opportunities.' }, { status: 400 });

    const result = await searchListings(base44, profile, 'web_search');
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Job search is unavailable. Please retry.' }, { status: 502 });
  }
}