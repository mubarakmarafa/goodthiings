import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Generate image with OpenAI latest model (gpt-image-1 or dall-e-3 fallback)
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1', // Latest OpenAI image model
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'high', // Use high quality for better results
        response_format: 'url'
      })
    })

    // Handle potential model fallback
    if (!openaiResponse.ok) {
      // If gpt-image-1 fails, try with dall-e-3 as fallback
      if (openaiResponse.status === 400) {
        const fallbackResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3', // Fallback to DALL-E 3
            prompt: enhancedPrompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            response_format: 'url'
          })
        })
        
        if (!fallbackResponse.ok) {
          throw new Error(`OpenAI API error: ${fallbackResponse.statusText}`)
        }
        
        const fallbackData = await fallbackResponse.json()
        const imageUrl = fallbackData.data[0].url
        
        // Continue with fallback result...
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
            message: 'Image generated successfully (using DALL-E 3 fallback)',
            model_used: 'dall-e-3'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

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
        message: 'Image generated successfully',
        model_used: 'gpt-image-1'
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