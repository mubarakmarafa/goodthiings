# Supabase Edge Functions Deployment Guide

## 🚀 **Quick Deployment Checklist**

### **Prerequisites Complete ✅**
- [x] Supabase CLI installed (`npx supabase`)
- [x] Project initialized (`supabase/config.toml` created)
- [x] Edge Functions created in `supabase/functions/`

## 📋 **Deployment Steps**

### **Step 1: Login to Supabase** ✅
```bash
npx supabase login
# Opens browser for authentication
```

### **Step 2: Link Your Project**
```bash
# If you have an existing Supabase project:
npx supabase link --project-ref YOUR_PROJECT_REF

# If you need to create a new project:
npx supabase projects create "goodthiings"
```

**Finding Your Project Reference:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings > General
4. Copy the "Reference ID"

### **Step 3: Deploy Edge Functions**
```bash
# Deploy all functions at once:
npx supabase functions deploy

# Or deploy individual functions:
npx supabase functions deploy auth-signup
npx supabase functions deploy images-generate
npx supabase functions deploy images-list
```

### **Step 4: Test Your Functions**
```bash
# Test the image generation function:
curl -X POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/images-generate' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -H 'x-openai-key: YOUR_OPENAI_KEY' \
  -d '{
    "prompt": "a beautiful sunset",
    "style_type": "3d",
    "grid_position_x": 0,
    "grid_position_y": 0
  }'
```

## 🔧 **Function URLs**

After deployment, your Edge Functions will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/auth-signup
https://YOUR_PROJECT_REF.supabase.co/functions/v1/images-generate
https://YOUR_PROJECT_REF.supabase.co/functions/v1/images-list
```

## 🔐 **Environment Variables Setup**

### **For Edge Functions (Optional)**
If you want to set any server-side environment variables:
```bash
# Set environment variables (if needed)
npx supabase secrets set MY_SECRET=value

# List all secrets
npx supabase secrets list
```

**Note**: For our user API key approach, no server-side secrets needed! 🎉

## 🎯 **Frontend Integration**

Update your React app to use the deployed Edge Functions:

```typescript
// Replace localhost with your Supabase project URL
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'

// In your useImageGeneration hook:
const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'x-openai-key': userApiKey, // User's OpenAI key
  },
  body: JSON.stringify({
    prompt,
    style_type: styleType,
    grid_position_x: gridPosition?.x || 0,
    grid_position_y: gridPosition?.y || 0,
  }),
})
```

## 📊 **Monitoring & Logs**

### **View Function Logs:**
```bash
# Watch logs in real-time
npx supabase functions logs images-generate --follow

# View recent logs
npx supabase functions logs images-generate
```

### **Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to "Edge Functions"
4. View deployment status, logs, and metrics

## 🔄 **Updating Functions**

When you make changes to your Edge Functions:
```bash
# Deploy updated function
npx supabase functions deploy images-generate

# Deploy all functions with changes
npx supabase functions deploy
```

## 🚨 **Troubleshooting**

### **Common Issues:**

**1. Permission Errors:**
```bash
# Ensure you're logged in
npx supabase status
```

**2. Project Link Issues:**
```bash
# Re-link project
npx supabase link --project-ref YOUR_PROJECT_REF
```

**3. Function Deployment Errors:**
```bash
# Check function syntax
npx supabase functions serve images-generate
```

**4. Database Connection Issues:**
```bash
# Verify database setup
npx supabase db reset
```

## ✅ **Deployment Success Checklist**

- [ ] Supabase CLI authenticated
- [ ] Project linked to your Supabase project
- [ ] Edge Functions deployed successfully
- [ ] Function URLs accessible
- [ ] Frontend updated with production URLs
- [ ] Test image generation working
- [ ] User API key flow functioning

## 🎯 **Next Steps After Deployment**

1. **Update Frontend**: Replace localhost URLs with production Edge Function URLs
2. **Test Integration**: Verify full user flow with API keys
3. **Monitor Usage**: Check Supabase dashboard for function metrics
4. **Scale**: Functions auto-scale based on usage

## 💰 **Cost Information**

**Edge Functions Pricing:**
- **Free Tier**: 500,000 function invocations per month
- **Pro Tier**: $25/month for 2 million invocations
- **Additional**: $2 per 1 million invocations

**Perfect for your user-pays-for-OpenAI model!** 🎯 