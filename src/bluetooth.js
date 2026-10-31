// Optional external BLE Baghchal board/controller protocol (not phone-to-phone).
// Device must implement the custom service and subscribe/write characteristics.
export const BLE_SERVICE='b0a6c7a1-7f0b-4e3b-b416-14df3b0a0001';
export const BLE_WRITE='b0a6c7a1-7f0b-4e3b-b416-14df3b0a0002';
export const BLE_NOTIFY='b0a6c7a1-7f0b-4e3b-b416-14df3b0a0003';
const decoder=new TextDecoder(), encoder=new TextEncoder();

export function compactBoard(game) {
  // Exact 25-position ternary board as a compact base36 integer (<2^53).
  const value=game.board.reduce((n,p)=>n*3+(p?.side==='tiger'?2:p?.side==='goat'?1:0),0);
  const turn=game.turn==='goat'?'g':'t';
  return 'S:'+turn+':'+game.goatsPlaced.toString(36)+':'+game.goatsCaptured.toString(36)+':'+value.toString(36);
}
export class BluetoothBoard {
  constructor(onMove,onStatus) {
    this.onMove=onMove;this.onStatus=onStatus;this.device=null;
    this.write=null;this.notify=null;this.pending=Promise.resolve();
  }
  get supported(){return !!navigator.bluetooth && window.isSecureContext;}
  get connected(){return !!this.device?.gatt?.connected && !!this.write;}
  async connect(game) {
    if(!this.supported)throw Error('Web Bluetooth is unavailable in this browser. Use supported Chromium over HTTPS with a compatible Baghchal BLE controller.');
    const device=await navigator.bluetooth.requestDevice({
      filters:[{services:[BLE_SERVICE]}],optionalServices:[BLE_SERVICE]
    });
    const onDisconnect=()=>{this.write=null;this.notify=null;this.onStatus?.('disconnected');};
    device.addEventListener('gattserverdisconnected',onDisconnect);
    const server=await device.gatt.connect();
    const service=await server.getPrimaryService(BLE_SERVICE);
    const write=await service.getCharacteristic(BLE_WRITE);
    const notify=await service.getCharacteristic(BLE_NOTIFY);
    await notify.startNotifications();
    notify.addEventListener('characteristicvaluechanged',event=>{
      const raw=decoder.decode(event.target.value).trim();
      if(raw==='R'){if(game)this.sync(game).catch(()=>{});return;}
      const match=/^M:(-1|(?:[0-9]|1[0-9]|2[0-4])):(?:([0-9]|1[0-9]|2[0-4]))$/.exec(raw);
      if(match)this.onMove?.({from:Number(match[1])===-1?null:Number(match[1]),to:Number(match[2])});
    });
    this.device=device;this.write=write;this.notify=notify;
    this.onStatus?.('connected');
    if(game)await this.sync(game);
    return device.name||'Baghchal BLE Board';
  }
  async send(data) {
    if(!this.connected)return;
    const bytes=encoder.encode(data);
    if(bytes.length>20)throw Error('BLE packet exceeds 20 bytes');
    // Serialize writes; characteristic.writeValueWithResponse is supported in modern Chromium.
    this.pending=this.pending.catch(()=>{}).then(()=>this.write.writeValueWithResponse(bytes));
    return this.pending;
  }
  async sync(game){return this.send(compactBoard(game));}
  async move(move){return this.send('M:'+(move.from??-1)+':'+move.to);}
  async reset(){return this.send('N');}
  disconnect(){
    if(this.device?.gatt?.connected)this.device.gatt.disconnect();
    this.device=null;this.write=null;this.notify=null;
    this.onStatus?.('disconnected');
  }
}
