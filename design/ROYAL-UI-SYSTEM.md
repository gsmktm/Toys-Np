# Royal Baghchal — UI/UX Design System v1.0

**Product:** KTM TOYS Baghchal — Nepal heritage edition.
**Implementation:** index.html, styles.css, royal.css, src/main.js and original SVG assets.

## Design direction
An original royal-Nepali atmosphere: midnight navy, antique gold, hand-crafted wood board, ॐ, Chandra–Surya, mountain silhouettes and Shreepech-inspired *decorative* heraldry. The artwork does not claim to be an official state insignia. No cross/church iconography.

## Color tokens
| Role | Hex |
|---|---|
| Main background | #070d18 |
| Deep ink | #0a1424 |
| Royal panel | #111f32 |
| Antique gold | #d8ab62 |
| Bright gold | #f7dda2 |
| Ivory | #fff1d5 |
| Crimson | #ac3b44 |
| Wood | #b8874c |
| Legal move | #63d5ad |

## Original artwork
- icons/royal-crest.svg — ॐ, crown silhouette, Chandra–Surya and jewel motifs
- icons/himalaya-royal.svg — editable layered Himalayan SVG
- icons/tiger-piece.svg — tiger playing pieces
- icons/goat-piece.svg — Himalayan goat playing pieces
- icons/favicon.svg — matching royal crest app mark
- images/royal-baghchal-banner.svg — original 1200 × 630 game banner

## Interaction architecture
The three hero shortcuts use the existing game mode select: Solo Court (AI), Royal Duel (local), World Arena (online). The original engine remains server-authoritative online. Pieces animate on the actual 5x5 board, not a decorative fake board. Selection and hints are tied to legal moves. Capture rings, history icons, player medallions and victory symbols reuse consistent custom assets.

## Accessibility and responsive experience
Each game intersection is keyboard reachable and labelled; arrow keys move between cells, Enter/Space use native buttons. A polite screen-reader region announces each move. Focus rings remain visible on dark wood. The board stays square across desktop, tablet and mobile. At widths below 530px the actions become compact and the sidebar stacks. Reduced-motion preferences disable ornament animation and capture-ring effects.

## Integration constraints
The presentation layer is separate in royal.css to avoid modifying Baghchal rules, online matchmaking, server protocols, rankings or Bluetooth. Web Bluetooth still requires compatible BLE hardware. Fonts use system fallbacks offline, with optional remote Noto Sans Devanagari and Cinzel.

## Quality checks
Run npm install and npm test. HTTP smoke tests check royal.css, original assets, duplicate IDs and new controls. Browser visual QA should cover 360px, 390px, 768px and 1366px, as well as actual phone touch and the online multiplayer flow.
