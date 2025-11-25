const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function parseResume(filePath, mimeType) {
  try {
    // Read file content
    let fileContent;
    
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      // For PDF, we'll use text extraction or base64 encoding
      // In production, use a PDF parser library
      fileContent = await fs.readFile(filePath, 'base64');
    } else {
      // For text files
      fileContent = await fs.readFile(filePath, 'utf-8');
    }

    // Use OpenAI to parse resume
    const prompt = `Extract structured information from this resume. Return a JSON object with the following structure:
{
  "name": "full name",
  "email": "email address",
  "phone": "phone number",
  "location": "city, state/country",
  "education": [
    {
      "degree": "degree name",
      "institution": "school/university name",
      "graduation_date": "year or date",
      "gpa": "if available"
    }
  ],
  "experience": [
    {
      "title": "job title",
      "company": "company name",
      "start_date": "start date",
      "end_date": "end date or 'current'",
      "description": "job description",
      "achievements": ["list of achievements"]
    }
  ],
  "skills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "languages": ["language1", "language2"]
  },
  "certifications": [
    {
      "name": "certification name",
      "issuer": "issuing organization",
      "date": "date obtained"
    }
  ],
  "projects": [
    {
      "name": "project name",
      "description": "project description",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Resume content:
${fileContent.substring(0, 10000)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured information from resumes. Always return valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const parsedData = JSON.parse(response.choices[0].message.content);
    return parsedData;
  } catch (error) {
    console.error('Error parsing resume:', error);
    
    // Fallback: return basic structure with error message
    return {
      error: 'Failed to parse resume',
      raw_content: fileContent?.substring(0, 1000) || 'Could not read file'
    };
  }
}

async function extractSkills(resumeData) {
  try {
    const skills = resumeData.skills || {};
    const allSkills = [
      ...(skills.technical || []),
      ...(skills.soft || []),
      ...(skills.languages || [])
    ];
    return allSkills;
  } catch (error) {
    console.error('Error extracting skills:', error);
    return [];
  }
}

module.exports = {
  parseResume,
  extractSkills
};

