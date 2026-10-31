import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){
  const server=createServer();
  server.listen(0,'127.0.0.1');
  await once(server,'listening');
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
function next(ws,check,timeout=2500){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off('message',receive);reject(Error('Timed out waiting for websocket message'));},timeout);
    function receive(raw){
      try{const msg=JSON.parse(raw.toString());if(check(msg)){clearTimeout(timer);ws.off('message',receive);resolve(msg);}}
      catch{}
    }
    ws.on('message',receive);
  });
}
test('HTTP server + real WebSocket handshake, rooms, move validation, and API health',async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'baghchal-'));
  const port=await freePort();
  const root='http://127.0.0.1:'+port;
  const child=spawn(process.execPath,['server/index.js'],{
    cwd:process.cwd(),env:{...process.env,PORT:String(port),NODE_ENV:'test',DATA_FILE:path.join(dir,'ratings.json')},
    stdio:['ignore','pipe','pipe']
  });
  t.after(async()=>{
    child.kill('SIGTERM');
    await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,1000);}});
    await rm(dir,{recursive:true,force:true});
  });
  let ready=false;
  for(let i=0;i<40;i++){
    if(child.exitCode!==null)break;
    try{const res=await fetch(root+'/api/health');if(res.ok){ready=true;break;}}
    catch{}
    await delay(75);
  }
  assert.equal(ready,true,'server should start and accept HTTP requests');
  const health=await (await fetch(root+'/api/health')).json();
  assert.equal(health.ok,true);
  assert.equal(health.protocol,1);
  assert.equal((await fetch(root+'/src/main.js')).status,200);
  const page=await (await fetch(root+'/')).text();
  assert.match(page,/royal.css/);
  assert.match(page,/royal-crest.svg/);
  assert.match(page,/data-play-mode="online"/);
  assert.match(page,/id="moveAnnouncer"/);
  assert.match(page,/id="onlineRematchBtn"/);
  assert.match(page,/id="rematchBtn"/);
  const ids=[...page.matchAll(/\\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(ids).size,ids.length,'all UI control IDs must be unique');
  for (const asset of [
    '/royal.css','/icons/royal-crest.svg','/icons/tiger-piece.svg',
    '/icons/goat-piece.svg','/icons/himalaya-royal.svg',
    '/images/royal-baghchal-banner.svg'
  ]) {
    const response=await fetch(root+asset);
    assert.equal(response.status,200,'royal asset should load: '+asset);
    assert.ok((await response.text()).length>100,asset+' must not be empty');
  }
  assert.equal((await fetch(root+'/src/intl-extra.js')).status,200);
  assert.equal((await fetch(root+'/server/hub.js')).status,404);
  assert.equal((await fetch(root+'/api/leaderboard')).status,200);

  const open=async()=>{
    const ws=new WebSocket('ws://127.0.0.1:'+port+'/ws',{headers:{Origin:root}});
    await once(ws,'open');
    t.after(()=>ws.close());
    return ws;
  };
  const a=await open(),b=await open();
  let response=next(a,msg=>msg.type==='welcome');
  a.send(JSON.stringify({type:'hello',name:'Player A',country:'NP'}));
  const welcome=await response;
  assert.equal(welcome.profile.name,'Player A');
  assert.ok(/^[a-f0-9]{64}$/.test(welcome.token));

  response=next(b,msg=>msg.type==='welcome');
  b.send(JSON.stringify({type:'hello',name:'Player B',country:'GB'}));
  await response;
  response=next(a,msg=>msg.type==='snapshot');
  a.send(JSON.stringify({type:'create',side:'goat'}));
  const created=await response;
  assert.match(created.room.code,/^[A-Z2-9]{6}$/);

  response=next(a,msg=>msg.type==='snapshot'&&msg.room.status==='active');
  b.send(JSON.stringify({type:'join',code:created.room.code}));
  const playing=await response;
  assert.equal(playing.room.players.tiger.country,'GB');

  response=next(b,msg=>msg.type==='error');
  b.send(JSON.stringify({type:'move',version:0,from:0,to:5}));
  assert.equal((await response).code,'not_your_turn');

  response=next(b,msg=>msg.type==='snapshot'&&msg.room.version===1);
  a.send(JSON.stringify({type:'move',version:0,from:null,to:12}));
  const moved=await response;
  assert.equal(moved.room.game.board[12].side,'goat');
});
