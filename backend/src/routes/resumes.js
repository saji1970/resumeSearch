const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');
const { parseResume } = require('../services/resumeParser');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/resumes');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, DOC, TXT'));
    }
  }
});

// Upload and parse resume
router.post('/upload', authenticate, upload.single('resume'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { is_master } = req.body;
    const isMaster = is_master === 'true' || is_master === true;

    // Check if OpenAI API key is configured
    const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                         process.env.OPENAI_API_KEY !== 'your-openai-api-key';

    let parsedData = null;
    let parseError = null;

    // Try to parse resume using AI if OpenAI is configured
    if (hasOpenAIKey) {
      try {
        parsedData = await parseResume(req.file.path, req.file.mimetype);
        
        // Check if parsing returned an error
        if (parsedData && parsedData.error) {
          parseError = parsedData.error;
          parsedData = {
            name: null,
            email: null,
            skills: {},
            experience: [],
            education: [],
            note: 'Resume uploaded but parsing failed. Please configure OpenAI API key for full parsing.'
          };
        }
      } catch (parseErr) {
        console.error('Resume parsing error:', parseErr);
        parseError = parseErr.message || 'Failed to parse resume';
        // Create minimal parsed data structure
        parsedData = {
          name: null,
          email: null,
          skills: {},
          experience: [],
          education: [],
          note: 'Resume uploaded but parsing failed. Please configure OpenAI API key for full parsing.'
        };
      }
    } else {
      // No OpenAI key - create minimal structure
      parsedData = {
        name: null,
        email: null,
        skills: {},
        experience: [],
        education: [],
        note: 'Resume uploaded successfully. Configure OpenAI API key in backend/.env to enable AI parsing.'
      };
    }

    // Ensure user profile exists
    const profileCheck = await pool.query(
      'SELECT user_id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );
    
    if (profileCheck.rows.length === 0) {
      await pool.query(
        'INSERT INTO user_profiles (user_id) VALUES ($1)',
        [req.user.id]
      );
    }

    // Save resume record
    // Truncate mimetype to 255 chars to prevent database errors (safety measure)
    const fileType = req.file.mimetype ? req.file.mimetype.substring(0, 255) : null;
    
    const result = await pool.query(
      `INSERT INTO resumes (user_id, file_name, file_path, file_type, parsed_data, is_master)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, file_name, file_path, file_type, parsed_data, is_master, created_at`,
      [
        req.user.id,
        req.file.originalname,
        req.file.path,
        fileType,
        JSON.stringify(parsedData),
        isMaster
      ]
    );

    // If this is a master resume and we have skills, update user profile
    if (isMaster && parsedData && parsedData.skills && Object.keys(parsedData.skills).length > 0) {
      try {
        await pool.query(
          `UPDATE user_profiles SET skills = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2`,
          [JSON.stringify(parsedData.skills), req.user.id]
        );
      } catch (profileError) {
        console.error('Error updating user profile:', profileError);
        // Don't fail the upload if profile update fails
      }
    }

    // Return success with appropriate message
    const responseMessage = parseError 
      ? 'Resume uploaded but parsing failed. Please configure OpenAI API key for full parsing.'
      : !hasOpenAIKey
      ? 'Resume uploaded successfully. Configure OpenAI API key to enable AI parsing.'
      : 'Resume uploaded and parsed successfully';

    res.status(201).json({
      message: responseMessage,
      resume: result.rows[0],
      parsingEnabled: hasOpenAIKey,
      parseError: parseError || null
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    // Return user-friendly error message
    res.status(500).json({
      error: error.message || 'Failed to upload resume. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get user's resumes
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, file_name, file_path, file_type, parsed_data, is_master, created_at, updated_at
       FROM resumes
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get master resume
router.get('/master', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, file_name, file_path, file_type, parsed_data, is_master, created_at, updated_at
       FROM resumes
       WHERE user_id = $1 AND is_master = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No master resume found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete resume
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      'SELECT file_path FROM resumes WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete file
    try {
      await fs.unlink(checkResult.rows[0].file_path);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Delete database record
    await pool.query('DELETE FROM resumes WHERE id = $1', [id]);

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

