// Test helper functions
const pool = require('../../src/database/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = {
  // Create a test user in the database
  async createTestUser(userData = {}) {
    const { mockUser } = require('./mockData');
    const user = { ...mockUser, ...userData };
    
    const passwordHash = await bcrypt.hash(user.password_hash || 'password123', 10);
    
    const result = await pool.query(
      `INSERT INTO users (email, name, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, name`,
      [user.email, user.name, passwordHash]
    );
    
    return result.rows[0];
  },

  // Generate JWT token for test user
  generateToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'test-secret-key');
  },

  // Create test resume/CV
  async createTestResume(userId, cvData = {}) {
    const { mockCVData } = require('./mockData');
    const resumeData = { ...mockCVData, ...cvData };
    
    const result = await pool.query(
      `INSERT INTO resumes (user_id, file_name, file_path, file_type, parsed_data, is_master)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, parsed_data`,
      [
        userId,
        'test-resume.pdf',
        '/uploads/resumes/test-resume.pdf',
        'application/pdf',
        JSON.stringify(resumeData),
        true
      ]
    );
    
    return result.rows[0];
  },

  // Create test user profile
  async createTestProfile(userId, profileData = {}) {
    const { mockCVData } = require('./mockData');
    
    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, professional_summary, skills, career_goals)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         professional_summary = EXCLUDED.professional_summary,
         skills = EXCLUDED.skills,
         career_goals = EXCLUDED.career_goals
       RETURNING *`,
      [
        userId,
        profileData.professional_summary || mockCVData.professional_summary,
        JSON.stringify(profileData.skills || mockCVData.skills),
        profileData.career_goals || 'Looking for growth opportunities'
      ]
    );
    
    return result.rows[0];
  },

  // Clean up test data
  async cleanupTestData() {
    try {
      await pool.query('DELETE FROM applications WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await pool.query('DELETE FROM resume_versions WHERE resume_id IN (SELECT id FROM resumes WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1))', ['test%@example.com']);
      await pool.query('DELETE FROM resumes WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await pool.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', ['test%@example.com']);
      await pool.query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com']);
    } catch (error) {
      console.error('Error cleaning up test data:', error.message);
      // Continue even if cleanup fails
    }
  },

  // Close database connection
  async closeConnection() {
    await pool.end();
  }
};

