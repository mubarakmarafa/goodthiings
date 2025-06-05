import express from 'express';
import { supabase } from '../utils/supabase';

export const userRoutes = express.Router();

// Get user preferences
userRoutes.get('/preferences/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user preferences
userRoutes.put('/preferences/:userId', async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const { last_used_style } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ 
        last_used_style,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ user: data });
  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 