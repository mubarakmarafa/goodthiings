import express from 'express';
import { supabase } from '../utils/supabase';

export const imagesRoutes = express.Router();

// Get images by style for current user
imagesRoutes.get('/', async (req: any, res: any) => {
  try {
    const { style, user_id } = req.query;

    let query = supabase
      .from('generated_images')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by style if provided
    if (style && (style === '3d' || style === 'handdrawn')) {
      query = query.eq('style_type', style);
    }

    // Filter by user_id if provided (for testing)
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ images: data || [] });
  } catch (error) {
    console.error('Get images error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new image (for testing with sample data)
imagesRoutes.post('/', async (req: any, res: any) => {
  try {
    const { user_id, prompt, style_type, image_url, grid_position_x, grid_position_y } = req.body;

    if (!user_id || !prompt || !style_type || !image_url) {
      return res.status(400).json({ 
        error: 'user_id, prompt, style_type, and image_url are required' 
      });
    }

    const { data, error } = await supabase
      .from('generated_images')
      .insert([{
        user_id,
        prompt,
        style_type,
        image_url,
        grid_position_x: grid_position_x || 0,
        grid_position_y: grid_position_y || 0,
        generation_status: 'completed'
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ image: data });
  } catch (error) {
    console.error('Create image error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 