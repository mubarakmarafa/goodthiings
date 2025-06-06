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
    console.log('🔄 Adding loading image to state:', loadingImage);
    setImages(prev => {
      const newImages = [loadingImage, ...prev];
      console.log('🔄 Updated images state (after adding loading):', newImages.length, 'images');
      return newImages;
    });

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
        enhanced_prompt: `[DEV PREVIEW] ${styleType === '3d' ? '3D rendered, high quality, modern digital art style: ' : 'Hand-drawn illustration, sketch style, artistic: '}${prompt.trim()}`,
        style_type: styleType,
        image_url: `/thiings/1.png`, // Development placeholder (apple icon)
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        generation_status: 'completed',
        created_at: new Date().toISOString(),
      };
      
      // Replace loading image with completed image
      console.log('🔄 Replacing loading image with completed image:', fakeImage);
      setImages(prev => {
        const updatedImages = prev.map(img => img.id === loadingImage.id ? fakeImage : img);
        console.log('🔄 Updated images state (after replacement):', updatedImages.length, 'images');
        console.log('🔄 All image IDs:', updatedImages.map(img => img.id));
        return updatedImages;
      });
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
      // Replace loading image with completed image
      setImages(prev => prev.map(img => img.id === loadingImage.id ? newImage : img));

      return newImage;
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      // Remove loading image on error
      setImages(prev => prev.filter(img => img.id !== loadingImage.id));
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error - please check your internet connection');
      }
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserImages = useCallback(async () => {
    if (!user) return;

    // Check if using development bypass
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - skipping image loading from server');
      setImages([]); // Start with empty images in dev mode
      return;
    }

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
  }, [user]);

  return {
    generateImage,
    loadUserImages,
    isGenerating,
    images,
    canGenerate: !!(user && apiKey),
  };
}; 