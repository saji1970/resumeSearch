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

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/resumes', require('./routes/resumes'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/ai', require('./routes/ai'));

// Health check - simple endpoint to verify server is running
// Doesn't check database to avoid blocking during migrations
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
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

