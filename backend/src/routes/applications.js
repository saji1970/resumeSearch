const express = require('express');
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Create application
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { job_id, resume_version_id, cover_letter, notes } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Verify job exists
    const jobResult = await pool.query(
      'SELECT id, title, company FROM job_listings WHERE id = $1',
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get or create master resume version if not specified
    let resumeVersionId = resume_version_id;
    if (!resumeVersionId) {
      const masterResume = await pool.query(
        'SELECT id FROM resumes WHERE user_id = $1 AND is_master = true ORDER BY created_at DESC LIMIT 1',
        [req.user.id]
      );

      if (masterResume.rows.length === 0) {
        return res.status(400).json({ error: 'No resume found. Please upload a resume first.' });
      }

      // Create a version entry for this application
      const versionResult = await pool.query(
        `INSERT INTO resume_versions (resume_id, job_id, version_number)
         VALUES ($1, $2, 1)
         RETURNING id`,
        [masterResume.rows[0].id, job_id]
      );
      resumeVersionId = versionResult.rows[0].id;
    }

    // Create application
    const result = await pool.query(
      `INSERT INTO applications (user_id, job_id, resume_version_id, cover_letter, status, notes)
       VALUES ($1, $2, $3, $4, 'applied', $5)
       RETURNING *`,
      [req.user.id, job_id, resumeVersionId, cover_letter || null, notes || null]
    );

    // Create initial status history
    await pool.query(
      'INSERT INTO application_status_history (application_id, status) VALUES ($1, $2)',
      [result.rows[0].id, 'applied']
    );

    res.status(201).json({
      message: 'Application submitted successfully',
      application: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// Get user's applications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        a.id,
        a.status,
        a.application_date,
        a.updated_at,
        a.cover_letter,
        j.id as job_id,
        j.title,
        j.company,
        j.location,
        j.salary_min,
        j.salary_max
      FROM applications a
      JOIN job_listings j ON a.job_id = j.id
      WHERE a.user_id = $1
    `;

    const params = [req.user.id];

    if (status) {
      query += ' AND a.status = $2';
      params.push(status);
    }

    query += ' ORDER BY a.application_date DESC';

    const result = await pool.query(query, params);

    res.json({
      applications: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
});

// Get application by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        a.*,
        j.title,
        j.company,
        j.description,
        j.location,
        j.application_url,
        rv.optimized_content,
        rv.file_path as resume_path
      FROM applications a
      JOIN job_listings j ON a.job_id = j.id
      LEFT JOIN resume_versions rv ON a.resume_version_id = rv.id
      WHERE a.id = $1 AND a.user_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get status history
    const historyResult = await pool.query(
      'SELECT * FROM application_status_history WHERE application_id = $1 ORDER BY created_at ASC',
      [id]
    );

    res.json({
      ...result.rows[0],
      status_history: historyResult.rows
    });
  } catch (error) {
    next(error);
  }
});

// Update application status
router.patch('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['applied', 'under_review', 'interview', 'offer', 'rejected', 'withdrawn'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Update status
    await pool.query(
      'UPDATE applications SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );

    // Add to status history
    await pool.query(
      'INSERT INTO application_status_history (application_id, status, notes) VALUES ($1, $2, $3)',
      [id, status, notes || null]
    );

    res.json({ message: 'Application status updated successfully' });
  } catch (error) {
    next(error);
  }
});

// Delete application
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Delete status history first
    await pool.query('DELETE FROM application_status_history WHERE application_id = $1', [id]);

    // Delete application
    await pool.query('DELETE FROM applications WHERE id = $1', [id]);

    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

