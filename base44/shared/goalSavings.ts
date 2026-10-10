/** Base amounts remain editable; independent contribution rows never overwrite them. */
export function withGoalContributions(goals, contributions) {
  return goals.map(goal => {
    const seen = new Set();
    const total = contributions.filter(row => row.goal_id === goal.id && (row.demo_profile || '') === (goal.demo_profile || '')).reduce((sum,row) => {
      if (!row.contribution_key || seen.has(row.contribution_key) || typeof row.amount !== 'number' || !Number.isFinite(row.amount) || row.amount <= 0) return sum;
      seen.add(row.contribution_key);
      return sum + Math.round(row.amount * 100);
    },0);
    const starting = Number(goal.saved_amount) || 0;
    return {...goal, starting_saved_amount:starting, contribution_total:total/100, saved_amount:(Math.round((starting+Number.EPSILON*Math.abs(starting))*100)+total)/100};
  });
}
