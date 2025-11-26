-- Migration: Fix file_type column length in resumes table
-- Issue: file_type VARCHAR(50) is too short for some MIME types
-- Solution: Increase to VARCHAR(255)

-- Simply alter the column - PostgreSQL will handle if it's already the right size
ALTER TABLE resumes ALTER COLUMN file_type TYPE VARCHAR(255);

