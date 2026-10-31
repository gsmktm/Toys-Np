# KTM TOYS Nepal — बाघचाल (Baghchal)

A complete, responsive **Tigers & Goats** strategy game from Nepal, with an authoritative online server and optional BLE-compatible physical board integration. The original repository contained only a short README; this game is the first playable application.

**Play online and locally (Node.js 20+):**
```sh
npm install
npm start
```
Then visit http://localhost:3000 . No paid account or API key is required. The server provides online matches; local AI/offline modes remain available.

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
- Worldwide WebSocket multiplayer with quick ranked matchmaking, six-character private rooms, spectator seats, resumable anonymous sessions, 10-minute + 2-second game clocks, server-verified moves, guest Elo rankings, and local-language country labels.
- International UI language selector: Nepali, English, Spanish, French, German, Chinese and Japanese. Some untranslated labels fall back to English.
- Optional Web Bluetooth GATT integration with an external compatible Baghchal BLE board/controller; this is **not** direct phone-to-phone Bluetooth.

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


## Online multiplayer — deployment

Run with Node.js 20+ on a long-running **WebSocket-capable host**:


```bash
npm install
PORT=3000 DATA_FILE=./data/players.json npm start
```


Open `http://localhost:3000`. The game and multiplayer endpoint share the same origin at `/ws`. Health check: `/api/health`. Leaderboard: `/api/leaderboard`. Browser connections automatically use `ws://localhost:3000/ws` locally and `wss://your-domain/ws` over HTTPS.

For hosting static game files on GitHub Pages, **deploy the server separately** behind TLS and enter its public `wss://your-backend.example/ws` address in the World Arena panel. Set `ALLOWED_ORIGINS=https://gsmktm.github.io,https://your-custom-domain.example` on the server (comma separated). Do not expose insecure ws:// except localhost for development. GitHub Pages cannot host this persistent WebSocket server.

The server checks moves, versions, player turns, captures, and clocks. Quick Match pairs players globally; private rooms create shareable codes and invite URLs. Room/game state is process memory (reconnection works while the server instance stays alive). Guest ratings are persisted in `DATA_FILE` using token hashes, not raw secret bearer tokens. Set a **persistent disk** for the data directory in production. Guest rankings are **not authenticated** and can be reset by clearing identity; they are not tamper-resistant competitive accounts.

This is a **single-instance release**. Scaling to multiple nodes requires a shared datastore, matchmaking coordinator, distributed room state, distributed timers, hardened registration, moderation, observability, disaster recovery, and regional latency routing. There is no claim of production-grade global scaling or live deployment.

### Security and operations

- WebSocket upgrade origin checking with optional `ALLOWED_ORIGINS`.
- Rate limits and maximum message sizes, per-socket heartbeat, no arbitrary file serving.
- Private rooms use random six-character invite codes; share these only with intended players. Spectators require that code.
- Players and spectators never receive another player's authentication token.
- Session tokens are scoped by backend origin in the browser.
- Guest accounts are not proof of identity. For tournaments, add verified account login and anti-collusion rules.
- Restarting the backend discards ongoing matches. Ratings persist if `DATA_FILE` survives.
- For reverse proxies, enable HTTP/1.1 WebSocket upgrade; TLS must terminate at the proxy. Do not attempt to run this as a serverless function.

## Bluetooth companion device

This project supports **Web Bluetooth GATT** to talk to an external BLE board/controller, not a second ordinary browser or phone. Compatible peripheral firmware is required and **not included**. Chromium on compatible desktops/Android can use the Pair Device button over HTTPS after a user gesture. Safari/iOS and Firefox do not natively expose the required Web Bluetooth API. Without the physical accessory, the local and online gameplay still works.

Custom GATT UUIDs:

- Service: `b0a6c7a1-7f0b-4e3b-b416-14df3b0a0001`
- Central → board **write** characteristic: `b0a6c7a1-7f0b-4e3b-b416-14df3b0a0002`
- Board → central **notify** characteristic: `b0a6c7a1-7f0b-4e3b-b416-14df3b0a0003`

UTF-8 payloads, 20 bytes maximum per packet, no newline:

- `M:from:to`, e.g. `M:-1:12` places a goat at center; `M:0:5` moves piece 0 to 5. Same message is emitted by the webpage after a local move and can be sent by the board to request a local legal move. Server online games do **not** accept Bluetooth controller commands.
- `S:g:<placed-base36>:<captured-base36>:<board-base36>` syncs the board. The board number encodes 25 row-major cells as a base-three number, with empty=0, goat=1, tiger=2. `g`/ `t` denotes turn. The compact message fits 20 bytes.
- `R` sent as notification requests a complete state sync; `N` sent by the app resets the board when a new local match starts.

Only valid rules-engine moves are applied. This feature is a hardware integration interface; physical BLE hardware testing and firmware integration are still required. Direct offline phone-to-phone Bluetooth would require a separate **native iOS/Android peer transport** with BLE peripheral/advertiser functionality, rather than standard Web Bluetooth.

## Code additions

- `server/index.js` — static server, WebSocket upgrade, origin policy, rate limiting, health.
- `server/hub.js` — rooms, matchmaking, server clocks, authoritative turns, game results, Elo.
- `server/store.js` — persistent anonymous guest ratings.
- `src/online-client.js` — reconnecting WebSocket client, secure per-server guest credentials.
- `src/bluetooth.js` — BLE GATT board/controller connection and compact board protocol.
- `src/intl-extra.js` — additional international language packs.
- `tests/online.test.js` — server protocol tests.
