// Server-authoritative WebSocket transport for multiplayer games.
// The player token is a secret bearer credential: never place it in an invite URL.
const TOKEN_KEY='ktm-baghchal-online-token';
const SERVER_KEY='ktm-baghchal-server-url';
export function defaultServerUrl(){
  try{
    const saved=localStorage.getItem(SERVER_KEY);
    if(saved)return saved;
  }catch{}
  if(location.hostname.endsWith('.github.io'))return '';
  return (location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
}
export function validateServerUrl(url) {
  try{
    const u=new URL(url);
    if(u.username||u.password||u.search||u.hash)throw Error();
    const isLocal=['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    if(u.protocol!=='wss:' && !(u.protocol==='ws:' && isLocal))throw Error();
    if(u.pathname!=='/ws')throw Error();
    return u.href;
  }catch{throw Error('Use a secure server address: wss://example.com/ws (ws://localhost allowed for testing).');}
}
export class OnlineClient {
  constructor(onEvent,onState){
    this.onEvent=onEvent;this.onState=onState;this.socket=null;
    this.url='';this.stopped=true;this.retries=0;this.timer=null;
    this.status='offline';this.profile=null;this.token=null;
    // Tokens are scoped to each server; never send a credential to an invite's unrelated host.
    this.token=null;
  }
  setStatus(status,message=''){this.status=status;this.onState?.(status,message);}
  connect(rawUrl){
    const url=validateServerUrl(rawUrl);
    this.stop(false);
    this.url=url;this.stopped=false;
    try{this.token=localStorage.getItem(TOKEN_KEY+':'+encodeURIComponent(url));}catch{this.token=null;}
    try{localStorage.setItem(SERVER_KEY,url);}catch{}
    this.open();return url;
  }
  open(){
    if(this.stopped)return;
    this.setStatus('connecting');
    let socket;
    try{socket=new WebSocket(this.url);}catch(e){this.retry();return;}
    this.socket=socket;
    socket.onopen=()=>{
      this.retries=0;
      this.setStatus('online');
      this.send({type:'hello',token:this.token});
    };
    socket.onmessage=event=>{
      let msg;try{msg=JSON.parse(event.data);}catch{return;}
      if(msg.type==='welcome'){
        this.token=msg.token;this.profile=msg.profile;
        try{localStorage.setItem(TOKEN_KEY+':'+encodeURIComponent(this.url),this.token);}catch{}
      }
      if(msg.type==='profile')this.profile=msg.profile;
      this.onEvent?.(msg);
    };
    socket.onclose=()=>{
      if(this.socket!==socket)return;
      this.socket=null;
      if(!this.stopped)this.retry();
    };
    socket.onerror=()=>{this.setStatus('error','Connection interrupted');};
  }
  retry(){
    if(this.stopped)return;
    this.setStatus('reconnecting');
    const wait=Math.min(15000,700*2**Math.min(this.retries++,5));
    clearTimeout(this.timer);
    this.timer=setTimeout(()=>this.open(),wait);
  }
  send(data){
    if(this.socket?.readyState!==WebSocket.OPEN)return false;
    this.socket.send(JSON.stringify(data));return true;
  }
  stop(notify=true){
    this.stopped=true;clearTimeout(this.timer);
    const old=this.socket;this.socket=null;
    if(old){old.onclose=null;old.close();}
    if(notify)this.setStatus('offline');
  }
}
