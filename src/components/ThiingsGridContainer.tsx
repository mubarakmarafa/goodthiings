import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useImageGeneration, type GeneratedImage } from '../hooks/useImageGeneration';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

// Configuration - Easy to customize
const CONFIG = {
  gridSize: 160,
  staticImages: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], // Static thiings icons
  initialPosition: { x: 0, y: 0 },
  // Scaling configuration
  minScale: 0.5,    // Minimum scale for edge icons
  maxScale: 1.0,    // Maximum scale for center icons
  scaleRadius: 3,   // Distance in grid cells from center where minimum scale is reached
};

interface GridItem {
  id: string;
  type: 'static' | 'generated' | 'loading';
  gridX: number;
  gridY: number;
  imageUrl?: string;
  staticIndex?: number;
  prompt?: string;
  styleType?: '3d' | 'handdrawn';
}

// Global state to track the current center position and selection
let currentCenterPosition = { x: 0, y: 0 };
let selectedImageState = { 
  gridIndex: null as number | null, 
  position: null as { x: number, y: number } | null,
  isSelected: false,
  isAnimating: false
};
let imageInteractionInProgress = false;

// Helper function to calculate distance-based scale
const calculateScale = (gridX: number, gridY: number, centerX: number, centerY: number) => {
  const distanceFromCenter = Math.sqrt(
    Math.pow(gridX - centerX, 2) + Math.pow(gridY - centerY, 2)
  );
  
  const normalizedDistance = Math.min(distanceFromCenter / CONFIG.scaleRadius, 1);
  const scale = CONFIG.maxScale - (normalizedDistance * (CONFIG.maxScale - CONFIG.minScale));
  
  return Math.max(scale, CONFIG.minScale);
};

interface ThiingsItemCellProps extends ItemConfig {
  item: GridItem;
  onFocus: (x: number, y: number) => void;
}

const ThiingsItemCell = ({ gridIndex, position, isMoving, item, onFocus }: ThiingsItemCellProps) => {
  const isSelected = selectedImageState.isSelected && selectedImageState.gridIndex === gridIndex;
  
  const handleImageInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    console.log(`Item interacted: ${item.id} at position (${position.x}, ${position.y})`);
    
    if (selectedImageState.isSelected && selectedImageState.gridIndex === gridIndex) {
      return;
    }
    
    selectedImageState = {
      gridIndex,
      position: { x: position.x, y: position.y },
      isSelected: true,
      isAnimating: true
    };
    
    onFocus(position.x, position.y);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    imageInteractionInProgress = true;
    setTimeout(() => {
      imageInteractionInProgress = false;
    }, 100);
  };

  const baseScale = calculateScale(position.x, position.y, currentCenterPosition.x, currentCenterPosition.y);
  const hoverScale = isMoving ? 1.15 : 1.1;
  const selectionScale = isSelected ? 1.2 : 1;
  const finalScale = baseScale * selectionScale * (baseScale > 0.7 ? hoverScale : 1);
  const shouldHideGridImage = isSelected && !selectedImageState.isAnimating;

  // Determine what to render based on item type
  const renderContent = () => {
    if (item.type === 'loading') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-xs text-gray-500 font-medium">adding thing</div>
          </div>
        </div>
      );
    }

    if (item.type === 'static') {
      return (
        <img
          draggable={false}
          src={`/thiings/${CONFIG.staticImages[item.staticIndex!]}.png`}
          alt={`Static Icon ${item.staticIndex}`}
          className="w-full h-full object-contain"
          style={{
            filter: baseScale < 0.7 ? 'brightness(0.8)' : 'brightness(1)',
          }}
        />
      );
    }

    if (item.type === 'generated' && item.imageUrl) {
      return (
        <img
          draggable={false}
          src={item.imageUrl}
          alt={item.prompt || 'Generated image'}
          className="w-full h-full object-contain rounded-lg"
          style={{
            filter: baseScale < 0.7 ? 'brightness(0.8)' : 'brightness(1)',
          }}
        />
      );
    }

    return null;
  };

  return (
    <div 
      className={`absolute inset-1 flex items-center justify-center cursor-pointer transition-all duration-300`}
      onClick={handleImageInteraction}
      onTouchStart={handleTouchStart}
      data-image-cell="true"
      style={{
        transform: `scale(${finalScale})`,
        transformOrigin: 'center',
        opacity: shouldHideGridImage ? 0 : Math.max(0.4, baseScale * 0.8 + 0.2),
        visibility: shouldHideGridImage ? 'hidden' : 'visible',
      }}
    >
      {renderContent()}
    </div>
  );
};

