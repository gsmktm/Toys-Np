import { initialGame, applyMove, legalMoves, rowCol, GOAT, TIGER } from './engine.js';
import { chooseMove } from './ai.js';
import { OnlineClient, defaultServerUrl } from './online-client.js';
import { BluetoothBoard } from './bluetooth.js';
import { extraLocales } from './intl-extra.js';

const STORAGE = 'ktm-toys-baghchal-v1';
const defaults = { mode:'ai', human:GOAT, difficulty:'medium', lang:'ne', sound:true };
const $ = id => document.getElementById(id);
let settings = { ...defaults }, game = initialGame(), timeline = [], log = [];
let selected = null, hint = null, thinking = false, aiTimer = null, toastTimer = null;
const pieceNodes = new Map(), cellNodes = [];
const art = {goat:'./icons/goat-piece.svg',tiger:'./icons/tiger-piece.svg',draw:'./icons/royal-crest.svg'};
let lastAnnouncedPly = -1;
let networkRoom=null, networkQueued=false, networkPlayers=[], networkStatus='offline';
let inviteCode=new URLSearchParams(location.search).get('room');
const network=new OnlineClient(onNetworkEvent,onNetworkStatus);
const bluetooth=new BluetoothBoard(onBluetoothMove,onBluetoothStatus);
const strings = {
  en: {
    heritage:'MADE IN NEPAL', howTo:'How to play',heroEyebrow:'THE HIMALAYAN STRATEGY COLLECTION',heroTitle:'बाघचाल',
    heroSubtitle:'THE TIGER & GOAT GAME',heroDescription:'Four tigers. Twenty goats. A timeless battle of instinct and intelligence, born in the hills of Nepal.',
    tigersCaps:'TIGERS',goatsCaps:'GOATS',pointsCaps:'POINTS',boardEyebrow:'THE ROYAL ARENA',boardTitle:'The battlefield',
    arenaTop:'ANCIENT NEPAL · 5 × 5',arenaBottom:'PATIENCE · COURAGE · STRATEGY',undo:'Undo move',
    hint:'Show hint',soundOn:'Sound on',soundOff:'Sound off',newGame:'New game',currentTurn:'CURRENT TURN',
    gamePhase:'GAME PHASE',matchOverview:'MATCH OVERVIEW',goatsPlaced:'Goats placed',goatsCaptured:'Goats captured',
    movesPlayed:'Moves played',gameSettings:'GAME SETTINGS',playMode:'PLAY MODE',vsComputer:'Vs. computer',
    twoPlayers:'Two players (local)',yourSide:'YOUR SIDE',difficulty:'DIFFICULTY',goats:'Goats 🐐',
    tigers:'Tigers 🐯',easy:'Easy',medium:'Medium',hard:'Hard',
    setupNote:'Changing players starts a fresh match. Your progress is saved only on this device.',
    recentMoves:'RECENT MOVES',heritageNote:'A treasured game of Nepal — where tigers hunt, goats unite, and every move tells a story.',
    footerText:'Crafted for the next generation. Rooted in tradition.',learnGame:'LEARN THE GAME',rulesTitle:'How to play Baghchal',
    rule1Title:'Set the board',rule1:'Four tigers begin at the corners. All twenty goats begin off the board. Goats move first.',
    rule2Title:'Place the goats',rule2:'Place one goat on an empty intersection each goat turn. Goats cannot move until all twenty have been placed.',
    rule3Title:'Move and capture',rule3:'A tiger moves along one line, or jumps over one goat into an empty point to capture it. No double jumps.',
    rule4Title:'Claim victory',rule4:'Tigers win by capturing five goats. Goats win by blocking every tiger. The game is a draw on threefold repetition.',
    startPlaying:"LET'S PLAY ✦",matchFinished:'MATCH FINISHED',playAgain:'PLAY AGAIN ↻',viewBoard:'View board',
    vsAi:'VS COMPUTER',local:'LOCAL TWO PLAYER',yourMove:'YOUR MOVE',aiThinking:'THINKING',theirMove:'PLAYER TURN',
    tigerTurn:'Tigers to play',goatTurn:'Goats to play',placeGoat:'Tap an empty point to place a goat.',
    moveGoat:'Select a goat, then an adjacent empty point.',moveTiger:'Move a tiger or jump a goat to capture it.',
    waitAi:'Your opponent is choosing a move…',placement:'Goat placement',movement:'Movement phase',
    winnerGoat:'The goats win!',winnerTiger:'The tigers win!',draw:'It is a draw!',
    winnerGoatDesc:'The herd held together. Every tiger has been trapped.',
    winnerTigerDesc:'Five goats have been captured. The tigers rule the board.',
    drawDesc:'The same position was repeated three times.',
    capture:'Captured',place:'Placed',move:'Moved',noMoves:'No moves yet. The story begins with you.',
    hintsUnavailable:'No legal move available.',undoEmpty:'No move to undo yet.',undoDone:'Move undone.',
    newStarted:'New match started.',settingsChanged:'New match with updated players.',hintReady:'Highlighted your suggested move.',
    restartHint:'Select a piece, then a glowing point.',ai:'Computer',goat:'Goat',tiger:'Tiger',drawLabel:'Draw',
    row:'row',column:'column',from:'from',to:'to'
  },
  ne: {
    heritage:'नेपालको मौलिक खेल',howTo:'खेल्ने तरिका',heroEyebrow:'हिमालयको रणनीतिक खेल परम्परा',
    heroTitle:'बाघचाल',heroSubtitle:'बाघ र बाख्राको बुद्धिको खेल',
    heroDescription:'चार बाघ। बीस बाख्रा। नेपाली माटोमा जन्मिएको साहस, धैर्य र रणनीतिको अनुपम खेल।',
    tigersCaps:'बाघ',goatsCaps:'बाख्रा',pointsCaps:'चौकी',boardEyebrow:'परम्परागत खेल मैदान',
    boardTitle:'खेलको मैदान',arenaTop:'नेपाली मौलिक खेल · ५ × ५',arenaBottom:'धैर्य · साहस · रणनीति',
    undo:'चाल फिर्ता',hint:'चाल सुझाव',soundOn:'ध्वनि चालु',soundOff:'ध्वनि बन्द',newGame:'नयाँ खेल',
    currentTurn:'अहिलेको पालो',gamePhase:'खेलको चरण',matchOverview:'खेलको अवस्था',
    goatsPlaced:'राखिएका बाख्रा',goatsCaptured:'खाइएका बाख्रा',movesPlayed:'खेलिएका चाल',
    gameSettings:'खेलको विकल्प',playMode:'खेल्ने तरिका',vsComputer:'कम्प्युटरसँग',
    twoPlayers:'दुई खेलाडी (एउटै यन्त्र)',yourSide:'आफ्नो पक्ष',difficulty:'कठिनाइ',
    goats:'बाख्रा 🐐',tigers:'बाघ 🐯',easy:'सजिलो',medium:'मध्यम',hard:'कठिन',
    setupNote:'खेलाडी परिवर्तन गर्दा नयाँ खेल सुरु हुन्छ। प्रगति यही यन्त्रमा सुरक्षित रहन्छ।',
    recentMoves:'पछिल्ला चाल',heritageNote:'नेपालको मौलिक बाघचाल — बाघले सिकार गर्छ, बाख्राले एकता देखाउँछ।',
    footerText:'परम्पराको जरा, नयाँ पुस्ताको खेल।',learnGame:'खेल सिकौँ',rulesTitle:'बाघचाल कसरी खेल्ने?',
    rule1Title:'खेलको सुरुवात',rule1:'चार बाघ चार कुनामा बस्छन्। बीस बाख्रा बाहिर रहन्छन्। पहिलो पालो बाख्राको हुन्छ।',
    rule2Title:'बाख्रा राख्ने',rule2:'हरेक पालोमा खाली चौकीमा एउटा बाख्रा राख्नुहोस्। सबै २० बाख्रा नराखेसम्म तिनलाई सार्न मिल्दैन।',
    rule3Title:'बाघको चाल',rule3:'बाघले रेखाको छेउको खाली चौकीमा चाल चल्छ वा एउटा बाख्रा नाघेर खाली ठाउँमा पुगेमा त्यसलाई खान्छ। एउटै चालमा एक सिकार।',
    rule4Title:'जित कसरी हुन्छ?',rule4:'पाँच बाख्रा खाए बाघ जित्छ। सबै बाघको चाल रोकिए बाख्रा जित्छन्। उही अवस्था तीन पटक दोहोरिए बराबरी हुन्छ।',
    startPlaying:'खेल सुरु गरौँ ✦',matchFinished:'खेल समाप्त',playAgain:'फेरि खेलौँ ↻',viewBoard:'मैदान हेर्नुहोस्',
    vsAi:'कम्प्युटरसँग',local:'दुई खेलाडी',yourMove:'तपाईंको पालो',aiThinking:'सोच्दैछ…',
    theirMove:'खेलाडीको पालो',tigerTurn:'बाघको पालो',goatTurn:'बाख्राको पालो',
    placeGoat:'खाली चौकीमा थिचेर एउटा बाख्रा राख्नुहोस्।',
    moveGoat:'बाख्रा छानेर रेखाले जोडिएको खाली चौकीमा सार्नुहोस्।',
    moveTiger:'बाघ छानेर सार्नुहोस् वा बाख्रा नाघेर सिकार गर्नुहोस्।',
    waitAi:'कम्प्युटर चाल सोच्दैछ…',placement:'बाख्रा राख्ने चरण',movement:'चाल सार्ने चरण',
    winnerGoat:'बाख्राको विजय!',winnerTiger:'बाघको विजय!',draw:'खेल बराबरी!',
    winnerGoatDesc:'सबै बाघको बाटो रोकियो। बाख्राको एकता विजयी भयो।',
    winnerTigerDesc:'पाँच बाख्रा खाइयो। बाघ विजयी भयो।',
    drawDesc:'उही अवस्था तीन पटक दोहोरिएको छ।',
    capture:'सिकार',place:'राख्यो',move:'सार्‍यो',noMoves:'अहिलेसम्म चाल चलेको छैन। पहिलो चाल तपाईंको।',
    hintsUnavailable:'कुनै सम्भव चाल छैन।',undoEmpty:'फिर्ता गर्न मिल्ने चाल छैन।',undoDone:'चाल फिर्ता गरियो।',
    newStarted:'नयाँ खेल सुरु भयो।',settingsChanged:'नयाँ खेलाडीअनुसार खेल सुरु भयो।',
    hintReady:'सुझाव गरिएको चाल देखाइएको छ।',restartHint:'गोटी छानेर चम्किएको चौकीमा थिच्नुहोस्।',
    ai:'कम्प्युटर',goat:'बाख्रा',tiger:'बाघ',drawLabel:'बराबरी',row:'पंक्ति',column:'स्तम्भ',from:'बाट',to:'सम्म'
  }
};
Object.assign(strings,extraLocales);
Object.assign(strings.en,{setupOnline:'International games and guest ratings are stored on the configured server. Offline games remain on your device.'});
Object.assign(strings.ne,{setupOnline:'अनलाइन खेल र अतिथि वरीयता सम्बन्धित सर्भरमा सुरक्षित रहन्छन्। अफलाइन खेल आफ्नो यन्त्रमा रहन्छ।'});
Object.assign(strings.en,{
  royalSolo:'SOLO COURT',royalDuel:'ROYAL DUEL',royalWorld:'WORLD ARENA',
  royalMove:'Royal move',royalCapture:'Tiger capture',royalPlacement:'Goat placed'
});
Object.assign(strings.ne,{
  royalSolo:'एकल खेल',royalDuel:'दुई खेलाडी',royalWorld:'विश्व मैदान',
  royalMove:'राजकीय चाल',royalCapture:'बाघको सिकार',royalPlacement:'बाख्रा राखियो'
});
const t = key => strings[settings.lang]?.[key] || strings.en[key] || key;
Object.assign(strings.en,{onlineMode:'Online · Worldwide',worldArena:'WORLD ARENA',onlineDescription:'Play with friends worldwide. Every move is verified by the server.',serverAddress:'SERVER ADDRESS · WSS',connectServer:'CONNECT TO WORLD ARENA',playerName:'PLAYER NAME',country:'COUNTRY (ISO 2)',saveProfile:'SAVE PROFILE',quickMatch:'⚡ QUICK MATCH',privateRoom:'✦ PRIVATE ROOM',joinCode:'6-CHARACTER ROOM CODE',joinRoom:'JOIN ROOM',spectate:'WATCH',roomCode:'ROOM',copyInvite:'COPY INVITE',resign:'RESIGN',leaveRoom:'LEAVE',rematch:'REMATCH',cancelSearch:'CANCEL SEARCH',bluetoothTitle:'BLUETOOTH BOARD',bluetoothDescription:'Connect a compatible BLE Baghchal board/controller using Chromium over HTTPS. Not phone-to-phone Bluetooth.',bluetoothConnect:'PAIR DEVICE',bluetoothDisconnect:'DISCONNECT',globalRankings:'GLOBAL GUEST RANKINGS',guestRankings:'Guest rankings are informal; no verified account is required.',onlineWait:'Find a match or wait for a friend to join.',onlineWaiting:'WAITING',notYourTurn:'Wait for the other player.',serverRequired:'Enter your secure multiplayer server URL first.',inviteCopied:'Invitation copied.',connectionFailed:'Could not connect to multiplayer server.',pairSuccess:'Bluetooth board connected.',pairFailure:'Bluetooth is unavailable or the device declined pairing.',bleUnavailable:'Compatible BLE board required on supported Chromium browser.',rankEmpty:'No ranked matches have finished yet.',waitingOpponent:'Waiting for another player…',rankedMatch:'Ranked match',casualMatch:'Friendly match',watching:'Watching',noRoom:'No active room',tigerTime:'Tiger',goatTime:'Goat'});
Object.assign(strings.ne,{onlineMode:'विश्वव्यापी अनलाइन',worldArena:'विश्व खेल मैदान',onlineDescription:'विश्वभरका साथीसँग खेल्नुहोस्। हरेक चाल सर्भरले जाँच्छ।',serverAddress:'सर्भर ठेगाना · WSS',connectServer:'अनलाइन जोडिनुहोस्',playerName:'खेलाडीको नाम',country:'देश (ISO २ अक्षर)',saveProfile:'परिचय सुरक्षित',quickMatch:'⚡ तुरुन्त खेलौँ',privateRoom:'✦ निजी कोठा',joinCode:'६-अक्षर कोठा कोड',joinRoom:'कोठामा प्रवेश',spectate:'हेर्नुहोस्',roomCode:'कोठा',copyInvite:'निम्तो कपी',resign:'हार स्वीकार',leaveRoom:'बाहिरिनुहोस्',rematch:'फेरि खेलौँ',cancelSearch:'खोजी रोक्नुहोस्',bluetoothTitle:'ब्लुटुथ बोर्ड',bluetoothDescription:'HTTPS मा समर्थित Chromium बाट उपयुक्त BLE बाघचाल बोर्डसँग जोड्नुहोस्। यो फोन–फोन ब्लुटुथ होइन।',bluetoothConnect:'उपकरण जोड्नुहोस्',bluetoothDisconnect:'छुट्याउनुहोस्',globalRankings:'विश्व अतिथि वरीयता',guestRankings:'यो अतिथि वरीयता हो; प्रमाणित खाता आवश्यक छैन।',onlineWait:'प्रतिद्वन्द्वी खोज्नुहोस् वा साथीको प्रतीक्षा गर्नुहोस्।',onlineWaiting:'प्रतीक्षामा',notYourTurn:'अर्को खेलाडीको पालो हो।',serverRequired:'पहिले सुरक्षित अनलाइन सर्भर ठेगाना राख्नुहोस्।',inviteCopied:'निम्तो कपी भयो।',connectionFailed:'अनलाइन सर्भरसँग जोडिन सकेन।',pairSuccess:'ब्लुटुथ बोर्ड जोडियो।',pairFailure:'ब्लुटुथ उपलब्ध छैन वा उपकरण जोडिएन।',bleUnavailable:'समर्थित Chromium र उपयुक्त BLE बोर्ड आवश्यक छ।',rankEmpty:'अहिलेसम्म वरीयताको खेल सकिएको छैन।',waitingOpponent:'अर्को खेलाडीको प्रतीक्षा…',rankedMatch:'वरीयता खेल',casualMatch:'मैत्रीपूर्ण खेल',watching:'दर्शक',noRoom:'खेल कोठा छैन',tigerTime:'बाघ',goatTime:'बाख्रा'});
function stored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE) || '{}');
    if (parsed.settings && ['ne','en','es','fr','de','zh','ja'].includes(parsed.settings.lang) &&
        ['ai','local','online'].includes(parsed.settings.mode) &&
        [GOAT,TIGER].includes(parsed.settings.human) &&
        ['easy','medium','hard'].includes(parsed.settings.difficulty)) {
      settings = { ...defaults, ...parsed.settings, sound: parsed.settings.sound !== false };
    }
    if (parsed.game && Array.isArray(parsed.game.board) && parsed.game.board.length === 25 &&
        [GOAT,TIGER].includes(parsed.game.turn) &&
        Number.isInteger(parsed.game.goatsPlaced) && parsed.game.goatsPlaced >= 0 &&
        parsed.game.goatsPlaced <= 20 && Number.isInteger(parsed.game.goatsCaptured) &&
        parsed.game.goatsCaptured >= 0 && parsed.game.goatsCaptured <= 5) {
      game = parsed.game;
      timeline = Array.isArray(parsed.timeline) ? parsed.timeline.slice(-120) : [];
      log = Array.isArray(parsed.log) ? parsed.log.slice(-120) : [];
    }
  } catch (_) { /* storage may be disabled or corrupted */ }
}
function persist() {
  try { localStorage.setItem(STORAGE,JSON.stringify({ settings, game:settings.mode==='online'?initialGame():game, timeline:settings.mode==='online'?[]:timeline, log:settings.mode==='online'?[]:log })); } catch (_) {}
}
function coord(n) { return 10 + n * 20 + '%'; }
function nameOf(p) { const [r,c]=rowCol(p); return String.fromCharCode(65 + c) + (5-r); }
function diagram() {
  const elements = [];
  for (let n=0;n<5;n++) {
    const p=100+n*200;
    elements.push('<line x1="100" y1="'+p+'" x2="900" y2="'+p+'"/>');
    elements.push('<line x1="'+p+'" y1="100" x2="'+p+'" y2="900"/>');
  }
  for (let r=0;r<4;r++) for (let c=0;c<4;c++) {
    const x=100+c*200,y=100+r*200;
    if ((r+c)%2===0) elements.push('<line x1="'+x+'" y1="'+y+'" x2="'+(x+200)+'" y2="'+(y+200)+'"/>');
    else elements.push('<line x1="'+(x+200)+'" y1="'+y+'" x2="'+x+'" y2="'+(y+200)+'"/>');
  }
  const rings = [];
  for (let r=0;r<5;r++) for (let c=0;c<5;c++)
    rings.push('<circle cx="'+(100+c*200)+'" cy="'+(100+r*200)+'" r="12"/>');
  $('geometry').innerHTML = '<g class="board-lines">'+elements.join('')+'</g><g class="board-rings">'+rings.join('')+'</g>';
  for (let i=0;i<25;i++) {
    const [r,c]=rowCol(i);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='board-node';
    btn.style.left=coord(c);btn.style.top=coord(r);
    btn.dataset.cell=String(i);
    btn.addEventListener('click',()=>clickCell(i));
    $('nodes').appendChild(btn);
    cellNodes.push(btn);
  }
}
function canHumanPlay() { if(settings.mode==='online')return networkStatus==='online'&&networkRoom?.status==='active'&&networkRoom.mySide===game.turn&&!game.winner;return !thinking&&!game.winner&&(settings.mode==='local'||game.turn===settings.human); }
function handleMove(move){if(settings.mode==='online'){if(!network.send({type:'move',version:networkRoom?.version,from:move.from,to:move.to}))notify(t('connectionFailed'));selected=null;render();return;}doMove(move);}
function doMove(move,source='ui') {
  timeline.push(game);
  if (timeline.length>120) timeline.shift();
  try { game=applyMove(game,move); }
  catch (_) { timeline.pop(); return; }
  log.push({ ...move, side:game.lastMove.side, ply:game.ply });
  if (log.length>120) log.shift();
  selected=null;hint=null;
  beep(move.capture!==null ? 'capture':'move');
  if(bluetooth.connected){bluetooth.latestGame=game;if(source!=='ble')bluetooth.move(move).catch(()=>{});}
  persist();render();
  royalMoveEffect(move);
  if (game.winner) finish();
  else scheduleAi();
}
function clickCell(pos) {
  if (!canHumanPlay()) return;
  const options=legalMoves(game);
  const piece=game.board[pos];
  if (game.turn===GOAT && game.goatsPlaced<20) {
    const placement=options.find(m=>m.from===null && m.to===pos);
    if (placement) handleMove(placement);
    return;
  }
  if (selected!==null) {
    const move=options.find(m=>m.from===selected && m.to===pos);
    if (move) { handleMove(move);return; }
  }
  if (piece && piece.side===game.turn) {
    selected=selected===pos ? null : pos;
    hint=null;
    beep('select');
  } else { selected=null;hint=null; }
  render();
}
function renderPieces() {
  const onBoard=new Set();
  game.board.forEach((piece,index)=>{
    if (!piece) return;
    onBoard.add(piece.id);
    let node=pieceNodes.get(piece.id);
    if (!node) {
      node=document.createElement('div');
      node.className='piece piece-'+piece.side+' piece-enter';
      node.dataset.piece=piece.id;
      const picture=document.createElement('img');
      picture.src=art[piece.side];
      picture.alt='';
      picture.width=64;picture.height=64;picture.draggable=false;
      const icon=document.createElement('span');icon.className='piece-icon';icon.appendChild(picture);
      const sheen=document.createElement('span');sheen.className='piece-sheen';
      node.append(icon,sheen);
      $('pieces').appendChild(node);
      pieceNodes.set(piece.id,node);
      requestAnimationFrame(()=>node.classList.remove('piece-enter'));
    }
    const [r,c]=rowCol(index);
    node.style.left=coord(c);node.style.top=coord(r);
    node.classList.toggle('piece-selected',selected===index);
    node.classList.toggle('piece-hint',!!hint && hint.from===index);
    node.classList.remove('piece-leaving');
  });
  for (const [id,node] of pieceNodes) {
    if (onBoard.has(id)) continue;
    pieceNodes.delete(id);
    node.classList.add('piece-leaving');
    setTimeout(()=>node.remove(),340);
  }
}
function renderBoard() {
  const moves=canHumanPlay() ? legalMoves(game) : [];
  const dest=new Set(selected!==null ? moves.filter(m=>m.from===selected).map(m=>m.to) : []);
  for (let i=0;i<25;i++) {
    const node=cellNodes[i],piece=game.board[i], legal=dest.has(i);
    node.className='board-node';
    if (legal) node.classList.add('node-legal');
    if (selected===i) node.classList.add('node-selected');
    if (hint && (hint.to===i || hint.from===i)) node.classList.add(hint.to===i?'node-hint-to':'node-hint-from');
    if (game.lastMove?.to===i) node.classList.add('node-last');
    if (game.lastMove?.from===i) node.classList.add('node-last-from');
    node.disabled=!canHumanPlay();
    node.setAttribute('aria-pressed',String(selected===i));
    node.setAttribute('aria-label',nameOf(i)+', '+(piece?(piece.side===TIGER?t('tiger'):t('goat')): 'empty')+(legal?', legal move':''));
  }
  renderPieces();
}
function setText(id,value) { $(id).textContent=String(value); }
function setMedallion(id,side) {
  const root=$(id),src=art[side]||art.draw;
  let img=root.querySelector('img');
  if(!img){
    root.replaceChildren();
    img=document.createElement('img');img.alt='';img.width=64;img.height=64;
    root.appendChild(img);
  }
  if(img.getAttribute('src')!==src)img.src=src;
}
function royalMoveEffect(move) {
  if(!move || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const board=$('board');
  if(!board)return;
  const at=move.capture!==null&&move.capture!==undefined?move.capture:move.to;
  const [r,c]=rowCol(at);
  const effect=document.createElement('span');
  effect.className=move.capture!==null&&move.capture!==undefined?'royal-capture-fx':'royal-move-fx';
  effect.style.left=coord(c);effect.style.top=coord(r);
  effect.setAttribute('aria-hidden','true');
  board.appendChild(effect);
  effect.addEventListener('animationend',()=>effect.remove(),{once:true});
  setTimeout(()=>effect.remove(),1000);
}
function announceMove() {
  const announcer=$('moveAnnouncer');
  if(!announcer||game.ply===lastAnnouncedPly)return;
  lastAnnouncedPly=game.ply;
  if(!game.lastMove)return;
  const m=game.lastMove;
  announcer.textContent=t(m.capture!==null?'royalCapture':m.from===null?'royalPlacement':'royalMove')+': '+
    (m.from===null?'':nameOf(m.from)+' → ')+nameOf(m.to);
}
function renderHistory() {
  const list=$('moveHistory');
  list.replaceChildren();
  const recent=log.slice(-7).reverse();
  if (!recent.length) {
    const li=document.createElement('li');li.className='empty-history';li.textContent=t('noMoves');list.appendChild(li);return;
  }
  for (const entry of recent) {
    const li=document.createElement('li');li.className='history-entry';
    const num=document.createElement('span');num.className='history-num';num.textContent=String(entry.ply).padStart(2,'0');
    const action=document.createElement('span');action.className='history-action';
    const icon=document.createElement('span');icon.className='history-piece-icon';
    const image=document.createElement('img');
    image.src=art[entry.side];image.alt='';image.width=24;image.height=24;
    icon.appendChild(image);
    const text=document.createElement('span');
    text.textContent=entry.from===null ?
      t('place')+' '+nameOf(entry.to) :
      nameOf(entry.from)+' → '+nameOf(entry.to)+(entry.capture!==null?' · '+t('capture'):'');
    action.append(icon,text);li.append(num,action);list.appendChild(li);
  }
}
function translate() {
  document.documentElement.lang=settings.lang;
  document.querySelectorAll('[data-t]').forEach(el=>{ const key=el.dataset.t;el.textContent=t(key); });
  $('langSelect').value=settings.lang;
}
function render() {
  translate();
  document.querySelector('.setup-panel .setup-note').textContent=settings.mode==='online'?t('setupOnline'):t('setupNote');
  const phase = game.goatsPlaced<20 ? t('placement'):t('movement');
  const ai = settings.mode==='ai' && game.turn!==settings.human && !game.winner;
  setText('modeLabel',t(settings.mode==='ai'?'vsAi':settings.mode==='online'?'onlineMode':'local'));
  setText('phaseValue',phase);
  setText('turnTitle',game.turn===GOAT?t('goatTurn'):t('tigerTurn'));
  setMedallion('turnAvatar',game.turn);
  $('turnAvatar').className='player-medallion '+(game.turn===TIGER?'tiger-medallion':'');
  setText('turnDesc',game.winner?t('matchFinished'): settings.mode==='online' && networkRoom?.status!=='active'?t('onlineWait'):ai?t('waitAi'):
    game.turn===TIGER?t('moveTiger'):game.goatsPlaced<20?t('placeGoat'):t('moveGoat'));
  setText('statusBadge',game.winner?t('matchFinished'):settings.mode==='online' && networkRoom?.status!=='active'?t('onlineWaiting'):ai?t('aiThinking'):
    settings.mode==='ai'||(settings.mode==='online'&&canHumanPlay())?t('yourMove'):t('theirMove'));
  $('statusBadge').classList.toggle('thinking',ai);
  setText('placedCount',game.goatsPlaced);
  setText('capturedCount',game.goatsCaptured);
  setText('moveCount',String(game.ply).padStart(2,'0'));
  // The denominator remains styled separately from the changing count.
  $('placedCount').insertAdjacentHTML('beforeend','<span>/20</span>');
  $('capturedCount').insertAdjacentHTML('beforeend','<span>/5</span>');
  $('placementMeter').style.width=(game.goatsPlaced/20*100)+'%';
  $('captureMeter').style.width=(game.goatsCaptured/5*100)+'%';
  $('sideField').hidden=settings.mode==='local';
  $('difficultyField').hidden=settings.mode!=='ai';
  $('onlinePanel').hidden=settings.mode!=='online';
  $('leaderboardPanel').hidden=settings.mode!=='online';
  $('bluetoothPanel').hidden=settings.mode==='online';
  $('undoBtn').disabled=timeline.length===0 || thinking || settings.mode==='online';
  $('hintBtn').disabled=thinking || !!game.winner || settings.mode==='online';
  $('soundBtn').setAttribute('aria-pressed',String(settings.sound));
  setText('soundIcon',settings.sound?'♪':'♫');
  setText('soundLabel',settings.sound?t('soundOn'):t('soundOff'));
  setText('boardHelp',game.winner?t('matchFinished') : thinking?t('waitAi') :
    selected!==null?t('restartHint'):game.turn===GOAT&&game.goatsPlaced<20?t('placeGoat'):
    game.turn===GOAT?t('moveGoat'):t('moveTiger'));
  for(const btn of document.querySelectorAll('[data-play-mode]')){
    const active=btn.dataset.playMode===settings.mode;
    btn.setAttribute('aria-pressed',String(active));
    btn.classList.toggle('active',active);
  }
  renderBoard();renderHistory();renderNetworkPanel();announceMove();
}
function beep(kind) {
  if (!settings.sound) return;
  try {
    const Context=window.AudioContext||window.webkitAudioContext;
    if (!Context) return;
    const ctx=beep.context || (beep.context=new Context());
    if (ctx.state==='suspended') ctx.resume().catch(()=>{});
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=kind==='capture'?'triangle':'sine';
    osc.frequency.setValueAtTime(kind==='capture'?280:kind==='select'?580:430,ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind==='capture'?140:620,ctx.currentTime+.12);
    gain.gain.setValueAtTime(.001,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(.055,ctx.currentTime+.012);
    gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.17);
    osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.18);
  } catch (_) { /* sound must never interrupt play */ }
}
function notify(msg) {
  const toast=$('toast');toast.textContent=msg;toast.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function cancelAi() { if (aiTimer!==null) clearTimeout(aiTimer);aiTimer=null;thinking=false; }
function scheduleAi() {
  if (settings.mode!=='ai'||game.winner||game.turn===settings.human) return;
  cancelAi();thinking=true;render();
  aiTimer=setTimeout(()=>{
    aiTimer=null;
    if (settings.mode!=='ai'||game.winner||game.turn===settings.human) {thinking=false;render();return;}
    const move=chooseMove(game,settings.difficulty);
    thinking=false;
    if (move) doMove(move);
    else render();
  },420);
}
function newGame(message) {
  if(settings.mode==='online' && networkRoom){notify(t('noRoom')+' — '+t('leaveRoom'));return;}
  cancelAi();game=initialGame();timeline=[];log=[];selected=null;hint=null;
  $('winOverlay').hidden=true;
  if(bluetooth.connected)bluetooth.reset().then(()=>bluetooth.sync(game)).catch(()=>{});
  persist();render();scheduleAi();
  if (message) notify(t(message));
}
function undo() {
  if(settings.mode==='online')return;
  if (thinking) cancelAi();
  if (!timeline.length) {notify(t('undoEmpty'));render();return;}
  do {
    game=timeline.pop();log.pop();
  } while (settings.mode==='ai'&&game.turn!==settings.human&&timeline.length);
  selected=null;hint=null;$('winOverlay').hidden=true;
  persist();render();scheduleAi();notify(t('undoDone'));
}
function showHint() {
  if (settings.mode==='online'||!canHumanPlay()) return;
  hint=chooseMove(game,'hard');
  selected=hint?.from??null;
  render();
  notify(t(hint?'hintReady':'hintsUnavailable'));
}
function finish() {
  const win=game.winner;
  setMedallion('winGlyph',win===GOAT?GOAT:win===TIGER?TIGER:'draw');
  setText('winTitle',t(win===GOAT?'winnerGoat':win===TIGER?'winnerTiger':'draw'));
  setText('winDescription',t(win===GOAT?'winnerGoatDesc':win===TIGER?'winnerTigerDesc':'drawDesc'));
  $('winOverlay').hidden=false;
  const bits=$('confetti');bits.replaceChildren();
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i=0;i<36;i++) {
      const p=document.createElement('i');
      p.style.left=(Math.random()*100)+'%';
      p.style.animationDelay=(Math.random()*1.4)+'s';
      p.style.animationDuration=(2+Math.random()*2)+'s';
      p.style.background=i%3===0?'#b76a43':i%2?'#f7d28b':'#d2dfe6';
      bits.appendChild(p);
    }
  }
  beep('capture');
}

