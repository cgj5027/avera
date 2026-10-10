// Employment discovery: finds real, current job/gig listings matching the
// user's opportunity profile, with web search. Read-only; results are
// validated by the frontend before display.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const str = (v) => (typeof v === 'string' ? v.trim().slice(0, 400) : '');
    const boundedInt = (v, max) => {
      const n = Math.floor(Number(v));
      return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0;
    };
    const profile = {
      skills: str(body.skills),
      preferred_roles: str(body.preferred_roles),
      work_mode: ['any', 'remote', 'hybrid', 'onsite'].includes(body.work_mode) ? body.work_mode : 'any',
      location: str(body.location),
      weekly_hours: boundedInt(body.weekly_hours, 80),
      target_monthly_income: boundedInt(body.target_monthly_income, 100000),
    };
    if (!profile.skills) return Response.json({ error: 'Describe your skills to search for opportunities.' }, { status: 400 });

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: [
        'Search the web for current, real job and gig listings that match this candidate profile.',
        '',
        'PROFILE:',
        `Skills: ${profile.skills}`,
        `Preferred roles: ${profile.preferred_roles || 'any'}`,
        `Work mode: ${profile.work_mode}`,
        `Location: ${profile.location || 'any (prefer remote or major US metros)'}`,
        `Available hours per week: ${profile.weekly_hours || 'flexible'}`,
        `Target income: ${profile.target_monthly_income ? `$${profile.target_monthly_income} per month` : 'not specified'}`,
        '',
        `Return up to 6 REAL listings from the search results, varied across employers.`,
        'Only include a listing when you have its direct URL to the posting. Never invent a URL.',
        'compensation: a short string such as "$15-$18/hr" or "$22/hr + tips" when known, otherwise empty.',
        'location: the listing\'s location, or "Remote".',
      ].join('\n'),
      response_json_schema: {
        type: 'object',
        properties: {
          opportunities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                company: { type: 'string' },
                url: { type: 'string' },
                compensation: { type: 'string' },
                location: { type: 'string' },
              },
              required: ['title', 'company', 'url'],
            },
          },
        },
        required: ['opportunities'],
      },
    });

    return Response.json({ opportunities: Array.isArray(llm?.opportunities) ? llm.opportunities : [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}