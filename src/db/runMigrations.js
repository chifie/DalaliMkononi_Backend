/**
 * Run all SQL migrations against the PostgreSQL database.
 * Usage: node src/db/runMigrations.js
 */
import fs from 'fs';
import path from 'path';
import pool from './pool.js';

async function runMigrations() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`✅  ${file}`);
    } catch (err) {
      console.error(`❌  ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n🎉  All migrations completed successfully!');
  await pool.end();
}

runMigrations();
