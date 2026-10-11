import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { readJsonLimited, RequestFailure } from '../base44/shared/requestSafety.ts';
import { validateResume } from '../base44/shared/resumeValidation.ts';
import { claimUsage } from '../base44/shared/usageLimits.ts';
import { allRecords, recentRecords } from '../base44/shared/plaid.ts';
const fixture = vi.hoisted(() => ({ client: null }));
vi.mock('npm:@base44/sdk@0.8.53', () => ({ createClientFromRequest: () => fixture.client }));
import resume from '../base44/functions/parseResume/entry.ts';
const request = body => new Request('https://fixture.test', { method: 'POST', body: JSON.stringify(body) });
const payload = (name='resume.txt', content='Skills: accounting') => ({ file_name:name, file_base64:btoa(content), consent:true });
function quotaClient() {
  const rows = new Map();
  const entity = {
    upsert: vi.fn(async records => { for (const row of records) rows.set(row.usage_key, { ...rows.get(row.usage_key), ...row }); }),
    // A synchronous predicate/increment models the documented server operation;
    // live verification of platform atomicity remains an explicit release gate.
    updateMany: vi.fn(async (query, change) => {
      const row=rows.get(query.usage_key), maximum=query.$or[1].used.$lt;
      if (!row || row.owner_id!==query.owner_id || (row.used??0)>=maximum) return {updated:0,has_more:false};
      row.used=(row.used??0)+change.$inc.used;return {updated:1,has_more:false};
    }),
  };
  return { rows, entity, client:{asServiceRole:{entities:{ServiceUsage:entity}}} };
}
describe('bounded request parsing', () => {
  it('bounds streamed bytes when Content-Length is absent or understated', async () => {
    for (const headers of [{}, {'content-length':'1'}]) {
      const req=new Request('https://fixture.test',{method:'POST',headers,body:'{"x":"'+'a'.repeat(100)+'"}'});
      await expect(readJsonLimited(req,20)).rejects.toMatchObject({status:413});
    }
  });
  it('rejects excessive declared length before reading the stream', async () => {
    const cancel=vi.fn();const req=new Request('https://fixture.test',{method:'POST',headers:{'content-length':'1000'},body:new ReadableStream({cancel}),duplex:'half'});
    await expect(readJsonLimited(req,20)).rejects.toMatchObject({status:413});
  });
  it.each(['[]','null','true','{"broken"'])('rejects invalid JSON objects %s', async body => {
    await expect(readJsonLimited(new Request('https://fixture.test',{method:'POST',body}))).rejects.toMatchObject({status:400});
  });
  it('cancels stalled streams when the read deadline expires', async () => {
    const cancel=vi.fn();
    const req=new Request('https://fixture.test',{method:'POST',body:new ReadableStream({cancel}),duplex:'half'});
    await expect(readJsonLimited(req,100,10)).rejects.toMatchObject({status:408});
    expect(cancel).toHaveBeenCalledOnce();
  });
  it('preserves UTF-8 data across streaming chunk boundaries', async () => {
    const bytes=new TextEncoder().encode('{"name":"é"}');
    const req=new Request('https://fixture.test',{method:'POST',body:new ReadableStream({start(c){for(const b of bytes)c.enqueue(new Uint8Array([b]));c.close();}}),duplex:'half'});
    expect(await readJsonLimited(req)).toEqual({name:'é'});
  });
});
describe('resume validation', () => {
  it('rejects disguised PDF/Word files and executable bytes', () => {
    for (const name of ['resume.pdf','resume.doc','resume.docx']) expect(()=>validateResume(payload(name,'MZ executable'))).toThrow(RequestFailure);
  });
  it.each(['../resume.pdf','a\\resume.pdf','x\0.pdf','resume.constructor','resume.__proto__'])('rejects unsafe filename %s', name => expect(()=>validateResume(payload(name))).toThrow(RequestFailure));
  it.each(['YWJj=','a===','YW Jj','Zh==','%%%'])('rejects invalid or noncanonical base64 %s', value => expect(()=>validateResume({...payload(),file_base64:value})).toThrow(RequestFailure));
  it('requires affirmative processing consent and rejects URI targeting', () => {
    expect(()=>validateResume({...payload(),consent:false})).toThrow(/Confirm/);
    expect(()=>validateResume({...payload(),file_uri:'private/other/resume.pdf'})).toThrow(/Upload/);
  });
  it('accepts bounded UTF-8 text and rejects control characters or invalid UTF-8', () => {
    expect(validateResume(payload()).text).toBe('Skills: accounting');
    for (const content of ['text\0binary','\xff']) expect(()=>validateResume(payload('resume.txt',content))).toThrow(RequestFailure);
    expect(()=>validateResume(payload('resume.txt','a'.repeat(60001)))).toThrow(/60 KB/);
  });
  it('rejects decoded oversize before decoding or provider work', () => {
    expect(()=>validateResume(payload('resume.pdf','a'.repeat(5*1024*1024+1)))).toThrow(/5 MB/);
  });
  it('checks PDF markers and removes the original storage filename', () => {
    const result=validateResume(payload('Personal Name.pdf','%PDF-1.7\nfixture\n%%EOF'));
    expect(result.fileName).toBe('resume.pdf');expect(result.mimeType).toBe('application/pdf');
    expect(()=>validateResume(payload('resume.pdf','%PDF-1.7\nno end marker'))).toThrow(RequestFailure);
  });
});
describe('durable usage reservations', () => {
  it('enforces minute limits across concurrent calls without resetting counters', async () => {
    const {client,rows}=quotaClient();
    const results=await Promise.allSettled(Array.from({length:10},()=>claimUsage(client,{id:'a'},'askAvera',0)));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(6);
    expect(results.filter(r=>r.status==='rejected').every(r=>r.reason.status===429)).toBe(true);
    expect([...rows.values()].find(r=>r.usage_key==='a:askAvera:60000:0').used).toBe(6);
    await expect(claimUsage(client,{id:'b'},'askAvera',0)).resolves.toBeUndefined();
  });
  it('enforces daily limits across minute windows and resets only at the next UTC day', async () => {
    const {client}=quotaClient();
    for(let minute=0;minute<60;minute++) await claimUsage(client,{id:'a'},'askAvera',minute*60000);
    await expect(claimUsage(client,{id:'a'},'askAvera',61*60000)).rejects.toMatchObject({status:429});
    await expect(claimUsage(client,{id:'a'},'askAvera',86400000)).resolves.toBeUndefined();
  });
  it('fails closed on unavailable or ambiguous persistence', async () => {
    await expect(claimUsage({}, {id:'a'},'askAvera',0)).rejects.toMatchObject({status:503});
    for(const result of [{},{updated:2},{updated:1,has_more:true}]) {
      const {client,entity}=quotaClient();entity.updateMany.mockResolvedValue(result);
      await expect(claimUsage(client,{id:'a'},'askAvera',0)).rejects.toMatchObject({status:503});
    }
  });
  it('keeps quota counters inaccessible to all user CRUD', () => {
    const schema=JSON.parse(readFileSync('base44/entities/ServiceUsage.jsonc','utf8'));
    expect(schema.rls).toEqual({create:false,read:false,update:false,delete:false});
  });
});
describe('resume endpoint with real request/quota guards', () => {
  function clientWithProvider() {
    const q=quotaClient(), upload=vi.fn(), sign=vi.fn(), llm=vi.fn(async()=>({skills:'Accounting'}));
    fixture.client={...q.client,auth:{me:async()=>({id:'a'})},integrations:{Core:{CreateFileSignedUrl:sign}}};
    fixture.client.asServiceRole.integrations={Core:{UploadPrivateFile:upload,InvokeLLM:llm}};
    return {...q,upload,sign,llm};
  }
  it('processes text without uploading or signing files', async () => {
    const {upload,sign,llm}=clientWithProvider();
    expect((await resume(request(payload()))).status).toBe(200);
    expect(upload).not.toHaveBeenCalled();expect(sign).not.toHaveBeenCalled();
    expect(llm.mock.calls[0][0]).not.toHaveProperty('file_urls');
    expect(llm.mock.calls[0][0].prompt).toContain('UNTRUSTED RESUME DATA');
  });
  it('prevents all provider/storage work when the quota backend is unavailable', async () => {
    const {entity,upload,llm}=clientWithProvider();entity.updateMany.mockRejectedValue(new Error('sensitive database diagnostic'));
    const response=await resume(request(payload()));expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sensitive');expect(upload).not.toHaveBeenCalled();expect(llm).not.toHaveBeenCalled();
  });
  it('counts rejected authenticated attempts but never uploads fake PDF bytes', async () => {
    const {entity,upload,llm}=clientWithProvider();expect((await resume(request(payload('resume.pdf','not PDF')))).status).toBe(400);
    expect(entity.upsert).toHaveBeenCalledTimes(2);expect(upload).not.toHaveBeenCalled();expect(llm).not.toHaveBeenCalled();
  });
});
describe('bounded details and complete aggregation', () => {
  it('retrieves only 120 recent details with a smaller final page request', async () => {
    const filter=vi.fn(async(q,opts)=>({items:Array.from({length:opts.limit},(_,i)=>({id:i})),has_more:true,next_cursor:String(filter.mock.calls.length)}));
    expect(await recentRecords({filter},{created_by_id:'a'})).toHaveLength(120);
    expect(filter).toHaveBeenCalledTimes(2);expect(filter.mock.calls[1][1].limit).toBe(20);
  });
  it('refuses partial aggregation above its maximum', async () => {
    const filter=vi.fn(async()=>({items:Array(100).fill({amount:1}),has_more:true,next_cursor:String(filter.mock.calls.length)}));
    await expect(allRecords({filter},{})).rejects.toThrow(/Record limit/);
    expect(filter).toHaveBeenCalledTimes(50);
  });
});

