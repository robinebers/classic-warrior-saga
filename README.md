# Classic Warrior Saga (CWS)

Offline, single-player browser homage to the *feel* of WoW Classic (1.12) — one Orc Warrior, levels 1→60, original world.

**No networking. No multiplayer. Local only.**

## Quick start

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173

```bash
pnpm verify   # typecheck + lint + unit tests + production build
```

## Controls

| Key | Action |
|---|---|
| W/S | Forward / backpedal |
| A/D | Turn (or strafe while mouse-looking) |
| Q/E | Strafe |
| Mouse drag | Look / orbit |
| Scroll | Zoom (0 ≈ first person … 15 yd) |
| Space | Jump |
| Tab | Nearest enemy |
| T | Toggle auto-attack |
| `~` | Debug console (`/spawn boar 1`, `/addxp 400`, `/setlevel 10`, …) |

## Architecture

- `src/game-core/` — pure TypeScript simulation (20 Hz), no DOM/Three
- `src/app/` — React Three Fiber scene + classic HUD overlay + input/audio
- `public/game-data/` — JSON tables (XP, sounds, …)

Inspired by Wowser’s browser client patterns (asset cache, workers later, AnimationMixer) without auth/realms/servers.

## Sounds

Drop the 57 user sound files into `Sounds/` (gitignored). Paths are listed in `public/game-data/sounds.json`. Missing files warn; they never crash the game.

## Credits / licenses

See `public/models/ATTRIBUTION.txt`. Open packs: OpenGameArt orc (CC-BY-SA), Quaternius animals (CC0), Kenney UI (CC0), game-icons.net (CC BY 3.0). Classic-look exports stay in gitignored `Assets/External/`.

## Status

See `Docs/PROGRESS.md`.
