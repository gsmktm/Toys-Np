// Baghchal: deterministic, dependency-free game rules.
// Points are numbered row-major, from 0 (top-left) to 24 (bottom-right).
export const GOAT = 'goat';
export const TIGER = 'tiger';
export const CAPTURE_TARGET = 5;
export const GOAT_TOTAL = 20;
export const CORNERS = [0, 4, 20, 24];
export const point = (row, col) => row * 5 + col;
export const rowCol = (p) => [Math.floor(p / 5), p % 5];
export const opponent = (side) => side === GOAT ? TIGER : GOAT;
const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
const valid = (r,c) => r >= 0 && r < 5 && c >= 0 && c < 5;
const idAt = (board, p) => board[p]?.side || null;

export function connected(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 24 || b > 24) return false;
  const [ar, ac] = rowCol(a), [br, bc] = rowCol(b);
  const dr = Math.abs(ar - br), dc = Math.abs(ac - bc);
  return dr + dc === 1 || (dr === 1 && dc === 1 && (ar + ac) % 2 === 0);
}
export function neighbors(p) {
  const [r,c] = rowCol(p);
  return directions.map(([dr,dc]) => [r+dr,c+dc])
    .filter(([nr,nc]) => valid(nr,nc) && connected(p, point(nr,nc)))
    .map(([nr,nc]) => point(nr,nc));
}
export function initialGame() {
  const board = Array(25).fill(null);
  CORNERS.forEach((p, i) => { board[p] = { side: TIGER, id: 't' + (i + 1) }; });
  return { board, turn: GOAT, goatsPlaced: 0, goatsCaptured: 0,
    winner: null, reason: null, ply: 0, lastMove: null, counts: {} };
}
export function positionKey(game) {
  return game.turn + '|' + game.goatsPlaced + '|' + game.goatsCaptured + '|' +
    game.board.map(p => p ? (p.side === TIGER ? 'T' : 'G') : '.').join('');
}
export function legalMoves(game, side = game.turn) {
  if (game.winner || ![GOAT, TIGER].includes(side)) return [];
  const board = game.board;
  const result = [];
  if (side === GOAT && game.goatsPlaced < GOAT_TOTAL) {
    board.forEach((p, to) => { if (!p) result.push({ from: null, to, capture: null }); });
    return result;
  }
  for (let from = 0; from < 25; from++) {
    if (idAt(board, from) !== side) continue;
    for (const to of neighbors(from)) {
      if (!board[to]) result.push({ from, to, capture: null });
    }
    if (side !== TIGER) continue;
    const [r,c] = rowCol(from);
    for (const [dr,dc] of directions) {
      const mr = r+dr, mc = c+dc, tr = r+dr*2, tc = c+dc*2;
      if (!valid(mr,mc) || !valid(tr,tc)) continue;
      const mid = point(mr,mc), to = point(tr,tc);
      if (connected(from,mid) && connected(mid,to) &&
          idAt(board,mid) === GOAT && !board[to]) {
        result.push({ from, to, capture: mid });
      }
    }
  }
  return result;
}
export function applyMove(game, proposed) {
  if (game.winner) throw new Error('Game has ended.');
  const move = legalMoves(game).find(m =>
    m.from === proposed.from && m.to === proposed.to &&
    (m.capture ?? null) === (proposed.capture ?? null));
  if (!move) throw new Error('Illegal move.');
  const board = game.board.slice();
  let goatsPlaced = game.goatsPlaced, goatsCaptured = game.goatsCaptured;
  if (move.from === null) {
    goatsPlaced++;
    board[move.to] = { side: GOAT, id: 'g' + goatsPlaced };
  } else {
    board[move.to] = board[move.from];
    board[move.from] = null;
    if (move.capture !== null) {
      board[move.capture] = null;
      goatsCaptured++;
    }
  }
  const next = { ...game, board, goatsPlaced, goatsCaptured,
    turn: opponent(game.turn), ply: game.ply + 1,
    winner: null, reason: null,
    lastMove: { ...move, side: game.turn }, counts: { ...game.counts } };
  if (goatsCaptured >= CAPTURE_TARGET) {
    next.winner = TIGER;
    next.reason = 'captured';
  } else if (!legalMoves(next).length) {
    next.winner = game.turn;
    next.reason = game.turn === GOAT ? 'tigersBlocked' : 'goatsBlocked';
  } else if (goatsPlaced === GOAT_TOTAL) {
    const key = positionKey(next);
    next.counts[key] = (next.counts[key] || 0) + 1;
    if (next.counts[key] >= 3) {
      next.winner = 'draw';
      next.reason = 'repetition';
    }
  }
  return next;
}
