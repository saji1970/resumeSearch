require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow Railway and custom domains
const corsOptions = {
  origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve static files from web build (if exists)
const webBuildPath = path.join(__dirname, '../../web/dist');
const fs = require('fs');
if (fs.existsSync(webBuildPath)) {
  app.use(express.static(webBuildPath));
  console.log('✅ Serving web frontend from:', webBuildPath);
} else {
  console.log('⚠️  Web frontend not found at:', webBuildPath);
  console.log('   Current working directory:', process.cwd());
  console.log('   __dirname:', __dirname);
  // Try alternative path (in case of different directory structure)
  const altPath = path.join(process.cwd(), 'web/dist');
  if (fs.existsSync(altPath)) {
    app.use(express.static(altPath));
    console.log('✅ Serving web frontend from alternative path:', altPath);
  }
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/ai', require('./routes/ai'));

// Root endpoint - serve web app if available, otherwise API info
app.get('/', (req, res) => {
  const webIndexPath = path.join(__dirname, '../../web/dist/index.html');
  const fs = require('fs');
  if (fs.existsSync(webIndexPath)) {
    // Serve the web app
    return res.sendFile(webIndexPath);
  }
  // Fallback to API info if web app not built
  res.json({ 
    message: 'AI Job Search API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      resumes: '/api/resumes',
      jobs: '/api/jobs',
      applications: '/api/applications',
      ai: '/api/ai'
    }
  });
});

// Health check - simple endpoint to verify server is running
// Doesn't check database to avoid blocking during migrations
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all non-API routes (SPA routing)
app.get('*', (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // Try to serve the web app's index.html
  const webIndexPath = path.join(__dirname, '../../web/dist/index.html');
  const fs = require('fs');
  if (fs.existsSync(webIndexPath)) {
    return res.sendFile(webIndexPath);
  }
  
  // Fallback to 404 if web app not built
  next();
});

// 404 handler for undefined API routes
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({
      error: 'Route not found',
      path: req.path,
      method: req.method,
      message: `The endpoint ${req.method} ${req.path} does not exist.`,
      availableEndpoints: {
        root: 'GET /',
        health: 'GET /api/health',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          me: 'GET /api/auth/me'
        },
        jobs: {
          list: 'GET /api/jobs',
          detail: 'GET /api/jobs/:id',
          search: 'GET /api/jobs?search=...'
        },
        resumes: {
          upload: 'POST /api/resumes/upload',
          list: 'GET /api/resumes',
          master: 'GET /api/resumes/master'
        },
        ai: {
          chat: 'POST /api/ai/chat',
          coverLetter: 'POST /api/ai/cover-letter',
          uploadCV: 'POST /api/ai/chat/upload-cv'
        }
      }
    });
  } else {
    res.status(404).send('Page not found. Web frontend may not be built.');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// Only start server if not in test environment and not imported
if (process.env.NODE_ENV !== 'test' && require.main === module) {
  // Start server immediately (don't wait for migrations)
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Run migrations in the background (non-blocking)
    const migrate = require('./database/migrate');
    migrate()
      .then(() => {
        console.log('Migrations completed successfully');
      })
      .catch((error) => {
        console.error('Migration failed (non-critical):', error.message);
        console.log('Server is running. Migrations can be run manually if needed.');
      });
  });
}

module.exports = app;

