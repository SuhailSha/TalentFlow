# Deployment Configuration

This document lists all environment variables required for each deployment
platform.

## Vercel (Frontend - apps/web)

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://your-api-domain.onrender.com/api/v1

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=TalentFlow
NEXT_PUBLIC_ENABLE_DEVTOOLS=false

# Server-side JWT Secret (must match API)
JWT_SECRET=your-jwt-secret-min-32-chars-use-openssl-rand-base64-64
```

## Render (Backend - apps/api)

Set these in Render Dashboard → Environment Variables:

```bash
# Application
NODE_ENV=production
PORT=10000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require

# Cache/Queue
REDIS_URL=rediss://user:password@host:port
REDIS_ENABLED=true

# CORS (comma-separated for multiple origins)
CORS_ORIGIN=https://your-app.vercel.app

# Authentication
JWT_SECRET=your-jwt-secret-min-32-chars-use-openssl-rand-base64-64
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-different-from-jwt-secret
JWT_REFRESH_EXPIRES_IN=30d

# Logging
LOG_LEVEL=info

# AI Integration (optional)
GEMINI_API_KEY=your-gemini-api-key
```

## Database Migrations

**✅ Automated**: Migrations run automatically during Render deployment via the
build command in `render.yaml`.

**Manual command** (if needed for troubleshooting):

```bash
pnpm --filter @repo/database exec prisma migrate deploy
```

## Security Notes

- ✅ All `.env*` files are gitignored
- ✅ No real secrets committed to repository
- ✅ JWT secrets must be 32+ characters (use `openssl rand -base64 64`)
- ✅ Use different secrets for JWT_SECRET and JWT_REFRESH_SECRET
- ✅ DATABASE_URL and REDIS_URL contain credentials - store securely
- ✅ CORS_ORIGIN should match your exact Vercel domain

## Health Checks

- **API Health**: `https://your-api-domain.onrender.com/api/v1/health`
- **Frontend**: Vercel automatic health monitoring

## Troubleshooting

### Build Failures on Render

1. **Check Environment Variables**: Ensure `DATABASE_URL` is set before build
   starts
2. **Prisma Issues**: Database must be accessible during build for migrations
3. **Build Logs**: Check Render logs for specific error messages
4. **Dependencies**: All workspace packages must build in correct order

### Common Issues

- **CORS Errors**: Update `CORS_ORIGIN` after getting your Vercel URL
- **Database Connection**: Verify `DATABASE_URL` format and credentials
- **Redis Connection**: Ensure `REDIS_URL` includes credentials
- **Build Timeouts**: Consider upgrading Render plan for larger builds
