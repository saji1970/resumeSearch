# AI-Powered Job Search & Application Platform

A comprehensive mobile application that leverages artificial intelligence to revolutionize the job search and application process. This platform analyzes resumes, matches candidates with suitable opportunities, optimizes CVs for specific roles, and automates job applications.

## Features

### Phase 1 MVP (Current Implementation)

- ✅ **User Authentication**: Secure signup, login, and profile management
- ✅ **Resume Upload & AI Parsing**: Upload resumes in multiple formats (PDF, DOCX, DOC) and extract structured information using OpenAI GPT-4
- ✅ **Job Search**: Browse job listings with filters (location, remote, salary, etc.)
- ✅ **Compatibility Scoring**: AI-powered matching algorithm that scores jobs based on skills, experience, location, and compensation
- ✅ **Manual Job Applications**: Apply to jobs with optimized CVs and AI-generated cover letters
- ✅ **Application Tracking**: Track all submitted applications with status updates
- ✅ **AI Assistant**: Chat with AI for career advice and job search guidance

### Planned Features (Future Phases)

- **Dynamic CV Optimization**: Job-specific CV tailoring
- **Automated Applications**: Semi-automatic and fully automatic application modes
- **Multi-Source Job Aggregation**: Scrape jobs from multiple job boards
- **Advanced Analytics**: Detailed insights and success metrics

## Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (structured data), MongoDB (document storage)
- **AI Services**: OpenAI GPT-4 API
- **Authentication**: JWT tokens
- **File Upload**: Multer

### Mobile App
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **UI Library**: React Native Paper
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation

### Web App
- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Redux Toolkit
- **Routing**: React Router

## Project Structure

```
jobSearchapp/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── database/       # Database connections and schemas
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API route handlers
│   │   ├── services/       # Business logic (AI, parsing, matching)
│   │   └── server.js       # Express server entry point
│   ├── uploads/            # Uploaded resume files
│   └── package.json
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── navigation/     # Navigation configuration
│   │   ├── screens/        # App screens
│   │   ├── services/       # API client services
│   │   ├── store/          # Redux store and slices
│   │   └── theme/          # App theme configuration
│   └── package.json
├── web/                    # React web application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API client services
│   │   └── store/          # Redux store and slices
│   └── package.json
└── README.md
```

## Deployment

### Railway Deployment

This app is configured for easy deployment on Railway. See [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) for detailed instructions.

Quick steps:
1. Connect your GitHub repository to Railway
2. Add PostgreSQL database service
3. Configure environment variables
4. Deploy!

The app will automatically:
- Run database migrations on deploy
- Configure CORS for production
- Use Railway's `DATABASE_URL` for PostgreSQL connection

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- MongoDB (optional, for future features)
- OpenAI API key
- Expo CLI for mobile development

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up PostgreSQL database:
```bash
# Create database
createdb jobsearch

# Run schema
psql jobsearch < src/database/schema.sql
```

4. Create `.env` file in `backend/` directory:
```env
PORT=3000
NODE_ENV=development

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=jobsearch

JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

OPENAI_API_KEY=your-openai-api-key

MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

5. Create uploads directory:
```bash
mkdir uploads
mkdir uploads/resumes
```

6. Start the backend server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### Web App Setup

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

3. Configure API URL (optional):
Create a `.env` file and set:
```
VITE_API_URL=http://localhost:3000/api
```

4. Start the development server:
```bash
npm run dev
```

The web app will be available at `http://localhost:3001`

### Mobile App Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Update API configuration (if needed):
Edit `src/services/api/config.ts` to point to your backend URL.

For Android emulator, use: `http://10.0.2.2:3000/api`
For iOS simulator, use: `http://localhost:3000/api`
For physical device, use your computer's IP address.

4. Start the Expo development server:
```bash
npm start
```

5. Run on your device:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Resumes
- `POST /api/resumes/upload` - Upload and parse resume
- `GET /api/resumes` - Get all user resumes
- `GET /api/resumes/master` - Get master resume
- `DELETE /api/resumes/:id` - Delete resume

### Jobs
- `GET /api/jobs` - Get job listings (with filters)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job listing (admin/testing)

### Applications
- `POST /api/applications` - Create application
- `GET /api/applications` - Get user's applications
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id/status` - Update application status

### AI Services
- `POST /api/ai/cover-letter` - Generate cover letter
- `POST /api/ai/chat` - Chat with AI assistant

## Database Schema

### Key Tables

- **users**: User accounts and authentication
- **user_profiles**: Extended user profile data
- **resumes**: Uploaded resume files and parsed data
- **resume_versions**: Optimized CV versions for specific jobs
- **job_listings**: Job postings from various sources
- **applications**: User job applications
- **application_status_history**: Application status tracking

See `backend/src/database/schema.sql` for complete schema.

## Development Roadmap

### ✅ Phase 1: MVP (Months 1-4) - COMPLETED
- User authentication
- Resume upload and AI parsing
- Basic job search with filters
- Simple compatibility scoring
- Manual application with CV attachment

### 🔄 Phase 2: AI Enhancement (Months 5-7)
- AI conversational interface for preferences
- Dynamic CV optimization per job
- Enhanced matching algorithm with ML
- Cover letter generation
- Application tracking dashboard

### ⏳ Phase 3: Automation (Months 8-10)
- Semi-automatic application mode
- Browser automation for form filling
- Multi-platform job aggregation
- Email integration for status tracking
- Notification system

### ⏳ Phase 4: Full Automation (Months 11-12)
- Fully automatic application mode
- Advanced analytics and insights
- Interview preparation AI assistant
- Salary negotiation guidance
- Performance optimization and scaling

## Security & Privacy

- JWT-based authentication
- Password hashing with bcrypt
- File upload validation and sanitization
- CORS configuration
- Input validation and sanitization
- Secure API key storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Support

For issues, questions, or contributions, please open an issue on the repository.

---

Built with ❤️ using React Native, Node.js, and OpenAI GPT-4

