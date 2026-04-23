/**
 * User Management Script
 * ─────────────────────
 * Add or update users in the ticketing system.
 * Run from the server/ directory: node db/manage_users.js
 *
 * Roles: 'admin' | 'agent' | 'user'
 * - admin  → full access + admin panel
 * - agent  → can assign, resolve tickets; set department
 * - user   → can create and view own tickets
 *
 * company_id: find your company UUID with:
 *   SELECT id, name FROM companies;
 * to run - node server/db/manage_users.js
 */

require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const pool = require('../db/pool');

// ─── Edit this list to add/update users ──────────────────────────────────────

const COMPANY_ID = 'PASTE_YOUR_COMPANY_UUID_HERE'; // ← get from: SELECT id FROM companies;

const USERS = [
  // ── Admins ────────────────────────────────────────────────────
  // {
  //   email:      'admin@acme.com',
  //   password:   'Admin@1234',
  //   name:       'System Admin',
  //   role:       'admin',
  //   department: null,
  //   company_id: COMPANY_ID,
  // },

  // ── Agents ────────────────────────────────────────────────────
  {
    email: 'suvir@acme.com',
    password: 'password123',
    name: 'Suvir',
    role: 'agent',
    department: 'IT Support',
    company_id: "00000000-0000-0000-0000-000000000001",
  },
  // {
  //   email: 'sarah.support@acme.com',
  //   password: 'Agent@1234',
  //   name: 'Sarah Support',
  //   role: 'agent',
  //   department: 'HR',
  //   company_id: COMPANY_ID,
  // },

  // ── Regular Users ─────────────────────────────────────────────
  // {
  //   email: 'alice@acme.com',
  //   password: 'User@1234',
  //   name: 'Alice Employee',
  //   role: 'user',
  //   department: null,
  //   company_id: COMPANY_ID,
  // },
  // {
  //   email: 'bob@acme.com',
  //   password: 'User@1234',
  //   name: 'Bob Employee',
  //   role: 'user',
  //   department: null,
  //   company_id: COMPANY_ID,
  // },
];

// ─── Script (no need to edit below) ──────────────────────────────────────────

async function run() {
  console.log(`\n🔧  Managing ${USERS.length} user(s)...\n`);

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 10);

    await pool.query(
      `INSERT INTO users (email, password, name, role, department, company_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE
         SET password   = EXCLUDED.password,
             name       = EXCLUDED.name,
             role       = EXCLUDED.role,
             department = EXCLUDED.department,
             company_id = EXCLUDED.company_id`,
      [u.email, hash, u.name, u.role, u.department || null, u.company_id || null]
    );

    console.log(`  ✅  ${u.role.padEnd(6)}  ${u.name.padEnd(20)}  ${u.email}`);
  }

  console.log('\n✔  Done. You can now log in with these credentials.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
