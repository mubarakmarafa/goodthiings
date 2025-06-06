import { useState } from 'react';
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

    // Check if using development bypass
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - simulating image generation...');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create fake generated image for development
      const fakeImage: GeneratedImage = {
        id: `dev-${Date.now()}`,
        user_id: user.id,
        prompt: prompt.trim(),
        enhanced_prompt: `${styleType === '3d' ? '3D rendered, high quality, modern digital art style: ' : 'Hand-drawn illustration, sketch style, artistic: '}${prompt.trim()}`,
        style_type: styleType,
        image_url: `/thiings/${Math.floor(Math.random() * 9) + 1}.png`, // Random sample image
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        generation_status: 'completed',
        created_at: new Date().toISOString(),
      };
      
      setImages(prev => [fakeImage, ...prev]);
      console.log('✅ Development image generated:', fakeImage);
      return fakeImage;
    }

    setIsGenerating(true);

    try {
      console.log('🎨 Generating image:', { prompt, styleType, gridPosition });

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-openai-key': apiKey,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style_type: styleType,
          grid_position_x: gridPosition.x,
          grid_position_y: gridPosition.y,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', response.status, errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Image generated successfully:', data);

      const newImage = data.image as GeneratedImage;
      setImages(prev => [newImage, ...prev]);

      return newImage;
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your internet connection');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserImages = async () => {
    if (!user) return;

    try {
      console.log('📚 Loading user images...');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setImages(data.images || []);
        console.log('✅ Loaded', data.images?.length || 0, 'images');
      }
    } catch (error) {
      console.error('❌ Failed to load images:', error);
    }
  };

  return {
    generateImage,
    loadUserImages,
    isGenerating,
    images,
    canGenerate: !!(user && apiKey),
  };
}; 