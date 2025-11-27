-- Add LinkedIn and website fields to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS other_websites JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS job_search_criteria JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS extracted_metadata JSONB DEFAULT '{}'::jsonb;

-- Add outcome tracking to applications
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS outcome VARCHAR(50), -- 'positive', 'negative', 'pending'
ADD COLUMN IF NOT EXISTS outcome_notes TEXT,
ADD COLUMN IF NOT EXISTS outcome_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS interview_feedback TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for outcome tracking
CREATE INDEX IF NOT EXISTS idx_applications_outcome ON applications(outcome);

-- Create table for learning/refinement data
CREATE TABLE IF NOT EXISTS application_learning (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  outcome VARCHAR(50) NOT NULL,
  learned_patterns JSONB,
  profile_refinements JSONB,
  search_refinements JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_application_learning_user_id ON application_learning(user_id);
CREATE INDEX IF NOT EXISTS idx_application_learning_outcome ON application_learning(outcome);

