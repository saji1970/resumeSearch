-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  professional_summary TEXT,
  career_goals TEXT,
  strengths TEXT[],
  preferences JSONB,
  skills JSONB,
  suggested_job_roles JSONB DEFAULT '[]'::jsonb,
  linkedin_url VARCHAR(500),
  other_websites JSONB DEFAULT '[]'::jsonb,
  job_search_criteria JSONB DEFAULT '{}'::jsonb,
  extracted_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Resumes Table
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(255),
  parsed_data JSONB,
  is_master BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Resume Versions (Tailored CVs)
CREATE TABLE IF NOT EXISTS resume_versions (
  id SERIAL PRIMARY KEY,
  resume_id INTEGER REFERENCES resumes(id) ON DELETE CASCADE,
  job_id INTEGER,
  optimized_content JSONB,
  file_path VARCHAR(500),
  version_number INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Listings Table
CREATE TABLE IF NOT EXISTS job_listings (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  company VARCHAR(255) NOT NULL,
  description TEXT,
  requirements JSONB,
  location VARCHAR(255),
  remote_options VARCHAR(50),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency VARCHAR(10) DEFAULT 'USD',
  job_type VARCHAR(50),
  application_url TEXT,
  source VARCHAR(100),
  posted_date DATE,
  expiration_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Applications Table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER REFERENCES job_listings(id) ON DELETE CASCADE,
  resume_version_id INTEGER REFERENCES resume_versions(id),
  cover_letter TEXT,
  status VARCHAR(50) DEFAULT 'applied',
  application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  outcome VARCHAR(50),
  outcome_notes TEXT,
  outcome_date TIMESTAMP,
  interview_feedback TEXT,
  rejection_reason TEXT
);

-- Application Status History
CREATE TABLE IF NOT EXISTS application_status_history (
  id SERIAL PRIMARY KEY,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Preferences Table
CREATE TABLE IF NOT EXISTS job_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Skills Table (Reference)
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Application Learning Table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
-- Index for suggested_job_roles - only create if column exists (handled in migration)
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
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_job_listings_title ON job_listings(title);
CREATE INDEX IF NOT EXISTS idx_job_listings_company ON job_listings(company);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
-- Index for outcome - only create if column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'applications' 
        AND column_name = 'outcome'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_applications_outcome ON applications(outcome);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_application_learning_user_id ON application_learning(user_id);
CREATE INDEX IF NOT EXISTS idx_application_learning_outcome ON application_learning(outcome);

