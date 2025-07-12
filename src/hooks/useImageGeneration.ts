import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SUPABASE_URL = 'https://whstudldcjncgyybfezn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indoc3R1ZGxkY2puY2d5eWJmZXpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDE4MjEsImV4cCI6MjA2NDcxNzgyMX0.carn2tL9vdzIF6DlL3SF1jqMQppSj_Y_9FHgjunVVIE';

// Enhanced TypeScript interfaces
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
  model_used?: string; // Track which AI model was used
  revised_prompt?: string; // Store revised prompt from OpenAI
  created_at: string;
}

export interface ImageGenerationResponse {
  success: boolean;
  image: GeneratedImage;
  message: string;
  model_used: string;
  revised_prompt?: string;
}

export interface ImageGenerationError {
  error: string;
  details?: string;
}

// Validation functions
const validateApiKey = (apiKey: string): { valid: boolean; error?: string } => {
  if (!apiKey) {
    return { valid: false, error: 'OpenAI API key is required' };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'Invalid API key format. OpenAI keys start with "sk-"' };
  }
  
  if (apiKey.length < 20) {
    return { valid: false, error: 'API key appears to be too short' };
  }
  
  return { valid: true };
};

const validatePrompt = (prompt: string): { valid: boolean; error?: string } => {
  if (!prompt.trim()) {
    return { valid: false, error: 'Please enter a prompt for your image' };
  }
  
  if (prompt.trim().length < 3) {
    return { valid: false, error: 'Prompt must be at least 3 characters long' };
  }
  
  if (prompt.trim().length > 1000) {
    return { valid: false, error: 'Prompt must be less than 1000 characters' };
  }
  
  return { valid: true };
};

// Enhanced error parsing
const parseApiError = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return 'An unexpected error occurred';
};

export const useImageGeneration = () => {
  const { user, apiKey } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  // Create a temporary loading image
  const createLoadingImage = (prompt: string, styleType: 'handdrawn' | '3d', gridPosition: { x: number; y: number }): GeneratedImage => ({
    id: `loading-${Date.now()}`,
    user_id: user?.id || '',
    prompt: prompt.trim(),
    enhanced_prompt: `Loading: ${prompt.trim()}`,
    style_type: styleType,
    image_url: '',
    grid_position_x: gridPosition.x,
    grid_position_y: gridPosition.y,
    generation_status: 'pending',
    created_at: new Date().toISOString(),
  });

  const generateImage = async (
    prompt: string,
    styleType: '3d' | 'handdrawn',
    gridPosition: { x: number; y: number }
  ): Promise<GeneratedImage> => {
    setLastError(null);
    
    // Validate inputs
    if (!user || !apiKey) {
      const error = 'Please log in and provide an OpenAI API key';
      setLastError(error);
      throw new Error(error);
    }

    const promptValidation = validatePrompt(prompt);
    if (!promptValidation.valid) {
      const error = promptValidation.error!;
      setLastError(error);
      throw new Error(error);
    }

    const keyValidation = validateApiKey(apiKey);
    if (!keyValidation.valid) {
      const error = keyValidation.error!;
      setLastError(error);
      throw new Error(error);
    }

    setIsGenerating(true);
    
    // Create loading image first
    const loadingImage = createLoadingImage(prompt, styleType, gridPosition);
    
    // Add loading image to state immediately
    console.log('🔄 Adding loading image to state');
    setImages(prev => {
      const newImages = [loadingImage, ...prev];
      console.log('� Updated images state:', newImages.length, 'total images');
      return newImages;
    });

    // Development mode bypass
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - simulating image generation');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create development image
      const devImage: GeneratedImage = {
        id: `dev-${Date.now()}`,
        user_id: user.id,
        prompt: prompt.trim(),
        enhanced_prompt: `[DEV] ${styleType === '3d' ? '3D rendered' : 'Hand-drawn'}: ${prompt.trim()}`,
        style_type: styleType,
        image_url: `/thiings/1.png`,
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        generation_status: 'completed',
        model_used: 'dev-mode',
        created_at: new Date().toISOString(),
      };
      
      // Replace loading image with completed image
      setImages(prev => prev.map(img => img.id === loadingImage.id ? devImage : img));
      setIsGenerating(false);
      
      console.log('✅ Development image generated');
      return devImage;
    }

    try {
      console.log('🚀 Generating image with OpenAI API');
      console.log('� Prompt:', prompt.trim());
      console.log('🎨 Style:', styleType);
      console.log('� Position:', gridPosition);

      const requestBody = {
        prompt: prompt.trim(),
        style_type: styleType,
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-openai-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = parseApiError(errorData);
        
        console.error('❌ API Error:', errorMessage);
        setLastError(errorMessage);
        
        // Remove loading image on error
        setImages(prev => prev.filter(img => img.id !== loadingImage.id));
        
        throw new Error(errorMessage);
      }

      const data: ImageGenerationResponse = await response.json();
      console.log('✅ Image generated successfully');
      console.log('🤖 Model used:', data.model_used);
      console.log('📝 Revised prompt:', data.revised_prompt || 'None');

      const newImage = data.image;
      
      // Replace loading image with completed image
      setImages(prev => prev.map(img => img.id === loadingImage.id ? newImage : img));

      // Reload all images to ensure we have the latest data
      setTimeout(() => {
        console.log('🔄 Reloading user images after generation');
        loadUserImages();
      }, 1000);

      return newImage;

    } catch (error) {
      console.error('💥 Image generation failed:', error);
      const errorMessage = parseApiError(error);
      setLastError(errorMessage);
      
      // Remove loading image on error
      setImages(prev => prev.filter(img => img.id !== loadingImage.id));
      
      // Handle network errors specifically
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the image generation service. Please check your internet connection and try again.');
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const loadUserImages = useCallback(async () => {
    if (!user) {
      console.log('� No user found, skipping image loading');
      return;
    }

    // Skip in development mode
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - skipping server image loading');
      return;
    }

    try {
      console.log('📚 Loading user images');

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      console.log('� Images list response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const userImages = data.images || [];
        
        console.log('📊 Loaded', userImages.length, 'images');
        setImages(userImages);
      } else {
        console.error('❌ Failed to load images:', response.status);
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Error details:', errorData);
      }
    } catch (error) {
      console.error('❌ Failed to load images:', error);
    }
  }, [user]);

  // Test Edge Function connectivity
  const testConnection = async (): Promise<boolean> => {
    try {
      console.log('� Testing Edge Function connection');
      
      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('🔍 Connection test result:', response.status);
      return response.status === 200;
    } catch (error) {
      console.error('🔍 Connection test failed:', error);
      return false;
    }
  };

  // Cleanup function to remove loading images
  const cleanup = useCallback(() => {
    setImages((prev: GeneratedImage[]) => prev.filter((img: GeneratedImage) => img.generation_status !== 'pending'));
  }, []);

  // Expose utilities for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).imageGeneration = {
        loadUserImages,
        testConnection,
        cleanup,
        debugState: () => {
          console.log('🔍 Current state:', {
            images: images.length,
            isGenerating,
            lastError,
            user: user?.id,
            hasApiKey: !!apiKey,
          });
        },
      };
    }
  }, [loadUserImages, testConnection, cleanup, images, isGenerating, lastError, user, apiKey]);

  return {
    generateImage,
    loadUserImages,
    testConnection,
    cleanup,
    isGenerating,
    images,
    lastError,
    canGenerate: !!(user && apiKey),
    hasImages: images.length > 0,
  };
}; 