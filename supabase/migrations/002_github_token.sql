-- Add encrypted GitHub PAT column to owner_settings
ALTER TABLE owner_settings
  ADD COLUMN IF NOT EXISTS github_token text;

-- Grant access (owner_settings was created with RLS enabled but no policies)
GRANT ALL ON owner_settings TO service_role, authenticated;

-- service_role bypass (used by all Server Actions)
CREATE POLICY "service_role_bypass" ON owner_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Owner can read/write their own row
CREATE POLICY "owner_rw" ON owner_settings
  FOR ALL TO authenticated
  USING (owner_id = current_setting('request.jwt.claims', true)::jsonb->>'sub')
  WITH CHECK (owner_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');
