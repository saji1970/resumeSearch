-- Migration: Add suggested_job_roles field to user_profiles
-- This stores AI-suggested job roles based on CV analysis for search functionality

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS suggested_job_roles JSONB DEFAULT '[]'::jsonb;

-- Add index for faster searches on suggested roles
CREATE INDEX IF NOT EXISTS idx_user_profiles_suggested_roles 
ON user_profiles USING GIN (suggested_job_roles);


