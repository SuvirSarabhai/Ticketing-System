/**
 * seed-helper.js
 * Run once: node server/db/seed-helper.js
 *
 * 1. Generates the correct bcrypt hash for 'password123'
 * 2. Runs seed.sql against the DB
 * 3. Updates all demo user passwords with the correct hash
 */

const bcrypt = require('bcrypt');
const { execSync } = require('child_process');
const pool = require('./pool');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const path = require('path');

async function main() {
  console.log('🔑  Generating bcrypt hash for password123...');
  const hash = await bcrypt.hash('password123', 10);
  console.log('   Hash:', hash);

  console.log('\n📦  Running seed.sql...');
  try {
    const seedPath = path.join(__dirname, 'seed.sql');
    execSync(
      `psql -U ${process.env.DB_USER} -h ${process.env.DB_HOST} -p ${process.env.DB_PORT || 5432} -d ${process.env.DB} -f "${seedPath}"`,
      {
        stdio: 'inherit',
        env: { ...process.env, PGPASSWORD: process.env.DB_PASSWD },
      }
    );
  } catch (err) {
    console.error('seed.sql failed — may already be seeded (ON CONFLICT DO NOTHING). Continuing...');
  }

  console.log('\n🔐  Updating demo user passwords with correct hash...');
  await pool.query(
    `UPDATE users SET password = $1 WHERE email = ANY($2::text[])`,
    [
      hash,
      [
        'admin@acme.com',
        'agent@acme.com',
        'agent2@acme.com',
        'user@acme.com',
        'hr.agent@acme.com',
      ],
    ]
  );

  console.log('✅  All demo users seeded with password: password123');
  await pool.end();
}

main().catch((err) => {
  console.error('❌  Seed helper failed:', err);
  process.exit(1);
});
