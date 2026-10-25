vi.mock('../base44/shared/jobDistance.ts', async importOriginal => ({...await importOriginal(), createJobArea: () => ({validate:async()=>null,filter:async rows=>rows})}));
// Existing handler fixtures isolate provider/data behavior; durable limits are exercised in request-safety.test.js.
import {beforeEach,describe,it,expect,vi} from 'vitest';
const fixture=vi.hoisted(()=>({client:null}));
vi.mock('npm:@base44/sdk@0.8.53',()=>({createClientFromRequest:()=>fixture.client}));
import search from '../base44/functions/searchJobOpportunities/entry.ts';
import {searchListings,rateOpportunity} from '../base44/shared/opportunitySource.ts';
import {searchOpportunities,JOB_SEARCH_TIMEOUT_MS,SERVICE_TIMEOUT_MS} from '../src/services/assistantService';
const sdk=vi.hoisted(()=>({auth:{me:vi.fn()},functions:{invoke:vi.fn()}}));
vi.mock('@/api/base44Client',()=>({base44:sdk}));
const profile={skills:'Bookkeeping',preferred_roles:'Bookkeeper',experience_level:'entry_level',work_mode:'remote',location:'USA',job_type:'part_time'};
const posting=(id,extra={})=>({title:'Bookkeeper',company:'Fixture employer',url:`https://www.indeed.com/viewjob?jk=fixture${id}`,work_mode:'remote',employment_type:'part-time',compensation:'$18-$22/hr',...extra});
const request=body=>new Request('https://fixture.local/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
let llm;
beforeEach(()=>{
  vi.resetAllMocks();llm=vi.fn();fixture.client={auth:{me:vi.fn(async()=>({id:'a'}))},asServiceRole:{integrations:{Core:{InvokeLLM:llm}}}};
  sdk.auth.me.mockResolvedValue({id:'a'});
});
describe('actual web-search adapter/handler with provider fixtures, not live postings',()=>{
  it('rejects anonymous and empty-profile requests before contacting the provider',async()=>{
    fixture.client.auth.me.mockResolvedValueOnce(null);expect((await search(request(profile))).status).toBe(401);
    expect((await search(request({skills:''}))).status).toBe(400);expect(llm).not.toHaveBeenCalled();
  });
  it.each([0,251,25.5,'25'])('rejects invalid search distance before provider work: %j',async distance => {
    expect((await search(request({...profile,distance_miles:distance}))).status).toBe(400);expect(llm).not.toHaveBeenCalled();
  });
  it('accepts valid structured JSON strings and preserves posted pay',async()=>{
    llm.mockResolvedValue(JSON.stringify({opportunities:[posting(1)]}));const result=await searchListings(fixture.client,profile);
    expect(result.opportunities[0].compensation).toBe('$18-$22/hr');expect(llm).toHaveBeenCalledTimes(2);
    expect(llm.mock.calls[0][0]).not.toHaveProperty('model');expect(llm.mock.calls[0][0].add_context_from_internet).toBe(true);
  });
  it('searches related roles when validation/type filters empty the first result set',async()=>{
    llm.mockResolvedValueOnce({opportunities:[posting(1,{title:'Senior Bookkeeper'}),posting(2,{employment_type:'full-time'})]}).mockResolvedValueOnce({opportunities:[posting(3)]});
    const result=await searchListings(fixture.client,profile);expect(result.opportunities).toHaveLength(1);expect(result.related_roles_searched).toBe(true);expect(llm).toHaveBeenCalledTimes(2);
    expect(llm.mock.calls[1][0].prompt).toContain('preserving location, experience level, role type and work mode');expect(llm.mock.calls[1][0].prompt).toContain('USA');
  });
  it('does not turn two valid empty responses into fabricated jobs',async()=>{
    llm.mockResolvedValue({opportunities:[]});const result=await searchListings(fixture.client,profile);expect(result.opportunities).toEqual([]);expect(llm).toHaveBeenCalledTimes(2);
  });
  it.each([null,{},{opportunities:'invalid'},'invalid JSON'])('treats malformed provider data as failure, not no matches: %j',async value=>{
    llm.mockResolvedValue(value);const response=await search(request(profile));expect(response.status).toBe(502);expect(llm).toHaveBeenCalledTimes(1);
  });
  it('deduplicates URLs, drops unsafe/index pages and limits ranked output to twelve',async()=>{
    llm.mockResolvedValue({opportunities:[posting(0,{url:'https://localhost/internal'}),posting(0,{title:'Jobs in Portland'}),posting(1),posting(1),...Array.from({length:15},(_,i)=>posting(i+2))]});
    const result=await searchListings(fixture.client,profile);expect(result.opportunities).toHaveLength(12);expect(new Set(result.opportunities.map(r=>r.url)).size).toBe(12);expect(llm).toHaveBeenCalledTimes(1);
  });
  it('merges related-role results even when the first search found matches',async()=>{
    llm.mockResolvedValueOnce({opportunities:[posting(1)]}).mockResolvedValueOnce({opportunities:[posting(2)]});
    const result=await searchListings(fixture.client,profile);
    expect(result.opportunities).toHaveLength(2);expect(result.related_roles_searched).toBe(true);
  });
  it('retains first-pass matches when expanded search fails',async()=>{
    llm.mockResolvedValueOnce({opportunities:[posting(1)]}).mockRejectedValueOnce(new Error('Unavailable'));
    const result=await searchListings(fixture.client,profile);
    expect(result.opportunities).toHaveLength(1);expect(result.partial_results).toBe(true);
  });
  it('deduplicates tracking links and drops unsupported work modes',async()=>{
    llm.mockResolvedValue({opportunities:[posting(1),posting(1,{url:posting(1).url+'&utm_source=board#apply'}),posting(2,{work_mode:'onsite'}),posting(3,{work_mode:null})]});
    expect((await searchListings(fixture.client,profile)).opportunities).toHaveLength(1);
  });
  it('calculates weighted match ratings from evidence rather than model scores',async()=>{
    const listing=posting(1,{description_excerpt:'Entry-level Bookkeeper for healthcare. Requires bookkeeping and payroll. Remote part-time work in USA.',required_skills:['bookkeeping','payroll'],experience_level:'entry_level',location:'USA',match_score:9999});
    const candidate={...profile,skills:'Bookkeeping, payroll',interests:'healthcare'};
    llm.mockResolvedValue({opportunities:[listing]});
    const result=(await searchListings(fixture.client,candidate)).opportunities[0];
    expect(result.match_score).toBe(100);expect(result.match_confidence).toBe('high');
    expect(result.match_breakdown).toEqual({skills:45,interests:25,experience:20,preferences:10});
    expect(result.matched_skills).toEqual(['bookkeeping','payroll']);
    const partial=rateOpportunity({...result,required_skills:['bookkeeping','payroll','invented skill']},{...candidate,skills:'bookkeeping'});
    expect(partial.missing_skills).toEqual(['payroll']);expect(partial.match_breakdown.skills).toBe(23);
    expect(partial.match_score).toBe(78);
  });
  it('marks sparse evidence as low confidence and awards no unsupported points',()=>{
    const result=rateOpportunity({title:'Unknown role',required_skills:['invented skill']},{skills:'invented skill'});
    expect(result.match_score).toBe(0);expect(result.match_confidence).toBe('low');expect(result.match_unknowns.length).toBeGreaterThan(0);
  });
  it('sanitizes provider exceptions instead of returning private messages',async()=>{
    llm.mockRejectedValue(new Error('fixture sensitive upstream detail'));const response=await search(request(profile));expect(response.status).toBe(502);expect(await response.text()).not.toContain('sensitive');
  });
  it('allows job search to finish beyond the shorter assistant timeout',async()=>{
    vi.useFakeTimers();try {
      sdk.functions.invoke.mockImplementation(()=>new Promise(resolve=>setTimeout(()=>resolve({data:{opportunities:[posting(1)]}}),30000)));
      let resolved=false;const pending=searchOpportunities(profile).then(value=>{resolved=true;return value;});
      await vi.advanceTimersByTimeAsync(SERVICE_TIMEOUT_MS+1);expect(resolved).toBe(false);
      await vi.advanceTimersByTimeAsync(10000);expect(await pending).toHaveLength(1);expect(JOB_SEARCH_TIMEOUT_MS).toBe(60000);
    } finally {vi.useRealTimers();}
  });
});

vi.mock('../base44/shared/usageLimits.ts',()=>({claimUsage:vi.fn(async()=>{})}));
