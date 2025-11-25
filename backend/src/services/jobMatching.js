const pool = require('../database/postgres');

async function calculateCompatibilityScore(job, userProfile) {
  let score = {
    overall: 0,
    skills: 0,
    experience: 0,
    location: 0,
    compensation: 0,
    details: {}
  };

  try {
    const userSkills = userProfile.skills || {};
    const allUserSkills = [
      ...(userSkills.technical || []),
      ...(userSkills.soft || []),
      ...(userSkills.languages || [])
    ].map(s => s.toLowerCase());

    const jobRequirements = job.requirements || {};
    const requiredSkills = jobRequirements.skills || [];
    const requiredSkillsLower = requiredSkills.map(s => s.toLowerCase());

    // Skills matching (40% weight)
    if (requiredSkills.length > 0) {
      const matchedSkills = requiredSkillsLower.filter(skill =>
        allUserSkills.some(userSkill => userSkill.includes(skill) || skill.includes(userSkill))
      );
      score.skills = (matchedSkills.length / requiredSkills.length) * 100;
      score.details.matchedSkills = matchedSkills;
      score.details.missingSkills = requiredSkillsLower.filter(
        skill => !matchedSkills.includes(skill)
      );
    } else {
      score.skills = 50; // Neutral if no skills specified
    }

    // Experience matching (20% weight)
    const requiredExperience = jobRequirements.experience_years || 0;
    const userExperience = userProfile.experience_years || 0;
    if (requiredExperience > 0) {
      if (userExperience >= requiredExperience) {
        score.experience = 100;
      } else {
        score.experience = (userExperience / requiredExperience) * 100;
      }
    } else {
      score.experience = 50;
    }

    // Location matching (20% weight)
    const userPreferences = userProfile.preferences || {};
    const preferredLocation = userPreferences.location || '';
    const jobLocation = (job.location || '').toLowerCase();
    const remoteOptions = (job.remote_options || '').toLowerCase();

    if (remoteOptions === 'remote' || remoteOptions === 'hybrid') {
      score.location = 100;
    } else if (preferredLocation && jobLocation.includes(preferredLocation.toLowerCase())) {
      score.location = 100;
    } else {
      score.location = 50;
    }

    // Compensation matching (20% weight)
    const preferredSalary = userPreferences.salary_min || 0;
    if (preferredSalary > 0 && job.salary_min) {
      if (job.salary_min >= preferredSalary) {
        score.compensation = 100;
      } else if (job.salary_max && preferredSalary <= job.salary_max) {
        score.compensation = 75;
      } else {
        score.compensation = Math.max(0, (job.salary_min / preferredSalary) * 100);
      }
    } else {
      score.compensation = 50;
    }

    // Calculate overall weighted score
    score.overall = Math.round(
      score.skills * 0.4 +
      score.experience * 0.2 +
      score.location * 0.2 +
      score.compensation * 0.2
    );

    return score;
  } catch (error) {
    console.error('Error calculating compatibility score:', error);
    return score;
  }
}

module.exports = {
  calculateCompatibilityScore
};

