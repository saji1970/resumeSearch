# AI Job Search - Web Application

React web frontend for the AI-Powered Job Search & Application Platform.

## Features

- 🎨 Modern, responsive UI with Tailwind CSS
- 🔐 User authentication (login/register)
- 📄 Resume upload and AI-powered parsing
- 🔍 Job search with filters and compatibility scoring
- 📝 AI-generated cover letters
- 📊 Application tracking dashboard
- 💬 AI chat assistant for career advice

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Router** for navigation
- **Axios** for API calls

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file (optional):
```env
VITE_API_URL=http://localhost:3000/api
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3001`

## Build

To build for production:
```bash
npm run build
```

The production build will be in the `dist/` directory.

## Project Structure

```
web/
├── src/
│   ├── components/     # Reusable components
│   │   └── layout/     # Layout components
│   ├── pages/          # Page components
│   │   ├── auth/       # Login/Register pages
│   │   ├── dashboard/  # Dashboard page
│   │   ├── jobs/       # Job search and detail pages
│   │   ├── applications/ # Application tracking pages
│   │   ├── resumes/    # Resume upload page
│   │   ├── profile/    # User profile page
│   │   └── ai/         # AI assistant page
│   ├── services/       # API client services
│   │   └── api/        # API endpoints
│   ├── store/          # Redux store
│   │   └── slices/     # Redux slices
│   ├── App.tsx         # Main app component
│   └── main.tsx        # Entry point
├── index.html
└── package.json
```

## Features Overview

### Dashboard
- Overview of job applications
- Statistics and metrics
- Recommended jobs

### Job Search
- Search by keywords
- Filter by location, salary, remote options
- View compatibility scores
- Detailed job information

### Applications
- Track all submitted applications
- View application status
- Application history

### Resume Management
- Upload resumes (PDF, DOC, DOCX)
- AI-powered resume parsing
- View parsed resume data

### AI Assistant
- Chat interface for career advice
- Job search guidance
- Interview preparation tips

## Development

The web app uses Vite for fast hot module replacement (HMR). Changes to files will automatically reflect in the browser.

## Production Deployment

Build the app and serve the `dist/` directory with any static file server:

```bash
npm run build
# Serve dist/ directory with nginx, Apache, or any static host
```

Make sure to set the `VITE_API_URL` environment variable to your production API URL before building.



