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

echo "==> build"
pnpm build

echo "verify.sh OK"
