#!/usr/bin/env bash
# One-time / optional downloads into Assets/External (gitignored).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/Assets/External"
mkdir -p "$EXT" "$ROOT/public/models/orc" "$ROOT/public/models/boar" "$ROOT/public/models"

echo "CWS asset fetch — open packs land in Assets/External (gitignored)."
echo "If network fails, drop zips manually into Assets/External and re-run."

download() {
  local url="$1" out="$2"
  if [[ -f "$out" ]]; then
    echo "  skip (exists): $out"
    return 0
  fi
  echo "  get: $url"
  curl -fL --retry 3 --retry-delay 2 -o "$out" "$url" || {
    echo "  WARN: failed $url"
    return 1
  }
}

# Quaternius farm animals (includes pig) — CC0 via OGA mirror when possible
# Direct OGA download endpoints are flaky; we try poly.pizza / known mirrors and document failures.
set +e
download "https://opengameart.org/sites/default/files/Farm%20Animals%20by%20%40Quaternius.zip" \
  "$EXT/quaternius_farm_animals.zip"
download "https://opengameart.org/sites/default/files/orc.zip" \
  "$EXT/oga_orc_3d.zip"
set -e

# Kenney Fantasy UI Borders
set +e
download "https://kenney.nl/media/pages/assets/fantasy-ui-borders/0e0d7c0c0c-1677580148/kenney_fantasy-ui-borders.zip" \
  "$EXT/kenney_fantasy_ui_borders.zip"
set -e

cat > "$ROOT/public/models/ATTRIBUTION.txt" <<'EOF'
CWS model attribution (runtime copies under public/models/)

Orc (bootstrap)
  Source: OpenGameArt — “Orc (3D)” by Guillaume "GuieA_7" Englert
  License: CC-BY-SA
  https://opengameart.org/content/orc-3d
  Path: public/models/orc/classic_orc.glb (exported from .blend)

Boar / pig (bootstrap)
  Source: Quaternius — LowPoly Animated Farm Animal Pack (pig)
  License: CC0
  https://opengameart.org/content/lowpoly-animated-farm-animal-pack
  Path: public/models/boar/pig.glb

Classic-look exports (gitignored Sources)
  Assets/External/wow/ — wow.export / Hive Workshop conversions (local only, never commit)

UI / icons / textures
  Kenney Fantasy UI Borders — CC0
  game-icons.net — CC BY 3.0 (credit authors in README)
  ambientCG / Poly Haven — CC0
EOF

echo "Done. Convert .blend/.fbx → .glb with Blender when archives present."
echo "Placeholder primitives are used until GLBs appear in public/models/."
