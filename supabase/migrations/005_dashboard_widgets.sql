-- Add persisted dashboard widget storage to owner_settings
ALTER TABLE owner_settings
  ADD COLUMN IF NOT EXISTS dashboard_events jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS dashboard_notes  jsonb NOT NULL DEFAULT '[]';
