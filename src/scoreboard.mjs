export const SPORTS=Object.freeze(['nfl','nba','nhl','mlb','ncaaf','ncaab','soccer']);
const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
// One bounded cache per server/isolate. This reduces requests; it is not a global quota.
export function createScoreboardHandler({loadSamples,fetchImpl=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 return async function handle(request,env={}){
  if(request.method!=='GET')return json({error:'Use GET.'},405,{Allow:'GET'});
  const sport=new URL(request.url).searchParams.get('sport')||'nfl';
  if(!SPORTS.includes(sport))return json({error:'Choose one of the seven supported feeds.'},400);
  if(env.SPORTYAPI_MODE!=='live'){
   try{const samples=await loadSamples();return json({...samples[sport],mode:'sample',fetchedAt:null});}
   catch{return json({error:'Sample fixtures unavailable.'},503);}
  }
  const key=env.SPORTYAPI_API_KEY;
  if(!key)return json({error:'Set SPORTYAPI_API_KEY on the server before enabling live mode.'},503);
  const hit=cache.get(sport);if(hit&&hit.expires>now())return json(hit.body,hit.status,hit.headers);
  if(!pending.has(sport))pending.set(sport,(async()=>{
   try{
    const response=await fetchImpl(`https://sportyapi.com/api/sports/${sport}/scoreboard`,{headers:{'X-API-Key':key},signal:AbortSignal.timeout(10000)});
    if(!response.ok){
     const retry=response.headers.get('Retry-After');const seconds=retry&&/^\d+$/.test(retry)?Math.min(86400,Math.max(1,Number(retry))):60;
     const messages={401:'Server API key is missing or invalid.',403:'Server API key is not active.',402:'Activate your SportyApi trial or subscription.',429:`API limit reached. Retry in ${seconds} seconds.`};
     const status=[401,402,403,429].includes(response.status)?response.status:502;
     return {body:{error:messages[response.status]||'Sports data is temporarily unavailable.'},status,headers:status===429?{'Retry-After':String(seconds)}:{},expires:now()+(status===429?seconds*1000:10000)};
    }
    const raw=await response.json(),games=Array.isArray(raw)?raw:raw.games;
    if(!Array.isArray(games))throw Error('Invalid game response');
    return {body:{sport,games,mode:'live',fetchedAt:new Date(now()).toISOString()},status:200,headers:{},expires:now()+60000};
   }catch{return {body:{error:'Sports data is temporarily unavailable. Try again shortly.'},status:502,headers:{},expires:now()+10000};}
  })());
  try{const result=await pending.get(sport);cache.set(sport,result);return json(result.body,result.status,result.headers);}
  finally{pending.delete(sport);}
 };
}