interface ThiingsGridContainerLogicProps {
  images: GeneratedImage[];
  loadUserImages: () => Promise<void>;
}

const ThiingsGridContainerLogic = ({ images, loadUserImages }: ThiingsGridContainerLogicProps) => {
  const gridRef = useRef<any>(null);
  const [, forceUpdate] = useState(0);
  const lastGridPositionRef = useRef({ x: 0, y: 0 });
  
  const [gridItems, setGridItems] = useState<GridItem[]>([]);

  // Load user images on mount
  useEffect(() => {
    loadUserImages();
  }, [loadUserImages]);

  // SIMPLIFIED: Only show generated images for debugging
  useEffect(() => {
    console.log('🔄 SIMPLIFIED GRID: Processing', images.length, 'generated images');
    console.log('📋 Images data:', images.map(img => ({ 
      id: img.id, 
      prompt: img.prompt, 
      status: img.generation_status,
      position: `(${img.grid_position_x}, ${img.grid_position_y})`,
      hasUrl: !!img.image_url
    })));
    
    const items: GridItem[] = [];
    
    // ONLY add generated images (no static images for now)
    images.forEach((image, index) => {
      const gridItem: GridItem = {
        id: `generated-${image.id}`,
        type: image.generation_status === 'pending' ? 'loading' : 'generated',
        gridX: image.grid_position_x,
        gridY: image.grid_position_y,
        imageUrl: image.image_url,
        prompt: image.prompt,
        styleType: image.style_type,
      };
      console.log(`🎯 Generated item ${index + 1}:`, {
        id: gridItem.id,
        type: gridItem.type,
        position: `(${gridItem.gridX}, ${gridItem.gridY})`,
        hasImageUrl: !!gridItem.imageUrl,
        imageUrlPreview: gridItem.imageUrl?.substring(0, 50) + '...'
      });
      items.push(gridItem);
    });

    console.log('✅ SIMPLIFIED GRID: Total items:', items.length);
    setGridItems([...items]);
    console.log('✅ SIMPLIFIED GRID: State updated');
  }, [images]);

  // Debug: Track gridItems state changes
  useEffect(() => {
    console.log('🚨 CRITICAL: GRIDITEM STATE ACTUALLY CHANGED! New count:', gridItems.length);
    console.log('📋 GridItems state contains generated items:', gridItems.filter(item => item.id.startsWith('generated-')).map(item => item.id));
  }, [gridItems]);

  // Convert gridItems to indexed format for ThiingsGrid
  const itemConfigs = useMemo(() => {
    console.log('🔄 ITEMCONFIGS USEMEMO RUNNING. GridItems count:', gridItems.length);
    console.log('🔍 GridItems input to useMemo:', gridItems.slice(0, 5).map(item => ({ id: item.id, type: item.type, pos: `${item.gridX},${item.gridY}` })));
    const configs = gridItems.map((item, index) => ({
      gridIndex: index,
      position: { x: item.gridX, y: item.gridY },
      item,
    }));
    console.log('✅ ItemConfigs created. Count:', configs.length);
    
    const generatedConfigs = configs.filter(c => c.item.id.startsWith('generated-'));
    console.log('📋 Generated items in configs:', generatedConfigs.map(c => c.item.id));
    console.log('🔍 Generated config details:', generatedConfigs.map(c => ({ 
      id: c.item.id, 
      type: c.item.type, 
      pos: `${c.item.gridX},${c.item.gridY}`,
      index: c.gridIndex 
    })));
    return configs;
  }, [gridItems]);

  // Function to smoothly animate to center an image
  const focusOnImage = useCallback((gridX: number, gridY: number) => {
    if (!gridRef.current) return;

    const targetOffsetX = -gridX * CONFIG.gridSize;
    const targetOffsetY = -gridY * CONFIG.gridSize;
    const currentOffset = gridRef.current.publicGetCurrentPosition();
    
    lastGridPositionRef.current = { x: currentOffset.x, y: currentOffset.y };
    
    const startTime = Date.now();
    const duration = 800;
    const startX = currentOffset.x;
    const startY = currentOffset.y;
    let lastUpdateTime = 0;
    
    const animateToPosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      const currentX = startX + (targetOffsetX - startX) * easedProgress;
      const currentY = startY + (targetOffsetY - startY) * easedProgress;
      
      if (gridRef.current && gridRef.current.setState) {
        gridRef.current.setState({
          offset: { x: currentX, y: currentY },
          restPos: { x: currentX, y: currentY },
          velocity: { x: 0, y: 0 }
        });
        
        const now = Date.now();
        if (gridRef.current.publicForceUpdate && now - lastUpdateTime > 66) {
          gridRef.current.publicForceUpdate();
          lastUpdateTime = now;
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateToPosition);
      } else {
        selectedImageState.isAnimating = false;
        lastGridPositionRef.current = { x: currentX, y: currentY };
        
        if (gridRef.current && gridRef.current.publicForceUpdate) {
          gridRef.current.publicForceUpdate();
        }
        
        forceUpdate(prev => prev + 1);
      }
    };
    
    requestAnimationFrame(animateToPosition);
  }, []);

  // Function to focus on and select a new image by ID with retry logic
  const focusOnNewImage = useCallback((imageId: string, gridX: number, gridY: number, retryCount = 0) => {
    console.log(`🎯 Focusing on new image (attempt ${retryCount + 1}):`, imageId, 'at position:', gridX, gridY);
    console.log('🔍 ItemConfigs available for search. Count:', itemConfigs.length);
    console.log('🔍 Generated items in itemConfigs:', itemConfigs.filter(c => c.item.id.startsWith('generated-')).map(c => c.item.id));
    console.log('🔍 Looking for ID:', `generated-${imageId}`);
    
    // Find the grid index of this image
    const imageIndex = itemConfigs.findIndex(config => config.item.id === `generated-${imageId}`);
    console.log('🔍 Found image index:', imageIndex);
    
    if (imageIndex !== -1) {
      // Found it! Set selection state
      selectedImageState = {
        gridIndex: imageIndex,
        position: { x: gridX, y: gridY },
        isSelected: true,
        isAnimating: true
      };
      
      console.log('🚀 Setting selection state and panning to:', { gridX, gridY });
      
      // Pan to the image
      focusOnImage(gridX, gridY);
      
      console.log('✅ Auto-selected new image at index:', imageIndex);
      
      // Force a re-render to ensure selection is visible
      forceUpdate(prev => prev + 1);
    } else if (retryCount < 10) {
      // Not found yet, retry in 100ms (max 10 attempts = 1 second total)
      console.log(`⏳ Image not found yet, retrying in 100ms (attempt ${retryCount + 1}/10)`);
      setTimeout(() => {
        focusOnNewImage(imageId, gridX, gridY, retryCount + 1);
      }, 100);
          } else {
        // Give up after 1 second
        console.log('❌ Could not find image after 10 attempts. Available IDs:', itemConfigs.slice(0, 5).map(c => c.item.id));
        console.log('❌ DEBUGGING: itemConfigs length at failure:', itemConfigs.length);
        console.log('❌ DEBUGGING: Total generated configs at failure:', itemConfigs.filter(c => c.item.id.startsWith('generated-')).length);
      }
  }, [itemConfigs, focusOnImage, forceUpdate]);

  // SIMPLIFIED: Just log what images we have, no auto-focus for now
  useEffect(() => {
    console.log('🎯 SIMPLIFIED AUTO-FOCUS: Images count:', images.length);
    if (images.length > 0) {
      const newestImage = images[0];
      console.log('🎯 Newest image details:', {
        id: newestImage.id,
        prompt: newestImage.prompt,
        status: newestImage.generation_status,
        position: `(${newestImage.grid_position_x}, ${newestImage.grid_position_y})`,
        hasUrl: !!newestImage.image_url
      });
      console.log('🎯 Current itemConfigs length:', itemConfigs.length);
      
      // TEMPORARILY DISABLED: Auto-focus logic
      // We'll add this back once we can see the images
      console.log('🚫 Auto-focus temporarily disabled for debugging');
    }
  }, [images, itemConfigs]);

  // Make functions available globally for debugging
  useEffect(() => {
    (window as any).focusOnImage = focusOnImage;
    (window as any).focusOnNewImage = focusOnNewImage;
    
    // DEBUGGING: Add function to manually navigate to generated images
    (window as any).goToImage = (imageId: string) => {
      const image = images.find(img => img.id === imageId);
      if (image) {
        console.log('🎯 Navigating to image:', image.prompt, 'at position:', image.grid_position_x, image.grid_position_y);
        focusOnImage(image.grid_position_x, image.grid_position_y);
      } else {
        console.log('❌ Image not found:', imageId);
        console.log('📋 Available images:', images.map(img => ({ id: img.id, prompt: img.prompt })));
      }
    };
    
    // DEBUGGING: Add function to go to our known image positions
    (window as any).goToChicken = () => focusOnImage(1, 6);
    (window as any).goToTable = () => focusOnImage(5, -9);
    (window as any).goToOrigin = () => focusOnImage(0, 0);
    
    // DEBUGGING: Add function to check what's at current position
    (window as any).checkCurrentPosition = () => {
      if (gridRef.current && gridRef.current.publicGetCurrentPosition) {
        const offset = gridRef.current.publicGetCurrentPosition();
        const centerX = -Math.round(offset.x / CONFIG.gridSize);
        const centerY = -Math.round(offset.y / CONFIG.gridSize);
        console.log('📍 Current center position:', centerX, centerY);
        console.log('📍 Current offset:', offset);
        
        // Check what images should be near this position
        const nearbyImages = images.filter(img => 
          Math.abs(img.grid_position_x - centerX) <= 2 && 
          Math.abs(img.grid_position_y - centerY) <= 2
        );
        console.log('📍 Nearby images:', nearbyImages.map(img => ({ 
          prompt: img.prompt, 
          position: `(${img.grid_position_x}, ${img.grid_position_y})` 
        })));
      }
    };
    
    return () => {
      delete (window as any).focusOnImage;
      delete (window as any).focusOnNewImage;
      delete (window as any).goToImage;
      delete (window as any).goToChicken;
      delete (window as any).goToTable;
      delete (window as any).goToOrigin;
      delete (window as any).checkCurrentPosition;
    };
  }, [focusOnImage, focusOnNewImage, images]);

  // Handle clicking on empty space to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectedImageState.isSelected) {
      selectedImageState = {
        gridIndex: null,
        position: null,
        isSelected: false,
        isAnimating: false
      };
      forceUpdate(prev => prev + 1);
      console.log("Image deselected by clicking background");
    }
  }, []);

  // Handle escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedImageState.isSelected) {
        selectedImageState = {
          gridIndex: null,
          position: null,
          isSelected: false,
          isAnimating: false
        };
        forceUpdate(prev => prev + 1);
        console.log("Image deselected with Escape key");
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Position tracking and center calculation
  useEffect(() => {
    if (gridRef.current && gridRef.current.publicGetCurrentPosition) {
      const initialOffset = gridRef.current.publicGetCurrentPosition();
      lastGridPositionRef.current = { x: initialOffset.x, y: initialOffset.y };
    }

    let lastUpdateTime = 0;
    const updateCenterPosition = () => {
      if (gridRef.current && gridRef.current.publicGetCurrentPosition) {
        const offset = gridRef.current.publicGetCurrentPosition();
        
        if (selectedImageState.isSelected && !selectedImageState.isAnimating) {
          const lastPos = lastGridPositionRef.current;
          const deltaX = Math.abs(offset.x - lastPos.x);
          const deltaY = Math.abs(offset.y - lastPos.y);
          const threshold = 10;
          
          if (deltaX > threshold || deltaY > threshold) {
            console.log(`Grid movement detected (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)}) - deselecting image`);
            selectedImageState = {
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            };
            forceUpdate(prev => prev + 1);
          }
        }
        
        lastGridPositionRef.current = { x: offset.x, y: offset.y };
        
        const centerX = -Math.round(offset.x / CONFIG.gridSize);
        const centerY = -Math.round(offset.y / CONFIG.gridSize);
        
        // Only update if center position actually changed (throttled to 30fps)
        const now = Date.now();
        if ((currentCenterPosition.x !== centerX || currentCenterPosition.y !== centerY) && now - lastUpdateTime > 33) {
          currentCenterPosition = { x: centerX, y: centerY };
          lastUpdateTime = now;
          forceUpdate(prev => prev + 1);
        }
      }
    };

    let animationFrame: number;
    const animate = () => {
      updateCenterPosition();
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []); // Cleanup handled by wrapper component

  // Custom render function that passes the item data
  const renderGridItem = useCallback((config: ItemConfig) => {
    const itemConfig = itemConfigs.find(item => item.gridIndex === config.gridIndex);
    if (!itemConfig) return null;

    return (
      <ThiingsItemCell
        {...config}
        item={itemConfig.item}
        onFocus={focusOnImage}
      />
    );
  }, [itemConfigs, focusOnImage]);

  return (
    <div 
      className="w-full h-full bg-gray-50 relative"
      onClick={handleBackgroundClick}
    >
      <div
        onMouseDown={() => {
          if (selectedImageState.isSelected) {
            console.log("Grid mouse interaction detected - deselecting image");
            selectedImageState = {
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            };
            forceUpdate(prev => prev + 1);
          }
        }}
        onTouchStart={() => {
          if (selectedImageState.isSelected && !imageInteractionInProgress) {
            console.log("Grid touch interaction detected - deselecting image");
            selectedImageState = {
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            };
            forceUpdate(prev => prev + 1);
          }
        }}
        onWheel={() => {
          if (selectedImageState.isSelected) {
            console.log("Grid wheel/trackpad interaction detected - deselecting image");
            selectedImageState = {
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            };
            forceUpdate(prev => prev + 1);
          }
        }}
      >
        <ThiingsGrid
          ref={gridRef}
          gridSize={CONFIG.gridSize}
          renderItem={renderGridItem}
          initialPosition={CONFIG.initialPosition}
        />
      </div>

      {/* Floating draggable image when selected */}
      {selectedImageState.isSelected && selectedImageState.gridIndex !== null && !selectedImageState.isAnimating && (() => {
        const selectedIndex = selectedImageState.gridIndex;
        const selectedItem = itemConfigs[selectedIndex]?.item;
        
        if (!selectedItem) return null;

        const imageUrl = selectedItem.type === 'static' 
          ? `/thiings/${CONFIG.staticImages[selectedItem.staticIndex!]}.png`
          : selectedItem.imageUrl;
        
        if (!imageUrl) return null;

        return (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 9999 }}
          >
            <div
              className="relative pointer-events-auto"
              style={{
                width: CONFIG.gridSize * 1.2,
                height: CONFIG.gridSize * 1.2,
                cursor: 'default',
              }}
            >
              <div 
                className="absolute inset-0 border-4 border-blue-500 rounded-lg shadow-xl animate-pulse pointer-events-none" 
                style={{ 
                  margin: '-4px',
                  zIndex: 1,
                }} 
              />
              
              <img
                draggable={true}
                src={imageUrl}
                alt={selectedItem.prompt || `Selected item ${selectedIndex}`}
                className="w-full h-full object-contain shadow-2xl relative rounded-lg"
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
                  cursor: 'move',
                  zIndex: 2,
                }}
                onDragStart={async (e) => {
                  console.log(`🚀 Starting drag of floating image ${selectedIndex}`);
                  
                  const fileName = selectedItem.type === 'static' 
                    ? `thiings-icon-${selectedItem.staticIndex}.png`
                    : `generated-${selectedItem.prompt?.replace(/\s+/g, '-').toLowerCase()}.png`;
                  
                  e.dataTransfer.setDragImage(e.target as HTMLImageElement, 
                    (e.target as HTMLImageElement).width / 2, 
                    (e.target as HTMLImageElement).height / 2
                  );
                  
                  try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const pngBlob = new Blob([blob], { type: 'image/png' });
                    e.dataTransfer.items.add(new File([pngBlob], fileName, { type: 'image/png' }));
                    e.dataTransfer.effectAllowed = "copy";
                    console.log(`✅ PNG file ready for drag: ${fileName}`);
                  } catch (error) {
                    console.log("❌ Could not prepare PNG file:", error);
                    e.dataTransfer.setData("text/uri-list", imageUrl);
                    e.dataTransfer.effectAllowed = "copyLink";
                  }
                }}
                onDragEnd={() => {
                  console.log(`✅ Drag completed for image ${selectedIndex}`);
                }}
                onMouseDown={(e) => {
                  console.log(`Mouse down on floating image ${selectedIndex}`);
                  e.stopPropagation();
                }}
              />
              
              <div 
                className="absolute inset-0 bg-blue-500/5 rounded-lg pointer-events-none" 
                style={{ zIndex: 0 }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// Debug Panel Component
const DebugPanel = () => {
  const { testConnection, canGenerate } = useImageGeneration();
  const { user, apiKey } = useAuth();

  const handleTestConnection = async () => {
    toast.loading('Testing connection...', { id: 'test-connection' });
    try {
      const canConnect = await testConnection();
      if (canConnect) {
        toast.success('✅ Server reachable! CORS issue confirmed.', { id: 'test-connection', duration: 5000 });
      } else {
        toast.error('❌ Server unreachable', { id: 'test-connection' });
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast.error('❌ Connection test failed', { id: 'test-connection' });
    }
  };

  // Only show debug panel if user is logged in
  if (!canGenerate) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg border max-w-sm">
      <h3 className="text-sm font-semibold mb-2 text-gray-700">🔧 Debug Panel</h3>
      <div className="space-y-2 text-xs">
        <div>User: {user?.username || 'None'}</div>
        <div>API Key: {apiKey ? `${apiKey.slice(0, 10)}...` : 'None'}</div>
        <div>Can Generate: {canGenerate ? '✅' : '❌'}</div>
        <button
          onClick={handleTestConnection}
          className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium transition-colors"
        >
          🔍 Test Connection
        </button>
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <div className="font-semibold text-orange-800 mb-1">⚠️ Known Issue:</div>
          <div className="text-orange-700">CORS policy blocks image generation. Edge Function needs CORS headers.</div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component that only renders the logic when user exists
export const ThiingsGridContainer = () => {
  const { user } = useAuth();
  const { images, loadUserImages } = useImageGeneration();

  // Debug: Track images prop changes in wrapper
  useEffect(() => {
    console.log('🚨 WRAPPER: Images prop changed! Count:', images.length);
    console.log('🚨 WRAPPER: Images array:', images.map(img => ({ id: img.id, status: img.generation_status })));
  }, [images]);

  // Debug: Track renders
  console.log('🔄 WRAPPER: Component rendering. User exists:', !!user, 'Images count:', images.length);

  // Only render heavy components when user exists
  if (!user) {
    // Reset global state when no user
    currentCenterPosition = { x: 0, y: 0 };
    selectedImageState = {
      gridIndex: null,
      position: null,
      isSelected: false,
      isAnimating: false
    };
    imageInteractionInProgress = false;
    return null;
  }

  return (
    <>
      <ThiingsGridContainerLogic images={images} loadUserImages={loadUserImages} />
      <DebugPanel />
    </>
  );
};

export default ThiingsGridContainer; 