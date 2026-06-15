-- Add explicit public-sharing flag to projects.
-- Projects default to private (is_shared = false).
-- Owners must explicitly enable the public /share/<id> page per project.
ALTER TABLE projects ADD COLUMN is_shared boolean NOT NULL DEFAULT false;
