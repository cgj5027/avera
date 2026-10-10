export const PROFILES=['early_career','multi_income','financial_improvement'];
export function datasetQuery(user, dataset) {
  if (dataset?.mode==='demo') {
    if (!PROFILES.includes(dataset.profile)) throw new Error('Invalid demo dataset');
    return {created_by_id:user.id,demo_profile:dataset.profile};
  }
  if (dataset?.mode && dataset.mode!=='ordinary') throw new Error('Invalid dataset mode');
  return {created_by_id:user.id,$or:[{demo_profile:{$exists:false}},{demo_profile:null},{demo_profile:''}]};
}
