-- Migration: Add suggested_job_roles field to user_profiles
-- This stores AI-suggested job roles based on CV analysis for search functionality

-- First, ensure the column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'suggested_job_roles'
    ) THEN
        ALTER TABLE user_profiles 
        ADD COLUMN suggested_job_roles JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Then, create the index only if the column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'suggested_job_roles'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_user_profiles_suggested_roles 
        ON user_profiles USING GIN (suggested_job_roles);
    END IF;
END $$;


