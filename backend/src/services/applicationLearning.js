const pool = require('../database/postgres');
const OpenAI = require('openai');

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
 * Analyze application outcomes and learn patterns
 */
async function analyzeApplicationOutcomes(userId) {
  try {
    // Get all applications with outcomes
    const result = await pool.query(
      `SELECT a.*, j.title, j.company, j.description, j.requirements, j.location, j.salary_min, j.salary_max
       FROM applications a
       JOIN job_listings j ON a.job_id = j.id
       WHERE a.user_id = $1 AND a.outcome IS NOT NULL
       ORDER BY a.outcome_date DESC`,
      [userId]
    );

    if (result.rows.length === 0) {
      return {
        learned: false,
        message: 'No application outcomes available for analysis'
      };
    }

    const applications = result.rows;
    const positiveOutcomes = applications.filter(app => app.outcome === 'positive');
    const negativeOutcomes = applications.filter(app => app.outcome === 'negative');

    // Analyze patterns using AI
    const openai = getOpenAIClient();
    if (!openai) {
      // Fallback: basic pattern analysis without AI
      return analyzePatternsBasic(applications, positiveOutcomes, negativeOutcomes);
    }

    try {
      const analysisPrompt = `Analyze these job application outcomes and identify patterns:

POSITIVE OUTCOMES (${positiveOutcomes.length}):
${positiveOutcomes.map(app => `
- Job: ${app.title} at ${app.company}
- Location: ${app.location || 'N/A'}
- Salary: ${app.salary_min ? `$${app.salary_min}` : 'N/A'}
- Requirements: ${app.requirements ? JSON.stringify(app.requirements).substring(0, 200) : 'N/A'}
- Feedback: ${app.interview_feedback || 'N/A'}
`).join('\n')}

NEGATIVE OUTCOMES (${negativeOutcomes.length}):
${negativeOutcomes.map(app => `
- Job: ${app.title} at ${app.company}
- Location: ${app.location || 'N/A'}
- Salary: ${app.salary_min ? `$${app.salary_min}` : 'N/A'}
- Requirements: ${app.requirements ? JSON.stringify(app.requirements).substring(0, 200) : 'N/A'}
- Rejection Reason: ${app.rejection_reason || 'N/A'}
`).join('\n')}

Analyze and return a JSON object with:
1. successful_patterns: What makes applications successful (job types, locations, salary ranges, requirements)
2. unsuccessful_patterns: What leads to rejections (common reasons, mismatches)
3. profile_refinements: Suggestions to improve the user's profile based on outcomes
4. search_refinements: Suggestions to refine job search criteria (better job types, locations, salary expectations)
5. recommendations: Actionable recommendations for future applications

Return only valid JSON.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a career analytics expert. Analyze job application outcomes and provide actionable insights. Return only valid JSON.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const analysis = JSON.parse(completion.choices[0].message.content);

      // Store learning data
      for (const app of applications) {
        await pool.query(
          `INSERT INTO application_learning (user_id, application_id, outcome, learned_patterns, profile_refinements, search_refinements)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT DO NOTHING`,
          [
            userId,
            app.id,
            app.outcome,
            JSON.stringify(analysis),
            JSON.stringify(analysis.profile_refinements || {}),
            JSON.stringify(analysis.search_refinements || {})
          ]
        );
      }

      return {
        learned: true,
        analysis,
        summary: {
          totalApplications: applications.length,
          positive: positiveOutcomes.length,
          negative: negativeOutcomes.length,
          successRate: positiveOutcomes.length / applications.length * 100
        }
      };
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      return analyzePatternsBasic(applications, positiveOutcomes, negativeOutcomes);
    }
  } catch (error) {
    console.error('Application learning error:', error);
    return {
      learned: false,
      error: error.message
    };
  }
}

/**
 * Basic pattern analysis without AI
 */
function analyzePatternsBasic(applications, positiveOutcomes, negativeOutcomes) {
  const patterns = {
    successful_patterns: {},
    unsuccessful_patterns: {},
    profile_refinements: {},
    search_refinements: {},
    recommendations: []
  };

  // Analyze successful applications
  if (positiveOutcomes.length > 0) {
    const successfulLocations = {};
    const successfulSalaries = [];
    const successfulJobTypes = {};

    positiveOutcomes.forEach(app => {
      if (app.location) {
        successfulLocations[app.location] = (successfulLocations[app.location] || 0) + 1;
      }
      if (app.salary_min) {
        successfulSalaries.push(app.salary_min);
      }
      if (app.title) {
        const jobType = app.title.toLowerCase();
        successfulJobTypes[jobType] = (successfulJobTypes[jobType] || 0) + 1;
      }
    });

    patterns.successful_patterns = {
      commonLocations: Object.keys(successfulLocations).sort((a, b) => successfulLocations[b] - successfulLocations[a]).slice(0, 3),
      averageSalary: successfulSalaries.length > 0 ? Math.round(successfulSalaries.reduce((a, b) => a + b, 0) / successfulSalaries.length) : null,
      commonJobTypes: Object.keys(successfulJobTypes).sort((a, b) => successfulJobTypes[b] - successfulJobTypes[a]).slice(0, 3)
    };
  }

  // Analyze unsuccessful applications
  if (negativeOutcomes.length > 0) {
    const rejectionReasons = {};
    negativeOutcomes.forEach(app => {
      if (app.rejection_reason) {
        const reason = app.rejection_reason.toLowerCase();
        rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
      }
    });

    patterns.unsuccessful_patterns = {
      commonRejectionReasons: Object.keys(rejectionReasons).sort((a, b) => rejectionReasons[b] - rejectionReasons[a]).slice(0, 3)
    };
  }

  // Generate recommendations
  if (positiveOutcomes.length > 0 && negativeOutcomes.length > 0) {
    patterns.recommendations.push('Focus on job types and locations that have led to positive outcomes');
    patterns.recommendations.push('Review rejection reasons and address skill gaps or experience mismatches');
  }

  return {
    learned: true,
    analysis: patterns,
    summary: {
      totalApplications: applications.length,
      positive: positiveOutcomes.length,
      negative: negativeOutcomes.length,
      successRate: positiveOutcomes.length / applications.length * 100
    }
  };
}

/**
 * Apply learned refinements to user profile and job search criteria
 */
async function applyRefinements(userId, refinements) {
  try {
    // Get current profile
    const profileResult = await pool.query(
      'SELECT job_search_criteria, extracted_metadata FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return { applied: false, message: 'Profile not found' };
    }

    const profile = profileResult.rows[0];
    let jobCriteria = {};
    let metadata = {};

    try {
      jobCriteria = profile.job_search_criteria 
        ? (typeof profile.job_search_criteria === 'string' ? JSON.parse(profile.job_search_criteria) : profile.job_search_criteria)
        : {};
      metadata = profile.extracted_metadata
        ? (typeof profile.extracted_metadata === 'string' ? JSON.parse(profile.extracted_metadata) : profile.extracted_metadata)
        : {};
    } catch (e) {
      console.error('Error parsing profile data:', e);
    }

    // Apply search refinements
    if (refinements.search_refinements) {
      jobCriteria = { ...jobCriteria, ...refinements.search_refinements };
    }

    // Apply profile refinements to metadata
    if (refinements.profile_refinements) {
      metadata.refinements = { ...(metadata.refinements || {}), ...refinements.profile_refinements };
    }

    // Update profile
    await pool.query(
      `UPDATE user_profiles 
       SET job_search_criteria = $1, extracted_metadata = $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [JSON.stringify(jobCriteria), JSON.stringify(metadata), userId]
    );

    return {
      applied: true,
      updatedCriteria: jobCriteria,
      updatedMetadata: metadata
    };
  } catch (error) {
    console.error('Error applying refinements:', error);
    return {
      applied: false,
      error: error.message
    };
  }
}

module.exports = {
  analyzeApplicationOutcomes,
  applyRefinements
};

