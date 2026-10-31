import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, applyMove, legalMoves } from '../src/engine.js';
import { compactBoard, BLE_SERVICE, BLE_WRITE, BLE_NOTIFY } from '../src/bluetooth.js';

test('BLE protocol uses stable UUIDs and a compact <=20 byte packet',()=>{
  const game=initialGame();
  const packet=compactBoard(game);
  assert.match(packet,/^S:g:0:0:[a-z0-9]+$/);
  assert.ok(new TextEncoder().encode(packet).length<=20);
  assert.ok(BLE_SERVICE.includes('-'));
  assert.notEqual(BLE_WRITE,BLE_NOTIFY);
});
test('BLE packet represents every board cell and placement count after a move',()=>{
  let game=initialGame();
  game=applyMove(game,{from:null,to:12,capture:null});
  const p=compactBoard(game);
  const parts=p.split(':');
  assert.equal(parts[1],'t');
  assert.equal(parseInt(parts[2],36),1);
  assert.equal(parseInt(parts[3],36),0);
  let boardValue=parseInt(parts[4],36);
  const cells=Array(25).fill(0);
  for(let i=24;i>=0;i--){cells[i]=boardValue%3;boardValue=Math.floor(boardValue/3);}
  assert.equal(cells[0],2);
  assert.equal(cells[4],2);
  assert.equal(cells[12],1);
  assert.equal(cells[20],2);
  assert.equal(cells[24],2);
  assert.equal(cells.filter(v=>v===1).length,1);
  assert.ok(legalMoves(game).length>0);
});
