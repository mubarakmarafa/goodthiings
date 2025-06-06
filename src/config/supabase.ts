// Supabase configuration for production
export const SUPABASE_CONFIG = {
  url: 'https://whstudldcjncgyybfezn.supabase.co',
  anonKey: 'your_anon_key_here', // Get from Supabase Dashboard > Settings > API
  
  // Edge Function URLs
  functions: {
    authSignup: 'https://whstudldcjncgyybfezn.supabase.co/functions/v1/auth-signup',
    imagesGenerate: 'https://whstudldcjncgyybfezn.supabase.co/functions/v1/images-generate',
    imagesList: 'https://whstudldcjncgyybfezn.supabase.co/functions/v1/images-list',
  }
}

// Example usage in your React components:
// const response = await fetch(SUPABASE_CONFIG.functions.imagesGenerate, {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//     'Authorization': `Bearer ${session.access_token}`,
//     'x-openai-key': userApiKey, // User's OpenAI API key
//   },
//   body: JSON.stringify({
//     prompt: 'a beautiful sunset',
//     style_type: '3d',
//     grid_position_x: 0,
//     grid_position_y: 0,
//   }),
// }) 