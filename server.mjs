import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createScoreboardHandler} from './src/scoreboard.mjs';
const root=new URL('./public/',import.meta.url);
const loadSamples=async()=>JSON.parse(await readFile(new URL('samples/scoreboards.json',root),'utf8'));
const handle=createScoreboardHandler({loadSamples});
const files=new Map([['/','index.html'],['/app.js','app.js'],['/site.css','site.css'],['/developers.css','developers.css']]);
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/scoreboard'){
   const response=await handle(new Request(url,{method:req.method}),process.env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(req.method!=='GET'||!files.has(url.pathname)){res.writeHead(404);res.end('Not found');return;}
  const file=files.get(url.pathname);res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(await readFile(new URL(file,root)));
 }catch{res.writeHead(500);res.end('Unable to serve this request.');}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log('Scoreboard ready at http://localhost:'+Number(process.env.PORT||3000)));
