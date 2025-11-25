# Railway Deployment Guide

This guide will help you deploy the AI Job Search App to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub account (your code is already on GitHub)
3. API keys for:
   - OpenAI (for resume parsing and AI features)
   - Hugging Face (optional, for AI fallback)
   - Serper (for web job search)

## Deployment Steps

### 1. Connect Your Repository to Railway

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository: `saji1970/resumeSearch`
5. Railway will automatically detect the project

### 2. Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a PostgreSQL database
4. The `DATABASE_URL` environment variable will be automatically set

### 3. Configure Environment Variables

In your Railway project, go to the "Variables" tab and add the following:

#### Required Variables:
```
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-change-this
```

#### Database (Auto-configured by Railway):
```
DATABASE_URL=postgresql://... (automatically set by Railway)
```

#### API Keys:
```
OPENAI_API_KEY=your-openai-api-key
HUGGINGFACE_API_KEY=your-huggingface-api-key
HF_CONVERSATION_MODEL=microsoft/DialoGPT-medium
HF_TEXT_MODEL=gpt2
SERPER_API_KEY=your-serper-api-key
```

#### Optional Variables:
```
POSTGRES_HOST= (not needed if using DATABASE_URL)
POSTGRES_PORT= (not needed if using DATABASE_URL)
POSTGRES_USER= (not needed if using DATABASE_URL)
POSTGRES_PASSWORD= (not needed if using DATABASE_URL)
POSTGRES_DB= (not needed if using DATABASE_URL)
MONGODB_URI= (optional, if using MongoDB)
REDIS_HOST= (optional, if using Redis)
REDIS_PORT= (optional, if using Redis)
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

### 4. Deploy Backend Service

Railway will automatically:
1. Detect the `Procfile` or `railway.json` configuration
2. Install dependencies (`npm install` in backend)
3. Run database migrations (`npm run migrate`)
4. Start the server (`npm start`)

The backend will be available at: `https://your-project-name.up.railway.app`

### 5. (Optional) Deploy Web Frontend as Separate Service

If you want to deploy the web frontend separately:

1. In Railway, click "New" → "GitHub Repo"
2. Select the same repository
3. Set the **Root Directory** to `web`
4. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run preview` (or use a static file server)
5. Add environment variable:
   ```
   VITE_API_URL=https://your-backend-service.up.railway.app/api
   ```

### 6. Update Frontend API Configuration

If deploying frontend separately, update the API URL:

**For Web (`web/src/services/api/config.ts`):**
```typescript
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-backend.up.railway.app/api';
```

**For Mobile (`mobile/src/services/api/config.ts`):**
```typescript
export const API_BASE_URL = 'https://your-backend.up.railway.app/api';
```

## Post-Deployment

### 1. Verify Database Migration

The migration should run automatically on first deploy. To verify:
1. Go to Railway dashboard → Your PostgreSQL service
2. Click "Query" tab
3. Run: `SELECT * FROM users;` (should return empty or your test data)

### 2. Test API Endpoints

```bash
# Health check
curl https://your-project.up.railway.app/api/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 3. Test Registration

```bash
curl -X POST https://your-project.up.railway.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly in Railway variables
- Check Railway PostgreSQL service is running
- Ensure SSL is enabled in production (handled automatically)

### Migration Errors

If migrations fail:
1. Check Railway logs for error messages
2. Manually run migration:
   ```bash
   railway run npm run migrate
   ```

### API Key Issues

- Verify all API keys are set in Railway variables
- Check API key quotas and billing
- Review Railway logs for API errors

### Port Issues

- Railway automatically sets `PORT` environment variable
- Backend uses `process.env.PORT || 3000`
- No manual port configuration needed

## Railway-Specific Features

### Custom Domain

1. Go to your service settings
2. Click "Generate Domain" or "Custom Domain"
3. Add your custom domain

### Environment Variables

- Railway automatically provides `DATABASE_URL` for PostgreSQL
- Use Railway's variable management UI for secrets
- Variables are encrypted at rest

### Logs

- View real-time logs in Railway dashboard
- Logs are automatically collected
- Use `railway logs` CLI command for terminal access

### Health Checks

The app includes a health check endpoint at `/api/health`:
- Railway will automatically monitor this endpoint
- Configured in `railway.json` with 100ms timeout

## Cost Optimization

1. **Use Railway's free tier** for development
2. **Scale down** when not in use
3. **Monitor usage** in Railway dashboard
4. **Optimize API calls** to reduce external API costs

## Next Steps

After deployment:
1. Test all features (registration, login, CV upload, job search)
2. Set up monitoring and alerts
3. Configure custom domain
4. Set up CI/CD for automatic deployments
5. Add backup strategy for database

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: https://github.com/saji1970/resumeSearch/issues

