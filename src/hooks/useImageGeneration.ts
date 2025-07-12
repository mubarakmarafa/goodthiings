import { useState, useCallback, useEffect, useRef } from 'react';
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

// Enhanced image state with loading and error information
interface ImageState {
  image: GeneratedImage;
  isLoading: boolean;
  loadError: boolean;
  retryCount: number;
}

// Image cache for better performance
interface ImageCache {
  [key: string]: {
    url: string;
    blob?: Blob;
    timestamp: number;
  };
}

// Grid position to image mapping for faster lookups
interface GridPositionMap {
  [key: string]: string; // "x,y" -> imageId
}

export const useImageGeneration = () => {
  const { user, apiKey } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Enhanced state management
  const [imageStates, setImageStates] = useState<Map<string, ImageState>>(new Map());
  const [gridPositionMap, setGridPositionMap] = useState<GridPositionMap>({});
  const [lastGeneratedImageId, setLastGeneratedImageId] = useState<string | null>(null);
  
  // Image cache for performance
  const imageCache = useRef<ImageCache>({});
  const preloadedImages = useRef<Set<string>>(new Set());
  
  // Debounced update function to prevent too many re-renders
  const updateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get images array from imageStates (for compatibility with existing code)
  const images = Array.from(imageStates.values())
    .map(state => state.image)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Efficient image lookup by position
  const getImageAtPosition = useCallback((x: number, y: number): GeneratedImage | null => {
    const positionKey = `${x},${y}`;
    const imageId = gridPositionMap[positionKey];
    if (!imageId) return null;
    
    const imageState = imageStates.get(imageId);
    return imageState ? imageState.image : null;
  }, [gridPositionMap, imageStates]);

  // Preload images for better performance
  const preloadImage = useCallback(async (imageUrl: string, imageId: string) => {
    if (preloadedImages.current.has(imageId) || !imageUrl) return;
    
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Cache the image
      imageCache.current[imageId] = {
        url: imageUrl,
        blob,
        timestamp: Date.now()
      };
      
      preloadedImages.current.add(imageId);
      
             // Update loading state
       setImageStates((prev: Map<string, ImageState>) => {
         const newStates = new Map(prev);
         const currentState = newStates.get(imageId);
         if (currentState) {
           newStates.set(imageId, {
             ...currentState,
             isLoading: false,
             loadError: false
           });
         }
         return newStates;
       });
    } catch (error) {
      console.error('Failed to preload image:', error);
             // Mark as error state
       setImageStates((prev: Map<string, ImageState>) => {
         const newStates = new Map(prev);
         const currentState = newStates.get(imageId);
         if (currentState) {
           newStates.set(imageId, {
             ...currentState,
             isLoading: false,
             loadError: true,
             retryCount: currentState.retryCount + 1
           });
         }
         return newStates;
       });
    }
  }, []);

  // Batch update images to prevent excessive re-renders
  const batchUpdateImages = useCallback((updates: Array<{ id: string; update: Partial<ImageState> }>) => {
    if (updateDebounceRef.current) {
      clearTimeout(updateDebounceRef.current);
    }
    
         updateDebounceRef.current = setTimeout(() => {
       setImageStates((prev: Map<string, ImageState>) => {
         const newStates = new Map(prev);
         updates.forEach(({ id, update }) => {
           const currentState = newStates.get(id);
           if (currentState) {
             newStates.set(id, { ...currentState, ...update });
           }
         });
         return newStates;
       });
     }, 50); // 50ms debounce
  }, []);

  // Enhanced test connection function
  const testConnection = async (): Promise<boolean> => {
    try {
      console.log('🔍 Testing Edge Function connection...');
      
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

  // Enhanced image generation with better error handling
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

    if (!apiKey.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. API keys should start with "sk-"');
    }

    const tempImageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const positionKey = `${gridPosition.x},${gridPosition.y}`;
    
    // Create loading image state
    const loadingImage: GeneratedImage = {
      id: tempImageId,
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

         // Add loading state immediately
     setImageStates((prev: Map<string, ImageState>) => {
       const newStates = new Map(prev);
       newStates.set(tempImageId, {
         image: loadingImage,
         isLoading: true,
         loadError: false,
         retryCount: 0
       });
       return newStates;
     });

    // Update grid position mapping
    setGridPositionMap(prev => ({
      ...prev,
      [positionKey]: tempImageId
    }));

    // Set as last generated for auto-focus
    setLastGeneratedImageId(tempImageId);

    // Handle development mode
    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - simulating image generation...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const devImage: GeneratedImage = {
        id: `dev-${Date.now()}`,
        user_id: user.id,
        prompt: prompt.trim(),
        enhanced_prompt: `[DEV] ${styleType === '3d' ? '3D rendered: ' : 'Hand-drawn: '}${prompt.trim()}`,
        style_type: styleType,
        image_url: `/thiings/${Math.floor(Math.random() * 9) + 1}.png`,
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        generation_status: 'completed',
        created_at: new Date().toISOString(),
      };
      
             // Replace loading image with completed image
       setImageStates((prev: Map<string, ImageState>) => {
         const newStates = new Map(prev);
         newStates.delete(tempImageId);
         newStates.set(devImage.id, {
           image: devImage,
           isLoading: false,
           loadError: false,
           retryCount: 0
         });
         return newStates;
       });

      // Update grid position mapping
      setGridPositionMap(prev => {
        const newMap = { ...prev };
        delete newMap[positionKey];
        newMap[positionKey] = devImage.id;
        return newMap;
      });

      // Update last generated ID
      setLastGeneratedImageId(devImage.id);
      
      // Preload the image
      preloadImage(devImage.image_url, devImage.id);
      
      return devImage;
    }

    // Real image generation
    setIsGenerating(true);

    try {
      const requestBody = {
        prompt: prompt.trim(),
        style_type: styleType,
        grid_position_x: gridPosition.x,
        grid_position_y: gridPosition.y,
        user_id: user.id,
      };

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-openai-key': apiKey,
          'x-user-id': user.id,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', response.status, errorText);
        
        // Remove loading image on error
        setImageStates((prev: Map<string, ImageState>) => {
          const newStates = new Map(prev);
          newStates.delete(tempImageId);
          return newStates;
        });
        
        setGridPositionMap(prev => {
          const newMap = { ...prev };
          delete newMap[positionKey];
          return newMap;
        });
        
        // Throw appropriate error
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
      setImageStates((prev: Map<string, ImageState>) => {
        const newStates = new Map(prev);
        newStates.delete(tempImageId);
        newStates.set(newImage.id, {
          image: newImage,
          isLoading: false,
          loadError: false,
          retryCount: 0
        });
        return newStates;
      });

      // Update grid position mapping
      setGridPositionMap(prev => {
        const newMap = { ...prev };
        delete newMap[positionKey];
        newMap[positionKey] = newImage.id;
        return newMap;
      });

      // Update last generated ID
      setLastGeneratedImageId(newImage.id);
      
      // Preload the image
      preloadImage(newImage.image_url, newImage.id);

      // Reload all images to ensure consistency
      setTimeout(() => {
        loadUserImages();
      }, 1000);

      return newImage;
    } catch (error) {
      console.error('❌ Image generation failed:', error);
      
      // Remove loading image on error
      setImageStates((prev: Map<string, ImageState>) => {
        const newStates = new Map(prev);
        newStates.delete(tempImageId);
        return newStates;
      });
      
      setGridPositionMap(prev => {
        const newMap = { ...prev };
        delete newMap[positionKey];
        return newMap;
      });
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('CORS Error: Image generation blocked by browser security policy.');
      }
      
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced load user images with caching
  const loadUserImages = useCallback(async () => {
    if (!user) {
      console.log('🚫 loadUserImages: No user found, skipping');
      return;
    }

    const isDevMode = user.id === 'dev-user-123';
    if (isDevMode) {
      console.log('🚧 Development mode - skipping server image loading');
      return;
    }

    try {
      console.log('📚 Loading user images for user:', user.id);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/images-list`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
          'x-user-id': user.id,
        },
      });

      if (!response.ok) {
        console.error('❌ Failed to load images:', response.status);
        return;
      }

      const data = await response.json();
      const loadedImages = data.images || [];

      // Batch update all images
      const newImageStates = new Map<string, ImageState>();
      const newGridPositionMap: GridPositionMap = {};
      
      loadedImages.forEach((image: GeneratedImage) => {
        const positionKey = `${image.grid_position_x},${image.grid_position_y}`;
        
        newImageStates.set(image.id, {
          image,
          isLoading: !!image.image_url, // Start loading if URL exists
          loadError: false,
          retryCount: 0
        });
        
        newGridPositionMap[positionKey] = image.id;
        
        // Preload completed images
        if (image.generation_status === 'completed' && image.image_url) {
          preloadImage(image.image_url, image.id);
        }
      });

      setImageStates(newImageStates);
      setGridPositionMap(newGridPositionMap);
      
      console.log('✅ Loaded', loadedImages.length, 'images');
    } catch (error) {
      console.error('❌ Failed to load images:', error);
    }
  }, [user, preloadImage]);

  // Clean up cache periodically
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      Object.keys(imageCache.current).forEach(key => {
        const cacheEntry = imageCache.current[key];
        if (now - cacheEntry.timestamp > maxAge) {
          delete imageCache.current[key];
          preloadedImages.current.delete(key);
        }
      });
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }
    };
  }, []);

  // Expose debug functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).loadUserImages = loadUserImages;
      (window as any).debugImages = () => {
        console.log('🔍 Current images state:', {
          imageStates: Array.from(imageStates.entries()),
          gridPositionMap,
          cacheSize: Object.keys(imageCache.current).length,
          preloadedCount: preloadedImages.current.size
        });
      };
    }
  }, [loadUserImages, imageStates, gridPositionMap]);

  return {
    generateImage,
    loadUserImages,
    testConnection,
    getImageAtPosition,
    batchUpdateImages,
    isGenerating,
    images,
    imageStates,
    gridPositionMap,
    lastGeneratedImageId,
    canGenerate: !!(user && apiKey),
  };
}; 