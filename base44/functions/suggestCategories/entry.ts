import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const STANDARD = [
  'Groceries', 'Dining Out', 'Gas & Fuel', 'Utilities', 'Subscriptions', 'Shopping',
  'Entertainment', 'Healthcare', 'Transportation', 'Travel', 'Home', 'Insurance', 'Other',
];

/**
 * Suggests accurate transaction categories using an LLM: each distinct expense
 * name (e.g. "MCDONALD'S" → Dining Out) is mapped to one of the user's budget
 * categories when it fits, else a standard household category. Applied to
 * uncategorized entries and imported charges with coarse bank labels; manual
 * categories the user chose themselves are never overwritten.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const expensePage = await base44.entities.Transaction.filter(
      { created_by_id: user.id, type: 'expense' },
      { limit: 1000 }
    );
    const expenseRows = expensePage.items || [];
    const candidates = expenseRows.filter((t) => {
      if (!t.plaid_item_id) return !t.category || t.category === 'Uncategorized';
      return true;
    });
    const names = [...new Set(candidates.map((t) => String(t.description || '').trim()).filter(Boolean))].slice(0, 60);
    if (!names.length) return Response.json({ updated: 0, suggested: 0 });

    const catsPage = await base44.entities.BudgetCategory.filter({ created_by_id: user.id }, { limit: 100 });
    const budgetNames = (catsPage.items || []).map((c) => c.name).filter(Boolean);

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: [
        'You categorize household bank transactions for a personal finance app.',
        'For each merchant or description below, pick the single most accurate category.',
        budgetNames.length
          ? 'Prefer one of these budget categories when it fits: ' + budgetNames.join(', ') + '.'
          : '',
        'Otherwise choose from this list: ' + STANDARD.join(', ') + '.',
        'Fast food, restaurants and coffee shops are Dining Out, never recurring bills.',
        'Streaming services and recurring apps are Subscriptions.',
        'Return exactly one mapping per input name, using each name verbatim.',
        'Names:',
        ...names.map((n, i) => (i + 1) + '. ' + n),
      ].filter(Boolean).join('\n'),
      response_json_schema: {
        type: 'object',
        properties: {
          mapping: {
            type: 'array',
            items: {
              type: 'object',
              properties: { name: { type: 'string' }, category: { type: 'string' } },
              required: ['name', 'category'],
            },
          },
        },
        required: ['mapping'],
      },
    });

    const mapping = new Map(
      (llm.mapping || []).map((m) => [String(m.name || '').trim().toLowerCase(), String(m.category || '').trim()])
    );
    const updates = [];
    for (const t of candidates) {
      const category = mapping.get(String(t.description || '').trim().toLowerCase());
      if (category && category !== (t.category || '')) updates.push({ id: t.id, category });
    }
    for (let i = 0; i < updates.length; i += 200) {
      await base44.entities.Transaction.bulkUpdate(updates.slice(i, i + 200));
    }
    return Response.json({ updated: updates.length, suggested: names.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}