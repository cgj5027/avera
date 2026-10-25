import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {searchListings} from '../base44/shared/opportunitySource.ts';
import {createJobArea,milesBetween,validDistance} from '../base44/shared/jobDistance.ts';
const point=(lon,lat,type='city')=>({geometry:{coordinates:[lon,lat]},properties:{type}});
let fetchMock;
beforeEach(()=>{
  fetchMock=vi.fn(async address=>{
    const q=new URL(address).searchParams.get('q');
    const locations={Origin:[point(0,0)],Near:[point(0.1,0)],Far:[point(1,0)],Boundary:[point(0.36,0)],Unknown:[],Country:[point(0,0,'country')],Ambiguous:[point(0,0),point(5,0)]};
    return Response.json({features:locations[q]??[point(0.1,0)]});
  });
  vi.stubGlobal('fetch',fetchMock);
});
afterEach(()=>vi.unstubAllGlobals());
it('uses a default 25-mile radius and excludes out-of-range and unknown locations',async()=>{
  const result=await createJobArea({location:'Origin'}).filter([{location:'Near'},{location:'Far'},{location:'Unknown'},{location:'Remote'},{location:'Country'}]);
  expect(result).toHaveLength(1);expect(result[0].location).toBe('Near');expect(result[0].distance_miles).toBeCloseTo(6.9);
});
it('respects custom radius and applies the boundary before distance rounding',async()=>{
  expect(milesBetween({lon:0,lat:0},{lon:0.36,lat:0})).toBeGreaterThan(24);
  expect(await createJobArea({location:'Origin',distance_miles:24}).filter([{location:'Boundary'}])).toEqual([]);
  expect(await createJobArea({location:'Origin',distance_miles:25}).filter([{location:'Boundary'}])).toHaveLength(1);
  expect(await createJobArea({location:'Origin',distance_miles:100}).filter([{location:'Far'}])).toHaveLength(1);
});
it('requires an unambiguous local origin instead of searching around a country centre',async()=>{
  await expect(createJobArea({location:'Ambiguous'}).validate()).rejects.toMatchObject({status:422});
  await expect(createJobArea({location:'Country'}).validate()).rejects.toMatchObject({status:422});
});
it('deduplicates repeated lookups within a search',async()=>{
  const area=createJobArea({location:'Origin'});
  await Promise.all([area.filter([{location:'Near'}]),area.filter([{location:'Near'}])]);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it('does not geocode or filter when no profile location is provided',async()=>{
  const rows=[{location:'Unknown'}];expect(await createJobArea({}).filter(rows)).toBe(rows);expect(fetchMock).not.toHaveBeenCalled();
});
it('fails closed on geocoding service failure instead of returning unrestricted results',async()=>{
  fetchMock.mockResolvedValueOnce(new Response('blocked',{status:403}));
  await expect(createJobArea({location:'Origin'}).filter([{location:'Near'}])).rejects.toMatchObject({status:503});
});
it('bounds lookups to the origin and twelve unique destination locations',async()=>{
  await createJobArea({location:'Origin'}).filter(Array.from({length:30},(_,i)=>({location:`Place ${i}`})));
  expect(fetchMock).toHaveBeenCalledTimes(13);
});
it.each([0,-1,251,25.5,NaN,'25',null])('rejects an invalid distance %j',value=>expect(validDistance(value)).toBe(false));

it('applies radius filtering to real web-provider results before ranking and expansion',async()=>{
  const llm=vi.fn(async()=>({opportunities:[{title:'Bookkeeper',company:'Near employer',url:'https://jobs.org/near',location:'Near'},{title:'Bookkeeper',company:'Far employer',url:'https://jobs.org/far',location:'Far'}]}));
  const client={asServiceRole:{integrations:{Core:{InvokeLLM:llm}}}};
  const result=await searchListings(client,{skills:'Bookkeeping',location:'Origin',distance_miles:25});
  expect(result.opportunities).toHaveLength(1);expect(result.opportunities[0].company).toBe('Near employer');
  expect(result.opportunities[0].distance_miles).toBeCloseTo(6.9);
  expect(llm.mock.calls.every(([args])=>args.prompt.includes('within 25 miles'))).toBe(true);
});
it('validates the origin before invoking paid sources',async()=>{
  fetchMock.mockResolvedValueOnce(new Response('blocked',{status:403}));
  const llm=vi.fn();const client={asServiceRole:{integrations:{Core:{InvokeLLM:llm}}}};
  await expect(searchListings(client,{skills:'Bookkeeping',location:'Origin'})).rejects.toMatchObject({status:503});
  expect(llm).not.toHaveBeenCalled();
});
