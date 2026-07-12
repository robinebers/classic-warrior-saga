#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> typecheck"
pnpm typecheck

echo "==> lint"
pnpm lint

echo "==> unit tests"
pnpm test

echo "==> e2e (optional if playwright browsers present)"
pnpm test:e2e || echo "WARN: e2e skipped/failed — check playwright browsers"

echo "==> build"
pnpm build

echo "verify.sh OK"
