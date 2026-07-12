# CWS Progress

## Assumptions / deviations

1. **A1 — XP total:** Sum of Appendix A rows is **4,084,700**, not the stated 3,379,400. Spot values match. Using table sum.
2. **A2 — Platform:** Browser (Vite/React/R3F) instead of macOS/Swift per user direction.
3. **A3 — Sounds:** User `Sounds/` not present; soft-fail until provided.
4. **A4 — Player model:** Using KayKit Barbarian (CC0) with green tint as primary player for clean anims; OGA classic_orc.glb kept as alternate. Classic wow.export models still the fidelity goal (Assets/External).

## M0 — Preflight & skeleton ✅

- Vite + React 19 + TS + R3F + drei + Zustand
- game-core formulas, World, SplitMix64, debug console
- Classic HUD shell, verify.sh, gitignore
- Tests: 25 passed; build OK
- Screenshot: `Docs/Screenshots/M0/00_empty_window.png`

## M1 — Movement ✅ (in progress polish)

- Heightmap dunes, gravity 19.29, run 7 / backpedal 4.5, WASD/QE/mouselook/jump
- Screenshot: `Docs/Screenshots/M1/01_first_steps.png`

## M2 — Characters & animation ✅ (bootstrap)

- KayKit barbarian (green) idle/run/attack; Quaternius pig Idle/Walk/Run/Death
- OGA orc GLB exported; boars wander
- Screenshot: `Docs/Screenshots/M2/01_orc_and_boars.png`

## M3 — Combat core ✅ (partial)

- Full white-hit attack table + statistical tests (200k rolls Δ0/Δ+3)
- Rage from dealing/taking, aggro/leash/evade, combat log, Tab/T
- Screenshot: `Docs/Screenshots/M3/01_combat.png`

## M4 — XP & leveling ✅ (core)

- Kill XP + rested split + ding chat + auto-learn
- Rested blue XP bubbles in HUD

## M5 — Abilities ✅ (core set)

- Charge, Rend, HS (queued), TC, Battle Shout, Bloodrage, Execute, Overpower, Hamstring
- Action bar keybinds 1–0,-,=
- Tests for stance gate / Charge / HS queue

## M7 — Save ✅ (scaffold)

- localStorage quicksave serialize + 20× roundtrip property test
- Title screen Continue / New Character

## M9 — SimBot ✅ (partial)

- Headless SimBot reaches **L4** with zero invariant violations

## Next

- Trainer NPC UI, remaining Appendix C, talents D, 14 quests, zones, audio, SimBot→60, Playwright e2e

