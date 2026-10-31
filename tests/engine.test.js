import test from 'node:test';
import assert from 'node:assert/strict';
import { initialGame, legalMoves, applyMove, connected, neighbors, TIGER, GOAT } from '../src/engine.js';
import { chooseMove } from '../src/ai.js';
const g = (board, turn = TIGER, placed = 0, captured = 0) =>
  ({ ...initialGame(), board, turn, goatsPlaced: placed, goatsCaptured: captured });

test('initial positions, 21 goat placements and first move', () => {
  const game = initialGame();
  assert.equal(game.board.filter(Boolean).length, 4);
  assert.equal(game.turn, GOAT);
  assert.equal(legalMoves(game).length, 21);
  const next = applyMove(game, { from:null, to:12, capture:null });
  assert.equal(next.goatsPlaced,1);
  assert.equal(next.turn,TIGER);
});
test('diagonals only exist on even checker intersections', () => {
  assert.equal(connected(0,6),true);
  assert.equal(connected(1,7),false);
  assert.equal(connected(6,12),true);
  assert.equal(connected(0,2),false);
  assert.equal(neighbors(12).length,8);
  assert.equal(neighbors(7).length,4);
});
test('tiger captures immediately and only over one goat', () => {
  const board = Array(25).fill(null);
  board[0] = { side:TIGER, id:'t1' };
  board[6] = { side:GOAT, id:'g1' };
  const game = g(board,TIGER,1);
  assert.ok(legalMoves(game).some(m => m.from === 0 && m.to === 12 && m.capture === 6));
  const next = applyMove(game,{ from:0,to:12,capture:6 });
  assert.equal(next.goatsCaptured,1);
  assert.equal(next.board[6],null);
  assert.equal(next.board[12].side,TIGER);
});
test('a tiger cannot capture without a connected diagonal or empty landing', () => {
  const board = Array(25).fill(null);
  board[1]={side:TIGER,id:'t1'};
  board[7]={side:GOAT,id:'g1'};
  assert.equal(legalMoves(g(board)).some(m => m.from===1 && m.capture===7),false);
  assert.throws(()=>applyMove(g(board),{from:1,to:13,capture:7}),/Illegal/);
});
test('goats cannot move during placement', () => {
  const board = initialGame().board.slice();
  board[12] = {side:GOAT,id:'g1'};
  assert.equal(legalMoves(g(board,GOAT,1)).some(m=>m.from===12),false);
  assert.ok(legalMoves(g(board,GOAT,20)).some(m=>m.from===12));
});
test('five captured goats end the game for tigers', () => {
  const board = Array(25).fill(null);
  board[0]={side:TIGER,id:'t1'};
  board[1]={side:GOAT,id:'g5'};
  const next=applyMove(g(board,TIGER,5,4),{from:0,to:2,capture:1});
  assert.equal(next.winner,TIGER);
  assert.equal(next.reason,'captured');
});
test('immobilized tiger side loses', () => {
  const board = Array(25).fill(null);
  [0,4,20,24].forEach((p,i)=>board[p]={side:TIGER,id:'t'+i});
  // All exits from each corner are occupied, with the landing points beyond occupied as well.
  [1,2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,21,22,23].forEach((p,i)=>
    board[p]={side:GOAT,id:'g'+i});
  const state=g(board,GOAT,20);
  assert.equal(legalMoves(state,TIGER).length,0);
});
test('computer returns legal moves in every level', () => {
  const state=initialGame();
  for (const level of ['easy','medium','hard']) {
    const move=chooseMove(state,level);
    assert.ok(legalMoves(state).some(m=>m.to===move.to));
  }
});
