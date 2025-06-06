import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client for database operations (not auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Using service role key for database access
    )

    const { username, password, apiKey } = await req.json()

    if (!username || !password || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Username, password, and API key are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return new Response(
        JSON.stringify({ error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate password (minimum 6 chars)
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-')) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key must start with "sk-"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🆕 Creating new user:', { username });

    // Hash password
    const passwordHash = await hashPassword(password);

    // Insert user into our custom table
    const { data, error } = await supabaseClient
      .from('app_users')
      .insert([{
        username,
        password_hash: passwordHash,
        api_key: apiKey,
        last_used_style: '3d'
      }])
      .select()
      .single()

    if (error) {
      console.error('Signup error:', error);
      
      // Handle duplicate username
      if (error.code === '23505') { // PostgreSQL unique violation
        return new Response(
          JSON.stringify({ error: 'Username already taken. Please choose a different username.' }),
          { 
            status: 409, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to create user: ' + error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ User created successfully:', { id: data.id, username: data.username });

    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        user: {
          id: data.id,
          username: data.username,
          last_used_style: data.last_used_style
        }
      }),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Signup function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 