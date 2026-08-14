#!/usr/bin/env bash
# Applies migrations + runs the SQL test suite against a Postgres instance.
# CI uses a service container; locally: docker run postgres:16-alpine.
#   DB_URL=postgresql://postgres:postgres@localhost:5432/nexcuba_test
set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@localhost:5432/nexcuba_test}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "▶ applying test shim"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/tests/db/shim.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "▶ applying $(basename "$f")"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo "▶ loading assertion framework"
psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$ROOT/tests/db/framework.sql"

echo "▶ running db test suite"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$ROOT/tests/db/rls.test.sql"
