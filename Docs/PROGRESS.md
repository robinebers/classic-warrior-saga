# CWS Progress

## Assumptions / deviations

1. **A1 — XP total:** Sum of Appendix A rows is **4,084,700**, not the stated 3,379,400. Spot values match.
2. **A2 — Platform:** Browser (Vite/React/R3F) instead of macOS/Swift.
3. **A3 — Sounds:** User `Sounds/` not present; soft-fail until provided.
4. **A4 — Player model:** KayKit Barbarian (CC0) green tint primary; OGA classic_orc alternate.
5. **A5 — Weapon scaling:** Level weapon mins/maxes tuned for solo pace (`3+1.6L` / `6+2.4L`, 2.8s 2H after L4).
6. **A6 — SimBot gear:** Uses rested XP + quest-green armour/weapon analogues to meet L10 &lt; 90 combat-min.

## Captures (see also chat)

| File | What to look for |
|---|---|
| `Docs/Screenshots/M0/01_title.png` | Title / New Character |
| `Docs/Screenshots/M2/03_world_loaded.png` | Orc + boars + action bar filled |
| `Docs/Screenshots/M3/02_combat_live.png` | Target frame, rage, combat log |
| `Docs/Screenshots/M4/01_ding.png` | Level-up via `/addxp` |
| `Docs/Screenshots/M5/01_trainer.png` | Warlord Kargha trainer list |
| `Docs/Screenshots/M7/01_quest_log.png` | Quest log (L) Boar Tusk Harvest |
| `Docs/Screenshots/M8/01_talents.png` | Talent trees at L10 |
| `Docs/Recordings/R_cws_demo.mp4` | ~demo of title → world → panels |
| `Docs/Recordings/R_panels_combat.webm` | Full Playwright capture |

## Test summary

- Unit/sim: **38** passing (includes SimBot L4 + **L10**)
- `pnpm typecheck` + `pnpm build` green

## Milestone status

- M0–M5 core ✅ (trainer, abilities expanded)
- M6 stances partial (switchStance + quest unlocks)
- M7 quests + save/title ✅
- M8 talents panel ✅
- M9 SimBot L10 ✅; e2e smoke scaffolded; recordings started
- M10 docs in progress

## Next

Quest turn-in UI polish, more talent effects, zones/Gor'mash, Howler with user Sounds/, Playwright CI green, longer R1–R6 demos.

7. **A7 — Classic models blocked on this Linux agent:** wow.export is Windows-first; no public CDN pack of 1.12 character GLBs was reachable. Bootstrap KayKit/Quaternius remain until user drops wow.export GLBs into `Assets/External/wow/` and runs `Scripts/import_classic_models.sh`.
