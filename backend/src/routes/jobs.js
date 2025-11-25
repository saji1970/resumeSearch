const express = require('express');
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');
const { calculateCompatibilityScore } = require('../services/jobMatching');
const { searchWebJobs } = require('../services/webJobSearch');

const router = express.Router();

// Get job listings with optional filters
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      search,
      location,
      remote,
      job_type,
      salary_min,
      salary_max,
      limit = 50,
      offset = 0,
      search_web = 'false'
    } = req.query;

    let query = 'SELECT * FROM job_listings WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (title ILIKE $${paramCount} OR company ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (location) {
      query += ` AND (location ILIKE $${paramCount} OR remote_options = 'remote')`;
      params.push(`%${location}%`);
      paramCount++;
    }

    if (remote === 'true') {
      query += ` AND remote_options IN ('remote', 'hybrid')`;
    }

    if (job_type) {
      query += ` AND job_type = $${paramCount}`;
      params.push(job_type);
      paramCount++;
    }

    if (salary_min) {
      query += ` AND salary_max >= $${paramCount}`;
      params.push(parseInt(salary_min));
      paramCount++;
    }

    if (salary_max) {
      query += ` AND salary_min <= $${paramCount}`;
      params.push(parseInt(salary_max));
      paramCount++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    let allJobs = [...result.rows];

    // Search web for jobs if requested
    if (search_web === 'true' && search) {
      try {
        const webResults = await searchWebJobs(search, location, { limit: parseInt(limit) });
        
        if (webResults.jobs && webResults.jobs.length > 0) {
          // Store web jobs in database for future searches
          for (const webJob of webResults.jobs) {
            try {
              // Check if job already exists (by URL or title+company)
              const existing = await pool.query(
                `SELECT id FROM job_listings 
                 WHERE (application_url = $1 AND application_url IS NOT NULL)
                 OR (title = $2 AND company = $3 AND source = 'google_jobs')`,
                [webJob.application_url, webJob.title, webJob.company]
              );

              if (existing.rows.length === 0) {
                // Insert new web job
                await pool.query(
                  `INSERT INTO job_listings (
                    title, company, description, requirements, location, remote_options,
                    salary_min, salary_max, salary_currency, job_type, application_url, 
                    source, posted_date
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                  RETURNING *`,
                  [
                    webJob.title,
                    webJob.company,
                    webJob.description,
                    webJob.requirements ? JSON.stringify(webJob.requirements) : null,
                    webJob.location,
                    webJob.remote_options,
                    webJob.salary_min,
                    webJob.salary_max,
                    'USD',
                    webJob.job_type,
                    webJob.application_url,
                    webJob.source || 'google_jobs',
                    webJob.posted_date
                  ]
                );
              }
            } catch (err) {
              console.error('Error storing web job:', err.message);
              // Continue with other jobs even if one fails
            }
          }

          // Re-query to get all jobs including newly stored web jobs
          const updatedResult = await pool.query(query, params);
          allJobs = [...updatedResult.rows];
        }
      } catch (webError) {
        console.error('Web search error:', webError.message);
        // Continue with database results even if web search fails
      }
    }

    // Calculate compatibility scores for each job
    const userProfileResult = await pool.query(
      `SELECT skills, preferences FROM user_profiles WHERE user_id = $1`,
      [req.user.id]
    );

    const userProfile = userProfileResult.rows[0] || {};
    const jobsWithScores = await Promise.all(
      allJobs.map(async (job) => {
        const score = await calculateCompatibilityScore(job, userProfile);
        return {
          ...job,
          compatibility_score: score.overall,
          match_details: score
        };
      })
    );

    // Sort by compatibility score
    jobsWithScores.sort((a, b) => b.compatibility_score - a.compatibility_score);

    res.json({
      jobs: jobsWithScores,
      total: jobsWithScores.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      web_search_used: search_web === 'true'
    });
  } catch (error) {
    next(error);
  }
});

// Get job by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM job_listings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = result.rows[0];

    // Calculate compatibility score
    const userProfileResult = await pool.query(
      `SELECT skills, preferences FROM user_profiles WHERE user_id = $1`,
      [req.user.id]
    );

    const userProfile = userProfileResult.rows[0] || {};
    const score = await calculateCompatibilityScore(job, userProfile);

    res.json({
      ...job,
      compatibility_score: score.overall,
      match_details: score
    });
  } catch (error) {
    next(error);
  }
});

// Create job listing (for testing/admin)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      title,
      company,
      description,
      requirements,
      location,
      remote_options,
      salary_min,
      salary_max,
      salary_currency,
      job_type,
      application_url,
      source
    } = req.body;

    if (!title || !company || !description) {
      return res.status(400).json({ error: 'Title, company, and description are required' });
    }

    const result = await pool.query(
      `INSERT INTO job_listings (
        title, company, description, requirements, location, remote_options,
        salary_min, salary_max, salary_currency, job_type, application_url, source, posted_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
      RETURNING *`,
      [
        title,
        company,
        description,
        requirements ? JSON.stringify(requirements) : null,
        location || null,
        remote_options || null,
        salary_min || null,
        salary_max || null,
        salary_currency || 'USD',
        job_type || null,
        application_url || null,
        source || 'manual'
      ]
    );

    res.status(201).json({
      message: 'Job listing created successfully',
      job: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

