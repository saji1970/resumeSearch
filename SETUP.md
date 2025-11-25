# Quick Setup Guide

## Initial Setup Steps

### 1. Install All Dependencies

From the root directory, run:
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../mobile && npm install
```

### 2. Backend Setup

1. **Install PostgreSQL** (if not already installed)
   - Download from: https://www.postgresql.org/download/
   - Create a database named `jobsearch`

2. **Set up the database**:
```bash
cd backend
createdb jobsearch  # or use pgAdmin
psql jobsearch < src/database/schema.sql
```

Or run the migration script:
```bash
npm run migrate
```

3. **Configure environment variables**:
```bash
cp env.example .env
```

Then edit `.env` and add your:
- PostgreSQL credentials
- OpenAI API key (required for resume parsing)
- JWT secret

4. **Create uploads directory**:
```bash
mkdir -p uploads/resumes
```

5. **Start the backend server**:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`

### 3. Mobile App Setup

1. **Install Expo CLI** (if not already installed):
```bash
npm install -g expo-cli
```

2. **Configure API URL**:
   - For Android emulator: Edit `mobile/src/services/api/config.ts` and use `http://10.0.2.2:3000/api`
   - For iOS simulator: Use `http://localhost:3000/api`
   - For physical device: Use your computer's IP address (e.g., `http://192.168.1.100:3000/api`)

3. **Start the mobile app**:
```bash
cd mobile
npm start
```

4. **Run on device**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your physical device

## Testing the Application

### 1. Create a Test Account
- Open the mobile app
- Register with a test email and password
- You'll be automatically logged in

### 2. Upload a Resume
- Go to Profile tab
- Click "Upload Resume"
- Select a PDF, DOC, or DOCX file
- Wait for AI parsing (requires OpenAI API key)

### 3. Search for Jobs
- Go to Search tab
- Browse available job listings
- View compatibility scores

### 4. Apply to a Job
- Open a job detail page
- Generate an AI cover letter (optional)
- Click "Apply Now"
- Track your application in the Applications tab

## Required API Keys

### OpenAI API Key (Required)
- Get your key from: https://platform.openai.com/api-keys
- Add to `backend/.env` as `OPENAI_API_KEY`
- Used for:
  - Resume parsing
  - Cover letter generation
  - AI chat assistant

### Optional API Keys (for future features)
- Anthropic Claude API (for alternative AI models)
- Google Vision API (for OCR)
- Serper API (for job aggregation)

## Troubleshooting

### Backend Issues

**Database Connection Error**
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database `jobsearch` exists

**OpenAI API Error**
- Verify API key is correct
- Check API quota/billing
- Ensure key has GPT-4 access

**File Upload Error**
- Ensure `uploads/resumes` directory exists
- Check file permissions
- Verify MAX_FILE_SIZE setting

### Mobile App Issues

**API Connection Error**
- Check API URL in `config.ts`
- Ensure backend server is running
- Verify CORS settings in backend
- For physical devices: Use computer's IP address, not localhost

**Expo Build Errors**
- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall
- Check Node.js version (18+ required)

## Development Tips

1. **Hot Reload**: Both backend and mobile app support hot reload during development

2. **API Testing**: Use Postman or curl to test API endpoints:
```bash
curl http://localhost:3000/api/health
```

3. **Database Queries**: Use `psql` to inspect data:
```bash
psql jobsearch
SELECT * FROM users;
```

4. **Logs**: Backend logs appear in terminal, mobile app logs in Expo dev tools

## Next Steps

After setup, you can:
- Add sample job listings via API
- Customize the UI theme
- Configure additional AI models
- Set up email notifications
- Add more job sources

## Support

For issues or questions, check the main README.md or open an issue on the repository.

