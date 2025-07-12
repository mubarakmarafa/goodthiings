# Google OAuth Setup Guide for GoodThiings

This guide will walk you through setting up Google OAuth authentication to replace the current complex username/password system with a simple, secure Google sign-in.

## Overview

The refactored authentication system:
- ✅ Uses Google OAuth for authentication (no more username/password)
- ✅ Separates API key management from authentication
- ✅ Users input their OpenAI API key during image generation (not during login)
- ✅ Simplified codebase with better security
- ✅ Better user experience

## Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Configure OAuth Consent Screen
1. Navigate to `APIs & Services` → `OAuth consent screen`
2. Choose `External` for user type
3. Fill in the required information:
   - **App name**: GoodThiings
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes (these are usually added automatically):
   - `email`
   - `profile`
   - `openid`
5. Save and continue through the setup

### 1.3 Create OAuth Credentials
1. Navigate to `APIs & Services` → `Credentials`
2. Click `Create Credentials` → `OAuth client ID`
3. Select `Web application` as application type
4. Configure URLs:
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173` (for development)
     - `https://your-production-domain.com` (for production)
   - **Authorized redirect URIs**:
     - `https://whstudldcjncgyybfezn.supabase.co/auth/v1/callback`
     - Replace `whstudldcjncgyybfezn` with your actual Supabase project reference
5. Click `Create` and copy the **Client ID** and **Client Secret**

## Step 2: Supabase Configuration

### 2.1 Enable Google OAuth
1. Go to your [Supabase Dashboard](https://app.supabase.io/)
2. Navigate to `Authentication` → `Providers`
3. Find `Google` and enable it
4. Enter your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Save the configuration

### 2.2 Configure Redirect URLs
1. In Supabase, go to `Authentication` → `URL Configuration`
2. Add these redirect URLs:
   - `http://localhost:5173/**` (for development)
   - `https://your-production-domain.com/**` (for production)
3. Set your **Site URL** to your main domain

## Step 3: Application Changes Made

### 3.1 Simplified Authentication Context
```typescript
// src/contexts/AuthContext.tsx - Now uses Google OAuth
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}
```

### 3.2 New Login Screen
- Simple Google OAuth button
- Clean, modern design
- No more complex username/password forms

### 3.3 API Key Management
- Users input their OpenAI API key during image generation
- API key is not stored or associated with authentication
- More secure and follows OpenAI best practices

## Step 4: Testing the Setup

### 4.1 Development Testing
1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:5173`
3. Click "Continue with Google"
4. Complete the OAuth flow
5. You should be redirected back to the app and authenticated

### 4.2 Production Testing
1. Deploy your application with the new code
2. Update the Google Cloud Console with your production domain
3. Test the OAuth flow in production

## Step 5: Migration Notes

### What's Removed
- ✅ Complex username/password system
- ✅ Custom edge functions for auth
- ✅ Password hashing and storage
- ✅ API key storage in authentication
- ✅ Custom user table management

### What's Added
- ✅ Google OAuth integration
- ✅ Simplified authentication flow
- ✅ Secure API key input during usage
- ✅ Better error handling
- ✅ Cleaner codebase

## Troubleshooting

### Common Issues

1. **"Error: redirect_uri_mismatch"**
   - Check that your redirect URIs in Google Cloud Console match exactly
   - Ensure you're using the correct Supabase project URL

2. **"CORS errors"**
   - Make sure your site URL is configured in Supabase
   - Check that JavaScript origins are set correctly in Google Cloud Console

3. **"OAuth configuration error"**
   - Verify your Client ID and Client Secret are correct
   - Ensure the Google OAuth provider is enabled in Supabase

4. **"User not found" after OAuth**
   - Check that your Supabase RLS policies allow user creation
   - Verify that the user profile table is set up correctly

## Benefits of This Approach

1. **Better Security**: No password storage, leverages Google's secure OAuth
2. **Better UX**: One-click sign-in with Google
3. **Simpler Code**: Removed complex authentication logic
4. **API Key Safety**: Keys are only used during generation, not stored
5. **Easier Maintenance**: Less custom auth code to maintain

## Environment Variables

Make sure you have these environment variables set:

```bash
# In your .env file
VITE_SUPABASE_URL=https://whstudldcjncgyybfezn.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Production Deployment

Before deploying to production:

1. Update Google Cloud Console with production URLs
2. Update Supabase redirect URLs with production domain
3. Test the OAuth flow thoroughly
4. Monitor for any authentication errors

This new system is much simpler, more secure, and provides a better user experience while maintaining all the functionality of the original app.