-- Database Migration Script for Image Generation Improvements
-- Run this in your Supabase SQL Editor if you have an existing installation

-- Add new columns to track AI model usage and revised prompts
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS model_used TEXT,
ADD COLUMN IF NOT EXISTS revised_prompt TEXT;

-- Add indexes for better performance on the new columns
CREATE INDEX IF NOT EXISTS idx_generated_images_model_used ON public.generated_images(model_used);

-- Add a comment to document the new columns
COMMENT ON COLUMN public.generated_images.model_used IS 'Track which AI model was used for generation (gpt-image-1, dall-e-3, dall-e-2)';
COMMENT ON COLUMN public.generated_images.revised_prompt IS 'Store revised prompt from OpenAI (especially useful for DALL-E 3 which often revises prompts)';

-- Optional: Update existing records to have a default model_used value
-- (Only run this if you want to mark existing images with a default model)
-- UPDATE public.generated_images 
-- SET model_used = 'unknown' 
-- WHERE model_used IS NULL;

-- Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'generated_images' 
  AND table_schema = 'public'
  AND column_name IN ('model_used', 'revised_prompt');

-- Check if indexes were created successfully
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'generated_images' 
  AND indexname LIKE '%model_used%';

-- Migration completed successfully!
-- The generated_images table now supports tracking AI model usage and revised prompts.