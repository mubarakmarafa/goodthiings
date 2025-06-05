import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Environment variables check:');
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
  console.error('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  throw new Error('Missing Supabase environment variables');
}

// Create admin client for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create client with anon key for frontend auth
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
export const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey); 