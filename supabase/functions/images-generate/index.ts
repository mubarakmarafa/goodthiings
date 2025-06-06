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

    // Generate image with OpenAI DALL-E 3
    const openaiResponse = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'url'
      })
    })

    if (!openaiResponse.ok) {
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
        message: 'Image generated successfully' 
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