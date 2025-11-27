const OpenAI = require('openai');
const axios = require('axios');
const cheerio = require('cheerio');

// Lazy initialization of OpenAI client
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

/**
 * Extract information from LinkedIn profile URL
 * Note: LinkedIn requires authentication for API access. This is a basic implementation
 * that could be enhanced with LinkedIn API or web scraping (with proper permissions).
 */
async function extractLinkedInInfo(linkedinUrl) {
  try {
    // Validate LinkedIn URL
    if (!linkedinUrl || !linkedinUrl.includes('linkedin.com')) {
      return { error: 'Invalid LinkedIn URL' };
    }

    // For production, you would use LinkedIn API or a service like RapidAPI
    // This is a placeholder that uses OpenAI to extract info if provided manually
    // In a real implementation, you'd need:
    // 1. LinkedIn API access (requires OAuth)
    // 2. Or a web scraping service (with user consent and LinkedIn ToS compliance)
    // 3. Or manual input from user
    
    const openai = getOpenAIClient();
    if (!openai) {
      return {
        note: 'LinkedIn extraction requires OpenAI API key. Please provide your LinkedIn information manually.',
        extracted: false
      };
    }

    // If user provides LinkedIn URL, we can ask them to share their profile summary
    // or use a service to extract it. For now, return a structured response.
    return {
      source: 'linkedin',
      url: linkedinUrl,
      extracted: false,
      note: 'LinkedIn profile extraction requires API access. Please manually add your LinkedIn information or use a LinkedIn data export.',
      fields: {
        headline: null,
        summary: null,
        experience: [],
        education: [],
        skills: [],
        certifications: []
      }
    };
  } catch (error) {
    console.error('LinkedIn extraction error:', error);
    return { error: error.message, extracted: false };
  }
}

/**
 * Extract information from a generic website URL
 * Uses web scraping to extract relevant professional information
 */
async function extractWebsiteInfo(websiteUrl) {
  try {
    if (!websiteUrl || !websiteUrl.startsWith('http')) {
      return { error: 'Invalid website URL' };
    }

    // Fetch the webpage
    const response = await axios.get(websiteUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract text content
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Use OpenAI to extract structured information from the webpage
    const openai = getOpenAIClient();
    if (!openai) {
      return {
        source: 'website',
        url: websiteUrl,
        extracted: false,
        note: 'Website extraction requires OpenAI API key. Raw content extracted.',
        rawContent: text.substring(0, 1000)
      };
    }

    try {
      const extractionPrompt = `Extract professional information from this webpage content. Return a JSON object with:
- name: person's name if mentioned
- title: professional title/headline
- summary: professional summary or bio
- skills: array of skills mentioned
- experience: array of experience items (title, company, description)
- education: array of education items (degree, institution)
- certifications: array of certifications
- contact: contact information if available

Webpage content (first 3000 chars): ${text.substring(0, 3000)}

Return only valid JSON, no markdown formatting.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a professional information extractor. Extract structured data from web content and return only valid JSON.'
          },
          {
            role: 'user',
            content: extractionPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      const extracted = JSON.parse(completion.choices[0].message.content);
      
      return {
        source: 'website',
        url: websiteUrl,
        extracted: true,
        data: extracted
      };
    } catch (parseError) {
      console.error('Error parsing extracted data:', parseError);
      return {
        source: 'website',
        url: websiteUrl,
        extracted: false,
        rawContent: text.substring(0, 1000),
        note: 'Could not extract structured data, but content was retrieved.'
      };
    }
  } catch (error) {
    console.error('Website extraction error:', error);
    if (error.response) {
      return { error: `HTTP ${error.response.status}: ${error.response.statusText}`, extracted: false };
    }
    return { error: error.message, extracted: false };
  }
}

/**
 * Merge extracted information from multiple sources into a unified profile
 */
function mergeExtractedData(resumeData, linkedinData, websiteDataArray) {
  const merged = {
    skills: {
      technical: [],
      soft: [],
      languages: []
    },
    experience: [],
    education: [],
    certifications: [],
    summary: null,
    contact: {}
  };

  // Start with resume data
  if (resumeData) {
    if (resumeData.skills) {
      merged.skills = { ...resumeData.skills };
    }
    if (resumeData.experience) {
      merged.experience = [...resumeData.experience];
    }
    if (resumeData.education) {
      merged.education = [...resumeData.education];
    }
    if (resumeData.professional_summary) {
      merged.summary = resumeData.professional_summary;
    }
  }

  // Merge LinkedIn data
  if (linkedinData && linkedinData.extracted && linkedinData.fields) {
    const li = linkedinData.fields;
    if (li.skills && Array.isArray(li.skills)) {
      merged.skills.technical = [...new Set([...merged.skills.technical || [], ...li.skills])];
    }
    if (li.experience && Array.isArray(li.experience)) {
      merged.experience = [...merged.experience, ...li.experience];
    }
    if (li.education && Array.isArray(li.education)) {
      merged.education = [...merged.education, ...li.education];
    }
    if (li.summary && !merged.summary) {
      merged.summary = li.summary;
    }
  }

  // Merge website data
  if (websiteDataArray && Array.isArray(websiteDataArray)) {
    websiteDataArray.forEach(websiteData => {
      if (websiteData.extracted && websiteData.data) {
        const wd = websiteData.data;
        if (wd.skills && Array.isArray(wd.skills)) {
          merged.skills.technical = [...new Set([...merged.skills.technical || [], ...wd.skills])];
        }
        if (wd.experience && Array.isArray(wd.experience)) {
          merged.experience = [...merged.experience, ...wd.experience];
        }
        if (wd.education && Array.isArray(wd.education)) {
          merged.education = [...merged.education, ...wd.education];
        }
        if (wd.certifications && Array.isArray(wd.certifications)) {
          merged.certifications = [...new Set([...merged.certifications, ...wd.certifications])];
        }
        if (wd.summary && !merged.summary) {
          merged.summary = wd.summary;
        }
        if (wd.contact) {
          merged.contact = { ...merged.contact, ...wd.contact };
        }
      }
    });
  }

  // Remove duplicates from experience and education
  merged.experience = merged.experience.filter((exp, index, self) =>
    index === self.findIndex(e => 
      e.title === exp.title && e.company === exp.company
    )
  );

  merged.education = merged.education.filter((edu, index, self) =>
    index === self.findIndex(e => 
      e.degree === edu.degree && e.institution === edu.institution
    )
  );

  return merged;
}

module.exports = {
  extractLinkedInInfo,
  extractWebsiteInfo,
  mergeExtractedData
};

