import { randomBytes, createHash, randomInt } from 'node:crypto';
import { initialGame, applyMove, legalMoves, GOAT, TIGER, opponent } from '../src/engine.js';

const MAX_SPECTATORS=30, CLOCK_MS=10*60*1000, INCREMENT_MS=2000;
export const sanitizeName = value => String(value || 'Guest').replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,32) || 'Guest';
export const sanitizeCountry = value => /^[A-Z]{2}$/.test(String(value||'').toUpperCase()) ? String(value).toUpperCase() : 'XX';
const validToken = t => typeof t==='string' && /^[a-f0-9]{64}$/.test(t);
export const hashToken = t => createHash('sha256').update(t).digest('hex');
const toSend = (socket,data) => { if (socket?.readyState===1) socket.send(JSON.stringify(data)); };

export function createHub({store,now=()=>Date.now(),rand= n=>randomInt(n)}={}) {
  if (!store) throw Error('A ranking store is required');
  const sessions=new Map(), sockets=new Map(), rooms=new Map();
  let queue=[];
  const send=(user,data)=>toSend(user?.socket,data);
  const fail=(user,code)=>send(user,{type:'error',code});
  const profile=(user)=>({
    id:user.id, name:user.name, country:user.country,
    rating:user.rating, wins:user.wins, losses:user.losses, draws:user.draws,
    matches:user.matches
  });
  function upsert(user) {
    store.set(user.key,profile(user));
  }
  function joinable(user) { return user && !user.room && !queue.includes(user); }
  function snapshot(room,user) {
    const player=(side)=>{
      const seat=room.seats[side];
      return seat ? {...profile(seat),connected:!!seat.socket && seat.socket.readyState===1} : null;
    };
    return {type:'snapshot',room:{
      code:room.code,ranked:room.ranked,status:room.status,version:room.version,
      game:room.game,players:{goat:player(GOAT),tiger:player(TIGER)},
      mySide:room.seats.goat===user?GOAT:room.seats.tiger===user?TIGER:null,
      spectators:room.spectators.size,clock:clockView(room),log:room.log.slice(-40),
      rematch:room.rematch.size,createdAt:room.createdAt
    }};
  }
  function clockView(room) {
    const remain={...room.remaining};
    if(room.status==='active') remain[room.game.turn]=Math.max(0,remain[room.game.turn]-(now()-room.turnStarted));
    return {remaining:remain,turnStarted:room.turnStarted,serverTime:now(),increment:INCREMENT_MS};
  }
  function broadcast(room) {
    const unique=new Set([...Object.values(room.seats).filter(Boolean),...room.spectators]);
    for (const user of unique) send(user,snapshot(room,user));
  }
  function code() {
    const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for(let attempt=0;attempt<12;attempt++) {
      let s='';for(let i=0;i<6;i++) s+=chars[rand(chars.length)];
      if(!rooms.has(s)) return s;
    }
    throw Error('No room codes available');
  }
  function removeQueue(user) { queue=queue.filter(u=>u!==user); }
  function newRoom(creator,side=GOAT,ranked=false) {
    const room={code:code(),ranked,game:initialGame(),version:0,
      seats:{goat:null,tiger:null},spectators:new Set(),status:'waiting',
      remaining:{goat:CLOCK_MS,tiger:CLOCK_MS},turnStarted:null,
      log:[],rematch:new Set(),createdAt:now(),finishedAt:null,lastBroadcast:now()};
    room.seats[side]=creator; creator.room=room;
    rooms.set(room.code,room);
    return room;
  }
  function seatPlayer(room,user,side) {
    room.seats[side]=user;user.room=room;
    room.status='active';room.turnStarted=now();
    broadcast(room);
  }
  function updateRatings(room) {
    if(!room.ranked || room.game.ply<2 || !room.seats.goat || !room.seats.tiger) return;
    const a=room.seats.goat,b=room.seats.tiger;
    const score=room.game.winner===GOAT?1:room.game.winner===TIGER?0:.5;
    const expected=1/(1+Math.pow(10,(b.rating-a.rating)/400));
    const delta=Math.round(24*(score-expected));
    a.rating=Math.max(100,a.rating+delta);
    b.rating=Math.max(100,b.rating-delta);
    a.matches++;b.matches++;
    if(score===1){a.wins++;b.losses++;}
    else if(score===0){b.wins++;a.losses++;}
    else {a.draws++;b.draws++;}
    upsert(a);upsert(b);
    send(a,{type:'rating',delta});
    send(b,{type:'rating',delta:-delta});
  }
  function finish(room,winner,reason) {
    if(room.status!=='active') return;
    room.status='complete';
    room.game={...room.game,winner,reason};
    room.version++;
    room.finishedAt=now();
    room.turnStarted=null;
    updateRatings(room);
    broadcast(room);
  }
  function expireIfNeeded(room) {
    if(room.status!=='active') return false;
    const side=room.game.turn;
    if(room.remaining[side]-(now()-room.turnStarted)>0)return false;
    room.remaining[side]=0;
    finish(room,opponent(side),'timeout');
    return true;
  }
  function leave(user) {
    removeQueue(user);
    const room=user.room;
    if(!room)return;
    if(room.status==='active' && (room.seats.goat===user || room.seats.tiger===user)) {
      finish(room,room.seats.goat===user?TIGER:GOAT,'resigned');
    }
    if(room.seats.goat===user) room.seats.goat=null;
    if(room.seats.tiger===user) room.seats.tiger=null;
    room.spectators.delete(user);room.rematch.delete(user);user.room=null;
    if(room.status==='waiting' || (!room.seats.goat && !room.seats.tiger && !room.spectators.size)) rooms.delete(room.code);
    else broadcast(room);
  }
  function hello(socket,msg) {
    if(sockets.has(socket))return;
    const supplied=validToken(msg.token)?msg.token:null;
    let token=supplied || randomBytes(32).toString('hex');
    let user=sessions.get(token);
    if(!user) {
      const key=hashToken(token), record=store.get(key);
      user={token,key,id:key.slice(0,12),name:sanitizeName(record?.name ?? msg.name),
        country:sanitizeCountry(record?.country ?? msg.country),
        rating:record?.rating ?? 1200,wins:record?.wins ?? 0,losses:record?.losses ?? 0,
        draws:record?.draws ?? 0,matches:record?.matches ?? 0,room:null,socket:null};
      sessions.set(token,user);
    }
    if(user.socket && user.socket!==socket) {
      const old=user.socket;
      sockets.delete(old);
      try{old.close(4001,'Session resumed elsewhere');}catch{}
    }
    user.socket=socket;sockets.set(socket,user);
    upsert(user);
    send(user,{type:'welcome',token,profile:profile(user),serverTime:now(),protocol:1});
    if(user.room)broadcast(user.room);
  }
  function dispatch(socket,msg) {
    if(!msg || typeof msg!=='object'||Array.isArray(msg)||typeof msg.type!=='string')return;
    if(msg.type==='hello'){hello(socket,msg);return;}
    const user=sockets.get(socket);
    if(!user){toSend(socket,{type:'error',code:'authenticate_first'});return;}
    if(msg.type==='profile') {
      user.name=sanitizeName(msg.name);
      user.country=sanitizeCountry(msg.country);
      upsert(user);send(user,{type:'profile',profile:profile(user)});
      if(user.room)broadcast(user.room);
      return;
    }
    if(msg.type==='leaderboard') {send(user,{type:'leaderboard',players:store.top(30)});return;}
    if(msg.type==='ping'){send(user,{type:'pong',serverTime:now()});return;}
    if(msg.type==='leave'){leave(user);send(user,{type:'left'});return;}
    if(msg.type==='cancelQueue'){removeQueue(user);send(user,{type:'queue',waiting:false});return;}
    if(msg.type==='resign') {
      if(!user.room || user.room.status!=='active'||!Object.values(user.room.seats).includes(user)){fail(user,'not_playing');return;}
      finish(user.room,user.room.seats.goat===user?TIGER:GOAT,'resigned');return;
    }
    if(msg.type==='quick') {
      if(!joinable(user)){fail(user,'already_busy');return;}
      queue=queue.filter(u=>u.socket?.readyState===1&&!u.room);
      const other=queue.shift();
      if(!other){queue.push(user);send(user,{type:'queue',waiting:true});return;}
      const goat=rand(2)===0?user:other,tiger=goat===user?other:user;
      const room=newRoom(goat,GOAT,true);
      seatPlayer(room,tiger,TIGER);
      send(other,{type:'queue',waiting:false});send(user,{type:'queue',waiting:false});
      return;
    }
    if(msg.type==='create') {
      if(!joinable(user)){fail(user,'already_busy');return;}
      const side=msg.side===TIGER?TIGER:GOAT;
      const room=newRoom(user,side,false);
      broadcast(room);return;
    }
    if(msg.type==='join'||msg.type==='spectate') {
      if(!joinable(user)){fail(user,'already_busy');return;}
      const room=rooms.get(String(msg.code||'').toUpperCase().trim());
      if(!room){fail(user,'room_not_found');return;}
      if(msg.type==='spectate') {
        if(room.spectators.size>=MAX_SPECTATORS){fail(user,'spectator_limit');return;}
        room.spectators.add(user);user.room=room;broadcast(room);return;
      }
      if(room.status!=='waiting'){fail(user,'room_unavailable');return;}
      const side=room.seats.goat?TIGER:GOAT;
      if(room.seats[side]){fail(user,'room_full');return;}
      seatPlayer(room,user,side);return;
    }
    if(msg.type==='move') {
      const room=user.room;
      if(!room || room.status!=='active'){fail(user,'not_playing');return;}
      if(expireIfNeeded(room))return;
      if(room.seats[room.game.turn]!==user){fail(user,'not_your_turn');return;}
      if(msg.version!==room.version){fail(user,'stale_move');send(user,snapshot(room,user));return;}
      const from=msg.from===null?null:msg.from,to=msg.to;
      if(!Number.isInteger(to)||to<0||to>24||
         (from!==null&&(!Number.isInteger(from)||from<0||from>24))){fail(user,'invalid_move');return;}
      const move=legalMoves(room.game).find(m=>m.from===from&&m.to===to);
      if(!move){fail(user,'illegal_move');return;}
      const elapsed=Math.max(0,now()-room.turnStarted);
      const side=room.game.turn;
      room.remaining[side]=Math.max(0,room.remaining[side]-elapsed)+INCREMENT_MS;
      room.game=applyMove(room.game,move);
      room.log.push({ply:room.game.ply,side,from,to,capture:move.capture});
      room.version++;
      room.turnStarted=now();
      if(room.game.winner)finish(room,room.game.winner,room.game.reason);
      else broadcast(room);
      return;
    }
    if(msg.type==='rematch') {
      const room=user.room;
      if(!room||room.status!=='complete'||room.ranked||!Object.values(room.seats).includes(user)){fail(user,'rematch_unavailable');return;}
      room.rematch.add(user);
      if(room.seats.goat&&room.seats.tiger&&room.rematch.size===2) {
        [room.seats.goat,room.seats.tiger]=[room.seats.tiger,room.seats.goat];
        room.game=initialGame();room.log=[];room.version++;room.rematch.clear();
        room.remaining={goat:CLOCK_MS,tiger:CLOCK_MS};room.turnStarted=now();room.status='active';room.finishedAt=null;
      }
      broadcast(room);return;
    }
    fail(user,'unknown_action');
  }
  function disconnect(socket) {
    const user=sockets.get(socket);
    if(!user)return;
    sockets.delete(socket);
    if(user.socket===socket)user.socket=null;
    removeQueue(user);
    if(user.room)broadcast(user.room);
  }
  function tick() {
    queue=queue.filter(u=>u.socket?.readyState===1&&!u.room);
    for(const room of rooms.values()) {
      if(room.status==='active') {
        if(!expireIfNeeded(room)&&now()-room.lastBroadcast>=5000) {
          broadcast(room);room.lastBroadcast=now();
        }
      }
      if(room.status==='waiting'&&now()-room.createdAt>15*60*1000) {
        for(const p of Object.values(room.seats))if(p){p.room=null;fail(p,'room_expired');}
        rooms.delete(room.code);
      }
      if(room.status==='complete'&&now()-room.finishedAt>30*60*1000) {
        for(const p of Object.values(room.seats))if(p&&p.room===room)p.room=null;
        for(const p of room.spectators)if(p.room===room)p.room=null;
        rooms.delete(room.code);
      }
    }
    // Do not retain detached anonymous profiles in memory forever.
    for(const [token,user] of sessions)if(!user.socket&&!user.room&&!queue.includes(user))sessions.delete(token);
  }
  return {dispatch,disconnect,tick,rooms,sessions,rankings:()=>store.top(30)};
}
