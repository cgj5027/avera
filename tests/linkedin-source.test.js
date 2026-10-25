import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const runtime = vi.hoisted(() => ({ key: undefined }));
vi.mock('base44:runtime', () => ({ secrets: { get: name => name === 'OPENWEBNINJA_API_KEY' ? runtime.key : undefined } }));
import { searchLinkedIn, linkedInListing } from '../base44/shared/linkedInSource.ts';
import { searchListings } from '../base44/shared/opportunitySource.ts';
const profile = { skills: 'Bookkeeping, payroll', preferred_roles: 'Bookkeeper', job_type: 'part_time', work_mode: 'remote', location: 'USA', experience_level: 'entry_level' };
const job = (id = '1', extra = {}) => ({ job_id:id, job_title:'Bookkeeper', employer_name:'Fixture employer', job_apply_link:`https://www.linkedin.com/jobs/view/${id}/`, job_description:'Remote part-time bookkeeping and payroll for our team.', job_employment_type:'PARTTIME', job_city:'Remote', job_country:'USA', job_is_remote:true, job_posted_at_datetime_utc:'2026-10-20T12:00:00Z', job_min_salary:20, job_max_salary:25, job_salary_currency:'USD', job_salary_period:'HOUR', ...extra });
const web = { title:'Bookkeeper web result', company:'Web fixture', url:'https://jobs.org/post/1', employment_type:'part-time', work_mode:'remote', description_excerpt:'Bookkeeping and payroll work', location:'USA' };
let fetchMock;
beforeEach(() => {
  runtime.key = 'fixture-key';
  fetchMock = vi.fn(async () => Response.json({status:'OK',data:[job()]}));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
const client = llm => ({asServiceRole:{integrations:{Core:{InvokeLLM:llm}}}});
describe('OpenWeb Ninja LinkedIn adapter (contract fixtures, not live API)', () => {
  it('searches lightweight cards and requests details only for selected IDs', async () => {
    const results = await searchLinkedIn(profile);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [address, options] = fetchMock.mock.calls[0];
    const url = new URL(address);
    expect(url.origin).toBe('https://api.openwebninja.com');
    expect(url.pathname).toBe('/realtime-linkedin-data/search');
    expect(url.searchParams.getAll('query')).toEqual(['Bookkeeper']);
    expect(url.searchParams.get('location')).toBe('USA');
    expect(url.searchParams.get('num_pages')).toBe('2');
    expect(url.searchParams.get('date_posted')).toBe('month');
    expect(url.searchParams.has('remote_jobs_only')).toBe(false);
    expect(url.searchParams.get('include_details')).toBe('false');
    const detailUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(detailUrl.pathname).toBe('/realtime-linkedin-data/job-details');
    expect(detailUrl.searchParams.get('job_id')).toBe('1');
    expect(url.searchParams.has('seniority_levels')).toBe(false);
    expect(options.headers['x-api-key']).toBe('fixture-key');
    expect(options.redirect).toBe('manual');
    expect(results[0]).toMatchObject({title:'Bookkeeper',publisher:'LinkedIn via OpenWeb Ninja',compensation:'USD 20–25/hour',source_provider:'linkedin'});
    expect(JSON.stringify(results)).not.toContain('fixture-key');
  });
  it('caps selected search jobs and detail IDs at twelve while preserving search order', async () => {
    const jobs=Array.from({length:20},(_,i)=>job(String(i+1)));
    fetchMock.mockResolvedValueOnce(Response.json({status:'OK',data:jobs}))
      .mockResolvedValueOnce(Response.json({status:'OK',data:[...jobs].reverse()}));
    const results=await searchLinkedIn(profile);
    const ids=new URL(fetchMock.mock.calls[1][0]).searchParams.get('job_id').split(',');
    expect(ids).toEqual(jobs.slice(0,12).map(row=>row.job_id));
    expect(results).toHaveLength(12);
    expect(results.map(row=>row.url)).toEqual(jobs.slice(0,12).map(row=>row.job_apply_link));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('deduplicates IDs before the details call and does not fetch details for empty results', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({status:'OK',data:[job(),job()]}))
      .mockResolvedValueOnce(Response.json({status:'OK',data:[job()]}));
    expect(await searchLinkedIn(profile)).toHaveLength(1);
    expect(new URL(fetchMock.mock.calls[1][0]).searchParams.get('job_id')).toBe('1');
    fetchMock.mockClear();fetchMock.mockResolvedValueOnce(Response.json({status:'OK',data:[]}));
    expect(await searchLinkedIn(profile)).toEqual([]);expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('fails the source when detail retrieval fails instead of returning incomplete cards', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({status:'OK',data:[job()]}))
      .mockResolvedValueOnce(new Response('unavailable',{status:503}));
    await expect(searchLinkedIn(profile)).rejects.toThrow('LinkedIn search failed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('preserves unknown pay, work mode and ambiguous seniority rather than guessing', () => {
    const result=linkedInListing(job('2',{job_min_salary:null,job_max_salary:null,job_is_remote:false,job_city:'Boston',job_seniority_level:'Mid-Senior level'}));
    expect(result.compensation).toBe('');expect(result.work_mode).toBeNull();expect(result.experience_level).toBeNull();
  });
  it('does not send a request without the optional credential', async () => {
    runtime.key=undefined;
    await expect(searchLinkedIn(profile)).rejects.toThrow('not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([301,401,429,500])('rejects HTTP %i without paid retries or redirect following', async status => {
    fetchMock.mockResolvedValue(new Response('provider detail must not escape',{status}));
    await expect(searchLinkedIn(profile)).rejects.toThrow('LinkedIn search failed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed API data instead of presenting it as zero results', async () => {
    fetchMock.mockResolvedValue(Response.json({status:'OK',data:{}}));
    await expect(searchLinkedIn(profile)).rejects.toThrow('Invalid LinkedIn');
  });
  it('combines sources and keeps deterministic ratings without another model call for LinkedIn', async () => {
    const llm=vi.fn(async()=>({opportunities:[web]}));
    const result=await searchListings(client(llm),profile,'combined');
    expect(result.opportunities).toHaveLength(2);
    expect(result.sources).toEqual([{provider:'web_search',status:'searched'},{provider:'linkedin',status:'searched'}]);
    expect(result.opportunities.find(item=>item.source_provider==='linkedin').matched_skills).toEqual(['bookkeeping','payroll']);
    expect(result.partial_results).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);expect(llm).toHaveBeenCalledTimes(2);
  });
  it('deduplicates a LinkedIn posting also returned by web search', async () => {
    const llm=vi.fn(async()=>({opportunities:[{...web,url:job().job_apply_link}]}));
    const result=await searchListings(client(llm),profile,'combined');
    expect(result.opportunities).toHaveLength(1);
  });
  it('retains API results when web AI fails', async () => {
    const result=await searchListings(client(vi.fn(async()=>{throw new Error('AI unavailable')})),profile,'combined');
    expect(result.opportunities).toHaveLength(1);expect(result.partial_results).toBe(true);
    expect(result.sources[0].status).toBe('unavailable');
  });
  it('retains web results when the API fails and does not expose provider errors', async () => {
    fetchMock.mockResolvedValue(new Response('sensitive provider failure',{status:401}));
    const result=await searchListings(client(vi.fn(async()=>({opportunities:[web]}))),profile,'combined');
    expect(result.opportunities).toHaveLength(1);expect(result.partial_results).toBe(true);
    expect(JSON.stringify(result)).not.toContain('sensitive');
  });
  it('keeps web-only behavior when LinkedIn is not configured', async () => {
    runtime.key=undefined;
    const result=await searchListings(client(vi.fn(async()=>({opportunities:[web]}))),profile,'combined');
    expect(result.sources).toEqual([{provider:'web_search',status:'searched'}]);expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects when all configured sources fail', async () => {
    fetchMock.mockRejectedValue(new Error('network failure'));
    await expect(searchListings(client(vi.fn(async()=>{throw new Error('AI failure')})),profile,'combined')).rejects.toThrow('Job sources unavailable');
  });
});
