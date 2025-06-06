# Deployment Guide

This project has both frontend and backend components:
- **Frontend**: Deployed to Vercel (https://goodthiings.vercel.app)
- **Backend**: Ready for Railway deployment

## Backend Deployment (Railway) 🚀

### Prerequisites
- Railway account: https://railway.app
- GitHub repository connected
- Supabase environment variables

### Environment Variables Required:
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  
SUPABASE_ANON_KEY=your_anon_key
NODE_ENV=production
```

### Railway Deployment Steps:
1. **Connect Repository**: Link your GitHub repo to Railway
2. **Set Environment Variables**: Add the Supabase credentials
3. **Deploy**: Railway will automatically use `npm run backend:start`
4. **Domain**: Railway provides a custom domain like `https://your-app.railway.app`

### Configuration Files:
- ✅ `Procfile` - Railway deployment configuration  
- ✅ `package.json` - Updated with deployment scripts
- ✅ `backend/src/server.ts` - Production CORS settings

## Frontend Deployment (Vercel) ✅

The frontend is already deployed to Vercel and configured to work with the backend.

## Setup Instructions

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit with GitHub Pages setup"
git push origin main
```

### 2. Enable GitHub Pages in Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically deploy your site

### 3. Your Site Will Be Available At:
```
https://[your-username].github.io/thiings-grid/
```

## How It Works

- **Automatic Deployment**: Every push to `main` triggers a build and deployment
- **Build Process**: Uses Vite to build the React app
- **Static Hosting**: Deploys the built files to GitHub Pages
- **Custom Domain**: You can configure a custom domain in repository settings if desired

## Local Development vs Production

- **Local Development**: Run `npm run dev` - uses base path `/`
- **Production Build**: Run `npm run build` - uses base path `/thiings-grid/`

## Workflow Details

The deployment uses GitHub Actions with:
- Node.js 18
- Automatic dependency caching
- Build artifact upload
- Secure deployment with proper permissions

## Troubleshooting

If deployment fails:
1. Check the **Actions** tab in your GitHub repository
2. Look for error messages in the workflow logs
3. Ensure your repository has Pages enabled
4. Verify the `main` branch exists and has the latest code

## Manual Deployment

If you need to deploy manually:
```bash
npm run build
# Then upload the `dist` folder contents to your hosting provider
``` 