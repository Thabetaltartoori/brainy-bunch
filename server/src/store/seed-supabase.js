import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

import { buildSeed } from './seed.js';

/**
 * One-shot uploader: pushes the demo data from seed.js into Supabase.
 *
 *   npm run seed:cloud            # fails if profiles already has rows
 *   npm run seed:cloud -- --force # wipes the tables first, then uploads
 *
 * Uses the raw client rather than SupabaseStore because this is a bulk
 * load, not something the app ever does. Ids come from the same
 * buildSeed() the in-memory driver uses, and they are already valid UUIDs,
 * so the foreign keys stay consistent across every table.
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    '\n  Missing Supabase credentials.\n' +
      '  Copy server/.env.example to server/.env and fill in:\n' +
      '    SUPABASE_URL=https://<project-ref>.supabase.co\n' +
      '    SUPABASE_SERVICE_ROLE_KEY=<the service_role key>\n' +
      '  Get both from Supabase > Project Settings > API.\n',
  );
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const force = process.argv.includes('--force');

/** Insert order follows the foreign keys in sql/schema.sql. `key` is a non-null column, used to clear the table. */
const TABLES = [
  { name: 'profiles', key: 'id' },
  { name: 'students', key: 'id' },
  { name: 'teacher_students', key: 'teacher_id' },
  { name: 'guardians', key: 'parent_id' },
  { name: 'notes', key: 'id' },
  { name: 'payments', key: 'id' },
  { name: 'announcements', key: 'id' },
];

function fail(table, error) {
  console.error(`\n  Failed on "${table}": ${error.message}\n`);
  console.error('  On a first run this usually means sql/schema.sql has not been run yet.');
  console.error('  Supabase > SQL Editor > New query, paste the file, press Run.\n');
  process.exit(1);
}

async function clear() {
  for (const { name, key: col } of [...TABLES].reverse()) {
    const { error } = await db.from(name).delete().not(col, 'is', null);
    if (error) fail(name, error);
  }
}

const { count, error: countError } = await db
  .from('profiles')
  .select('id', { count: 'exact', head: true });
if (countError) fail('profiles', countError);

if (count > 0 && !force) {
  console.error(
    `\n  profiles already has ${count} row(s), so this would duplicate your accounts.\n` +
      '  Re-run with --force to wipe the tables and replace them.\n',
  );
  process.exit(1);
}
if (count > 0) await clear();

const seed = buildSeed();

for (const { name } of TABLES) {
  const rows = seed[name] ?? [];
  if (!rows.length) {
    console.log(`  ${name.padEnd(17)} —`);
    continue;
  }
  const { error } = await db.from(name).insert(rows);
  if (error) fail(name, error);
  console.log(`  ${name.padEnd(17)} ${String(rows.length).padStart(3)} rows`);
}

console.log('\n  Uploaded. Sign in with:\n');
console.log('    admin@brainybunch.school    Admin#2026     (Director)');
console.log('    amina@brainybunch.school    Teach#2026     (teacher)');
console.log('    parent@brainybunch.school   Parent#2026    (parent)\n');
console.log('  These are demo passwords. Change them in Staff before real use.\n');
console.log('  Start the server — it will now report "storage : Supabase (Postgres)".\n');
