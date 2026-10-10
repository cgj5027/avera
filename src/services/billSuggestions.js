import { base44 } from '@/api/base44Client';
import { getDataMode, getDemoWorkspace, setModeOwner } from '@/lib/mode';
export async function billSuggestionRequest(action, payload = {}) {
  const user=await base44.auth.me();
  if(!user?.id) throw new Error('Sign in to continue.');
  setModeOwner(user.id);
  const dataset=getDataMode()==='demo'?{mode:'demo',profile:getDemoWorkspace()?.profile}:{mode:'ordinary'};
  let timer;
  try {
    const response=await Promise.race([base44.functions.invoke('suggestBills',{...payload,action,dataset}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Suggestions timed out. Scan again before retrying.')),60000);})]);
    if((await base44.auth.me())?.id!==user.id || JSON.stringify(dataset)!==JSON.stringify(getDataMode()==='demo'?{mode:'demo',profile:getDemoWorkspace()?.profile}:{mode:'ordinary'})) throw new Error('Your active dataset changed. Scan again.');
    if(response.data?.error) throw new Error(response.data.error);
    return response.data;
  } finally {clearTimeout(timer);}
}