function onNetworkStatus(status,message='') {
  networkStatus=status;
  if(message && status==='error')notify(message);
  renderNetworkPanel();
}
function onNetworkEvent(msg) {
  if(settings.mode!=='online')return;
  if(msg.type==='welcome') {
    $('playerName').value=msg.profile.name;
    $('playerCountry').value=msg.profile.country;
    network.send({type:'leaderboard'});
    if(inviteCode && !networkRoom){
      network.send({type:'join',code:inviteCode.toUpperCase()});
      inviteCode=null;
    }
    renderNetworkPanel();
  } else if(msg.type==='snapshot') {
    const previous=networkRoom?.game?.ply ?? -1;
    const previouslyWon=!!networkRoom?.game?.winner;
    networkRoom=msg.room;
    networkQueued=false;
    game=msg.room.game;
    log=msg.room.log||[];
    timeline=[];selected=null;hint=null;
    if(game.ply!==previous && previous>=0){beep(game.lastMove?.capture!==null?'capture':'move');royalMoveEffect(game.lastMove);}
    render();
    if(game.winner&&!previouslyWon && settings.mode==='online')finish();
    if(!game.winner)$('winOverlay').hidden=true;
  } else if(msg.type==='queue') {
    networkQueued=!!msg.waiting;
    renderNetworkPanel();
  } else if(msg.type==='left') {
    networkRoom=null;networkQueued=false;game=initialGame();log=[];timeline=[];
    selected=null;hint=null;$('winOverlay').hidden=true;render();
  } else if(msg.type==='error') {
    notify('Online: '+String(msg.code||'unknown_error').replaceAll('_',' '));
    renderNetworkPanel();
  } else if(msg.type==='leaderboard') {
    networkPlayers=Array.isArray(msg.players)?msg.players:[];
    renderRankings();
  } else if(msg.type==='rating'){
    notify('Elo '+(msg.delta>0?'+':'')+msg.delta);
    network.send({type:'leaderboard'});
  } else if(msg.type==='profile'){
    renderNetworkPanel();
  }
}
function formatTime(ms){
  const seconds=Math.max(0,Math.ceil(ms/1000));
  return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
function renderRankings(){
  const list=$('leaderboardRows');
  list.replaceChildren();
  if(!networkPlayers.length){
    const p=document.createElement('p');p.className='setup-note';p.textContent=t('rankEmpty');list.appendChild(p);return;
  }
  for(let i=0;i<networkPlayers.length;i++) {
    const p=networkPlayers[i],row=document.createElement('div');row.className='rank-row';
    const position=document.createElement('strong');position.textContent=String(i+1).padStart(2,'0');
    const player=document.createElement('span');player.textContent=p.name+' · '+p.country;
    const score=document.createElement('b');score.textContent=String(p.rating);
    row.append(position,player,score);list.appendChild(row);
  }
}
function renderRoomPlayers(){
  const panel=$('roomPlayers');
  if(!networkRoom){panel.replaceChildren();return;}
  const room=networkRoom,clock=room.clock;
  panel.replaceChildren();
  for(const side of [GOAT,TIGER]){
    const p=room.players[side];
    const row=document.createElement('div');row.className='room-player';
    const label=document.createElement('span');
    label.textContent=(side===GOAT?'🐐 ':'🐯 ')+(p?p.name+' · '+p.country:t('waitingOpponent'))+(p&&!p.connected?' · offline':'');
    const timer=document.createElement('strong');timer.id='clock-'+side;
    timer.textContent=formatTime(clock.remaining[side]);
    row.append(label,timer);panel.appendChild(row);
  }
  const bottom=document.createElement('p');bottom.className='setup-note';
  bottom.textContent=(room.ranked?t('rankedMatch'):t('casualMatch'))+' · '+
    (room.mySide? t('yourSide')+': '+t(room.mySide):t('watching'))+' · '+
    new Intl.DateTimeFormat(settings.lang==='ne'?'ne-NP':undefined,
      {hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(room.createdAt));
  panel.appendChild(bottom);
}
function updateClockLabels(){
  if(!networkRoom||networkRoom.status!=='active')return;
  const clock=networkRoom.clock;
  const remaining={...clock.remaining};
  remaining[networkRoom.game.turn]=Math.max(0,
    remaining[networkRoom.game.turn]-(Date.now()-(clock.receivedAt||Date.now())));
  for(const side of [GOAT,TIGER]) {
    const el=$('clock-'+side);
    if(el)el.textContent=formatTime(remaining[side]);
  }
}
function renderNetworkPanel(){
  const panel=$('onlinePanel');
  if(!panel)return;
  const online=networkStatus==='online',room=networkRoom;
  setText('connectionStatus',networkStatus.toUpperCase());
  $('connectionStatus').classList.toggle('thinking',networkStatus==='connecting'||networkStatus==='reconnecting');
  const busy=!!room||networkQueued;
  for(const id of ['quickBtn','createRoomBtn','joinBtn','spectateBtn'])
    $(id).disabled=!online||busy;
  $('profileBtn').disabled=!online;
  $('roomInfo').hidden=!room;
  $('cancelQueueBtn').hidden=!networkQueued;
  $('resignBtn').hidden=!room||room.status!=='active'||!room.mySide;
  $('rematchBtn').hidden=!room||room.status!=='complete'||room.ranked||!room.mySide;
  $('leaveRoomBtn').hidden=!room;
  $('copyInviteBtn').hidden=!room;
  if(room){
    setText('roomCodeLabel',room.code);
    renderRoomPlayers();
    setText('networkHint',room.status==='waiting'?t('waitingOpponent'):
      room.status==='active'?(room.mySide&&game.turn===room.mySide?t('yourMove'):t('theirMove')):
      t('matchFinished'));
  }else {
    setText('networkHint',networkQueued?t('waitingOpponent'):
      networkStatus==='online'?t('onlineWait'):t('serverRequired'));
  }
  $('bluetoothConnectBtn').disabled=!bluetooth.supported||bluetooth.connected||settings.mode==='online';
  $('bluetoothDisconnectBtn').disabled=!bluetooth.connected;
}
function onBluetoothMove(incoming){
  if(settings.mode==='online'||!canHumanPlay())return;
  const move=legalMoves(game).find(m=>m.from===incoming.from&&m.to===incoming.to);
  if(!move)return;
  doMove(move,'ble');
}
function onBluetoothStatus(status){
  setText('bluetoothStatus',status.toUpperCase());
  if($('bluetoothConnectBtn'))renderNetworkPanel();
}
function wireOnline(){
  $('connectBtn').addEventListener('click',()=>{
    if(networkRoom?.status==='active'&&!window.confirm(settings.lang==='ne'?'अहिलेको खेल छोडेर नयाँ सर्भरमा जाने?':'Leaving the current match will count as resignation. Switch servers?'))return;
    if(networkRoom)network.send({type:'leave'});
    const address=$('serverAddress').value.trim();
    if(!address){notify(t('serverRequired'));return;}
    try{
      networkRoom=null;networkQueued=false;
      network.connect(address);
    }catch(e){notify(e.message||t('connectionFailed'));}
  });
  $('profileBtn').addEventListener('click',()=>{
    if(!network.send({type:'profile',name:$('playerName').value,country:$('playerCountry').value.toUpperCase()}))
      notify(t('connectionFailed'));
  });
  $('quickBtn').addEventListener('click',()=>network.send({type:'quick'}));
  $('createRoomBtn').addEventListener('click',()=>network.send({type:'create',side:$('sideSelect').value}));
  $('joinBtn').addEventListener('click',()=>network.send({type:'join',code:$('joinCode').value.toUpperCase().trim()}));
  $('spectateBtn').addEventListener('click',()=>network.send({type:'spectate',code:$('joinCode').value.toUpperCase().trim()}));
  $('cancelQueueBtn').addEventListener('click',()=>network.send({type:'cancelQueue'}));
  $('resignBtn').addEventListener('click',()=>{
    if(window.confirm(settings.lang==='ne'?'खेल हार स्वीकार गर्ने?':'Resign this match?'))network.send({type:'resign'});
  });
  $('leaveRoomBtn').addEventListener('click',()=>{
    if(networkRoom?.status==='active'&&
       !window.confirm(settings.lang==='ne'?'कोठा छोड्दा हार हुनेछ। जारी राख्ने?':'Leaving an active game forfeits the match. Continue?'))return;
    network.send({type:'leave'});
  });
  $('rematchBtn').addEventListener('click',()=>network.send({type:'rematch'}));
  $('refreshRanksBtn').addEventListener('click',()=>network.send({type:'leaderboard'}));
  $('copyInviteBtn').addEventListener('click',async()=>{
    if(!networkRoom)return;
    const url=new URL(location.href);
    url.searchParams.set('room',networkRoom.code);
    url.searchParams.set('server',network.url);
    try{await navigator.clipboard.writeText(url.href);notify(t('inviteCopied'));}
    catch{notify(url.href);}
  });
  $('bluetoothConnectBtn').addEventListener('click',async()=>{
    try{
      if(settings.mode==='online'){notify(t('bleUnavailable'));return;}
      await bluetooth.connect(game);notify(t('pairSuccess'));
    }catch(e){notify(e?.message||t('pairFailure'));}
    renderNetworkPanel();
  });
  $('bluetoothDisconnectBtn').addEventListener('click',()=>bluetooth.disconnect());
  window.setInterval(updateClockLabels,1000);
}

function wire() {
  document.querySelectorAll('[data-play-mode]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const mode=btn.dataset.playMode;
      if(!['ai','local','online'].includes(mode)||settings.mode===mode){
        $('game').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
        return;
      }
      $('modeSelect').value=mode;
      $('modeSelect').dispatchEvent(new Event('change',{bubbles:true}));
      $('game').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
    });
  });
  $('board').addEventListener('keydown',event=>{
    if(!/^Arrow(Up|Down|Left|Right)$/.test(event.key))return;
    const focus=event.target.closest('[data-cell]');
    if(!focus)return;
    const pos=Number(focus.dataset.cell);
    const [r,c]=rowCol(pos);
    const dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
    const [dr,dc]=dirs[event.key];
    const nr=Math.max(0,Math.min(4,r+dr)),nc=Math.max(0,Math.min(4,c+dc));
    event.preventDefault();cellNodes[nr*5+nc].focus();
  });
  $('rulesBtn').addEventListener('click',()=>$('rulesDialog').showModal());
  $('closeRulesBtn').addEventListener('click',()=>$('rulesDialog').close());
  $('rulesPlayBtn').addEventListener('click',()=>$('rulesDialog').close());
  $('rulesDialog').addEventListener('click',ev=>{if(ev.target===$('rulesDialog')) $('rulesDialog').close();});
  $('newBtn').addEventListener('click',()=>newGame('newStarted'));
  $('rematchBtn').addEventListener('click',()=>newGame('newStarted'));
  $('closeWinBtn').addEventListener('click',()=>$('winOverlay').hidden=true);
  $('undoBtn').addEventListener('click',undo);
  $('hintBtn').addEventListener('click',showHint);
  $('langSelect').addEventListener('change',ev=>{settings.lang=ev.target.value;persist();render();});
  $('soundBtn').addEventListener('click',()=>{settings.sound=!settings.sound;persist();render();if(settings.sound)beep('select');});
  $('modeSelect').addEventListener('change',ev=>{if(settings.mode==='online'){if(networkRoom)network.send({type:'leave'});network.stop();}networkRoom=null;networkQueued=false;settings.mode=ev.target.value;if(settings.mode==='online')bluetooth.disconnect();newGame('settingsChanged');});
  $('sideSelect').addEventListener('change',ev=>{settings.human=ev.target.value;newGame('settingsChanged');});
  $('difficultySelect').addEventListener('change',ev=>{settings.difficulty=ev.target.value;persist();render();});
  wireOnline();
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape'){selected=null;hint=null;render();}});
}
stored();
$('serverAddress').value=new URLSearchParams(location.search).get('server')||defaultServerUrl();
if(inviteCode && !/^[A-Za-z2-9]{6}$/.test(inviteCode))inviteCode=null;
if(inviteCode)$('joinCode').value=inviteCode.toUpperCase();
diagram();
$('modeSelect').value=settings.mode;
$('sideSelect').value=settings.human;
$('difficultySelect').value=settings.difficulty;
wire();render();
if(settings.mode!=='online'){if(game.winner)finish();else scheduleAi();}
if(settings.mode==='online' && defaultServerUrl() && !inviteCode){try{network.connect(defaultServerUrl());}catch{}}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
