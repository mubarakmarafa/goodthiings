import express, { Request, Response } from 'express';
import { supabaseAuth } from '../utils/supabase';

export const authRoutes = express.Router();

// Sign up new user
authRoutes.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign in user
authRoutes.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      message: 'Signed in successfully',
      user: data.user,
      session: data.session
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Sign out user
authRoutes.post('/signout', async (req: Request, res: Response) => {
  try {
    const { error } = await supabaseAuth.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Signout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
authRoutes.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabaseAuth.auth.getUser(token);

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({ user: data.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 