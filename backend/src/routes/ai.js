const express = require('express');
const OpenAI = require('openai');
const pool = require('../database/postgres');
const { authenticate } = require('../middleware/auth');
const huggingFaceService = require('../services/huggingFaceService');
const { parseResume } = require('../services/resumeParser');
const { searchWebJobs } = require('../services/webJobSearch');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

const router = express.Router();

// Lazy initialization of OpenAI client (only when needed and API key is available)
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null; // Return null if API key not configured
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Configure multer for CV uploads in chat
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/resumes');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.user.id}-chat-${uniqueSuffix}${path.extname(file.originalname)}`);
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
      cb(new Error('Invalid file type'));
    }
  }
});

// Generate cover letter
router.post('/cover-letter', authenticate, async (req, res, next) => {
  try {
    const { job_id, custom_message } = req.body;

    if (!job_id) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get job details
    const jobResult = await pool.query(
      'SELECT title, company, description FROM job_listings WHERE id = $1',
      [job_id]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    // Get user profile
    const userResult = await pool.query(
      `SELECT u.name, up.professional_summary, up.skills, up.career_goals
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );

    const user = userResult.rows[0] || {};

    // Generate cover letter using AI
    const prompt = `Write a professional cover letter for the following job application:

Job Title: ${job.title}
Company: ${job.company}
Job Description: ${job.description.substring(0, 2000)}

Candidate Information:
Name: ${user.name || 'Candidate'}
Professional Summary: ${user.professional_summary || 'Experienced professional'}
Skills: ${JSON.stringify(user.skills || {})}
Career Goals: ${user.career_goals || ''}

${custom_message ? `Additional instructions: ${custom_message}` : ''}

Write a compelling, personalized cover letter that:
1. Addresses the hiring manager
2. Highlights relevant experience and skills
3. Explains why the candidate is a good fit
4. Shows enthusiasm for the role and company
5. Includes a strong closing

Keep it professional, concise (3-4 paragraphs), and engaging.`;

    const openai = getOpenAIClient();
    if (!openai) {
      return res.status(503).json({ 
        error: 'OpenAI API key is not configured. Please configure OPENAI_API_KEY in environment variables.' 
      });
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert career coach and cover letter writer. Write professional, compelling cover letters.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const coverLetter = response.choices[0].message.content;

    res.json({
      cover_letter: coverLetter,
      job_title: job.title,
      company: job.company
    });
  } catch (error) {
    next(error);
  }
});

// Upload CV in chat
router.post('/chat/upload-cv', authenticate, upload.single('cv'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check if OpenAI API key is configured
    const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                         process.env.OPENAI_API_KEY !== 'your-openai-api-key';

    let parsedData = null;
    let parseError = null;

    // Try to parse CV if OpenAI is configured
    if (hasOpenAIKey) {
      try {
        parsedData = await parseResume(req.file.path, req.file.mimetype);
        
        if (parsedData && parsedData.error) {
          parseError = parsedData.error;
          parsedData = {
            name: null,
            email: null,
            skills: {},
            experience: [],
            education: [],
            note: 'CV uploaded but parsing failed. Please configure OpenAI API key for full parsing.'
          };
        }
      } catch (parseErr) {
        console.error('CV parsing error:', parseErr);
        parseError = parseErr.message || 'Failed to parse CV';
        parsedData = {
          name: null,
          email: null,
          skills: {},
          experience: [],
          education: [],
          note: 'CV uploaded but parsing failed. Please configure OpenAI API key for full parsing.'
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
        note: 'CV uploaded successfully. Configure OpenAI API key in backend/.env to enable AI parsing.'
      };
    }
    
    // Ensure user profile exists, create if not
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
    
    // Save CV analysis metadata to user profile for search functionality
    if (parsedData) {
      try {
        // Prepare update data
        const skillsToSave = parsedData.skills || {};
        const professionalSummary = parsedData.experience?.[0]?.description || 
                                   parsedData.professional_summary || 
                                   '';
        
        // Update user profile with skills, suggested roles, and other metadata
        await pool.query(
          `UPDATE user_profiles 
           SET skills = $1, 
               professional_summary = $2, 
               suggested_job_roles = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $4`,
          [
            JSON.stringify(skillsToSave),
            professionalSummary,
            JSON.stringify(suggestedRoles), // Store suggested roles as JSONB array
            req.user.id
          ]
        );
        
        console.log('✅ CV metadata saved to user profile:', {
          skillsCount: Object.keys(skillsToSave).length,
          rolesCount: suggestedRoles.length
        });
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't fail if profile update fails - continue with response
      }
    }

    // Generate questions based on CV
    let questions = [];
    try {
      if (parsedData && !parsedData.error) {
        questions = await huggingFaceService.analyzeCVAndGenerateQuestions(parsedData);
      }
    } catch (questionError) {
      console.error('Question generation error:', questionError);
    }
    
    // Use default questions if generation failed or no questions
    if (questions.length === 0) {
      questions = [
        "What type of job are you looking for?",
        "What's your preferred work location or remote work preference?",
        "What are your salary expectations?",
        "What are your main career goals?",
        "Which skills do you want to use in your next role?"
      ];
    }

    // Analyze CV and generate skills/roles summary
    let skillsSummary = '';
    let rolesSummary = '';
    let suggestedRoles = [];
    let allSkills = [];
    
    if (parsedData && !parseError && hasOpenAIKey) {
      try {
        // Extract all skills
        if (parsedData.skills) {
          if (parsedData.skills.technical && Array.isArray(parsedData.skills.technical)) {
            allSkills.push(...parsedData.skills.technical);
          }
          if (parsedData.skills.soft && Array.isArray(parsedData.skills.soft)) {
            allSkills.push(...parsedData.skills.soft);
          }
          if (parsedData.skills.languages && Array.isArray(parsedData.skills.languages)) {
            allSkills.push(...parsedData.skills.languages);
          }
        }
        
        // Format skills summary
        if (allSkills.length > 0) {
          const uniqueSkills = [...new Set(allSkills)];
          allSkills = uniqueSkills; // Store unique skills
          skillsSummary = `\n\n📋 **Skills Identified:**\n${uniqueSkills.map(skill => `• ${skill}`).join('\n')}`;
        }
        
        // Use AI to suggest suitable job roles based on CV
        const openai = getOpenAIClient();
        if (openai && parsedData.experience && parsedData.experience.length > 0) {
          try {
            const rolePrompt = `Based on this CV analysis, suggest 5-8 specific job roles/titles this candidate would be qualified for. Consider their experience, skills, and education.

Experience: ${JSON.stringify(parsedData.experience.slice(0, 3))}
Skills: ${JSON.stringify(parsedData.skills)}
Education: ${JSON.stringify(parsedData.education || [])}

Return a JSON array of job role titles, like: ["Senior Software Engineer", "Product Manager", "Technical Lead"]`;

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

            suggestedRoles = JSON.parse(roleResponse.choices[0].message.content);
            if (Array.isArray(suggestedRoles) && suggestedRoles.length > 0) {
              rolesSummary = `\n\n🎯 **Suitable Job Roles:**\n${suggestedRoles.map(role => `• ${role}`).join('\n')}`;
            }
          } catch (roleError) {
            console.error('Error generating role suggestions:', roleError);
            // Fallback: generate roles from experience titles
            if (parsedData.experience && parsedData.experience.length > 0) {
              suggestedRoles = parsedData.experience
                .map(exp => exp.title)
                .filter((title, index, self) => self.indexOf(title) === index)
                .slice(0, 5);
              if (suggestedRoles.length > 0) {
                rolesSummary = `\n\n🎯 **Potential Roles (based on your experience):**\n${suggestedRoles.map(role => `• ${role}`).join('\n')}`;
              }
            }
          }
        } else if (parsedData.experience && parsedData.experience.length > 0) {
          // Fallback: use experience titles as roles
          suggestedRoles = parsedData.experience
            .map(exp => exp.title)
            .filter((title, index, self) => self.indexOf(title) === index)
            .slice(0, 5);
          if (suggestedRoles.length > 0) {
            rolesSummary = `\n\n🎯 **Potential Roles (based on your experience):**\n${suggestedRoles.map(role => `• ${role}`).join('\n')}`;
          }
        }
      } catch (analysisError) {
        console.error('Error analyzing CV:', analysisError);
      }
    }
    
    // Build response message
    let responseMessage;
    if (parseError || !hasOpenAIKey) {
      responseMessage = hasOpenAIKey 
        ? `I've received your CV. However, I couldn't fully parse it. ${parsedData.note || ''}\n\nLet me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : `I've received your CV! ${parsedData.note || ''}\n\nLet me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    } else {
      responseMessage = `✅ **CV Analysis Complete!**\n\nI've analyzed your CV and here's what I found:${skillsSummary}${rolesSummary}\n\n💬 **Next Steps:**\nLet me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    }

    res.json({
      message: 'CV uploaded successfully',
      cvData: parsedData,
      questions: questions,
      response: responseMessage,
      parsingEnabled: hasOpenAIKey,
      parseError: parseError || null
    });
  } catch (error) {
    console.error('CV upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    // Return user-friendly error
    res.status(500).json({
      error: error.message || 'Failed to upload CV. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Enhanced AI chat assistant with CV understanding and job search
router.post('/chat', authenticate, async (req, res, next) => {
  try {
    const { message, context, searchJobs } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user context including CV data from ANY uploaded resume (not just master)
    // This ensures CVs uploaded from Resume, Profile, or AI Assistant are all accessible
    // Also fetch suggested_job_roles, job_search_criteria, and extracted_metadata from user profile
    const userResult = await pool.query(
      `SELECT u.name, u.email, 
              up.professional_summary, up.skills, up.career_goals, up.suggested_job_roles,
              up.job_search_criteria, up.extracted_metadata, up.linkedin_url, up.other_websites,
              r.parsed_data as cv_data, r.file_name, r.created_at as cv_uploaded_at
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN resumes r ON r.user_id = u.id
       WHERE u.id = $1
       ORDER BY r.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const user = userResult.rows[0] || {};
    let cvData = user.cv_data ? (typeof user.cv_data === 'string' ? JSON.parse(user.cv_data) : user.cv_data) : null;
    
    // Parse user profile metadata
    let profileSkills = null;
    let suggestedRoles = [];
    let jobSearchCriteria = {};
    let extractedMetadata = {};
    
    if (user.skills) {
      try {
        profileSkills = typeof user.skills === 'string' ? JSON.parse(user.skills) : user.skills;
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (user.suggested_job_roles) {
      try {
        suggestedRoles = typeof user.suggested_job_roles === 'string' 
          ? JSON.parse(user.suggested_job_roles) 
          : user.suggested_job_roles;
        if (!Array.isArray(suggestedRoles)) {
          suggestedRoles = [];
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    if (user.job_search_criteria) {
      try {
        jobSearchCriteria = typeof user.job_search_criteria === 'string' 
          ? JSON.parse(user.job_search_criteria) 
          : user.job_search_criteria;
        if (!jobSearchCriteria || typeof jobSearchCriteria !== 'object') {
          jobSearchCriteria = {};
        }
      } catch (e) {
        jobSearchCriteria = {};
      }
    }
    
    if (user.extracted_metadata) {
      try {
        extractedMetadata = typeof user.extracted_metadata === 'string'
          ? JSON.parse(user.extracted_metadata)
          : user.extracted_metadata;
        if (!extractedMetadata || typeof extractedMetadata !== 'object') {
          extractedMetadata = {};
        }
      } catch (e) {
        extractedMetadata = {};
      }
    }
    
    // Merge CV data with profile metadata - profile data takes precedence as it's more recent
    if (!cvData) {
      cvData = {};
    }
    
    // Use profile skills if available (they're from the most recent CV analysis)
    if (profileSkills && Object.keys(profileSkills).length > 0) {
      cvData.skills = profileSkills;
    }
    
    // Add suggested roles to CV data for context
    if (suggestedRoles.length > 0) {
      cvData.suggested_job_roles = suggestedRoles;
    }
    
    // Check if job search criteria needs to be collected
    const needsJobCriteria = !jobSearchCriteria || 
                            Object.keys(jobSearchCriteria).length === 0 ||
                            !jobSearchCriteria.job_titles || 
                            !jobSearchCriteria.preferred_locations ||
                            !jobSearchCriteria.salary_expectations;
    
    // Check if user wants to search for jobs or provided job requirements (needed for criteria extraction)
    const jobSearchKeywords = ['find jobs', 'search jobs', 'job search', 'looking for', 'need a job', 'find me', 'show me jobs', 'search for'];
    const hasJobTitle = /\b(senior|sr|jr|junior|lead|principal|manager|director|engineer|developer|analyst|designer|product|marketing|sales|accountant|nurse|teacher|doctor|lawyer)\b/i.test(message);
    const hasLocation = /\b(in|at|near|around)\s+[A-Z][a-z]+(\s+[A-Z]{2})?/i.test(message) || 
                       /\b([A-Z][a-z]+\s+[A-Z]{2})\b/.test(message) ||
                       /\b(remote|hybrid|onsite|on-site)\b/i.test(message);
    const hasSalary = /\b(above|over|at least|minimum|need|want|expect|salary|pay|compensation)\s*\$?\d+/i.test(message) || 
                     /\$\d+/i.test(message) ||
                     /\b\d{5,}\b/.test(message);
    const hasJobType = /\b(product management|software engineer|developer|manager|analyst|designer|marketing|sales)\b/i.test(message);
    const hasJobInfo = hasJobTitle || hasJobType || /\b(product|management|engineer|developer|manager|director|analyst)\b/i.test(message);
    const hasLocationOrSalary = hasLocation || hasSalary;
    const mightWantJobs = searchJobs || 
                         jobSearchKeywords.some(keyword => message.toLowerCase().includes(keyword)) ||
                         (hasJobInfo && hasLocationOrSalary) ||
                         (hasJobTitle && message.length > 15) ||
                         (hasJobType && (hasLocation || hasSalary)) ||
                         message.toLowerCase().includes('job');
    
    // Use NLP to extract job search criteria from the conversation
    const openai = getOpenAIClient();
    let extractedCriteria = null;
    if (openai && (needsJobCriteria || mightWantJobs)) {
      try {
        const criteriaExtractionPrompt = `Extract job search criteria from this user message. Return a JSON object with:
- job_titles: array of job titles/roles mentioned (e.g., ["Senior Product Manager", "Software Engineer"])
- preferred_locations: array of locations mentioned (e.g., ["Atlanta, GA", "Remote"])
- salary_expectations: object with min and max (e.g., {"min": 150000, "max": 200000, "currency": "USD"})
- remote_preference: "remote", "hybrid", "onsite", or null
- job_types: array of job types (e.g., ["full-time", "contract"])
- industries: array of industries if mentioned
- other_preferences: any other preferences mentioned

User message: "${message}"

If no criteria is mentioned, return an empty object {}. Return only valid JSON, no markdown.`;

        const criteriaResponse = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'Extract job search criteria from user messages. Return only valid JSON.'
            },
            {
              role: 'user',
              content: criteriaExtractionPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        });

        const extracted = JSON.parse(criteriaResponse.choices[0].message.content);
        if (extracted && Object.keys(extracted).length > 0) {
          extractedCriteria = extracted;
          // Merge with existing criteria
          jobSearchCriteria = {
            ...jobSearchCriteria,
            ...extractedCriteria,
            job_titles: [...(jobSearchCriteria.job_titles || []), ...(extractedCriteria.job_titles || [])].filter((v, i, a) => a.indexOf(v) === i),
            preferred_locations: [...(jobSearchCriteria.preferred_locations || []), ...(extractedCriteria.preferred_locations || [])].filter((v, i, a) => a.indexOf(v) === i)
          };
          
          // Save updated criteria to profile
          await pool.query(
            `UPDATE user_profiles 
             SET job_search_criteria = $1, updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $2`,
            [JSON.stringify(jobSearchCriteria), req.user.id]
          );
        }
      } catch (extractError) {
        console.error('Error extracting job criteria:', extractError);
      }
    }

    // Determine if we should search for jobs (using variables already defined above)
    const shouldSearchJobs = mightWantJobs;

    let jobResults = null;
    let searchQuery = '';
    let searchLocation = '';
    
    if (shouldSearchJobs) {
      // Extract job title from message - improved patterns
      const jobTitlePatterns = [
        /\b(sr|senior|lead|principal|junior|jr)\s+(product\s+management|software\s+engineer|developer|manager|analyst|designer|director)/i,
        /\b(product\s+management|software\s+engineer|developer|manager|analyst|designer|director|specialist|coordinator|assistant|executive|marketing|sales)\b/i,
        /\b(sr|senior|lead|principal|junior|jr)?\s*([a-z\s]+(?:manager|engineer|developer|analyst|designer|director|specialist|coordinator|assistant|executive|product|marketing|sales|accountant|nurse|teacher|doctor|lawyer|consultant))/i
      ];
      
      let jobTitleMatch = null;
      for (const pattern of jobTitlePatterns) {
        jobTitleMatch = message.match(pattern);
        if (jobTitleMatch) {
          searchQuery = jobTitleMatch[0].trim();
          break;
        }
      }
      
      if (!jobTitleMatch) {
        // Try to extract from common patterns
        const patterns = [
          /(?:looking for|need|want|search for)\s+([a-z\s]+(?:manager|engineer|developer|analyst|designer|director))/i,
          /(?:position|role|job)\s+(?:as|in)?\s*([a-z\s]+(?:manager|engineer|developer|analyst|designer|director))/i,
          /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:manager|engineer|developer|analyst|designer|director|specialist))/i
        ];
        
        for (const pattern of patterns) {
          const match = message.match(pattern);
          if (match) {
            searchQuery = match[1] || match[0];
            break;
          }
        }
      }
      
      // Extract location - improved pattern matching
      const locationPatterns = [
        /\b([A-Z][a-z]+\s+[A-Z]{2})\b/, // "Atlanta GA", "New York NY"
        /\b(in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z]{2})?)/i, // "in Atlanta GA"
        /\b([A-Z][a-z]+),\s*([A-Z]{2})\b/, // "Atlanta, GA"
        /\b([A-Z][a-z]+)\s+([A-Z]{2})\b/ // "Atlanta GA" (already matched above but keep for clarity)
      ];
      
      for (const pattern of locationPatterns) {
        const locationMatch = message.match(pattern);
        if (locationMatch) {
          // Extract city name (first capture group or second if "in/at" pattern)
          searchLocation = locationMatch[2] || locationMatch[1];
          // Clean up - remove state abbreviation if included
          searchLocation = searchLocation.replace(/\s*[A-Z]{2}$/, '').trim();
          if (searchLocation) break;
        }
      }
      
      // If no specific query extracted, use the message itself
      if (!searchQuery) {
        // Remove common words and keep job-related terms
        searchQuery = message
          .replace(/\b(above|over|at least|minimum|need|want|expect|salary|pay|compensation|in|at|near|around|ga|ny|ca|tx|fl)\b/gi, '')
          .replace(/\$\d+/g, '')
          .replace(/\b\d{5,}\b/g, '') // Remove large numbers (salary)
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
          .substring(0, 100);
        
        // If still empty or too short, use default
        if (!searchQuery || searchQuery.length < 3) {
          searchQuery = 'product management';
        }
      }
      
      // Log for debugging
      console.log('Job search triggered:', { 
        message, 
        searchQuery, 
        searchLocation, 
        shouldSearchJobs 
      });
      
      // Use job search criteria if available
      if (jobSearchCriteria && jobSearchCriteria.job_titles && jobSearchCriteria.job_titles.length > 0 && !searchQuery) {
        searchQuery = jobSearchCriteria.job_titles[0];
      }
      if (jobSearchCriteria && jobSearchCriteria.preferred_locations && jobSearchCriteria.preferred_locations.length > 0 && !searchLocation) {
        searchLocation = jobSearchCriteria.preferred_locations[0];
      }
      
      // Clean up the query
      searchQuery = searchQuery.trim();
      if (!searchQuery) {
        searchQuery = cvData?.experience?.[0]?.title || 
                     (jobSearchCriteria?.job_titles?.[0]) || 
                     (cvData?.suggested_job_roles?.[0]) ||
                     'software engineer';
      }
      
      try {
        const webResults = await searchWebJobs(searchQuery, searchLocation, { 
          limit: 5,
          salary_min: jobSearchCriteria?.salary_expectations?.min,
          remote: jobSearchCriteria?.remote_preference === 'remote' || jobSearchCriteria?.remote_preference === 'hybrid'
        });
        if (webResults.jobs && webResults.jobs.length > 0) {
          jobResults = webResults.jobs;
        }
      } catch (jobError) {
        console.error('Job search error:', jobError);
      }
    }

    // Build comprehensive context-aware prompt with all CV metadata
    let systemPrompt = `You are an AI career assistant helping job seekers. You have access to their complete CV/resume metadata and should use this information throughout the entire conversation to provide personalized, context-aware responses.

=== USER PROFILE & CV METADATA ===
Name: ${user.name || 'User'}
Professional Summary: ${user.professional_summary || 'Not provided'}
Career Goals: ${user.career_goals || 'Not specified'}`;

    // Include comprehensive CV data if available
    if (cvData && (cvData.skills || cvData.experience || cvData.education || cvData.suggested_job_roles)) {
      systemPrompt += `\n\n=== CV/RESUME ANALYSIS ===`;
      
      if (cvData.skills && Object.keys(cvData.skills).length > 0) {
        const allSkills = [];
        if (cvData.skills.technical) allSkills.push(...(Array.isArray(cvData.skills.technical) ? cvData.skills.technical : []));
        if (cvData.skills.soft) allSkills.push(...(Array.isArray(cvData.skills.soft) ? cvData.skills.soft : []));
        if (cvData.skills.languages) allSkills.push(...(Array.isArray(cvData.skills.languages) ? cvData.skills.languages : []));
        
        systemPrompt += `\n\nSKILLS (Use these throughout the conversation):
${allSkills.length > 0 ? allSkills.map(s => `- ${s}`).join('\n') : 'Not specified'}`;
        
        if (cvData.skills.technical && Array.isArray(cvData.skills.technical) && cvData.skills.technical.length > 0) {
          systemPrompt += `\n\nTechnical Skills: ${cvData.skills.technical.join(', ')}`;
        }
        if (cvData.skills.soft && Array.isArray(cvData.skills.soft) && cvData.skills.soft.length > 0) {
          systemPrompt += `\nSoft Skills: ${cvData.skills.soft.join(', ')}`;
        }
      }
      
      if (cvData.experience && Array.isArray(cvData.experience) && cvData.experience.length > 0) {
        systemPrompt += `\n\nEXPERIENCE (Reference this when discussing career):
${cvData.experience.slice(0, 5).map(exp => 
  `- ${exp.title || 'Position'} at ${exp.company || 'Company'}${exp.description ? `: ${exp.description.substring(0, 100)}` : ''}`
).join('\n')}`;
      }
      
      if (cvData.education && Array.isArray(cvData.education) && cvData.education.length > 0) {
        systemPrompt += `\n\nEDUCATION:
${cvData.education.map(edu => 
  `- ${edu.degree || 'Degree'} from ${edu.institution || 'Institution'}`
).join('\n')}`;
      }
      
       if (cvData.suggested_job_roles && Array.isArray(cvData.suggested_job_roles) && cvData.suggested_job_roles.length > 0) {
         systemPrompt += `\n\nSUGGESTED JOB ROLES (Based on CV analysis - reference these when discussing jobs):
 ${cvData.suggested_job_roles.map(role => `- ${role}`).join('\n')}`;
       }
     } else {
       systemPrompt += `\n\nCV Status: No CV has been uploaded yet. Ask the user to upload their CV for personalized assistance.`;
     }
     
     // Add job search criteria if available
     if (jobSearchCriteria && Object.keys(jobSearchCriteria).length > 0) {
       systemPrompt += `\n\n=== JOB SEARCH CRITERIA (Use these when searching for jobs) ===`;
       if (jobSearchCriteria.job_titles && jobSearchCriteria.job_titles.length > 0) {
         systemPrompt += `\nPreferred Job Titles: ${jobSearchCriteria.job_titles.join(', ')}`;
       }
       if (jobSearchCriteria.preferred_locations && jobSearchCriteria.preferred_locations.length > 0) {
         systemPrompt += `\nPreferred Locations: ${jobSearchCriteria.preferred_locations.join(', ')}`;
       }
       if (jobSearchCriteria.salary_expectations) {
         const sal = jobSearchCriteria.salary_expectations;
         systemPrompt += `\nSalary Expectations: ${sal.min ? `$${sal.min}` : ''}${sal.max ? ` - $${sal.max}` : ''}${sal.currency || 'USD'}`;
       }
       if (jobSearchCriteria.remote_preference) {
         systemPrompt += `\nRemote Preference: ${jobSearchCriteria.remote_preference}`;
       }
       if (jobSearchCriteria.industries && jobSearchCriteria.industries.length > 0) {
         systemPrompt += `\nIndustries: ${jobSearchCriteria.industries.join(', ')}`;
       }
     } else {
       systemPrompt += `\n\nJOB SEARCH CRITERIA: Not yet collected. You should conversationally ask the user about their job preferences:
- What job titles/roles are they interested in?
- Preferred locations (cities, states, or remote)?
- Salary expectations (minimum and ideal range)?
- Remote work preference (remote, hybrid, onsite)?
- Any specific industries or company types?
- Job type preferences (full-time, contract, part-time)?

Ask these questions naturally in conversation, not all at once. Extract information as they provide it.`;
     }

     systemPrompt += `\n\n=== YOUR ROLE & INSTRUCTIONS ===
 You MUST use the CV metadata and job search criteria above in EVERY response. This is critical for providing personalized assistance.
 
 1. ALWAYS reference the user's skills, experience, and suggested roles when relevant
 2. When discussing jobs, match them to the user's background, suggested roles, AND job search criteria
 3. When asked about their resume/CV, use the metadata to provide specific insights
 4. When suggesting jobs, prioritize roles from the "SUGGESTED JOB ROLES" list AND their job search criteria
 5. When discussing skills, reference their actual skills from the CV
 6. When providing career advice, base it on their experience and education
 7. If job search criteria is missing, conversationally ask about their preferences (job titles, locations, salary, remote work)
 8. Use NLP to extract job search criteria from natural conversation - don't ask for a form, extract it naturally
 9. When searching for jobs, use their job search criteria to refine the search
 10. Be conversational, friendly, and helpful
 11. Use NLP to understand natural language queries
 12. If the user asks about jobs without specifying details, use their suggested roles, skills, AND job search criteria to guide the search
  
 CRITICAL: 
 - The CV metadata above is your source of truth. Use it actively in every conversation.
 - Job search criteria should be collected conversationally through natural dialogue.
 - When criteria is provided, save it and use it for all future job searches.
 - Don't just acknowledge metadata exists - actively reference specific skills, roles, experience, and preferences when relevant.`;

    // Detect if user wants CV analysis or job recommendations
    const cvAnalysisKeywords = [
      'read my resume', 'read my cv', 'understand my resume', 'understand my cv',
      'analyze my resume', 'analyze my cv', 'look at my resume', 'look at my cv',
      'suggest jobs', 'jobs i can apply', 'job profiles', 'recommend jobs',
      'what jobs', 'which jobs', 'suitable jobs', 'match my resume'
    ];
    
    const wantsCVAnalysis = cvAnalysisKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    // If user wants CV analysis, enhance the prompt with stored metadata
    if (wantsCVAnalysis) {
      if (cvData && (cvData.skills || cvData.experience || cvData.education || cvData.suggested_job_roles)) {
        // User has CV data - provide detailed analysis using stored metadata
        const rolesToSuggest = cvData.suggested_job_roles && cvData.suggested_job_roles.length > 0
          ? cvData.suggested_job_roles
          : [];
        
        systemPrompt += `\n\n=== USER REQUEST: CV Analysis & Job Recommendations ===
The user wants you to analyze their CV and suggest job profiles they can apply for.

IMPORTANT: You already have their CV metadata above. Use it to provide specific recommendations.

Your Response Should:
1. Acknowledge that you've analyzed their CV (reference specific skills and experience)
2. Highlight their key skills from the CV metadata above
3. ${rolesToSuggest.length > 0 
  ? `Use the SUGGESTED JOB ROLES from their CV analysis: ${rolesToSuggest.join(', ')}. Explain why each role is a good fit based on their skills and experience.`
  : 'Suggest 5-10 specific job titles/roles they\'re qualified for based on their background (use their skills and experience to determine these)'}
4. For each suggested role, explain why it matches their skills and experience
5. Optionally search for actual job openings matching these profiles
6. Be specific - reference actual skills and experience from their CV, don't be generic`;
      } else {
        // User doesn't have CV uploaded yet
        systemPrompt += `\n\n=== USER REQUEST: CV Analysis Requested ===
The user wants you to analyze their CV and suggest job profiles, but they haven't uploaded a CV yet.

Your Response Should:
1. Politely inform them that you don't see a CV uploaded yet
2. Ask them to upload their CV first (they can do this in the chat or from the Resume/Profile pages)
3. Explain that once uploaded, you can analyze their skills and suggest suitable job profiles
4. Offer to help them understand what information would be useful`;
      }
    }

    // Use OpenAI for conversational response (Hugging Face as optional fallback)
    let aiResponse;
    const hasOpenAIKey = process.env.OPENAI_API_KEY && 
                         process.env.OPENAI_API_KEY !== 'your-openai-api-key';
    
    if (hasOpenAIKey) {
      try {
        // Use OpenAI for better conversational responses with NLP understanding
        const openai = getOpenAIClient();
        if (!openai) {
          throw new Error('OpenAI client not available');
        }
        
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...(context || []),
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 800 // Increased for job recommendations
        });
        aiResponse = response.choices[0].message.content;
        
        // If user wants CV analysis, also search for jobs matching their profile
        if (wantsCVAnalysis && cvData) {
          // Extract job search query from CV data
          let jobSearchQuery = '';
          
          // Try to get job title from most recent experience
          if (cvData.experience && cvData.experience.length > 0) {
            const latestExp = cvData.experience[0];
            jobSearchQuery = latestExp.title || latestExp.position || '';
          }
          
          // If no title, try to extract from skills
          if (!jobSearchQuery && cvData.skills) {
            const technicalSkills = cvData.skills.technical || cvData.skills.hard || [];
            if (Array.isArray(technicalSkills) && technicalSkills.length > 0) {
              jobSearchQuery = technicalSkills.slice(0, 2).join(' ');
            } else if (typeof technicalSkills === 'object') {
              const skillKeys = Object.keys(technicalSkills).slice(0, 2);
              jobSearchQuery = skillKeys.join(' ');
            }
          }
          
          // Fallback to generic search
          if (!jobSearchQuery) {
            jobSearchQuery = 'software engineer'; // Generic fallback
          }
          
          try {
            console.log('Searching jobs for CV analysis with query:', jobSearchQuery);
            const webResults = await searchWebJobs(jobSearchQuery, '', { limit: 10 });
            if (webResults.jobs && webResults.jobs.length > 0) {
              jobResults = webResults.jobs;
              console.log(`Found ${jobResults.length} jobs matching CV profile`);
            }
          } catch (jobError) {
            console.error('Job search error during CV analysis:', jobError);
          }
        }
      } catch (openaiError) {
        console.error('OpenAI error:', openaiError.message);
        // Fallback to Hugging Face if OpenAI fails
        try {
          const conversationHistory = (context || []).map(msg => ({
            role: msg.role,
            content: msg.content
          }));
          aiResponse = await huggingFaceService.chat(message, conversationHistory);
        } catch (hfError) {
          console.error('Both AI services failed:', hfError.message);
          // Final fallback - provide helpful response based on context
          if (shouldSearchJobs && jobResults && jobResults.length > 0) {
            aiResponse = "I found some jobs for you! Check the results below.";
          } else if (shouldSearchJobs) {
            aiResponse = "I searched for jobs but didn't find any matching results. Would you like me to try a different search or refine your criteria?";
          } else {
            aiResponse = "I'm here to help you with your job search! You can:\n\n• Upload your CV for analysis\n• Ask me about job requirements\n• Search for jobs by typing your requirements\n• Get career advice\n\nWhat would you like to do?";
          }
        }
      }
    } else {
      // No OpenAI key - try Hugging Face
      try {
        const conversationHistory = (context || []).map(msg => ({
          role: msg.role,
          content: msg.content
        }));
        aiResponse = await huggingFaceService.chat(message, conversationHistory);
      } catch (hfError) {
        console.error('Hugging Face error:', {
          message: hfError.message,
          status: hfError.response?.status,
          data: hfError.response?.data
        });
        
        // Provide helpful response based on context and error type
        if (hfError.message?.includes('loading')) {
          aiResponse = "The AI model is loading. This usually takes 20-30 seconds on the first request. Please try again in a moment, or configure OpenAI API key for faster responses.";
        } else if (hfError.message?.includes('authentication')) {
          aiResponse = "There's an issue with the AI service authentication. Please check the Hugging Face API key configuration.";
        } else if (shouldSearchJobs && jobResults && jobResults.length > 0) {
          aiResponse = "I found some jobs for you! Check the results below.";
        } else if (shouldSearchJobs) {
          aiResponse = "I searched for jobs but didn't find any matching results. Would you like me to try a different search or refine your criteria?";
        } else {
          aiResponse = "I'm here to help you with your job search! You can:\n\n• Upload your CV for analysis\n• Ask me about job requirements\n• Search for jobs by typing your requirements (e.g., 'Sr product management Atlanta GA')\n• Get career advice\n\nWhat would you like to do?";
        }
      }
    }

    // If job criteria is missing and user is asking about jobs, add a conversational prompt
    if (needsJobCriteria && (shouldSearchJobs || message.toLowerCase().includes('job'))) {
      const criteriaPrompt = `\n\nTo help me find the best jobs for you, could you tell me:\n- What job titles or roles are you interested in?${cvData?.suggested_job_roles?.length > 0 ? ` (I see your CV suggests: ${cvData.suggested_job_roles.slice(0, 3).join(', ')})` : ''}\n- Preferred locations? (cities, states, or remote?)\n- Salary expectations? (minimum or range?)\n\nYou can share this information naturally in our conversation, and I'll remember it for future searches!`;
      
      if (!aiResponse || aiResponse.includes("I'm having trouble") || aiResponse.includes("rephrase")) {
        aiResponse = `I'd love to help you find jobs!${criteriaPrompt}`;
      } else {
        aiResponse += criteriaPrompt;
      }
    }
    
    // Enhance response with job results if available
    if (jobResults && jobResults.length > 0) {
      const jobList = jobResults.slice(0, 5).map((job, idx) => {
        let jobInfo = `${idx + 1}. ${job.title} at ${job.company}`;
        if (job.location) jobInfo += ` - ${job.location}`;
        if (job.salary_min) {
          jobInfo += ` ($${job.salary_min.toLocaleString()}`;
          if (job.salary_max) jobInfo += ` - $${job.salary_max.toLocaleString()}`;
          jobInfo += ')';
        }
        return jobInfo;
      }).join('\n');
      
      // If AI response is the generic error, replace it with job-focused response
      if (aiResponse.includes("I'm having trouble processing") || aiResponse.includes("rephrase")) {
        aiResponse = `Great! I've searched for jobs matching your requirements. Here are some positions I found:\n\n${jobList}\n\nWould you like me to:\n- Search for more specific positions?\n- Help you understand any of these roles better?\n- Refine the search with different criteria?`;
      } else {
        aiResponse = `Great! I've searched for jobs matching your requirements. Here are some positions I found:\n\n${jobList}\n\n${aiResponse}\n\nWould you like me to search for more specific positions or help you understand any of these roles better?`;
      }
    } else if (shouldSearchJobs && (!jobResults || jobResults.length === 0)) {
      // If we tried to search but got no results
      if (aiResponse.includes("I'm having trouble processing") || aiResponse.includes("rephrase")) {
        aiResponse = `I searched for jobs matching "${searchQuery}"${searchLocation ? ` in ${searchLocation}` : ''} but didn't find any matching results. 

This could be because:
- The search terms need to be more specific
- There might not be jobs available for that exact combination
- The job search API might need a moment to process

Would you like me to:
- Try a different search query?
- Search in a different location?
- Help you refine your job requirements?`;
      } else {
        aiResponse += `\n\nI searched for jobs but didn't find any matching results. Would you like me to try a different search or refine your criteria?`;
      }
    }

    res.json({
      response: aiResponse,
      jobs: jobResults,
      cvAnalyzed: !!cvData
    });
  } catch (error) {
    console.error('Chat error:', error);
    next(error);
  }
});

module.exports = router;

