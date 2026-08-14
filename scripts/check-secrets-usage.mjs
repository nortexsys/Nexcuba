#!/usr/bin/env node
/**
 * CI guard: the Supabase service-role key and the server-only client module
 * must never be referenced outside src/lib/server/** (design.md §10).
 * Exit code 1 lists violations.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const FORBIDDEN = [/SUPABASE_SERVICE_ROLE/i, /service[-_]role/i];

const violations = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    const rel = relative(SRC, full).replaceAll('\\', '/');
    if (rel.startsWith('lib/server/')) continue;
    const content = readFileSync(full, 'utf8');
    for (const pattern of FORBIDDEN) {
      if (pattern.test(content)) violations.push(`${rel}: matches ${pattern}`);
    }
  }
}

walk(SRC);

if (violations.length > 0) {
  console.error('✖ service-role usage outside src/lib/server/:');
  for (const v of violations) console.error('  -', v);
  process.exit(1);
}
console.log('✔ no service-role references outside src/lib/server/');
