// Polyfill for File API (required by undici/axios in Node.js 18)
// This must be defined before any modules that use it are loaded
if (typeof global.File === 'undefined') {
  global.File = class File {
    constructor(bits, name, options = {}) {
      this.name = name || '';
      this.lastModified = options.lastModified || Date.now();
      this.size = Array.isArray(bits) 
        ? bits.reduce((acc, bit) => acc + (bit.length || bit.size || 0), 0)
        : (bits ? (bits.length || bits.size || 0) : 0);
      this.type = options.type || '';
      this._bits = bits;
    }
    stream() {
      // Return a minimal stream-like object
      const { Readable } = require('stream');
      return Readable.from([]);
    }
    arrayBuffer() {
      return Promise.resolve(new ArrayBuffer(this.size || 0));
    }
    text() {
      return Promise.resolve(Array.isArray(this._bits) ? this._bits.join('') : '');
    }
    slice(start, end, contentType) {
      return new File(
        Array.isArray(this._bits) ? this._bits.slice(start, end) : [],
        this.name,
        { type: contentType || this.type }
      );
    }
  };
  
  // Also define FileList if needed
  if (typeof global.FileList === 'undefined') {
    global.FileList = class FileList extends Array {
      item(index) {
        return this[index] || null;
      }
    };
  }
}

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
const fs = require('fs');
const webBuildPaths = [
  path.join(__dirname, '../../web/dist'),  // From backend/src: ../../web/dist
  path.join(process.cwd(), 'web/dist'),   // From app root: web/dist
  path.join(process.cwd(), '../web/dist'), // Alternative: ../web/dist
  '/app/web/dist'                         // Absolute path in Railway
];

let webBuildPath = null;
for (const buildPath of webBuildPaths) {
  if (fs.existsSync(buildPath)) {
    webBuildPath = buildPath;
    app.use(express.static(buildPath));
    console.log('✅ Serving web frontend from:', buildPath);
    break;
  }
}

if (!webBuildPath) {
  console.log('⚠️  Web frontend not found. Checked paths:');
  webBuildPaths.forEach(p => console.log('   -', p));
  console.log('   Current working directory:', process.cwd());
  console.log('   __dirname:', __dirname);
  console.log('   Listing /app directory:', fs.existsSync('/app') ? fs.readdirSync('/app').join(', ') : 'not found');
  if (fs.existsSync('/app/web')) {
    console.log('   Listing /app/web:', fs.readdirSync('/app/web').join(', '));
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
  const fs = require('fs');
  const indexPaths = [
    path.join(__dirname, '../../web/dist/index.html'),
    path.join(process.cwd(), 'web/dist/index.html'),
    path.join(process.cwd(), '../web/dist/index.html'),
    '/app/web/dist/index.html'
  ];
  
  for (const indexPath of indexPaths) {
    if (fs.existsSync(indexPath)) {
      console.log('Serving index.html from:', indexPath);
      return res.sendFile(path.resolve(indexPath));
    }
  }
  
  // Fallback to API info if web app not built
  console.log('⚠️  index.html not found, serving API info');
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
  const fs = require('fs');
  const indexPaths = [
    path.join(__dirname, '../../web/dist/index.html'),
    path.join(process.cwd(), 'web/dist/index.html'),
    path.join(process.cwd(), '../web/dist/index.html'),
    '/app/web/dist/index.html'
  ];
  
  for (const indexPath of indexPaths) {
    if (fs.existsSync(indexPath)) {
      return res.sendFile(path.resolve(indexPath));
    }
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
  // Log detailed information about the environment
  console.log('=== Server Startup Information ===');
  console.log('Current working directory:', process.cwd());
  console.log('__dirname:', __dirname);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // Check for web build one more time with detailed logging
  const fs = require('fs');
  console.log('\n=== Checking for web build ===');
  const checkPaths = [
    path.join(__dirname, '../../web/dist'),
    path.join(process.cwd(), 'web/dist'),
    path.join(process.cwd(), '../web/dist'),
    '/app/web/dist',
    path.join(process.cwd(), '../../web/dist')
  ];
  
  checkPaths.forEach(checkPath => {
    const exists = fs.existsSync(checkPath);
    console.log(`${exists ? '✅' : '❌'} ${checkPath}`);
    if (exists) {
      try {
        const files = fs.readdirSync(checkPath);
        console.log(`   Contains ${files.length} files: ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);
        if (fs.existsSync(path.join(checkPath, 'index.html'))) {
          console.log('   ✅ index.html found');
        } else {
          console.log('   ❌ index.html NOT found');
        }
      } catch (err) {
        console.log(`   Error reading directory: ${err.message}`);
      }
    }
  });
  
  // List /app directory structure
  if (fs.existsSync('/app')) {
    console.log('\n=== /app directory structure ===');
    try {
      const appContents = fs.readdirSync('/app');
      console.log('Contents:', appContents.join(', '));
      
      if (appContents.includes('web')) {
        const webContents = fs.readdirSync('/app/web');
        console.log('/app/web contents:', webContents.join(', '));
        if (webContents.includes('dist')) {
          const distContents = fs.readdirSync('/app/web/dist');
          console.log('/app/web/dist contents:', distContents.join(', '));
        }
      }
    } catch (err) {
      console.log('Error reading /app:', err.message);
    }
  }
  
  console.log('=== End Startup Information ===\n');
  
  // Check for required environment variables
  console.log('=== Environment Variables Check ===');
  const requiredVars = {
    'JWT_SECRET': process.env.JWT_SECRET,
    'DATABASE_URL': process.env.DATABASE_URL ? 'Set' : 'Missing',
  };
  
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (value && value !== 'Missing') {
      console.log(`✅ ${key}: Configured`);
    } else {
      console.error(`❌ ${key}: MISSING - This will cause authentication to fail!`);
    }
  });
  console.log('=== End Environment Check ===\n');
  
  // Start server immediately (don't wait for migrations)
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    if (!process.env.JWT_SECRET) {
      console.error('\n⚠️  WARNING: JWT_SECRET is not set!');
      console.error('   Authentication will fail. Please add JWT_SECRET to Railway environment variables.\n');
    }
    
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