describe("DOCX structural validation",()=>{
 it("accepts a minimal Word archive",()=>expect(validateResume({file_name:"resume.docx",consent:true,file_base64:"UEsDBBQAAAAAAD2xS13HHBc8CAAAAAgAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDxUeXBlcy8+UEsDBBQAAAAAAD2xS11fW9FMCwAAAAsAAAARAAAAd29yZC9kb2N1bWVudC54bWw8ZG9jdW1lbnQvPlBLAQIUAxQAAAAAAD2xS13HHBc8CAAAAAgAAAATAAAAAAAAAAAAAACAAQAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQDFAAAAAAAPbFLXV9b0UwLAAAACwAAABEAAAAAAAAAAAAAAIABOQAAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAACAAIAgAAAAHMAAAAAAA=="}).mimeType).toContain("wordprocessingml"));
 it("rejects traversal entries",()=>expect(()=>validateResume({file_name:"resume.docx",consent:true,file_base64:"UEsDBBQAAAAAAD2xS13HHBc8CAAAAAgAAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbDxUeXBlcy8+UEsDBBQAAAAAAD2xS11fW9FMCwAAAAsAAAARAAAAd29yZC9kb2N1bWVudC54bWw8ZG9jdW1lbnQvPlBLAwQUAAAAAAA9sUtd+zkrggMAAAADAAAADgAAAC4uL3BheWxvYWQudHh0YmFkUEsBAhQDFAAAAAAAPbFLXcccFzwIAAAACAAAABMAAAAAAAAAAAAAAIABAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAMUAAAAAAA9sUtdX1vRTAsAAAALAAAAEQAAAAAAAAAAAAAAgAE5AAAAd29yZC9kb2N1bWVudC54bWxQSwECFAMUAAAAAAA9sUtd+zkrggMAAAADAAAADgAAAAAAAAAAAAAAgAFzAAAALi4vcGF5bG9hZC50eHRQSwUGAAAAAAMAAwC8AAAAogAAAAAA"})).toThrow(RequestFailure));
});

it('allows testing all three Sandbox profiles twice while retaining a connection quota',async()=>{
 const {client}=quotaClient();
 for(let i=0;i<6;i++) await claimUsage(client,{id:'a'},'demoSandboxConnect',0);
 await expect(claimUsage(client,{id:'a'},'demoSandboxConnect',0)).rejects.toMatchObject({status:429,code:'REQUEST_LIMITED'});
});
