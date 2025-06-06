import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-openai-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, style_type, grid_position_x, grid_position_y } = await req.json()

    if (!prompt || !style_type) {
      return new Response(
        JSON.stringify({ error: 'Prompt and style_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enhance prompt based on style
    const enhancedPrompt = style_type === '3d' 
      ? `3D rendered, high quality, modern digital art style: ${prompt}`
      : `Hand-drawn illustration, sketch style, artistic: ${prompt}`

    // Get user's OpenAI API key from request headers
    const userApiKey = req.headers.get('x-openai-key')
    if (!userApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is required. Please provide your API key.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate image with OpenAI (trying multiple models)
    console.log('Making OpenAI request with:', {
      prompt: enhancedPrompt.substring(0, 100) + '...',
      apiKeyPrefix: userApiKey.substring(0, 10) + '...',
      promptLength: enhancedPrompt.length,
      availableModels: ['gpt-image-1', 'dall-e-3', 'dall-e-2']
    });

    // Try models in order: gpt-image-1 (newest) -> DALL-E 3 -> DALL-E 2
    let openaiResponse;
    let modelUsed = 'gpt-image-1';
    const models = [
      {
        name: 'gpt-image-1',
        body: {
          model: 'gpt-image-1',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'high', // 'low', 'medium', 'high' for gpt-image-1
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
          quality: 'hd', // 'standard' or 'hd' for DALL-E 3
          style: 'vivid', // 'natural' or 'vivid' for DALL-E 3
          response_format: 'url'
        }
      },
      {
        name: 'dall-e-2',
        body: {
          model: 'dall-e-2',
          prompt: enhancedPrompt.substring(0, 1000), // DALL-E 2 has shorter prompt limit
          n: 1,
          size: '1024x1024',
          response_format: 'url'
        }
      }
    ];

    let lastError = null;
    
    for (const modelConfig of models) {
      try {
        console.log(`Trying ${modelConfig.name}...`);
        
        openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'ThiingsGrid-AI/1.0'
          },
          body: JSON.stringify(modelConfig.body)
        });

        console.log(`${modelConfig.name} response status:`, openaiResponse.status);
        
        if (openaiResponse.ok) {
          modelUsed = modelConfig.name;
          break; // Success, exit the loop
        } else {
          const errorBody = await openaiResponse.text();
          console.log(`${modelConfig.name} failed:`, errorBody);
          lastError = errorBody;
          
          // Don't try next model if it's a content filter error (these won't work on any model)
          try {
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error?.code === 'content_filter' || 
                errorJson.error?.type === 'image_generation_user_error' ||
                errorJson.error?.code === 'contentFilter') {
              console.log('Content filter error detected, not trying other models');
              console.log('Error details:', errorJson.error);
              lastError = errorBody;
              break;
            }
          } catch (e) {
            // Continue to next model if we can't parse the error
          }
        }
      } catch (fetchError) {
        console.error(`Network error with ${modelConfig.name}:`, fetchError);
        lastError = fetchError.message;
        continue; // Try next model
      }
    }

    // Check if we got a successful response from any model
    if (!openaiResponse || !openaiResponse.ok) {
      console.error('All models failed. Last error:', lastError);
      
      // Try to parse the last error for better user feedback
      if (lastError) {
        try {
          const errorJson = JSON.parse(lastError);
          
          // Handle content moderation errors specifically
          if (errorJson.error?.code === 'content_filter' || 
              errorJson.error?.type === 'image_generation_user_error' ||
              errorJson.error?.code === 'contentFilter') {
            throw new Error('Your prompt was flagged by the content moderation system. Please try a different, more general description.');
          }
          
          // Handle other API errors
          const errorMessage = errorJson.error?.message || lastError;
          throw new Error(`OpenAI API error: ${errorMessage}`);
        } catch (parseError) {
          // If we can't parse as JSON, return the raw error
          throw new Error(`OpenAI API error: ${lastError}`);
        }
      } else {
        throw new Error('OpenAI API error: All image generation models failed');
      }
    }

    // Parse successful response

    const openaiData = await openaiResponse.json()
    const imageUrl = openaiData.data[0].url

    // Save to database
    const { data: imageRecord, error: dbError } = await supabaseClient
      .from('generated_images')
      .insert([{
        user_id: user.id,
        prompt,
        enhanced_prompt: enhancedPrompt,
        style_type,
        image_url: imageUrl,
        grid_position_x: grid_position_x || 0,
        grid_position_y: grid_position_y || 0,
        generation_status: 'completed'
      }])
      .select()
      .single()

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        image: imageRecord,
        message: `Image generated successfully with ${modelUsed.toUpperCase()}`,
        model_used: modelUsed
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Image generation error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate image' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 