/**
 * Run all SQL migrations against the PostgreSQL database.
 * Usage: npm run db:migrate
 */

import fs from 'fs';
import path from 'path';
import pool from './pool.js';

async function runMigrations() {
  // FIX: use local migrations folder instead of supabase
  const migrationsDir = path.join(process.cwd(), 'src', 'db', 'migrations');

  // If folder does not exist, stop safely
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations folder not found:', migrationsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️ No migration files found.');
    await pool.end();
    return;
  }

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

  console.log('\n🎉 All migrations completed successfully!');
  await pool.end();
}

runMigrations();
