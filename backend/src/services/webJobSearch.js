const axios = require('axios');

/**
 * Search for jobs on the web using Serper API (Google Jobs)
 */
async function searchWebJobs(query, location = '', options = {}) {
  const serperApiKey = process.env.SERPER_API_KEY;
  
  if (!serperApiKey || serperApiKey === 'your-serper-api-key') {
    // Fallback: Use a free alternative or return empty results with a message
    console.warn('SERPER_API_KEY not configured. Web job search unavailable.');
    return {
      jobs: [],
      error: 'Web job search requires SERPER_API_KEY to be configured in .env file'
    };
  }

  try {
    // Build search query
    let searchQuery = query;
    if (location) {
      searchQuery += ` jobs in ${location}`;
    }
    
    // Build the search query
    let finalQuery = searchQuery;
    if (location) {
      finalQuery = `${searchQuery} jobs in ${location}`;
    } else {
      finalQuery = `${searchQuery} jobs`;
    }
    
    console.log('Searching Serper API with query:', finalQuery);
    
    // Search Google Jobs via Serper API
    const response = await axios.post(
      'https://google.serper.dev/jobs',
      {
        q: finalQuery,
        location: location || undefined,
        num: options.limit || 20,
        page: options.page || 1
      },
      {
        headers: {
          'X-API-KEY': serperApiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000 // 15 second timeout
      }
    );
    
    console.log('Serper API response status:', response.status);
    console.log('Serper API jobs found:', response.data?.jobs?.length || 0);

    // Check response structure
    console.log('Serper API response data keys:', Object.keys(response.data || {}));
    
    // Parse and normalize job results
    const jobsData = response.data?.jobs || response.data?.organic || [];
    console.log('Raw jobs data length:', jobsData.length);
    
    const jobs = jobsData.map(job => ({
      title: job.title || job.name || '',
      company: job.companyName || job.company || job.organization || '',
      description: job.description || job.snippet || '',
      location: job.location || location || '',
      application_url: job.applyUrl || job.url || job.link || '',
      salary_min: extractSalary(job.salary, 'min'),
      salary_max: extractSalary(job.salary, 'max'),
      job_type: extractJobType(job),
      remote_options: extractRemoteOption(job),
      source: 'google_jobs',
      posted_date: job.publishDate ? new Date(job.publishDate) : new Date(),
      requirements: extractRequirements(job.description || job.snippet || '')
    })).filter(job => job.title && job.company); // Filter out invalid jobs

    console.log('Processed jobs count:', jobs.length);

    return {
      jobs,
      total: response.data?.total || jobs.length,
      source: 'serper'
    };
  } catch (error) {
    console.error('Error searching web jobs:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText
    });
    
    // Return empty results with error info
    return {
      jobs: [],
      error: error.response?.data?.message || error.message || 'Failed to search web jobs',
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    };
  }
}

/**
 * Extract salary from job description or salary field
 */
function extractSalary(salary, type = 'min') {
  if (!salary) return null;
  
  // Handle string salary like "$50,000 - $80,000" or "$50k-$80k"
  if (typeof salary === 'string') {
    const numbers = salary.match(/\$?([\d,]+)/g);
    if (numbers && numbers.length >= 2) {
      const min = parseInt(numbers[0].replace(/[$,]/g, ''));
      const max = parseInt(numbers[1].replace(/[$,]/g, ''));
      return type === 'min' ? min : max;
    } else if (numbers && numbers.length === 1) {
      const value = parseInt(numbers[0].replace(/[$,]/g, ''));
      return type === 'min' ? value : null;
    }
  }
  
  return null;
}

/**
 * Extract job type from job data
 */
function extractJobType(job) {
  const description = (job.description || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  
  if (description.includes('full-time') || title.includes('full-time')) return 'full-time';
  if (description.includes('part-time') || title.includes('part-time')) return 'part-time';
  if (description.includes('contract') || title.includes('contract')) return 'contract';
  if (description.includes('internship') || title.includes('intern')) return 'internship';
  if (description.includes('freelance') || title.includes('freelance')) return 'freelance';
  
  return null;
}

/**
 * Extract remote option from job data
 */
function extractRemoteOption(job) {
  const description = (job.description || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const location = (job.location || '').toLowerCase();
  
  if (description.includes('remote') || title.includes('remote')) {
    if (description.includes('hybrid')) return 'hybrid';
    return 'remote';
  }
  
  if (location.includes('remote')) return 'remote';
  
  return null;
}

/**
 * Extract requirements from job description
 */
function extractRequirements(description) {
  if (!description) return null;
  
  // Try to extract skills/requirements section
  const requirementsMatch = description.match(/(?:requirements?|qualifications?|skills?)[:]\s*([^.]*(?:\.[^.]*)*)/i);
  if (requirementsMatch) {
    return requirementsMatch[1].trim();
  }
  
  return null;
}

/**
 * Search multiple job sources and aggregate results
 */
async function searchMultipleSources(query, location = '', options = {}) {
  const results = await searchWebJobs(query, location, options);
  
  // Can add more sources here (LinkedIn, Indeed, etc.)
  // For now, just return Serper results
  
  return results;
}

module.exports = {
  searchWebJobs,
  searchMultipleSources
};

