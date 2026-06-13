-- Add S3 key column for uploaded project logos.
-- logo_url stays as a cache of the last presigned URL;
-- logo_s3_key is the permanent reference used to regenerate it on load.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS logo_s3_key text;
