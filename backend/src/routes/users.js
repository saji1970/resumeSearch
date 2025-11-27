const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');
const { parseResume } = require('../services/resumeParser');
const { extractLinkedInInfo, extractWebsiteInfo, mergeExtractedData } = require('../services/profileExtractor');
const OpenAI = require('openai');

const router = express.Router();

// Lazy initialization of OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Configure multer for resume uploads in profile
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/resumes');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// Get user profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    // Check if suggested_job_roles column exists, if not, don't select it
    let profileColumns = 'up.professional_summary, up.career_goals, up.strengths, up.skills, up.preferences';
    try {
      const colCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name IN ('suggested_job_roles', 'linkedin_url', 'other_websites', 'job_search_criteria', 'extracted_metadata')
      `);
      const existingCols = colCheck.rows.map(r => r.column_name);
      if (existingCols.includes('suggested_job_roles')) profileColumns += ', up.suggested_job_roles';
      if (existingCols.includes('linkedin_url')) profileColumns += ', up.linkedin_url';
      if (existingCols.includes('other_websites')) profileColumns += ', up.other_websites';
      if (existingCols.includes('job_search_criteria')) profileColumns += ', up.job_search_criteria';
      if (existingCols.includes('extracted_metadata')) profileColumns += ', up.extracted_metadata';
    } catch (e) {
      // If check fails, use basic columns only
    }
    
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.phone, u.location, 
              ${profileColumns}
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const profile = result.rows[0];
    
    // Parse JSON fields
    if (profile.skills && typeof profile.skills === 'string') {
      try {
        profile.skills = JSON.parse(profile.skills);
      } catch (e) {}
    }
    if (profile.preferences && typeof profile.preferences === 'string') {
      try {
        profile.preferences = JSON.parse(profile.preferences);
      } catch (e) {}
    }
    if (profile.suggested_job_roles && typeof profile.suggested_job_roles === 'string') {
      try {
        profile.suggested_job_roles = JSON.parse(profile.suggested_job_roles);
      } catch (e) {}
    }
    if (profile.other_websites && typeof profile.other_websites === 'string') {
      try {
        profile.other_websites = JSON.parse(profile.other_websites);
      } catch (e) {}
    }
    if (profile.job_search_criteria && typeof profile.job_search_criteria === 'string') {
      try {
        profile.job_search_criteria = JSON.parse(profile.job_search_criteria);
      } catch (e) {}
    }
    if (profile.extracted_metadata && typeof profile.extracted_metadata === 'string') {
      try {
        profile.extracted_metadata = JSON.parse(profile.extracted_metadata);
      } catch (e) {}
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
});

// Update user profile with optional resume upload and website extraction
router.put('/profile', authenticate, upload.single('resume'), async (req, res, next) => {
  try {
    const { 
      name, phone, location, professional_summary, career_goals, strengths, skills, preferences,
      linkedin_url, other_websites, job_search_criteria
    } = req.body;

    let resumeData = null;
    let extractedMetadata = {};

    // Process resume upload if provided
    if (req.file) {
      try {
        const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                           process.env.OPENAI_API_KEY !== 'your-openai-api-key';
        
        if (hasOpenAIKey) {
          try {
            resumeData = await parseResume(req.file.path, req.file.mimetype);
            console.log('Resume parsed successfully:', resumeData ? 'Yes' : 'No');
          } catch (parseError) {
            console.error('Error parsing resume:', parseError);
            resumeData = {
              error: parseError.message,
              note: 'Resume uploaded but parsing failed. Please try again or upload a different format.'
            };
          }
          
          // Extract skills and suggest roles
          if (resumeData && !resumeData.error) {
            const openai = getOpenAIClient();
            if (openai && resumeData.experience && resumeData.experience.length > 0) {
              try {
                // Extract all skills
                const allSkills = [];
                if (resumeData.skills) {
                  if (resumeData.skills.technical) allSkills.push(...(Array.isArray(resumeData.skills.technical) ? resumeData.skills.technical : []));
                  if (resumeData.skills.soft) allSkills.push(...(Array.isArray(resumeData.skills.soft) ? resumeData.skills.soft : []));
                  if (resumeData.skills.languages) allSkills.push(...(Array.isArray(resumeData.skills.languages) ? resumeData.skills.languages : []));
                }

                // Suggest job roles
                const rolePrompt = `Based on this CV analysis, suggest 5-8 specific job roles/titles this candidate would be qualified for.
Experience: ${JSON.stringify(resumeData.experience.slice(0, 3))}
Skills: ${JSON.stringify(resumeData.skills)}
Education: ${JSON.stringify(resumeData.education || [])}
Return a JSON array of job role titles.`;

                const roleResponse = await openai.chat.completions.create({
                  model: 'gpt-4',
                  messages: [
                    {
                      role: 'system',
                      content: 'You are a career advisor. Analyze CVs and suggest suitable job roles. Always return a valid JSON array of job titles.'
                    },
                    {
                      role: 'user',
                      content: rolePrompt
                    }
                  ],
                  temperature: 0.5,
                  max_tokens: 500
                });

                const suggestedRoles = JSON.parse(roleResponse.choices[0].message.content);
                if (Array.isArray(suggestedRoles) && suggestedRoles.length > 0) {
                  extractedMetadata.suggested_job_roles = suggestedRoles;
                  extractedMetadata.skills = resumeData.skills;
                  extractedMetadata.experience = resumeData.experience;
                  extractedMetadata.education = resumeData.education;
                }
              } catch (roleError) {
                console.error('Error generating role suggestions:', roleError);
                // Continue without role suggestions
              }
            }
          }

          // Save resume to database (even if parsing had errors)
          try {
            const fileType = req.file.mimetype ? req.file.mimetype.substring(0, 255) : 'application/pdf';
            await pool.query(
              `INSERT INTO resumes (user_id, file_name, file_path, file_type, parsed_data, is_master)
               VALUES ($1, $2, $3, $4, $5, true)
               ON CONFLICT DO NOTHING`,
              [
                req.user.id,
                req.file.originalname,
                req.file.path,
                fileType,
                JSON.stringify(resumeData || {})
              ]
            );
            console.log('Resume saved to database');
          } catch (dbError) {
            console.error('Error saving resume to database:', dbError);
            // Continue with profile update even if resume save fails
          }
        } else {
          console.log('OpenAI API key not configured, skipping resume parsing');
          // Still save the file even without parsing
          try {
            const fileType = req.file.mimetype ? req.file.mimetype.substring(0, 255) : 'application/pdf';
            await pool.query(
              `INSERT INTO resumes (user_id, file_name, file_path, file_type, parsed_data, is_master)
               VALUES ($1, $2, $3, $4, $5, true)
               ON CONFLICT DO NOTHING`,
              [
                req.user.id,
                req.file.originalname,
                req.file.path,
                fileType,
                JSON.stringify({ note: 'Resume uploaded but parsing requires OpenAI API key' })
              ]
            );
          } catch (dbError) {
            console.error('Error saving resume to database:', dbError);
          }
        }
      } catch (resumeError) {
        console.error('Resume processing error:', resumeError);
        // Continue with profile update even if resume processing fails
      }
    }

    // Extract information from LinkedIn if provided
    let linkedinData = null;
    if (linkedin_url) {
      try {
        linkedinData = await extractLinkedInInfo(linkedin_url);
        if (linkedinData && linkedinData.extracted) {
          extractedMetadata.linkedin = linkedinData.fields;
        }
      } catch (liError) {
        console.error('LinkedIn extraction error:', liError);
      }
    }

    // Extract information from other websites if provided
    let websiteDataArray = [];
    if (other_websites) {
      const websites = typeof other_websites === 'string' ? JSON.parse(other_websites) : other_websites;
      if (Array.isArray(websites) && websites.length > 0) {
        for (const websiteUrl of websites) {
          try {
            const websiteData = await extractWebsiteInfo(websiteUrl);
            if (websiteData && websiteData.extracted) {
              websiteDataArray.push(websiteData);
              extractedMetadata.websites = extractedMetadata.websites || [];
              extractedMetadata.websites.push({
                url: websiteUrl,
                data: websiteData.data
              });
            }
          } catch (webError) {
            console.error(`Error extracting from ${websiteUrl}:`, webError);
          }
        }
      }
    }

    // Merge all extracted data
    if (resumeData || linkedinData || websiteDataArray.length > 0) {
      const merged = mergeExtractedData(resumeData, linkedinData, websiteDataArray);
      extractedMetadata.merged = merged;
      
      // Update skills from merged data
      if (merged.skills && Object.keys(merged.skills).length > 0) {
        skills = merged.skills;
      }
    }

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

    // Parse other_websites if it's a string
    let parsedOtherWebsites = other_websites;
    if (other_websites && typeof other_websites === 'string') {
      try {
        parsedOtherWebsites = JSON.parse(other_websites);
      } catch (e) {
        parsedOtherWebsites = [other_websites];
      }
    }

    // Parse job_search_criteria if it's a string
    let parsedJobCriteria = job_search_criteria;
    if (job_search_criteria && typeof job_search_criteria === 'string') {
      try {
        parsedJobCriteria = JSON.parse(job_search_criteria);
      } catch (e) {
        parsedJobCriteria = {};
      }
    }

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
      if (linkedin_url !== undefined) {
        profileFields.push(`linkedin_url = $${profileParamCount++}`);
        profileValues.push(linkedin_url);
      }
      if (parsedOtherWebsites !== undefined) {
        profileFields.push(`other_websites = $${profileParamCount++}`);
        profileValues.push(JSON.stringify(parsedOtherWebsites));
      }
      if (parsedJobCriteria !== undefined) {
        profileFields.push(`job_search_criteria = $${profileParamCount++}`);
        profileValues.push(JSON.stringify(parsedJobCriteria));
      }
      if (Object.keys(extractedMetadata).length > 0) {
        // Merge with existing extracted_metadata
        const existingResult = await pool.query(
          'SELECT extracted_metadata FROM user_profiles WHERE user_id = $1',
          [req.user.id]
        );
        let existingMetadata = {};
        if (existingResult.rows[0] && existingResult.rows[0].extracted_metadata) {
          try {
            existingMetadata = typeof existingResult.rows[0].extracted_metadata === 'string'
              ? JSON.parse(existingResult.rows[0].extracted_metadata)
              : existingResult.rows[0].extracted_metadata;
          } catch (e) {}
        }
        const mergedMetadata = { ...existingMetadata, ...extractedMetadata };
        profileFields.push(`extracted_metadata = $${profileParamCount++}`);
        profileValues.push(JSON.stringify(mergedMetadata));
        
        // Update suggested_job_roles if extracted
        if (extractedMetadata.suggested_job_roles) {
          profileFields.push(`suggested_job_roles = $${profileParamCount++}`);
          profileValues.push(JSON.stringify(extractedMetadata.suggested_job_roles));
        }
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
        `INSERT INTO user_profiles (user_id, professional_summary, career_goals, strengths, skills, preferences, 
         linkedin_url, other_websites, job_search_criteria, extracted_metadata, suggested_job_roles)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          req.user.id,
          professional_summary || null,
          career_goals || null,
          strengths || null,
          skills ? JSON.stringify(skills) : null,
          preferences ? JSON.stringify(preferences) : null,
          linkedin_url || null,
          parsedOtherWebsites ? JSON.stringify(parsedOtherWebsites) : '[]',
          parsedJobCriteria ? JSON.stringify(parsedJobCriteria) : '{}',
          Object.keys(extractedMetadata).length > 0 ? JSON.stringify(extractedMetadata) : '{}',
          extractedMetadata.suggested_job_roles ? JSON.stringify(extractedMetadata.suggested_job_roles) : '[]'
        ]
      );
    }

    res.json({ 
      message: 'Profile updated successfully',
      metadataExtracted: Object.keys(extractedMetadata).length > 0,
      extractedMetadata: Object.keys(extractedMetadata).length > 0 ? extractedMetadata : undefined
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

