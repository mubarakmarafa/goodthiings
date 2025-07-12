import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
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
  type: 'static' | 'generated' | 'loading' | 'error';
  gridX: number;
  gridY: number;
  imageUrl?: string;
  staticIndex?: number;
  prompt?: string;
  styleType?: '3d' | 'handdrawn';
  isLoading?: boolean;
  loadError?: boolean;
  retryCount?: number;
}

// Enhanced state management
interface GridState {
  selectedImageIndex: number | null;
  selectedPosition: { x: number, y: number } | null;
  isSelected: boolean;
  isAnimating: boolean;
  centerPosition: { x: number, y: number };
  lastMoveTime: number;
}

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
  gridState: GridState;
  onImageLoad?: (imageId: string) => void;
  onImageError?: (imageId: string) => void;
}

const ThiingsItemCell = ({ 
  gridIndex, 
  position, 
  isMoving, 
  item, 
  onFocus, 
  gridState,
  onImageLoad,
  onImageError
}: ThiingsItemCellProps) => {
  const isSelected = gridState.isSelected && gridState.selectedImageIndex === gridIndex;
  const [imageLoadState, setImageLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  const handleImageInteraction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (gridState.isSelected && gridState.selectedImageIndex === gridIndex) {
      return;
    }
    
    onFocus(position.x, position.y);
  }, [gridState, gridIndex, onFocus, position]);

  const handleImageLoad = useCallback(() => {
    setImageLoadState('loaded');
    onImageLoad?.(item.id);
  }, [item.id, onImageLoad]);

  const handleImageError = useCallback(() => {
    setImageLoadState('error');
    onImageError?.(item.id);
  }, [item.id, onImageError]);

  const baseScale = calculateScale(
    position.x, 
    position.y, 
    gridState.centerPosition.x, 
    gridState.centerPosition.y
  );
  
  const hoverScale = isMoving ? 1.15 : 1.1;
  const selectionScale = isSelected ? 1.2 : 1;
  const finalScale = baseScale * selectionScale * (baseScale > 0.7 ? hoverScale : 1);
  const shouldHideGridImage = isSelected && !gridState.isAnimating;

  // Enhanced rendering with better error handling
  const renderContent = () => {
    if (item.type === 'loading') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-xs text-gray-500 font-medium">generating...</div>
          </div>
        </div>
      );
    }

    if (item.type === 'error') {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-100 rounded-lg border-2 border-dashed border-red-300">
          <div className="text-center">
            <div className="text-red-500 text-lg mb-1">⚠️</div>
            <div className="text-xs text-red-600 font-medium">failed to load</div>
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
          className="w-full h-full object-contain transition-opacity duration-200"
          style={{
            filter: baseScale < 0.7 ? 'brightness(0.8)' : 'brightness(1)',
            opacity: imageLoadState === 'loaded' ? 1 : 0.5,
          }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      );
    }

    if (item.type === 'generated' && item.imageUrl) {
      return (
        <div className="w-full h-full relative">
          <img
            draggable={false}
            src={item.imageUrl}
            alt={item.prompt || 'Generated image'}
            className="w-full h-full object-contain rounded-lg transition-opacity duration-200"
            style={{
              filter: baseScale < 0.7 ? 'brightness(0.8)' : 'brightness(1)',
              opacity: imageLoadState === 'loaded' ? 1 : 0.5,
            }}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
          
          {/* Loading indicator for generated images */}
          {(item.isLoading || imageLoadState === 'loading') && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-80 rounded-lg">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          
          {/* Error indicator for generated images */}
          {(item.loadError || imageLoadState === 'error') && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-80 rounded-lg">
              <div className="text-red-500 text-sm">⚠️</div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div 
      className={`absolute inset-1 flex items-center justify-center cursor-pointer transition-all duration-300 ${
        isSelected ? 'z-10' : ''
      }`}
      onClick={handleImageInteraction}
      data-image-cell="true"
      data-item-id={item.id}
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
  imageStates: Map<string, any>;
  gridPositionMap: { [key: string]: string };
  lastGeneratedImageId: string | null;
  getImageAtPosition: (x: number, y: number) => GeneratedImage | null;
  batchUpdateImages: (updates: Array<{ id: string; update: any }>) => void;
  loadUserImages: () => Promise<void>;
}

const ThiingsGridContainerLogic = ({ 
  images, 
  imageStates, 
  gridPositionMap, 
  lastGeneratedImageId, 
  getImageAtPosition,
  batchUpdateImages,
  loadUserImages 
}: ThiingsGridContainerLogicProps) => {
  const gridRef = useRef<any>(null);
  const [gridState, setGridState] = useState<GridState>({
    selectedImageIndex: null,
    selectedPosition: null,
    isSelected: false,
    isAnimating: false,
    centerPosition: { x: 0, y: 0 },
    lastMoveTime: 0,
  });

  const throttledUpdateRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user images on mount
  useEffect(() => {
    loadUserImages();
  }, [loadUserImages]);

  // Enhanced grid items computation with better performance
  const gridItems = useMemo(() => {
    const items: GridItem[] = [];
    
    // Add generated images
    images.forEach((image) => {
      const imageState = imageStates.get(image.id);
      
      const gridItem: GridItem = {
        id: image.id,
        type: image.generation_status === 'failed' ? 'error' : 
              image.generation_status === 'pending' ? 'loading' : 'generated',
        gridX: image.grid_position_x,
        gridY: image.grid_position_y,
        imageUrl: image.image_url,
        prompt: image.prompt,
        styleType: image.style_type,
        isLoading: imageState?.isLoading || false,
        loadError: imageState?.loadError || false,
        retryCount: imageState?.retryCount || 0,
      };
      
      items.push(gridItem);
    });

    return items;
  }, [images, imageStates]);

  // Convert gridItems to indexed format for ThiingsGrid
  const itemConfigs = useMemo(() => {
    return gridItems.map((item, index) => ({
      gridIndex: index,
      position: { x: item.gridX, y: item.gridY },
      item,
    }));
  }, [gridItems]);

  // Throttled grid state updates
  const updateGridState = useCallback((updates: Partial<GridState>) => {
    if (throttledUpdateRef.current) {
      clearTimeout(throttledUpdateRef.current);
    }
    
    throttledUpdateRef.current = setTimeout(() => {
      setGridState(prev => ({ ...prev, ...updates }));
    }, 16); // ~60fps throttling
  }, []);

  // Enhanced focus function with better animation
  const focusOnImage = useCallback((gridX: number, gridY: number) => {
    if (!gridRef.current) return;

    const targetOffsetX = -gridX * CONFIG.gridSize;
    const targetOffsetY = -gridY * CONFIG.gridSize;
    const currentOffset = gridRef.current.publicGetCurrentPosition();
    
    // Find the image at this position
    const targetImageIndex = itemConfigs.findIndex(
      config => config.position.x === gridX && config.position.y === gridY
    );
    
    if (targetImageIndex === -1) return;

    // Update selection state
    setGridState(prev => ({
      ...prev,
      selectedImageIndex: targetImageIndex,
      selectedPosition: { x: gridX, y: gridY },
      isSelected: true,
      isAnimating: true,
    }));

    // Animate to position
    const startTime = Date.now();
    const duration = 600; // Slightly faster animation
    const startX = currentOffset.x;
    const startY = currentOffset.y;
    
    const animateToPosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      const currentX = startX + (targetOffsetX - startX) * easedProgress;
      const currentY = startY + (targetOffsetY - startY) * easedProgress;
      
      if (gridRef.current?.setState) {
        gridRef.current.setState({
          offset: { x: currentX, y: currentY },
          restPos: { x: currentX, y: currentY },
          velocity: { x: 0, y: 0 }
        });
        
        gridRef.current.publicForceUpdate?.();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateToPosition);
      } else {
        setGridState(prev => ({
          ...prev,
          isAnimating: false,
        }));
      }
    };
    
    requestAnimationFrame(animateToPosition);
  }, [itemConfigs]);

  // Auto-focus on new images with simplified logic
  useEffect(() => {
    if (!lastGeneratedImageId) return;
    
    const newImageConfig = itemConfigs.find(
      config => config.item.id === lastGeneratedImageId
    );
    
    if (newImageConfig) {
      console.log('🎯 Auto-focusing on new image:', newImageConfig.item.prompt);
      
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        focusOnImage(newImageConfig.position.x, newImageConfig.position.y);
      }, 200);
    }
  }, [lastGeneratedImageId, itemConfigs, focusOnImage]);

  // Handle clicking on empty space to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && gridState.isSelected) {
      setGridState(prev => ({
        ...prev,
        selectedImageIndex: null,
        selectedPosition: null,
        isSelected: false,
        isAnimating: false,
      }));
    }
  }, [gridState.isSelected]);

  // Handle escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gridState.isSelected) {
        setGridState(prev => ({
          ...prev,
          selectedImageIndex: null,
          selectedPosition: null,
          isSelected: false,
          isAnimating: false,
        }));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [gridState.isSelected]);

  // Enhanced position tracking with better performance
  useEffect(() => {
    let lastUpdateTime = 0;
    let animationFrame: number;
    
    const updateCenterPosition = () => {
      if (!gridRef.current?.publicGetCurrentPosition) return;
      
      const offset = gridRef.current.publicGetCurrentPosition();
      const centerX = -Math.round(offset.x / CONFIG.gridSize);
      const centerY = -Math.round(offset.y / CONFIG.gridSize);
      
      const now = Date.now();
      
      // Movement detection for deselection
      if (gridState.isSelected && !gridState.isAnimating) {
        const deltaTime = now - gridState.lastMoveTime;
        if (deltaTime > 100) { // 100ms threshold
          const currentCenter = gridState.centerPosition;
          const hasMovedSignificantly = 
            Math.abs(centerX - currentCenter.x) > 0 || 
            Math.abs(centerY - currentCenter.y) > 0;
          
          if (hasMovedSignificantly) {
            setGridState(prev => ({
              ...prev,
              selectedImageIndex: null,
              selectedPosition: null,
              isSelected: false,
              isAnimating: false,
            }));
          }
        }
      }
      
      // Throttled center position updates
      if (
        (gridState.centerPosition.x !== centerX || gridState.centerPosition.y !== centerY) && 
        now - lastUpdateTime > 33 // ~30fps
      ) {
        setGridState(prev => ({
          ...prev,
          centerPosition: { x: centerX, y: centerY },
          lastMoveTime: now,
        }));
        lastUpdateTime = now;
      }
    };

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
  }, [gridState]);

  // Image loading callbacks for better UX
  const handleImageLoad = useCallback((imageId: string) => {
    console.log('✅ Image loaded:', imageId);
    
    // Update image state to mark as loaded
    const updates = [{ id: imageId, update: { isLoading: false, loadError: false } }];
    batchUpdateImages(updates);
  }, [batchUpdateImages]);

  const handleImageError = useCallback((imageId: string) => {
    console.error('❌ Image failed to load:', imageId);
    
    // Update image state to mark as error
    const updates = [{ id: imageId, update: { isLoading: false, loadError: true } }];
    batchUpdateImages(updates);
  }, [batchUpdateImages]);

  // Custom render function with enhanced props
  const renderGridItem = useCallback((config: ItemConfig) => {
    const itemConfig = itemConfigs.find(item => item.gridIndex === config.gridIndex);
    if (!itemConfig) return null;

    return (
      <ThiingsItemCell
        {...config}
        item={itemConfig.item}
        onFocus={focusOnImage}
        gridState={gridState}
        onImageLoad={handleImageLoad}
        onImageError={handleImageError}
      />
    );
  }, [itemConfigs, focusOnImage, gridState, handleImageLoad, handleImageError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (throttledUpdateRef.current) {
        clearTimeout(throttledUpdateRef.current);
      }
    };
  }, []);

  return (
    <div 
      className="w-full h-full bg-gray-50 relative"
      onClick={handleBackgroundClick}
    >
      <div
        onMouseDown={(e) => {
          if (gridState.isSelected) {
            setGridState(prev => ({
              ...prev,
              selectedImageIndex: null,
              selectedPosition: null,
              isSelected: false,
              isAnimating: false,
            }));
          }
        }}
        onWheel={(e) => {
          if (gridState.isSelected) {
            setGridState(prev => ({
              ...prev,
              selectedImageIndex: null,
              selectedPosition: null,
              isSelected: false,
              isAnimating: false,
            }));
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

      {/* Enhanced floating image with better performance */}
      {gridState.isSelected && gridState.selectedImageIndex !== null && !gridState.isAnimating && (() => {
        const selectedItem = itemConfigs[gridState.selectedImageIndex]?.item;
        
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
                alt={selectedItem.prompt || `Selected item ${gridState.selectedImageIndex}`}
                className="w-full h-full object-contain shadow-2xl relative rounded-lg"
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
                  cursor: 'move',
                  zIndex: 2,
                }}
                onDragStart={async (e) => {
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
                  } catch (error) {
                    console.log("Could not prepare PNG file:", error);
                    e.dataTransfer.setData("text/uri-list", imageUrl);
                    e.dataTransfer.effectAllowed = "copyLink";
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
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
        toast.success('✅ Server reachable!', { id: 'test-connection', duration: 3000 });
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
      </div>
    </div>
  );
};

// Enhanced wrapper component
export const ThiingsGridContainer = () => {
  const { user } = useAuth();
  const { 
    images, 
    imageStates, 
    gridPositionMap, 
    lastGeneratedImageId, 
    getImageAtPosition,
    batchUpdateImages,
    loadUserImages 
  } = useImageGeneration();

  // Only render when user exists
  if (!user) return null;

  return (
    <>
      <ThiingsGridContainerLogic 
        images={images}
        imageStates={imageStates}
        gridPositionMap={gridPositionMap}
        lastGeneratedImageId={lastGeneratedImageId}
        getImageAtPosition={getImageAtPosition}
        batchUpdateImages={batchUpdateImages}
        loadUserImages={loadUserImages}
      />
      <DebugPanel />
    </>
  );
};

export default ThiingsGridContainer; 