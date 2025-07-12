import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useImageGeneration, type GeneratedImage } from '../hooks/useImageGeneration';
import { useAuth } from '../contexts/AuthContext';
// import { toast } from 'sonner';
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

// Component state interfaces
interface SelectionState {
  gridIndex: number | null;
  position: { x: number, y: number } | null;
  isSelected: boolean;
  isAnimating: boolean;
}

interface CenterPosition {
  x: number;
  y: number;
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
}

interface ThiingsItemCellProps extends ItemConfig {
  item: GridItem;
  onFocus: (x: number, y: number) => void;
  isSelected: boolean;
  onSelect: (gridIndex: number, position: { x: number, y: number }) => void;
  onTouchStart: () => void;
  centerPosition: CenterPosition;
}

const ThiingsItemCell = ({ gridIndex, position, isMoving, item, onFocus, isSelected, onSelect, onTouchStart, centerPosition }: ThiingsItemCellProps) => {
  const handleImageInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    
    if (isSelected) {
      return;
    }
    
    onSelect(gridIndex, position);
    onFocus(position.x, position.y);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    onTouchStart();
  };

  const baseScale = calculateScale(position.x, position.y, centerPosition.x, centerPosition.y);
  const hoverScale = isMoving ? 1.15 : 1.1;
  const selectionScale = isSelected ? 1.2 : 1;
  const finalScale = baseScale * selectionScale * (baseScale > 0.7 ? hoverScale : 1);
  const shouldHideGridImage = isSelected;

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
  const [imageInteractionInProgress, setImageInteractionInProgress] = useState(false);
  
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [centerPosition, setCenterPosition] = useState<CenterPosition>({ x: 0, y: 0 });
  const [selectionState, setSelectionState] = useState<SelectionState>({
    gridIndex: null,
    position: null,
    isSelected: false,
    isAnimating: false
  });

  // Load user images on mount
  useEffect(() => {
    loadUserImages();
  }, [loadUserImages]);

  // Process images and convert to grid items
  useEffect(() => {
    const items: GridItem[] = [];
    
    // Add generated images
    images.forEach((image) => {
      const gridItem: GridItem = {
        id: `generated-${image.id}`,
        type: image.generation_status === 'pending' ? 'loading' : 'generated',
        gridX: image.grid_position_x,
        gridY: image.grid_position_y,
        imageUrl: image.image_url,
        prompt: image.prompt,
        styleType: image.style_type,
      };
      items.push(gridItem);
    });

    setGridItems(items);
  }, [images]);



  // Convert gridItems to indexed format for ThiingsGrid
  const itemConfigs = useMemo(() => {
    return gridItems.map((item, index) => ({
      gridIndex: index,
      position: { x: item.gridX, y: item.gridY },
      item,
    }));
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
        setSelectionState(prev => ({ ...prev, isAnimating: false }));
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
    // Find the grid index of this image
    const imageIndex = itemConfigs.findIndex(config => config.item.id === `generated-${imageId}`);
    
    if (imageIndex !== -1) {
      // Found it! Set selection state
      setSelectionState({
        gridIndex: imageIndex,
        position: { x: gridX, y: gridY },
        isSelected: true,
        isAnimating: true
      });
      
      // Pan to the image
      focusOnImage(gridX, gridY);
      
      // Force a re-render to ensure selection is visible
      forceUpdate(prev => prev + 1);
    } else if (retryCount < 5) {
      // Not found yet, retry in 200ms (max 5 attempts = 1 second total)
      setTimeout(() => {
        focusOnNewImage(imageId, gridX, gridY, retryCount + 1);
      }, 200);
    }
  }, [itemConfigs, focusOnImage, forceUpdate]);

  // Auto-focus on new images
  useEffect(() => {
    if (images.length > 0) {
      const newestImage = images[0];
      if (newestImage.generation_status === 'completed') {
        focusOnNewImage(newestImage.id, newestImage.grid_position_x, newestImage.grid_position_y);
      }
    }
  }, [images, focusOnNewImage]);



  // Handle clicking on empty space to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && selectionState.isSelected) {
      setSelectionState({
        gridIndex: null,
        position: null,
        isSelected: false,
        isAnimating: false
      });
      forceUpdate(prev => prev + 1);
    }
  }, [selectionState.isSelected]);

  // Handle escape key to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectionState.isSelected) {
        setSelectionState({
          gridIndex: null,
          position: null,
          isSelected: false,
          isAnimating: false
        });
        forceUpdate(prev => prev + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectionState.isSelected]);

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
        
        if (selectionState.isSelected && !selectionState.isAnimating) {
          const lastPos = lastGridPositionRef.current;
          const deltaX = Math.abs(offset.x - lastPos.x);
          const deltaY = Math.abs(offset.y - lastPos.y);
          const threshold = 10;
          
          if (deltaX > threshold || deltaY > threshold) {
            setSelectionState({
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            });
            forceUpdate(prev => prev + 1);
          }
        }
        
        lastGridPositionRef.current = { x: offset.x, y: offset.y };
        
        const centerX = -Math.round(offset.x / CONFIG.gridSize);
        const centerY = -Math.round(offset.y / CONFIG.gridSize);
        
        // Only update if center position actually changed (throttled to 30fps)
        const now = Date.now();
        if ((centerPosition.x !== centerX || centerPosition.y !== centerY) && now - lastUpdateTime > 33) {
          setCenterPosition({ x: centerX, y: centerY });
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
  }, [selectionState, centerPosition]); // Cleanup handled by wrapper component

  // Handle selection
  const handleSelection = useCallback((gridIndex: number, position: { x: number, y: number }) => {
    setSelectionState({
      gridIndex,
      position,
      isSelected: true,
      isAnimating: true
    });
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(() => {
    setImageInteractionInProgress(true);
    setTimeout(() => {
      setImageInteractionInProgress(false);
    }, 100);
  }, []);

  // Custom render function that passes the item data
  const renderGridItem = useCallback((config: ItemConfig) => {
    const itemConfig = itemConfigs.find(item => item.gridIndex === config.gridIndex);
    if (!itemConfig) return null;

    return (
      <ThiingsItemCell
        {...config}
        item={itemConfig.item}
        onFocus={focusOnImage}
        isSelected={selectionState.isSelected && selectionState.gridIndex === config.gridIndex}
        onSelect={handleSelection}
        onTouchStart={handleTouchStart}
        centerPosition={centerPosition}
      />
    );
  }, [itemConfigs, focusOnImage, selectionState, handleSelection, handleTouchStart, centerPosition]);

  return (
    <div 
      className="w-full h-full bg-gray-50 relative"
      onClick={handleBackgroundClick}
    >
      <div
        onMouseDown={() => {
          if (selectionState.isSelected) {
            setSelectionState({
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            });
            forceUpdate(prev => prev + 1);
          }
        }}
        onTouchStart={() => {
          if (selectionState.isSelected && !imageInteractionInProgress) {
            setSelectionState({
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            });
            forceUpdate(prev => prev + 1);
          }
        }}
        onWheel={() => {
          if (selectionState.isSelected) {
            setSelectionState({
              gridIndex: null,
              position: null,
              isSelected: false,
              isAnimating: false
            });
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
      {selectionState.isSelected && selectionState.gridIndex !== null && !selectionState.isAnimating && (() => {
        const selectedIndex = selectionState.gridIndex;
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



// Wrapper component that only renders the logic when user exists
export const ThiingsGridContainer = () => {
  const { user } = useAuth();
  const { images, loadUserImages } = useImageGeneration();



  // Only render heavy components when user exists
  if (!user) {
    return null;
  }

  return (
    <ThiingsGridContainerLogic images={images} loadUserImages={loadUserImages} />
  );
};

export default ThiingsGridContainer; 