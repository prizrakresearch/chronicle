-- ============================================================
-- Chronicle — initial schema
-- Run once in Supabase SQL Editor
-- ============================================================

-- ── Helpers ──────────────────────────────────────────────────

-- Auto-update updated_at on any table that has the column
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 1. projects ───────────────────────────────────────────────

CREATE TABLE projects (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          text        NOT NULL,        -- Clerk user ID
  name              text        NOT NULL,
  brief             text,
  description       text,
  problem_statement text,
  status            text        NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','paused','archived')),
  logo_url          text,
  pinned            boolean     NOT NULL DEFAULT false,
  hidden            boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE INDEX projects_owner_idx ON projects (owner_id);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 2. project_shares ─────────────────────────────────────────
-- Owner decides which projects a guest Clerk account can see.

CREATE TABLE project_shares (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  clerk_user_id  text NOT NULL,
  UNIQUE (project_id, clerk_user_id)
);

ALTER TABLE project_shares ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_shares_user_idx ON project_shares (clerk_user_id);

-- ── 3. github_repos ───────────────────────────────────────────

CREATE TABLE github_repos (
  id              uuid   PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid   NOT NULL UNIQUE REFERENCES projects (id) ON DELETE CASCADE,
  github_id       bigint UNIQUE,
  full_name       text   NOT NULL,
  default_branch  text   NOT NULL DEFAULT 'main',
  description     text,
  stars           integer NOT NULL DEFAULT 0,
  last_synced_at  timestamptz
);

ALTER TABLE github_repos ENABLE ROW LEVEL SECURITY;

-- ── 4. roadmap_items ──────────────────────────────────────────

CREATE TABLE roadmap_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'planned'
              CHECK (status IN ('planned','in_progress','completed')),
  sort_order  integer NOT NULL DEFAULT 0
);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX roadmap_project_idx ON roadmap_items (project_id, sort_order);

-- ── 5. timeline_events ────────────────────────────────────────

CREATE TABLE timeline_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  type        text        NOT NULL
              CHECK (type IN ('note','decision','maintenance','milestone','git_commit')),
  title       text        NOT NULL,
  body        text,
  event_date  timestamptz NOT NULL DEFAULT now(),
  metadata    jsonb        -- { sha, url, authorName } for git_commit rows
);

ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX timeline_project_idx ON timeline_events (project_id, event_date DESC);

-- ── 6. calendar_events ────────────────────────────────────────

CREATE TABLE calendar_events (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid    NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  date        date    NOT NULL,
  title       text    NOT NULL,
  completed   boolean NOT NULL DEFAULT false
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX calendar_project_date_idx ON calendar_events (project_id, date);

-- ── 7. project_notes (short sticky notes on overview) ─────────

CREATE TABLE project_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  content     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_notes_project_idx ON project_notes (project_id, created_at DESC);

-- ── 8. markdown_notes (full editor notes tab) ─────────────────

CREATE TABLE markdown_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title       text        NOT NULL DEFAULT 'Untitled',
  content     text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE markdown_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX markdown_notes_project_idx ON markdown_notes (project_id, updated_at DESC);

CREATE TRIGGER markdown_notes_updated_at
  BEFORE UPDATE ON markdown_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 9. folders ────────────────────────────────────────────────

CREATE TABLE folders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name        text NOT NULL
);

ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

CREATE INDEX folders_project_idx ON folders (project_id);

-- ── 10. project_links ─────────────────────────────────────────

CREATE TABLE project_links (
  id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid  NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  folder_id   uuid  REFERENCES folders (id) ON DELETE SET NULL,
  title       text  NOT NULL,
  url         text  NOT NULL,
  type        text  NOT NULL DEFAULT 'other'
              CHECK (type IN ('github','docs','production','design','other')),
  tags        text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE project_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_links_project_idx ON project_links (project_id);

-- ── 11. project_files ─────────────────────────────────────────
-- Actual bytes live in Supabase Storage bucket "project-files".
-- storage_path pattern: {owner_id}/{project_id}/{uuid}/{filename}

CREATE TABLE project_files (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  folder_id     uuid        REFERENCES folders (id) ON DELETE SET NULL,
  name          text        NOT NULL,
  mime_type     text        NOT NULL,
  size          bigint      NOT NULL,  -- bytes
  storage_path  text        NOT NULL,  -- Supabase Storage path
  tags          text[]      NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

CREATE INDEX project_files_project_idx ON project_files (project_id, created_at DESC);

-- ── 12. credentials ───────────────────────────────────────────

CREATE TABLE credentials (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  title       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX credentials_project_idx ON credentials (project_id);

CREATE TRIGGER credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 13. credential_pairs ──────────────────────────────────────
-- Values are AES-256-GCM encrypted client-side before insert.

CREATE TABLE credential_pairs (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id  uuid    NOT NULL REFERENCES credentials (id) ON DELETE CASCADE,
  key            text    NOT NULL,
  value          text    NOT NULL,  -- encrypted ciphertext (base64)
  sort_order     integer NOT NULL DEFAULT 0
);

ALTER TABLE credential_pairs ENABLE ROW LEVEL SECURITY;

CREATE INDEX credential_pairs_cred_idx ON credential_pairs (credential_id, sort_order);

-- ── 14. owner_settings ────────────────────────────────────────

CREATE TABLE owner_settings (
  owner_id   text PRIMARY KEY,   -- Clerk user ID
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE owner_settings ENABLE ROW LEVEL SECURITY;
