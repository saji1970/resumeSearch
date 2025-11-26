-- Migration: Fix file_type column length in resumes table
-- Issue: file_type VARCHAR(50) is too short for some MIME types
-- Solution: Increase to VARCHAR(255)

-- Check if column exists and alter it
DO $$
BEGIN
  -- Check if the column exists and is VARCHAR(50)
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'resumes' 
    AND column_name = 'file_type'
    AND character_maximum_length = 50
  ) THEN
    ALTER TABLE resumes ALTER COLUMN file_type TYPE VARCHAR(255);
    RAISE NOTICE 'Updated file_type column from VARCHAR(50) to VARCHAR(255)';
  ELSE
    RAISE NOTICE 'file_type column does not exist or is already the correct size';
  END IF;
END $$;

