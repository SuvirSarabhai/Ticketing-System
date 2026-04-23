-- Migration: add company_id to users
-- Run: psql -U postgres -d ticketing_system -f add_company_to_users.sql

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Optional: assign all existing users to the first company (change as needed)
-- UPDATE users SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
