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

    // Generate image with OpenAI DALL-E 3
    console.log('Making OpenAI request with:', {
      model: 'dall-e-3',
      prompt: enhancedPrompt.substring(0, 100) + '...',
      apiKeyPrefix: userApiKey.substring(0, 10) + '...',
      promptLength: enhancedPrompt.length
    });

    // Try DALL-E 3 first, fallback to DALL-E 2 if access issues
    let openaiResponse;
    let modelUsed = 'dall-e-3';
    
    try {
      openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0'
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          response_format: 'url'
        })
      });

      console.log('DALL-E 3 response status:', openaiResponse.status);
      
      // If DALL-E 3 fails with 400/403, try DALL-E 2
      if (!openaiResponse.ok && (openaiResponse.status === 400 || openaiResponse.status === 403)) {
        const errorBody = await openaiResponse.text();
        console.log('DALL-E 3 failed, trying DALL-E 2. Error:', errorBody);
        
        // Try DALL-E 2 as fallback
        openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Supabase-Edge-Function/1.0'
          },
          body: JSON.stringify({
            model: 'dall-e-2',
            prompt: enhancedPrompt.substring(0, 1000), // DALL-E 2 has shorter prompt limit
            n: 1,
            size: '1024x1024',
            response_format: 'url'
          })
        });
        
        modelUsed = 'dall-e-2';
        console.log('DALL-E 2 response status:', openaiResponse.status);
      }

    } catch (fetchError) {
      console.error('Network error calling OpenAI:', fetchError);
      throw new Error(`Network error calling OpenAI: ${fetchError.message}`);
    }

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text();
      console.error('OpenAI API error details:', errorBody);
      
      // Parse error for better user feedback
      try {
        const errorJson = JSON.parse(errorBody);
        const errorMessage = errorJson.error?.message || errorBody;
        throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorMessage}`);
      } catch {
        throw new Error(`OpenAI API error (${openaiResponse.status}): ${errorBody}`);
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