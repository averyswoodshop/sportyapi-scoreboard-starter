const sportSelect=document.getElementById('demo-sport');
const gamesElement=document.getElementById('demo-games');
const statusElement=document.getElementById('demo-status');
const jsonElement=document.getElementById('demo-json');
const refresh=document.getElementById('demo-refresh');
const badge=document.getElementById('demo-mode');
let revision=0,controller;
function node(tag,text){const el=document.createElement(tag);el.textContent=text;return el;}
function renderGame(game){
 const card=document.createElement('article');card.className='demo-game';
 const state=typeof game.status?.type==='object'?game.status.type:game.status;
 card.append(node('h3',state?.detail||state?.name||state?.type||'Status unavailable'));
 const scheduled=/SCHEDULED/i.test(state?.name||state?.type||'');
 for(const side of ['awayTeam','homeTeam']){const team=game[side]||{},row=document.createElement('div');row.className='demo-team';row.append(node('span',team.name||team.shortName||team.abbreviation||'Team unavailable'),node('strong',scheduled?'—':String(team.score??'—')));card.append(row);}
 const date=game.date&&new Date(game.date);const when=date&&!Number.isNaN(date.getTime())?date.toLocaleString():'Start time unavailable';
 card.append(node('p',when+' · '+(game.venue?.fullName||'Venue unavailable')));return card;
}
async function load(){
 const current=++revision;controller?.abort();controller=new AbortController();refresh.disabled=true;statusElement.dataset.error='false';statusElement.textContent='Loading scoreboard…';
 try{
  const staticDemo=document.body.dataset.sampleOnly==='true';
  const response=await fetch(staticDemo?'/samples/scoreboards.json':'/api/scoreboard?sport='+encodeURIComponent(sportSelect.value),{signal:controller.signal});
  if(!response.ok){const body=await response.json().catch(()=>({}));throw Error(body.error||'Scoreboard unavailable. Please try again.');}
  const raw=await response.json();if(current!==revision)return;
  const data=staticDemo?{...raw[sportSelect.value],mode:'sample',fetchedAt:null}:raw;
  if(!Array.isArray(data.games))throw Error('Unexpected response format.');
  badge.textContent=data.mode==='live'?'Live API response':'Sample data / no API calls';
  statusElement.textContent=data.mode==='live'?'Fetched '+new Date(data.fetchedAt).toLocaleString()+'. Game updates may be delayed.':'Illustrative fixtures and scores. Not real games or live data. Dates are displayed in your local timezone.';
  gamesElement.replaceChildren(...data.games.map(renderGame));if(!data.games.length)gamesElement.append(node('p','No games returned for this feed. Try another sport.'));
  jsonElement.textContent=JSON.stringify({sport:data.sport,games:data.games},null,2);
 }catch(error){if(error.name==='AbortError'||current!==revision)return;statusElement.dataset.error='true';statusElement.textContent=error.message;gamesElement.replaceChildren(node('p','We could not load this scoreboard. Try again shortly.'));jsonElement.textContent='Response unavailable.';}
 finally{if(current===revision)refresh.disabled=false;}
}
sportSelect.addEventListener('change',load);refresh.addEventListener('click',load);
document.getElementById('demo-copy').addEventListener('click',async event=>{try{await navigator.clipboard.writeText(jsonElement.textContent);event.target.textContent='Copied';}catch{event.target.textContent='Select JSON to copy';}});
load();
