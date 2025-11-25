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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    
    // Save CV data to user profile if we have skills
    if (parsedData && parsedData.skills && Object.keys(parsedData.skills).length > 0) {
      try {
        await pool.query(
          `UPDATE user_profiles 
           SET skills = $1, professional_summary = $2, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3`,
          [
            JSON.stringify(parsedData.skills || {}),
            parsedData.experience?.[0]?.description || '',
            req.user.id
          ]
        );
      } catch (dbError) {
        console.error('Database update error:', dbError);
        // Don't fail if profile update fails
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

    // Build response message
    let responseMessage;
    if (parseError || !hasOpenAIKey) {
      responseMessage = hasOpenAIKey 
        ? `I've received your CV. However, I couldn't fully parse it. ${parsedData.note || ''}\n\nLet me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : `I've received your CV! ${parsedData.note || ''}\n\nLet me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
    } else {
      const skillsText = parsedData.skills?.technical?.slice(0, 3).join(', ') || 'various fields';
      responseMessage = `Great! I've analyzed your CV. I can see you have experience in ${skillsText}. Let me ask you a few questions to better understand what you're looking for:\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`;
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
    const userResult = await pool.query(
      `SELECT u.name, u.email, up.professional_summary, up.skills, up.career_goals,
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
    
    // If no CV data in resume, check user profile for skills
    if (!cvData || !cvData.skills || Object.keys(cvData.skills).length === 0) {
      if (user.skills && typeof user.skills === 'string') {
        try {
          const profileSkills = JSON.parse(user.skills);
          if (profileSkills && Object.keys(profileSkills).length > 0) {
            cvData = cvData || {};
            cvData.skills = profileSkills;
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    // Check if user wants to search for jobs or provided job requirements
    const jobSearchKeywords = ['find jobs', 'search jobs', 'job search', 'looking for', 'need a job', 'find me', 'show me jobs', 'search for'];
    
    // Detect job requirements in the message (job title, location, salary mentioned)
    const hasJobTitle = /\b(senior|sr|jr|junior|lead|principal|manager|director|engineer|developer|analyst|designer|product|marketing|sales|accountant|nurse|teacher|doctor|lawyer)\b/i.test(message);
    const hasLocation = /\b(in|at|near|around)\s+[A-Z][a-z]+(\s+[A-Z]{2})?/i.test(message) || 
                       /\b([A-Z][a-z]+\s+[A-Z]{2})\b/.test(message) || // Matches "Atlanta GA"
                       /\b(remote|hybrid|onsite|on-site)\b/i.test(message);
    const hasSalary = /\b(above|over|at least|minimum|need|want|expect|salary|pay|compensation)\s*\$?\d+/i.test(message) || 
                     /\$\d+/i.test(message) ||
                     /\b\d{5,}\b/.test(message); // Matches numbers like 150000
    const hasJobType = /\b(product management|software engineer|developer|manager|analyst|designer|marketing|sales)\b/i.test(message);
    
    // More lenient detection - if message contains job-related terms and location/salary, trigger search
    const hasJobInfo = hasJobTitle || hasJobType || /\b(product|management|engineer|developer|manager|director|analyst)\b/i.test(message);
    const hasLocationOrSalary = hasLocation || hasSalary;
    
    // Determine if we should search for jobs
    const shouldSearchJobs = searchJobs || 
                             jobSearchKeywords.some(keyword => message.toLowerCase().includes(keyword)) ||
                             (hasJobInfo && hasLocationOrSalary) ||
                             (hasJobTitle && message.length > 15) ||
                             (hasJobType && (hasLocation || hasSalary));

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
      
      // Clean up the query
      searchQuery = searchQuery.trim();
      if (!searchQuery) {
        searchQuery = cvData?.experience?.[0]?.title || 'software engineer';
      }
      
      try {
        const webResults = await searchWebJobs(searchQuery, searchLocation, { limit: 5 });
        if (webResults.jobs && webResults.jobs.length > 0) {
          jobResults = webResults.jobs;
        }
      } catch (jobError) {
        console.error('Job search error:', jobError);
      }
    }

    // Build context-aware prompt
    let systemPrompt = `You are an AI career assistant helping job seekers. You understand their CV, ask relevant questions about their job requirements, and help them find suitable positions.

User Profile:
- Name: ${user.name || 'User'}
- Professional Summary: ${user.professional_summary || 'Not provided'}
- Skills: ${JSON.stringify(user.skills || {})}
- Career Goals: ${user.career_goals || 'Not specified'}`;

    if (cvData) {
      systemPrompt += `\n\nCV Information:
- Experience: ${JSON.stringify(cvData.experience || [])}
- Education: ${JSON.stringify(cvData.education || [])}
- Skills: ${JSON.stringify(cvData.skills || {})}`;
    }

    systemPrompt += `\n\nYour role:
1. Understand and analyze the user's CV/resume when they ask about it
2. When asked to "read my resume" or "understand my CV", analyze their skills, experience, and education
3. Suggest job profiles and roles they can apply for based on their CV
4. Ask relevant questions to understand job requirements (location, salary, remote work, etc.)
5. Help users understand their skills and experience
6. Provide career advice based on their background
7. When they ask about jobs, help them search and understand job requirements
8. Be conversational, friendly, and helpful
9. Use NLP to understand natural language queries about their resume

Important: If the user asks you to read/understand their resume or suggest jobs they can apply for, analyze their CV data and provide specific job recommendations based on their skills and experience.`;

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
    
    // If user wants CV analysis, enhance the prompt
    if (wantsCVAnalysis) {
      if (cvData && (cvData.skills || cvData.experience || cvData.education)) {
        // User has CV data - provide detailed analysis
        systemPrompt += `\n\nUSER REQUEST: The user wants you to analyze their CV and suggest job profiles they can apply for.

CV Analysis Required:
- Extract key skills: ${JSON.stringify(cvData.skills || {})}
- Review experience: ${JSON.stringify(cvData.experience || [])}
- Consider education: ${JSON.stringify(cvData.education || [])}
- Professional summary: ${cvData.professional_summary || user.professional_summary || 'Not provided'}
- Identify career level and expertise areas

Your Response Should:
1. Acknowledge that you've analyzed their CV
2. Highlight their key skills and experience areas
3. Suggest 5-10 specific job titles/roles they're qualified for based on their background
4. Explain why each role is a good fit for their skills and experience
5. Optionally search for actual job openings matching these profiles`;
      } else {
        // User doesn't have CV uploaded yet
        systemPrompt += `\n\nUSER REQUEST: The user wants you to analyze their CV and suggest job profiles, but they haven't uploaded a CV yet.

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

