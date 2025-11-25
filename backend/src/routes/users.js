const express = require('express');
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.location, 
              up.professional_summary, up.career_goals, up.strengths, up.skills, up.preferences
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const { name, phone, location, professional_summary, career_goals, strengths, skills, preferences } = req.body;

    // Update user table
    if (name !== undefined || phone !== undefined || location !== undefined) {
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${paramCount++}`);
        values.push(name);
      }
      if (phone !== undefined) {
        updateFields.push(`phone = $${paramCount++}`);
        values.push(phone);
      }
      if (location !== undefined) {
        updateFields.push(`location = $${paramCount++}`);
        values.push(location);
      }
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.user.id);

      await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    }

    // Update or insert user profile
    const profileExists = await pool.query(
      'SELECT id FROM user_profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileExists.rows.length > 0) {
      // Update existing profile
      const profileFields = [];
      const profileValues = [];
      let profileParamCount = 1;

      if (professional_summary !== undefined) {
        profileFields.push(`professional_summary = $${profileParamCount++}`);
        profileValues.push(professional_summary);
      }
      if (career_goals !== undefined) {
        profileFields.push(`career_goals = $${profileParamCount++}`);
        profileValues.push(career_goals);
      }
      if (strengths !== undefined) {
        profileFields.push(`strengths = $${profileParamCount++}`);
        profileValues.push(strengths);
      }
      if (skills !== undefined) {
        profileFields.push(`skills = $${profileParamCount++}`);
        profileValues.push(JSON.stringify(skills));
      }
      if (preferences !== undefined) {
        profileFields.push(`preferences = $${profileParamCount++}`);
        profileValues.push(JSON.stringify(preferences));
      }
      profileFields.push(`updated_at = CURRENT_TIMESTAMP`);
      profileValues.push(req.user.id);

      await pool.query(
        `UPDATE user_profiles SET ${profileFields.join(', ')} WHERE user_id = $${profileParamCount}`,
        profileValues
      );
    } else {
      // Insert new profile
      await pool.query(
        `INSERT INTO user_profiles (user_id, professional_summary, career_goals, strengths, skills, preferences)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user.id,
          professional_summary || null,
          career_goals || null,
          strengths || null,
          skills ? JSON.stringify(skills) : null,
          preferences ? JSON.stringify(preferences) : null
        ]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

