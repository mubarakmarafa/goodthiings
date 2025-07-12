import { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://whstudldcjncgyybfezn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc3R1ZGxkY2puY2d5eWJmZXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE4MjEsImV4cCI6MjA2NDcxNzgyMX0.carn2tL9vdzIF6DlL3SF1jqMQppSj_Y_9FHgjunVVIE';

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  enhanced_prompt?: string;
  style_type: 'handdrawn' | '3d';
  image_url: string;
  grid_position_x: number;
  grid_position_y: number;
  generation_status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export const useImageGeneration = () => {
  const { user, apiKey } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);

  // Test connection to Edge Function with proper OPTIONS request
  const testConnection = async (): Promise<boolean> => {
    try {
      // Use OPTIONS request to test CORS and connectivity
      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      // OPTIONS should return 200 if CORS is properly configured
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  };

  const generateImage = async (
    prompt: string,
    styleType: '3d' | 'handdrawn',
    gridPosition: { x: number; y: number }
  ): Promise<GeneratedImage> => {
    if (!user || !apiKey) {
      throw new Error('Please log in and provide an API key');
    }

    if (!prompt.trim()) {
      throw new Error('Please enter a prompt');
    }

    // Validate API key format (OpenAI keys start with 'sk-')
    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. API keys should start with "sk-"');
    }

    // Create loading image first
    const loadingImage: GeneratedImage = {
      id: `loading-${Date.now()}`,
      user_id: user.id,
      prompt: prompt.trim(),
      enhanced_prompt: `Loading: ${prompt.trim()}`,
      style_type: styleType,
      image_url: '',
      grid_position_x: gridPosition.x,
      grid_position_y: gridPosition.y,
      generation_status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Add loading image to state immediately
    setImages(prev => [loadingImage, ...prev]);

    // Check if using development bypass
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create fake generated image for development
      const fakeImage: GeneratedImage = {
        id: `dev-${Date.now()}`,
        user_id: user.id,
        prompt: prompt.trim(),
        enhanced_prompt: `[DEV PREVIEW] ${styleType === '3d' ? '3D rendered, high quality, modern digital art style: ' : 'Hand-drawn illustration, sketch style, artistic: '}${prompt.trim()}`,
        style_type: styleType,
        image_url: `/thiings/1.png`, // Development placeholder (apple icon)
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        generation_status: 'completed',
        created_at: new Date().toISOString(),
      };
      
      // Replace loading image with completed image
      setImages(prev => prev.map(img => img.id === loadingImage.id ? fakeImage : img));
      return fakeImage;
    }

    setIsGenerating(true);

    try {
      const requestBody = {
        prompt: prompt.trim(),
        style_type: styleType,
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        user_id: user.id, // Add user ID for custom auth system
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-openai-key': apiKey,
          'x-user-id': user.id, // Add user ID header for custom auth
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Provide more specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Authentication failed - please check your OpenAI API key');
        } else if (response.status === 403) {
          throw new Error('Access denied - your OpenAI API key may be invalid or have insufficient credits');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded - please wait a moment and try again');
        } else if (response.status >= 500) {
          throw new Error('Server error - please try again later');
        } else {
          throw new Error(`Server error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      const newImage = data.image as GeneratedImage;
      
      // Replace loading image with completed image
      setImages(prev => prev.map(img => img.id === loadingImage.id ? newImage : img));

      // Also reload all images from database to ensure we have the latest data
      setTimeout(() => {
        loadUserImages();
      }, 1000); // Small delay to ensure database is fully updated

      return newImage;
    } catch (error) {
      console.error('Image generation failed:', error);
      
      // Remove loading image on error
      setImages(prev => prev.filter(img => img.id !== loadingImage.id));
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('CORS Error: Image generation blocked by browser security policy. The Supabase Edge Function needs CORS configuration to allow requests from localhost.');
      } else if (error instanceof Error && error.message.includes('Failed to fetch')) {
        throw new Error('CORS Error: Browser blocked the request due to missing CORS headers on the server.');
      }
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserImages = useCallback(async () => {
    if (!user) {
      return;
    }

    // Check if using development bypass
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      setImages([]); // Start with empty images in dev mode
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-user-id': user.id, // Add user ID header for custom auth
        },
      });

      const data = await response.json();

      if (response.ok) {
        setImages(data.images || []);
      } else {
        console.error('Failed to load images:', response.status, data);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, [user]);



  return {
    generateImage,
    loadUserImages,
    testConnection,
    isGenerating,
    images,
    canGenerate: !!(user && apiKey),
  };
}; 