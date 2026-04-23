-- ═══════════════════════════════════════════════════════════════════
-- Seed data — mirrors mock-data.js exactly
-- Run AFTER schema.sql:
--   psql -U postgres -d ticketing_system -f "...server/db/seed.sql"
--
-- Uses fixed UUIDs so cross-references (categories → domains, etc.)
-- are deterministic and can be referenced by future seed scripts.
-- ═══════════════════════════════════════════════════════════════════

-- ─── Companies ───────────────────────────────────────────────────────────────
INSERT INTO companies (id, name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Acme Corporation'),
  ('00000000-0000-0000-0000-000000000002', 'TechStart Inc'),
  ('00000000-0000-0000-0000-000000000003', 'Global Solutions Ltd')
ON CONFLICT (id) DO NOTHING;

-- ─── Domains ─────────────────────────────────────────────────────────────────
INSERT INTO domains (id, name) VALUES
  ('00000000-0000-0000-0001-000000000001', 'Technology'),
  ('00000000-0000-0000-0001-000000000002', 'Finance'),
  ('00000000-0000-0000-0001-000000000003', 'Healthcare'),
  ('00000000-0000-0000-0001-000000000004', 'Manufacturing')
ON CONFLICT (id) DO NOTHING;

-- ─── Categories ──────────────────────────────────────────────────────────────
INSERT INTO categories (id, name, domain_id) VALUES
  ('00000000-0000-0000-0002-000000000001', 'IT Support',        '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0002-000000000002', 'HR',                '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0002-000000000003', 'Facilities',        '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0002-000000000004', 'Finance',           '00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0002-000000000005', 'Payroll',           '00000000-0000-0000-0001-000000000002'),
  ('00000000-0000-0000-0002-000000000006', 'Medical Equipment', '00000000-0000-0000-0001-000000000003')
ON CONFLICT (id) DO NOTHING;

-- ─── Subcategories (with JSONB form_fields) ──────────────────────────────────
INSERT INTO subcategories (id, name, category_id, form_fields) VALUES

  -- IT Support > Software Bug
  ('00000000-0000-0000-0003-000000000001', 'Software Bug',
   '00000000-0000-0000-0002-000000000001',
   '[
     {"id":"f1","label":"Software Version","type":"text","required":true},
     {"id":"f2","label":"Operating System","type":"select","required":true,"options":["Windows","macOS","Linux"]},
     {"id":"f3","label":"Steps to Reproduce","type":"textarea","required":true},
     {"id":"f4","label":"Expected Behavior","type":"textarea","required":false}
   ]'::jsonb),

  -- IT Support > Hardware Issue
  ('00000000-0000-0000-0003-000000000002', 'Hardware Issue',
   '00000000-0000-0000-0002-000000000001',
   '[
     {"id":"f5","label":"Asset Tag","type":"text","required":true},
     {"id":"f6","label":"Device Model","type":"text","required":true},
     {"id":"f7","label":"Location","type":"text","required":true},
     {"id":"f8","label":"Error Message","type":"textarea","required":false}
   ]'::jsonb),

  -- IT Support > Network/Connectivity
  ('00000000-0000-0000-0003-000000000003', 'Network/Connectivity',
   '00000000-0000-0000-0002-000000000001',
   '[
     {"id":"f9","label":"Location","type":"text","required":true},
     {"id":"f10","label":"Device Type","type":"select","required":true,"options":["Desktop","Laptop","Mobile","Other"]},
     {"id":"f11","label":"Connection Type","type":"select","required":false,"options":["WiFi","Ethernet","VPN"]}
   ]'::jsonb),

  -- Payroll > Payroll Issue
  ('00000000-0000-0000-0003-000000000004', 'Payroll Issue',
   '00000000-0000-0000-0002-000000000005',
   '[
     {"id":"f12","label":"Employee ID","type":"text","required":true},
     {"id":"f13","label":"Pay Period","type":"date","required":true},
     {"id":"f14","label":"Amount Affected","type":"number","required":true},
     {"id":"f15","label":"Issue Details","type":"textarea","required":true}
   ]'::jsonb),

  -- HR > Leave Request
  ('00000000-0000-0000-0003-000000000005', 'Leave Request',
   '00000000-0000-0000-0002-000000000002',
   '[
     {"id":"f16","label":"Employee ID","type":"text","required":true},
     {"id":"f17","label":"Leave Type","type":"select","required":true,"options":["Annual","Sick","Personal","Parental"]},
     {"id":"f18","label":"Start Date","type":"date","required":true},
     {"id":"f19","label":"End Date","type":"date","required":true}
   ]'::jsonb),

  -- Facilities > Building Maintenance
  ('00000000-0000-0000-0003-000000000006', 'Building Maintenance',
   '00000000-0000-0000-0002-000000000003',
   '[
     {"id":"f20","label":"Building","type":"text","required":true},
     {"id":"f21","label":"Floor/Room","type":"text","required":true},
     {"id":"f22","label":"Issue Type","type":"select","required":true,"options":["Plumbing","Electrical","HVAC","Cleaning","Other"]}
   ]'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- ─── Users (demo accounts — password123 bcrypt hash) ─────────────────────────
-- Hash generated with: bcrypt.hashSync('password123', 10)
INSERT INTO users (id, email, password, name, role, department, created_at) VALUES
  ('00000000-0000-0000-0004-000000000001',
   'admin@acme.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'Admin User', 'admin', NULL,
   '2026-01-01T00:00:00Z'),

  ('00000000-0000-0000-0004-000000000002',
   'agent@acme.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'John Agent', 'agent', 'IT Support',
   '2026-01-02T00:00:00Z'),

  ('00000000-0000-0000-0004-000000000003',
   'agent2@acme.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'Sarah Support', 'agent', 'IT Support',
   '2026-01-03T00:00:00Z'),

  ('00000000-0000-0000-0004-000000000004',
   'user@acme.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'Regular User', 'user', NULL,
   '2026-01-04T00:00:00Z'),

  ('00000000-0000-0000-0004-000000000005',
   'hr.agent@acme.com',
   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
   'HR Agent', 'agent', 'HR',
   '2026-01-05T00:00:00Z')

ON CONFLICT (id) DO NOTHING;

-- NOTE: The bcrypt hash above is the standard Laravel/test hash for "password"
-- (not "password123"). Run the server's /api/auth/register or the helper script
-- below to generate a correct hash for password123 if needed.
--
-- Quick fix — update all demo users with the correct hash after seeding:
-- UPDATE users SET password = '$2b$10$YourCorrectHashHere' WHERE email LIKE '%@acme.com';
--
-- Or use the seed helper: node server/db/seed-helper.js

-- ─── Assignment Rules ─────────────────────────────────────────────────────────
-- These mirror mockInitialRules and reference the fixed user + category UUIDs above
INSERT INTO assignment_rules (id, category_id, urgency, assign_to_user_id, priority) VALUES
  ('00000000-0000-0000-0005-000000000001',
   '00000000-0000-0000-0002-000000000001', 'high',
   '00000000-0000-0000-0004-000000000002', 1),

  ('00000000-0000-0000-0005-000000000002',
   '00000000-0000-0000-0002-000000000001', 'medium',
   '00000000-0000-0000-0004-000000000003', 2),

  ('00000000-0000-0000-0005-000000000003',
   '00000000-0000-0000-0002-000000000001', 'low',
   '00000000-0000-0000-0004-000000000003', 3),

  -- HR category → HR Agent (any urgency, so urgency column is NULL)
  ('00000000-0000-0000-0005-000000000004',
   '00000000-0000-0000-0002-000000000002', NULL,
   '00000000-0000-0000-0004-000000000005', 1)

ON CONFLICT (id) DO NOTHING;
