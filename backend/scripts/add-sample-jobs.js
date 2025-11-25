const pool = require('../src/database/postgres');
require('dotenv').config();

const sampleJobs = [
  {
    title: 'Senior Software Engineer',
    company: 'TechCorp Inc.',
    description: 'We are looking for an experienced software engineer to join our team. You will work on building scalable web applications using modern technologies. Responsibilities include designing and implementing new features, collaborating with cross-functional teams, and mentoring junior developers.',
    requirements: JSON.stringify({
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'PostgreSQL'],
      experience_years: 5,
      education: 'Bachelor\'s degree in Computer Science or related field'
    }),
    location: 'San Francisco, CA',
    remote_options: 'hybrid',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    job_type: 'full-time',
    application_url: 'https://techcorp.com/careers/senior-engineer',
    source: 'manual'
  },
  {
    title: 'Full Stack Developer',
    company: 'StartupXYZ',
    description: 'Join our fast-growing startup as a Full Stack Developer. You will be responsible for developing both frontend and backend systems, working closely with product managers, and contributing to architectural decisions. We value innovation and creative problem-solving.',
    requirements: JSON.stringify({
      skills: ['Python', 'React', 'Django', 'PostgreSQL', 'AWS'],
      experience_years: 3,
      education: 'Bachelor\'s degree or equivalent experience'
    }),
    location: 'New York, NY',
    remote_options: 'remote',
    salary_min: 100000,
    salary_max: 150000,
    salary_currency: 'USD',
    job_type: 'full-time',
    application_url: 'https://startupxyz.com/jobs/fullstack',
    source: 'manual'
  },
  {
    title: 'Product Manager',
    company: 'Innovation Labs',
    description: 'We are seeking an experienced Product Manager to lead product development initiatives. You will work with engineering, design, and business teams to define product strategy, prioritize features, and drive product launches.',
    requirements: JSON.stringify({
      skills: ['Product Management', 'Agile', 'User Research', 'Data Analysis', 'Strategy'],
      experience_years: 4,
      education: 'Bachelor\'s degree in Business, Engineering, or related field'
    }),
    location: 'Seattle, WA',
    remote_options: 'hybrid',
    salary_min: 110000,
    salary_max: 160000,
    salary_currency: 'USD',
    job_type: 'full-time',
    application_url: 'https://innovationlabs.com/careers/pm',
    source: 'manual'
  }
];

async function addSampleJobs() {
  try {
    console.log('Adding sample jobs...');
    
    for (const job of sampleJobs) {
      await pool.query(
        `INSERT INTO job_listings (
          title, company, description, requirements, location, remote_options,
          salary_min, salary_max, salary_currency, job_type, application_url, source, posted_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_DATE)
        ON CONFLICT DO NOTHING`,
        [
          job.title,
          job.company,
          job.description,
          job.requirements,
          job.location,
          job.remote_options,
          job.salary_min,
          job.salary_max,
          job.salary_currency,
          job.job_type,
          job.application_url,
          job.source
        ]
      );
    }
    
    console.log(`Successfully added ${sampleJobs.length} sample jobs!`);
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample jobs:', error);
    process.exit(1);
  }
}

// Connect to database and run
const { connect } = require('../src/database/postgres');
addSampleJobs();

