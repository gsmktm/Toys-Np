import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { createHub } from './hub.js';
import { RatingStore } from './store.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=Number(process.env.PORT || 3000);
const allowed=(process.env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
const production=process.env.NODE_ENV==='production';
const routes=new Map([
  ['/','index.html'],['/index.html','index.html'],['/styles.css','styles.css'],
  ['/src/engine.js','src/engine.js'],['/src/ai.js','src/ai.js'],
  ['/src/main.js','src/main.js'],['/src/online-client.js','src/online-client.js'],
  ['/src/bluetooth.js','src/bluetooth.js'],['/src/intl-extra.js','src/intl-extra.js'],
  ['/sw.js','sw.js'],['/manifest.webmanifest','manifest.webmanifest'],
  ['/icons/favicon.svg','icons/favicon.svg']
]);
const mime={'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8',
  'css':'text/css; charset=utf-8','webmanifest':'application/manifest+json',
  'svg':'image/svg+xml'};
const store=new RatingStore();
const hub=createHub({store});
const counters=new Map();
function safeOrigin(req) {
  const origin=req.headers.origin;
  if(typeof origin!=='string')return !production;
  if(allowed.includes(origin))return true;
  try {
    const parsed=new URL(origin);
    return parsed.host===req.headers.host &&
      (parsed.protocol==='https:' || (!production && parsed.protocol==='http:'));
  }catch{return false;}
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url||'/', 'http://localhost');
  const headers={
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'X-Frame-Options':'DENY',
    'Permissions-Policy':'geolocation=(), camera=(), microphone=(), bluetooth=(self)',
    'Cache-Control':'no-cache',
    'Cross-Origin-Resource-Policy':'same-origin'
  };
  if(url.pathname==='/api/health'){
    res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({ok:true,app:'baghchal',protocol:1,now:Date.now(),regions:'single-instance'}));
    return;
  }
  if(url.pathname==='/api/leaderboard'){
    res.writeHead(200,{...headers,'Content-Type':'application/json; charset=utf-8'});
    res.end(JSON.stringify({players:hub.rankings()}));return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
  const file=routes.get(url.pathname);
  if(!file){res.writeHead(404,headers);res.end('Not found');return;}
  try{
    const data=await readFile(path.join(root,file));
    const ext=file.split('.').pop();
    res.writeHead(200,{...headers,'Content-Type':mime[ext]||'application/octet-stream'});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404,headers);res.end('Not found');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
  let url;
  try{url=new URL(req.url,'http://localhost');}catch{socket.destroy();return;}
  if(url.pathname!=='/ws'||!safeOrigin(req)){socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
});
wss.on('connection',(ws,req)=>{
  const ip=req.socket.remoteAddress||'unknown';
  // Global per-IP sliding-window guard plus per-connection guard.
  let localHits=0,windowStart=Date.now();
  ws.isAlive=true;
  ws.on('pong',()=>{ws.isAlive=true;});
  ws.on('message',raw=>{
    const now=Date.now();
    if(now-windowStart>10_000){windowStart=now;localHits=0;}
    const entry=counters.get(ip)||{hits:0,start:now};
    if(now-entry.start>10_000){entry.hits=0;entry.start=now;}
    entry.hits++;localHits++;counters.set(ip,entry);
    if(localHits>90 || entry.hits>250){ws.close(1008,'Rate limit exceeded');return;}
    try{
      const msg=JSON.parse(raw.toString());
      hub.dispatch(ws,msg);
    }catch{
      if(ws.readyState===1)ws.send(JSON.stringify({type:'error',code:'invalid_json'}));
    }
  });
  ws.on('close',()=>hub.disconnect(ws));
  ws.on('error',()=>hub.disconnect(ws));
});
const interval=setInterval(()=>{
  hub.tick();
  for(const [ip,entry] of counters)if(Date.now()-entry.start>30_000)counters.delete(ip);
  for(const ws of wss.clients) {
    if(!ws.isAlive){ws.terminate();continue;}
    ws.isAlive=false;ws.ping();
  }
},5000);
function shutdown(){
  clearInterval(interval);
  for(const ws of wss.clients)ws.close(1001,'Server restarting');
  store.flush();
  server.close();
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);
server.listen(PORT,'0.0.0.0',()=>console.log('Baghchal server listening on port '+PORT));
