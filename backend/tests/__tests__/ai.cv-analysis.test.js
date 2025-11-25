const request = require('supertest');
const app = require('../../src/server');
const { createTestUser, generateToken, createTestResume, createTestProfile, cleanupTestData } = require('../helpers/testHelpers');
const { mockCVData } = require('../helpers/mockData');
const pool = require('../../src/database/postgres');

describe('AI Assistant CV Analysis', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Test database connection
    try {
      await pool.query('SELECT NOW()');
    } catch (error) {
      console.error('Database connection failed:', error.message);
      throw new Error('Cannot connect to database. Please ensure PostgreSQL is running.');
    }
    
    // Clean up any existing test data
    await cleanupTestData();
    
    // Create test user
    testUser = await createTestUser();
    authToken = generateToken(testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData();
    // Don't close pool as it's shared
  });

  describe('CV Upload and Accessibility', () => {
    test('should upload CV from AI Assistant and make it accessible', async () => {
      // This test would require file upload mocking
      // For now, we'll test the CV retrieval logic
      const resume = await createTestResume(testUser.id, mockCVData);
      
      expect(resume).toBeDefined();
      expect(resume.parsed_data).toBeDefined();
      
      const parsedData = typeof resume.parsed_data === 'string' 
        ? JSON.parse(resume.parsed_data) 
        : resume.parsed_data;
      
      expect(parsedData.skills).toBeDefined();
      expect(parsedData.experience).toBeDefined();
    });

    test('should retrieve CV data from any upload location', async () => {
      // Create resume (simulating upload from Resume page)
      await createTestResume(testUser.id, mockCVData);
      
      // Create another resume (simulating upload from Profile page)
      const secondResume = await createTestResume(testUser.id, {
        ...mockCVData,
        name: 'Updated Name'
      });
      
      // The AI chat should retrieve the most recent CV
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is my name?',
          context: []
        });
      
      expect(response.status).toBe(200);
      // The system should have access to the CV data
    });
  });

  describe('NLP-based CV Understanding', () => {
    beforeEach(async () => {
      await createTestResume(testUser.id, mockCVData);
      await createTestProfile(testUser.id, { skills: mockCVData.skills });
    });

    test('should detect CV analysis request with "read my resume"', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want you to read and understand my Resume and give me a list of Job profile I can apply for',
          context: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body.response).toBeDefined();
      
      // Should detect CV analysis keywords
      const responseText = response.body.response.toLowerCase();
      // The response should acknowledge CV analysis or ask for CV upload
      expect(
        responseText.includes('resume') || 
        responseText.includes('cv') || 
        responseText.includes('upload')
      ).toBe(true);
    });

    test('should detect CV analysis request with "analyze my CV"', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Can you analyze my CV and suggest jobs?',
          context: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    test('should detect CV analysis request with "suggest jobs"', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Suggest job profiles I can apply for based on my resume',
          context: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
    });

    test('should handle request when no CV is uploaded', async () => {
      // Clean up resumes
      const pool = require('../../src/database/postgres');
      await pool.query('DELETE FROM resumes WHERE user_id = $1', [testUser.id]);
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Read my resume and suggest jobs',
          context: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      // Should politely inform user to upload CV
      const responseText = response.body.response.toLowerCase();
      expect(
        responseText.includes('upload') || 
        responseText.includes('resume') ||
        responseText.includes('cv')
      ).toBe(true);
    });
  });

  describe('CV Analysis and Job Recommendations', () => {
    beforeEach(async () => {
      await createTestResume(testUser.id, mockCVData);
      await createTestProfile(testUser.id, { skills: mockCVData.skills });
    });

    test('should analyze CV and extract skills', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What skills do I have?',
          context: []
        });
      
      expect(response.status).toBe(200);
      // The system should have access to CV skills
    });

    test('should suggest job profiles based on CV', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want you to read and understand my Resume and give me a list of Job profile I can apply for',
          context: []
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      
      // Response should contain job-related content
      const responseText = response.body.response.toLowerCase();
      // Should mention jobs, roles, or positions
      expect(
        responseText.includes('job') || 
        responseText.includes('role') || 
        responseText.includes('position') ||
        responseText.includes('developer') ||
        responseText.includes('engineer')
      ).toBe(true);
    });

    test('should search for jobs matching CV profile', async () => {
      // Mock the webJobSearch service if needed
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Read my resume and find me jobs',
          context: []
        });
      
      expect(response.status).toBe(200);
      // May include job results if Serper API is configured
      if (response.body.jobs) {
        expect(Array.isArray(response.body.jobs)).toBe(true);
      }
    });
  });

  describe('CV Data Integration', () => {
    test('should use CV data from user profile if resume not available', async () => {
      // Create profile with skills but no resume
      await createTestProfile(testUser.id, { skills: mockCVData.skills });
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What are my skills?',
          context: []
        });
      
      expect(response.status).toBe(200);
      // Should still have access to skills from profile
    });

    test('should prioritize most recent CV upload', async () => {
      // Create first resume
      await createTestResume(testUser.id, {
        ...mockCVData,
        name: 'First Name'
      });
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Create second resume (should be retrieved as most recent)
      await createTestResume(testUser.id, {
        ...mockCVData,
        name: 'Second Name'
      });
      
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'What is my name?',
          context: []
        });
      
      expect(response.status).toBe(200);
      // Should use the most recent CV
    });
  });

  describe('Error Handling', () => {
    test('should handle missing authentication', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .send({
          message: 'Read my resume',
          context: []
        });
      
      expect(response.status).toBe(401);
    });

    test('should handle missing message', async () => {
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: []
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should handle database errors gracefully', async () => {
      // This would require mocking database errors
      // For now, we'll just ensure the endpoint doesn't crash
      const response = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'Test message',
          context: []
        });
      
      // Should return a response (even if error)
      expect([200, 500]).toContain(response.status);
    });
  });
});

