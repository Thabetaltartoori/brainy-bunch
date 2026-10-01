import 'dotenv/config';

import { createClient } from '@supabase/supabase-js';

/**
 * Checks that the Supabase connection is real and the schema is in place.
 *
 *   npm run doctor
 *
 * Reports which tables exist and whether the secret key can read them. It
 * cannot confirm Row Level Security from out here: RLS does not apply to the
 * secret key (it has BYPASSRLS), so a successful read is the same result
 * whether RLS is on or off. To verify RLS, run the query in README under
 * "Checking it works" in the Supabase SQL Editor.
 */

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('\n  server/.env is incomplete. Need both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const TABLES = [
  'profiles',
  'sessions',
  'students',
  'teacher_sections',
  'teacher_students',
  'guardians',
  'notes',
  'assessments',
  'payments',
  'announcements',
];

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`\n  url : ${url}`);
console.log(`  key : ${key.slice(0, 11)}... (${key.length} chars, ${key.split('_')[1] ?? 'unknown'} style)\n`);

const { error: pingError } = await db.from('profiles').select('id').limit(1);
if (pingError) {
  console.error(`  Cannot reach the database: ${pingError.message}\n`);
  console.error('  If it says the relation "profiles" does not exist, sql/schema.sql has not been run.\n');
  process.exit(1);
}

console.log('  tables');
const missing = [];
for (const table of TABLES) {
  const { error } = await db.from(table).select('*').limit(1);
  if (error) {
    console.log(`    ${table.padEnd(17)} MISSING  (${error.code})`);
    missing.push(table);
  } else {
    console.log(`    ${table.padEnd(17)} present`);
  }
}

const { count } = await db.from('profiles').select('id', { count: 'exact', head: true });
console.log(`\n  profiles rows: ${count ?? 0}`);

if (missing.length) {
  console.log(`\n  ${missing.length} table(s) missing. Run sql/schema.sql in the Supabase SQL Editor.\n`);
  process.exit(1);
}
console.log('\n  All 10 tables present and readable. Run `npm run seed:cloud` to load the data.\n');
