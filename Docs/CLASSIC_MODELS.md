# Classic-faithful models (Path B)

Current in-game meshes are **bootstrap stand-ins** (KayKit Barbarian + Quaternius pig).
They are intentionally temporary so combat/UI could ship first.

## Required for the fidelity bar

Drop wow.export (or MPQ→GLB) outputs here:

```
Assets/External/wow/
  orc_male.glb          # Orc male + idle/walk/run/attack/death
  boar.glb              # Mottled / bristlebac k style boar
  scorpid.glb
  wolf.glb
  …
```

Then:

```bash
bash Scripts/import_classic_models.sh
```

That copies into `public/models/classic/` and writes `manifest.json`.
The app prefers those paths when present.

## How to export (your machine)

1. Install [wow.export](https://www.kruithne.net/wow.export/)
2. **Use Blizzard CDN** (or local Classic client)
3. Export **GLB with animations** for player orc + creatures
4. Copy into this folder (gitignored — never commit Blizzard assets)

Without these files, the prototype cannot meet the “real Classic replica” visual bar.
Mechanics continue regardless.
