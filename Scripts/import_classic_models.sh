#!/usr/bin/env bash
# Import Classic-faithful models exported via wow.export (or similar) into public/models/classic/
# Usage:
#   1. On a Windows/Mac machine: run wow.export → Blizzard CDN or local Classic install
#   2. Export GLB+anims for: orc male, mottled boar, scorpid, wolf, etc.
#   3. Copy exports into Assets/External/wow/ (gitignored)
#   4. Run: bash Scripts/import_classic_models.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/Assets/External/wow"
DST="$ROOT/public/models/classic"
mkdir -p "$DST"

if [[ ! -d "$SRC" ]] || [[ -z "$(ls -A "$SRC" 2>/dev/null || true)" ]]; then
  cat <<'EOF'
No Classic exports found in Assets/External/wow/

To get faithful replicas (required for the fidelity bar):

  Option A — wow.export (recommended)
    1. Download https://www.kruithne.net/wow.export/
    2. Open with "Use Blizzard CDN" (or local Classic install)
    3. Export as GLB with animations:
         Characters → Orc Male
         Creatures → Boar / Mottled Boar, Scorpid, Wolf, …
    4. Drop the folder into Assets/External/wow/
    5. Re-run this script

  Option B — Classic 1.12 MPQ Data/
    Point a vanilla extractor (e.g. MangosSuperUI_Extractor) at your
    Data/ folder, convert M2→GLB, drop into Assets/External/wow/

Bootstrap KayKit/Quaternius models stay in public/models/ until these land.
EOF
  exit 1
fi

echo "Importing from $SRC → $DST"
# Copy common patterns
find "$SRC" -type f \( -iname '*.glb' -o -iname '*.gltf' -o -iname '*.bin' -o -iname '*.png' -o -iname '*.jpg' \) \
  -print0 | while IFS= read -r -d '' f; do
  rel="${f#$SRC/}"
  mkdir -p "$DST/$(dirname "$rel")"
  cp -n "$f" "$DST/$rel" || cp "$f" "$DST/$rel"
  echo "  + $rel"
done

# Write runtime manifest the app can prefer
cat > "$DST/manifest.json" <<EOF
{
  "player": "orc_male.glb",
  "boar": "boar.glb",
  "updated": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "note": "Prefer these over public/models/orc|boar bootstrap packs"
}
EOF

echo "Done. Restart pnpm dev — GameApp will prefer classic/ when manifest exists."
