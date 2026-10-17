import {createScoreboardHandler} from './src/scoreboard.mjs';
const live=createScoreboardHandler();
export default {async fetch(request,env){
 if(new URL(request.url).pathname==='/api/scoreboard'){
  if(env.SPORTYAPI_MODE==='live')return live(request,env);
  const sample=createScoreboardHandler({loadSamples:async()=>{
   const response=await env.ASSETS.fetch(new Request(new URL('/samples/scoreboards.json',request.url)));
   if(!response.ok)throw Error('Missing samples');return response.json();
  }});return sample(request,env);
 }
 return env.ASSETS.fetch(request);
}};
