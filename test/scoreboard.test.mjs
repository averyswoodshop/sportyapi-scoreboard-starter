import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {createScoreboardHandler,SPORTS} from '../src/scoreboard.mjs';
const samples=JSON.parse(await readFile(new URL('../public/samples/scoreboards.json',import.meta.url),'utf8'));
const req=(sport='nfl',method='GET')=>new Request('http://localhost/api/scoreboard?sport='+sport,{method});
test('sample mode works without credentials across all seven feeds',async()=>{
 let calls=0;const h=createScoreboardHandler({loadSamples:async()=>samples,fetchImpl:async()=>{calls++;throw Error();}});
 for(const sport of SPORTS){const r=await h(req(sport));const d=await r.json();assert.equal(r.status,200);assert.equal(d.mode,'sample');assert.equal(d.sport,sport);assert.equal(d.games.length,3);assert.equal(d.fetchedAt,null);}
 assert.equal(calls,0);
});
test('validates sport/method and requires credentials for live mode',async()=>{
 const h=createScoreboardHandler();
 assert.equal((await h(req('invalid'))).status,400);
 assert.equal((await h(req('nfl','POST'))).status,405);
 assert.equal((await h(req(),{SPORTYAPI_MODE:'live'})).status,503);
});
test('sends credentials only upstream and deduplicates concurrent requests',async()=>{
 let clock=0,calls=0;const h=createScoreboardHandler({now:()=>clock,fetchImpl:async(url,init)=>{
  calls++;assert.equal(url,'https://sportyapi.com/api/sports/nfl/scoreboard');assert.equal(init.headers['X-API-Key'],'fixture-credential');
  await new Promise(resolve=>setTimeout(resolve,5));return Response.json(samples.nfl);
 }});const config={SPORTYAPI_MODE:'live',SPORTYAPI_API_KEY:'fixture-credential'};
 const responses=await Promise.all([h(req(),config),h(req(),config)]);assert.equal(calls,1);
 for(const r of responses){const text=await r.text();assert.doesNotMatch(text,/fixture-credential/);assert.equal(JSON.parse(text).mode,'live');}
 await h(req(),config);assert.equal(calls,1);clock=60001;await h(req(),config);assert.equal(calls,2);
});
test('honors a 429 cooldown without an automatic retry',async()=>{
 let clock=0,calls=0;const h=createScoreboardHandler({now:()=>clock,fetchImpl:async()=>{calls++;return Response.json({error:'upstream-only-details'},{status:429,headers:{'Retry-After':'120'}});}});
 const config={SPORTYAPI_MODE:'live',SPORTYAPI_API_KEY:'fixture-credential'};
 const a=await h(req(),config);assert.equal(a.status,429);assert.equal(a.headers.get('Retry-After'),'120');assert.doesNotMatch(await a.text(),/upstream-only-details/);
 clock=119999;await h(req(),config);assert.equal(calls,1);clock=120001;await h(req(),config);assert.equal(calls,2);
});
test('handles unavailable access, upstream errors, malformed and empty responses',async()=>{
 const config={SPORTYAPI_MODE:'live',SPORTYAPI_API_KEY:'fixture-credential'};
 for(const [upstream,expected] of [[401,401],[402,402],[403,403],[500,502]]){
  const h=createScoreboardHandler({fetchImpl:async()=>Response.json({error:'upstream-only-details'},{status:upstream})});
  const r=await h(req(),config);assert.equal(r.status,expected);assert.doesNotMatch(await r.text(),/upstream-only-details/);
 }
 const empty=createScoreboardHandler({fetchImpl:async()=>Response.json({games:[]})});assert.deepEqual((await (await empty(req(),config)).json()).games,[]);
 const broken=createScoreboardHandler({fetchImpl:async()=>Response.json({wrong:[]})});assert.equal((await broken(req(),config)).status,502);
 const failed=createScoreboardHandler({fetchImpl:async()=>{throw Error('upstream-only-details');}});assert.doesNotMatch(await (await failed(req(),config)).text(),/upstream-only-details/);
});
