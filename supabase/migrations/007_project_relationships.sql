-- Symmetric join table for linking related projects together.
-- Both (A, B) and (B, A) are stored so queries only need WHERE project_id = $1.
-- Deleting a project cascades both directions.

CREATE TABLE project_relationships (
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  related_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, related_id),
  CHECK (project_id <> related_id)
);
