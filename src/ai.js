import { applyMove, legalMoves, TIGER, GOAT, rowCol } from './engine.js';

// Evaluation is from the tigers' point of view. All levels obey the same rules.
export function evaluate(game) {
  if (game.winner === TIGER) return 100000;
  if (game.winner === GOAT) return -100000;
  if (game.winner === 'draw') return 0;
  const tigerMoves = legalMoves(game, TIGER);
  const captureThreats = tigerMoves.filter(m => m.capture !== null).length;
  const tigers = game.board.flatMap((piece, i) => piece?.side === TIGER ? [i] : []);
  const stranded = tigers.filter(i => !tigerMoves.some(m => m.from === i)).length;
  const central = tigers.reduce((sum, p) => {
    const [r,c] = rowCol(p);
    return sum + (2 - Math.abs(2-r)) + (2 - Math.abs(2-c));
  }, 0);
  return game.goatsCaptured * 190 + tigerMoves.length * 3.5 +
    captureThreats * 26 + central * 3 - stranded * 55 - game.goatsPlaced * 3;
}
function rankMoves(game, moves, side, cap) {
  const ranked = moves.map(move => {
    const next = applyMove(game, move);
    return { move, score: evaluate(next) };
  });
  ranked.sort((a,b) => side === TIGER ? b.score-a.score : a.score-b.score);
  return cap ? ranked.slice(0, cap) : ranked;
}
function search(game, depth, alpha, beta, limit) {
  if (!depth || game.winner) return evaluate(game);
  const side = game.turn;
  const moves = legalMoves(game);
  if (!moves.length) return side === TIGER ? -100000 : 100000;
  const ranked = rankMoves(game, moves, side, limit);
  if (side === TIGER) {
    let value = -Infinity;
    for (const { move } of ranked) {
      value = Math.max(value, search(applyMove(game,move), depth-1, alpha,beta, limit));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }
  let value = Infinity;
  for (const { move } of ranked) {
    value = Math.min(value, search(applyMove(game,move), depth-1, alpha,beta, limit));
    beta = Math.min(beta,value);
    if (alpha >= beta) break;
  }
  return value;
}
export function chooseMove(game, difficulty = 'medium') {
  const moves = legalMoves(game);
  if (!moves.length) return null;
  if (difficulty === 'easy') {
    const captures = moves.filter(m => m.capture !== null);
    const pool = captures.length && Math.random() < .65 ? captures : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  const depth = difficulty === 'hard' ? 3 : 2;
  const beam = difficulty === 'hard' ? 10 : 8;
  const side = game.turn;
  let best = null, value = side === TIGER ? -Infinity : Infinity;
  const ordered = rankMoves(game,moves,side,0);
  for (const { move } of ordered) {
    const score = search(applyMove(game,move),depth-1,-Infinity,Infinity,beam);
    const better = side === TIGER ? score > value : score < value;
    if (better || best === null) { value = score; best = move; }
  }
  return best;
}
