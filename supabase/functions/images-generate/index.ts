import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openai-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Types for better type safety
interface ImageGenerationRequest {
  prompt: string;
  style_type: 'handdrawn' | '3d';
  grid_position_x?: number;
  grid_position_y?: number;
}

interface OpenAIImageResponse {
  data: Array<{
    url: string;
    revised_prompt?: string;
  }>;
}

interface ModelConfig {
  name: string;
  body: {
    model: string;
    prompt: string;
    n: number;
    size: string;
    response_format: string;
    quality?: string;
    style?: string;
  };
}

// Enhanced prompt generation with better style-specific prompts
function enhancePrompt(prompt: string, styleType: 'handdrawn' | '3d'): string {
  const basePrompt = prompt.trim();
  
  if (styleType === '3d') {
    return `3D rendered icon, high quality, modern digital art style, clean background, professional lighting, vibrant colors: ${basePrompt}`;
  } else {
    return `Hand-drawn illustration, sketch style, artistic, clean lines, minimal background, icon-style: ${basePrompt}`;
  }
}

// Validate OpenAI API key format
function validateApiKey(apiKey: string): { valid: boolean; error?: string } {
  if (!apiKey) {
    return { valid: false, error: 'OpenAI API key is required' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'Invalid OpenAI API key format. Keys should start with "sk-"' };
  }
  
  if (apiKey.length < 20) {
    return { valid: false, error: 'OpenAI API key appears to be too short' };
  }
  
  return { valid: true };
}

// Check if error is content-related (won't work on any model)
function isContentError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const errorCode = error.code || error.type;
  const errorMessage = error.message || '';
  
  return (
    errorCode === 'content_filter' ||
    errorCode === 'content_policy_violation' ||
    errorCode === 'contentFilter' ||
    errorCode === 'image_generation_user_error' ||
    errorMessage.toLowerCase().includes('content policy') ||
    errorMessage.toLowerCase().includes('content filter') ||
    errorMessage.toLowerCase().includes('safety')
  );
}

// Parse OpenAI error for better user feedback
function parseOpenAIError(responseText: string): string {
  try {
    const errorData = JSON.parse(responseText);
    const error = errorData.error;
    
    if (isContentError(error)) {
      return 'Your prompt was flagged by content moderation. Please try a different, more general description.';
    }
    
    if (error?.code === 'insufficient_quota') {
      return 'Your OpenAI API key has insufficient credits. Please check your OpenAI account billing.';
    }
    
    if (error?.code === 'invalid_api_key') {
      return 'Invalid OpenAI API key. Please check your API key and try again.';
    }
    
    if (error?.code === 'rate_limit_exceeded') {
      return 'Rate limit exceeded. Please wait a moment and try again.';
    }
    
    return error?.message || 'Unknown OpenAI API error';
  } catch {
    return responseText || 'Unknown API error';
  }
}

// Create model configurations with proper parameters
function createModelConfigs(enhancedPrompt: string): ModelConfig[] {
  return [
    {
      name: 'gpt-image-1',
      body: {
        model: 'gpt-image-1',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        response_format: 'url'
      }
    },
    {
      name: 'dall-e-3',
      body: {
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
        response_format: 'url'
      }
    },
    {
      name: 'dall-e-2',
      body: {
        model: 'dall-e-2',
        prompt: enhancedPrompt.substring(0, 1000), // DALL-E 2 has shorter limit
        n: 1,
        size: '1024x1024',
        response_format: 'url'
      }
    }
  ];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting image generation request');
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('❌ Authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let requestData: ImageGenerationRequest;
    try {
      requestData = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, style_type, grid_position_x, grid_position_y } = requestData;

    // Validate required fields
    if (!prompt || !style_type) {
      return new Response(
        JSON.stringify({ error: 'Prompt and style_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['handdrawn', '3d'].includes(style_type)) {
      return new Response(
        JSON.stringify({ error: 'style_type must be "handdrawn" or "3d"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get and validate OpenAI API key
    const userApiKey = req.headers.get('x-openai-key');
    const keyValidation = validateApiKey(userApiKey || '');
    if (!keyValidation.valid) {
      return new Response(
        JSON.stringify({ error: keyValidation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enhance prompt based on style
    const enhancedPrompt = enhancePrompt(prompt, style_type);
    console.log('🎨 Enhanced prompt:', enhancedPrompt.substring(0, 100) + '...');

    // Create model configurations
    const modelConfigs = createModelConfigs(enhancedPrompt);
    console.log('🤖 Available models:', modelConfigs.map(m => m.name));

    // Try each model in order
    let successfulResponse: Response | null = null;
    let modelUsed = '';
    let lastError = '';

    for (const modelConfig of modelConfigs) {
      try {
        console.log(`⏳ Attempting ${modelConfig.name}...`);
        
        const response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ThiingsGrid-AI/1.0'
          },
          body: JSON.stringify(modelConfig.body)
        });

        console.log(`📡 ${modelConfig.name} response status: ${response.status}`);
        
        if (response.ok) {
          successfulResponse = response;
          modelUsed = modelConfig.name;
          console.log(`✅ Successfully generated image with ${modelConfig.name}`);
          break;
        } else {
          const errorText = await response.text();
          console.log(`❌ ${modelConfig.name} failed:`, errorText);
          lastError = errorText;
          
          // Check if it's a content error - if so, don't try other models
          const parsedError = parseOpenAIError(errorText);
          if (parsedError.includes('content moderation') || parsedError.includes('content policy')) {
            console.log('🚫 Content filter error - skipping other models');
            break;
          }
        }
      } catch (fetchError) {
        console.error(`🌐 Network error with ${modelConfig.name}:`, fetchError);
        lastError = `Network error: ${fetchError.message}`;
        continue;
      }
    }

    // Check if we got a successful response
    if (!successfulResponse) {
      console.error('❌ All models failed. Last error:', lastError);
      const userFriendlyError = parseOpenAIError(lastError);
      return new Response(
        JSON.stringify({ 
          error: userFriendlyError,
          details: 'All image generation models failed'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse successful response
    const openaiData: OpenAIImageResponse = await successfulResponse.json();
    
    if (!openaiData.data || !openaiData.data[0] || !openaiData.data[0].url) {
      console.error('❌ Invalid OpenAI response format:', openaiData);
      return new Response(
        JSON.stringify({ error: 'Invalid response from image generation API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const imageUrl = openaiData.data[0].url;
    const revisedPrompt = openaiData.data[0].revised_prompt;

    console.log('🖼️ Generated image URL:', imageUrl);
    console.log('📝 Revised prompt:', revisedPrompt || 'None');

    // Save to database
    const { data: imageRecord, error: dbError } = await supabaseClient
      .from('generated_images')
      .insert([{
        user_id: user.id,
        prompt: prompt.trim(),
        enhanced_prompt: enhancedPrompt,
        style_type,
        image_url: imageUrl,
        grid_position_x: grid_position_x || 0,
        grid_position_y: grid_position_y || 0,
        generation_status: 'completed',
        model_used: modelUsed,
        revised_prompt: revisedPrompt || null
      }])
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return new Response(
        JSON.stringify({ error: `Database error: ${dbError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('💾 Image saved to database:', imageRecord.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: imageRecord,
        message: `Image generated successfully with ${modelUsed.toUpperCase()}`,
        model_used: modelUsed,
        revised_prompt: revisedPrompt || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred during image generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 