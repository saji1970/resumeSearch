// Mock data for testing

module.exports = {
  // Mock user data
  mockUser: {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password_hash: '$2a$10$testhash'
  },

  // Mock CV data
  mockCVData: {
    name: 'John Doe',
    email: 'john@example.com',
    skills: {
      technical: ['JavaScript', 'Node.js', 'React', 'PostgreSQL'],
      soft: ['Communication', 'Leadership', 'Problem Solving']
    },
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        duration: '2020-2024',
        description: 'Led development of web applications using React and Node.js'
      },
      {
        title: 'Software Engineer',
        company: 'Startup Inc',
        duration: '2018-2020',
        description: 'Developed RESTful APIs and frontend components'
      }
    ],
    education: [
      {
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        institution: 'University of Technology',
        year: '2018'
      }
    ],
    professional_summary: 'Experienced software engineer with expertise in full-stack development'
  },

  // Mock job data
  mockJobs: [
    {
      title: 'Senior Full Stack Developer',
      company: 'Tech Company',
      location: 'San Francisco, CA',
      salary_min: 120000,
      salary_max: 180000,
      description: 'Looking for a senior developer with React and Node.js experience',
      application_url: 'https://example.com/job/1'
    },
    {
      title: 'React Developer',
      company: 'Startup',
      location: 'Remote',
      salary_min: 100000,
      salary_max: 150000,
      description: 'React developer needed for frontend development',
      application_url: 'https://example.com/job/2'
    }
  ],

  // Mock token
  mockToken: 'mock-jwt-token-here'
};


