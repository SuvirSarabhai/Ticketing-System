-- ═══════════════════════════════════════════════════════════════════
-- Multi-Department Ticketing System — PostgreSQL Schema
-- Run once: psql -U postgres -d ticketing_system -f schema.sql
-- ═══════════════════════════════════════════════════════════════════

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────────────────────
-- Roles: admin | agent | user
CREATE TABLE IF NOT EXISTS users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT        UNIQUE NOT NULL,
  password            TEXT        NOT NULL,            -- bcrypt hash
  name                TEXT        NOT NULL,
  role                TEXT        NOT NULL CHECK (role IN ('admin', 'agent', 'user')),
  department          TEXT,                            -- only relevant for agents
  refresh_token       TEXT,                            -- rotated on each login
  reset_token         TEXT,                            -- password-reset token
  reset_token_expires TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Companies ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Domains (Industries) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS domains (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Categories (Departments) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT  NOT NULL,
  domain_id  UUID  REFERENCES domains(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subcategories (Issue Types) ─────────────────────────────────────────────
-- form_fields is a JSONB array matching the frontend field schema exactly:
-- [{ id, label, type, required, options? }]
CREATE TABLE IF NOT EXISTS subcategories (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT  NOT NULL,
  category_id UUID  REFERENCES categories(id) ON DELETE CASCADE,
  form_fields JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tickets ─────────────────────────────────────────────────────────────────
-- form_data is JSONB: { [fieldId]: value } — matches frontend formData shape
CREATE TABLE IF NOT EXISTS tickets (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT        UNIQUE NOT NULL,   -- e.g. TKT-1001
  company_id      UUID        REFERENCES companies(id),
  domain_id       UUID        REFERENCES domains(id),
  category_id     UUID        REFERENCES categories(id),
  subcategory_id  UUID        REFERENCES subcategories(id),
  urgency         TEXT        NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'assigned', 'in_progress', 'resolved', 'closed')),
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  form_data       JSONB       NOT NULL DEFAULT '{}',
  created_by      UUID        REFERENCES users(id),
  assigned_to     UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  resolution_time INT                            -- minutes from open → resolved
);

-- Auto-update updated_at on every ticket change
CREATE OR REPLACE FUNCTION update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ticket_updated_at ON tickets;
CREATE TRIGGER trigger_ticket_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_ticket_timestamp();

-- ─── Comments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        REFERENCES tickets(id) ON DELETE CASCADE,
  user_id    UUID        REFERENCES users(id),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Assignment Rules ─────────────────────────────────────────────────────────
-- NULL fields = match-any (e.g. NULL category_id means any category)
CREATE TABLE IF NOT EXISTS assignment_rules (
  id                UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       UUID  REFERENCES categories(id) ON DELETE SET NULL,
  subcategory_id    UUID  REFERENCES subcategories(id) ON DELETE SET NULL,
  urgency           TEXT  CHECK (urgency IN ('low', 'medium', 'high')),   -- NULL = any
  assign_to_user_id UUID  REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  priority          INT   NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Auto-Close Configuration ────────────────────────────────────────────────
-- Single-row table (id = 1 enforced by constraint)
CREATE TABLE IF NOT EXISTS auto_close_config (
  id           INT  PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  high_hours   INT  NOT NULL DEFAULT 24,
  medium_hours INT  NOT NULL DEFAULT 48,
  low_hours    INT  NOT NULL DEFAULT 72
);

-- Seed the single config row (idempotent)
INSERT INTO auto_close_config (id, high_hours, medium_hours, low_hours)
VALUES (1, 24, 48, 72)
ON CONFLICT (id) DO NOTHING;

-- ─── Ticket number sequence ──────────────────────────────────────────────────
-- Used by the server to generate TKT-XXXX in order
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1001;
