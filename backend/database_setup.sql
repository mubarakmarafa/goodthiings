-- ThiingsGrid AI Database Setup
-- Run this in your Supabase SQL Editor

-- Create custom users table (extends Supabase auth)
CREATE TABLE public.users (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_used_style TEXT DEFAULT '3d',
    generation_count INTEGER DEFAULT 0,
    monthly_generation_limit INTEGER DEFAULT 50
);

-- Create generated images table
CREATE TABLE public.generated_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    prompt TEXT NOT NULL,
    enhanced_prompt TEXT,
    style_type TEXT NOT NULL CHECK (style_type IN ('3d', 'handdrawn')),
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    grid_position_x INTEGER,
    grid_position_y INTEGER,
    generation_status TEXT DEFAULT 'completed' CHECK (generation_status IN ('pending', 'completed', 'failed')),
    openai_request_id TEXT,
    model_used TEXT, -- Track which model was used (gpt-image-1, dall-e-3, dall-e-2)
    revised_prompt TEXT, -- Store revised prompt from OpenAI (especially for DALL-E 3)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Add RLS policies for generated_images table
CREATE POLICY "Users can view own images" ON public.generated_images
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images" ON public.generated_images
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own images" ON public.generated_images
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own images" ON public.generated_images
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on our custom tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_style_type ON public.generated_images(style_type);
CREATE INDEX IF NOT EXISTS idx_generated_images_model_used ON public.generated_images(model_used);

-- Migration script for existing installations
-- Add new columns if they don't exist
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS revised_prompt TEXT;

-- Tables created successfully! 
-- You can add sample data later after creating a real user account. 