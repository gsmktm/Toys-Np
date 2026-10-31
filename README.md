# KTM TOYS Nepal — बाघचाल (Baghchal)

A complete, responsive **Tigers & Goats** strategy game from Nepal, developed as a dependency-free web application for KTM TOYS. The original repository contained only a short README; this game is the first playable application.

**Play locally:** Open the project with any HTTP static server, e.g.:
```sh
python3 -m http.server 8080
```
Then visit http://localhost:8080 . No build, login, database, tracking, or API key is needed.

**Tests:** `npm test` (Node.js 20+). The rules engine and computer player use native ECMAScript modules.

## Game features

- Beautiful **Nepali / English** interface with premium navy, bronze and antique-gold game board.
- Click/tap board; highlighted legal moves; pieces smoothly animate as they move, capture, and appear.
- Play **vs. computer** (Easy, Medium, Hard) as either goats or tigers, or **two players on one device**.
- Authentic **5×5 Baghchal** geometry, goats place first, then move after all 20 are placed; four tigers start at the corners.
- Tigers can move or jump a goat along connected lines, one capture per turn. Five captures win; immobilising all tigers wins for the goats. Threefold repetition is scored a draw.
- AI move hints, undo, new match, recent-move history, optional synthesized sound, victory celebration, automatic local save and resume.
- Keyboard-accessible board buttons, reduced-motion support, responsive phones/tablets/desktops.
- Installable PWA with a service worker for offline play.

## Board rules

The game has 25 junctions, on a 5×5 grid. Diagonal edges connect adjacent points only at alternating intersections. Captures require *both* adjacent segments of a straight connected path. They can happen during goat placement. Captures are optional and cannot be chained.

Baghchal has regional variations in capture targets and repetition outcomes. This build chooses the commonly documented **five goats** and **threefold draw** rules. See [GamesCrafters at UC Berkeley](https://gamescrafters.berkeley.edu/games/puzzles/software.php?game=baghchal) and [Baghchaal rules](https://www.baghchaal.com/rules/).

## Deploy with GitHub Pages

In GitHub repository settings, go to **Pages → Build and deployment → Deploy from a branch**, select the default branch and **/(root)**, and save. The site can then be served from `https://gsmktm.github.io/Toys-Np/` once GitHub Pages has finished publishing. This is a suggested URL, not a claim that hosting is enabled.

The site uses relative paths, so it also works from a custom domain or subpath. For a domain, point hosting at this static repository.

## Code map

- `src/engine.js` — pure rules, legal moves, captures, terminal conditions, repetition.
- `src/ai.js` — minimax computer opponent with alpha-beta pruning and heuristic evaluation.
- `src/main.js` — animations, interface state, history, accessibility, translations, offline save.
- `styles.css` — responsive visual design.
- `tests/engine.test.js` — rules + AI tests.
- `sw.js` / `manifest.webmanifest` — offline support and installability.

Made for **KTM TOYS · Nepal**. This is a local, privacy-preserving game; online matchmaking and accounts are not part of this version.
