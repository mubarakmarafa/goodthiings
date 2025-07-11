import { useRef, useState, useEffect, useCallback } from "react";
import ThiingsGrid, { type ItemConfig } from "../../lib/ThiingsGrid";

// Configuration - Easy to customize
const CONFIG = {
  gridSize: 160,
  images: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  initialPosition: { x: 0, y: 0 },
  // Scaling configuration
  minScale: 0.5,    // Minimum scale for edge icons
  maxScale: 1.0,    // Maximum scale for center icons
  scaleRadius: 3,   // Distance in grid cells from center where minimum scale is reached
};

// Global state to track the current center position and selection
let currentCenterPosition = { x: 0, y: 0 };
let selectedImageState = { 
  gridIndex: null as number | null, 
  position: null as { x: number, y: number } | null,
  isSelected: false,
  isAnimating: false // Track if centering animation is in progress
};
let imageInteractionInProgress = false; // Flag to prevent grid deselection during image touch

// Helper function to calculate distance-based scale
const calculateScale = (gridX: number, gridY: number, centerX: number, centerY: number) => {
  // Calculate distance from current center in grid coordinates
  const distanceFromCenter = Math.sqrt(
    Math.pow(gridX - centerX, 2) + Math.pow(gridY - centerY, 2)
  );
  
  // Calculate scale based on distance (closer to center = larger scale)
  const normalizedDistance = Math.min(distanceFromCenter / CONFIG.scaleRadius, 1);
  const scale = CONFIG.maxScale - (normalizedDistance * (CONFIG.maxScale - CONFIG.minScale));
  
  return Math.max(scale, CONFIG.minScale);
};

const ThiingsIconCell = ({ gridIndex, position, isMoving }: ItemConfig) => {
  // Check if this image is selected
  const isSelected = selectedImageState.isSelected && selectedImageState.gridIndex === gridIndex;
  
  // Handle click/touch events - Select this image and focus on it
  const handleImageInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // Prevent grid panning when clicking on an image
    console.log(`Icon interacted: ${gridIndex} at position (${position.x}, ${position.y})`);
    
    // If this image is already selected, don't do anything
    if (selectedImageState.isSelected && selectedImageState.gridIndex === gridIndex) {
      return;
    }
    
    // Update selection state (this will deselect any current selection)
    selectedImageState = {
      gridIndex,
      position: { x: position.x, y: position.y },
      isSelected: true,
      isAnimating: true
    };
    
    // Trigger centering animation
    if ((window as any).focusOnImage) {
      (window as any).focusOnImage(position.x, position.y);
    }
  };

  // Handle touch start specifically to prevent grid deselection
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation(); // Prevent grid touch handler from firing
    imageInteractionInProgress = true; // Mark that an image interaction is starting
    
    // Clear the flag after a short delay to allow the interaction to complete
    setTimeout(() => {
      imageInteractionInProgress = false;
    }, 100);
  };

  // Calculate scale based on distance from current center
  const baseScale = calculateScale(position.x, position.y, currentCenterPosition.x, currentCenterPosition.y);
  
  // Calculate additional scale factors
  const hoverScale = isMoving ? 1.15 : 1.1;
  const selectionScale = isSelected ? 1.2 : 1; // Selected images are larger
  const finalScale = baseScale * selectionScale * (baseScale > 0.7 ? hoverScale : 1);

  // Hide the grid image if it's selected and the floating image is showing
  const shouldHideGridImage = isSelected && !selectedImageState.isAnimating;

  return (
    <div 
      className={`absolute inset-1 flex items-center justify-center cursor-pointer transition-all duration-300`}
      onClick={handleImageInteraction}
      onTouchStart={handleTouchStart}
      data-image-cell="true"
      style={{
        transform: `scale(${finalScale})`,
        transformOrigin: 'center',
        opacity: shouldHideGridImage ? 0 : Math.max(0.4, baseScale * 0.8 + 0.2), // Hide when extracted, normal opacity otherwise
        visibility: shouldHideGridImage ? 'hidden' : 'visible',
      }}
    >
      <img
        draggable={false} // Grid images are never draggable, only the floating one is
        src={`/thiings/${CONFIG.images[gridIndex % CONFIG.images.length]}.png`}
        alt={`Icon ${gridIndex}`}
        className="w-full h-full object-contain"
        style={{
          filter: baseScale < 0.7 ? 'brightness(0.8)' : 'brightness(1)', // Normal distance-based filtering only
        }}
      />
    </div>
  );
};

export const ThiingsIcons = () => {
  const gridRef = useRef<any>(null);
  const [, forceUpdate] = useState(0);
  const lastGridPositionRef = useRef({ x: 0, y: 0 });

  // Function to smoothly animate to center an image
  const focusOnImage = useCallback((gridX: number, gridY: number) => {
    if (!gridRef.current) return;

    // Calculate the offset needed to center this grid position
    const targetOffsetX = -gridX * CONFIG.gridSize;
    const targetOffsetY = -gridY * CONFIG.gridSize;

    // Get current position
    const currentOffset = gridRef.current.publicGetCurrentPosition();
    
    // Reset position tracking to avoid deselecting during our own animation
    lastGridPositionRef.current = { x: currentOffset.x, y: currentOffset.y };
    
    // Animate to the new position
    const startTime = Date.now();
    const duration = 800; // 800ms animation
    const startX = currentOffset.x;
    const startY = currentOffset.y;
    let lastUpdateTime = 0;
    
    const animateToPosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      // Calculate current position
      const currentX = startX + (targetOffsetX - startX) * easedProgress;
      const currentY = startY + (targetOffsetY - startY) * easedProgress;
      
      // Update grid position (we need to manually set the offset)
      if (gridRef.current && gridRef.current.setState) {
        gridRef.current.setState({
          offset: { x: currentX, y: currentY },
          restPos: { x: currentX, y: currentY },
          velocity: { x: 0, y: 0 }
        });
        
        // Force grid to recalculate visible items during animation (throttled to ~15fps)
        const now = Date.now();
        if (gridRef.current.publicForceUpdate && now - lastUpdateTime > 66) {
          gridRef.current.publicForceUpdate();
          lastUpdateTime = now;
        }
      }
      
      if (progress < 1) {
        requestAnimationFrame(animateToPosition);
      } else {
        // Animation completed - show floating image and reset position tracking
        selectedImageState.isAnimating = false;
        lastGridPositionRef.current = { x: currentX, y: currentY };
        
        // Final update to ensure all images are loaded after centering
        if (gridRef.current && gridRef.current.publicForceUpdate) {
          gridRef.current.publicForceUpdate();
        }
        
        forceUpdate(prev => prev + 1);
      }
    };
    
    requestAnimationFrame(animateToPosition);
  }, []);

  // Handle clicking on empty space to deselect
  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the background div itself
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

  useEffect(() => {
    // Make focusOnImage available globally for the cell components
    (window as any).focusOnImage = focusOnImage;

    // Initialize position tracking
    if (gridRef.current && gridRef.current.publicGetCurrentPosition) {
      const initialOffset = gridRef.current.publicGetCurrentPosition();
      lastGridPositionRef.current = { x: initialOffset.x, y: initialOffset.y };
    }

    const updateCenterPosition = () => {
      if (gridRef.current && gridRef.current.publicGetCurrentPosition) {
        const offset = gridRef.current.publicGetCurrentPosition();
        
        // Check if grid moved significantly (indicating user panning)
        if (selectedImageState.isSelected && !selectedImageState.isAnimating) {
          const lastPos = lastGridPositionRef.current;
          const deltaX = Math.abs(offset.x - lastPos.x);
          const deltaY = Math.abs(offset.y - lastPos.y);
          const threshold = 10; // pixels of movement before deselecting
          
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
        
        // Update last position for movement detection
        lastGridPositionRef.current = { x: offset.x, y: offset.y };
        
        // Calculate the center position in grid coordinates
        const centerX = -Math.round(offset.x / CONFIG.gridSize);
        const centerY = -Math.round(offset.y / CONFIG.gridSize);
        
        // Update global center position
        currentCenterPosition = { x: centerX, y: centerY };
        
        // Force re-render to update scales
        forceUpdate(prev => prev + 1);
      }
    };

    // Update position on animation frame for smooth updates
    let animationFrame: number;
    const animate = () => {
      updateCenterPosition();
      animationFrame = requestAnimationFrame(animate);
    };
    
    // Start the animation loop
    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      // Clean up global function
      delete (window as any).focusOnImage;
    };
  }, [focusOnImage]);

    return (
    <div 
      className="w-full h-full bg-gray-50 relative"
      onClick={handleBackgroundClick}
    >
      {/* Main grid */}
      <div
        onMouseDown={() => {
          // Deselect when starting to pan/drag the grid with mouse
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
          // Only deselect if not currently interacting with an image
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
          // Deselect when using trackpad/wheel to pan the grid
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
          renderItem={ThiingsIconCell}
          initialPosition={CONFIG.initialPosition}
        />
      </div>

            {/* Floating draggable image - spawned outside grid when selected and animation complete */}
      {selectedImageState.isSelected && selectedImageState.gridIndex !== null && !selectedImageState.isAnimating && (() => {
        const selectedIndex = selectedImageState.gridIndex;
        return (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              zIndex: 9999, // Maximum z-index to ensure it's on top
            }}
          >
            <div
              className="relative pointer-events-auto"
              style={{
                width: CONFIG.gridSize * 1.2, // Slightly larger for better visibility
                height: CONFIG.gridSize * 1.2,
                cursor: 'default', // Override any inherited cursor styles
              }}
            >
              {/* Selection border */}
              <div 
                className="absolute inset-0 border-4 border-blue-500 rounded-lg shadow-xl animate-pulse pointer-events-none" 
                style={{ 
                  margin: '-4px',
                  zIndex: 1,
                }} 
              />
              
              {/* Draggable image */}
              <img
                draggable={true}
                src={`/thiings/${CONFIG.images[selectedIndex % CONFIG.images.length]}.png`}
                alt={`Selected Icon ${selectedIndex}`}
                className="w-full h-full object-contain shadow-2xl relative"
                style={{
                  filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))',
                  cursor: 'move', // Explicit drag cursor
                  zIndex: 2,
                }}
                onDragStart={async (e) => {
                  console.log(`🚀 Starting drag of floating image ${selectedIndex}`);
                  
                  const imageUrl = `${window.location.origin}/thiings/${CONFIG.images[selectedIndex % CONFIG.images.length]}.png`;
                  const fileName = `thiings-icon-${selectedIndex}.png`;
                  
                  // Set the drag image to be the actual image element
                  e.dataTransfer.setDragImage(e.target as HTMLImageElement, 
                    (e.target as HTMLImageElement).width / 2, 
                    (e.target as HTMLImageElement).height / 2
                  );
                  
                  try {
                    // Fetch the image and convert to PNG blob
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    
                    // Ensure it's a PNG blob
                    const pngBlob = new Blob([blob], { type: 'image/png' });
                    
                    // Only set the PNG file data - no text formats
                    e.dataTransfer.items.add(new File([pngBlob], fileName, { type: 'image/png' }));
                    
                    e.dataTransfer.effectAllowed = "copy";
                    console.log(`✅ PNG file ready for drag: ${fileName}`);
                    
                  } catch (error) {
                    console.log("❌ Could not prepare PNG file:", error);
                    // Fallback: just set the image URL
                    e.dataTransfer.setData("text/uri-list", imageUrl);
                    e.dataTransfer.effectAllowed = "copyLink";
                  }
                }}
                onDragEnd={() => {
                  console.log(`✅ Drag completed for image ${selectedIndex}`);
                  // Optionally deselect after successful drag
                  // selectedImageState = { gridIndex: null, position: null, isSelected: false };
                  // forceUpdate(prev => prev + 1);
                }}
                onMouseEnter={() => {
                  console.log(`Mouse entered floating image ${selectedIndex}`);
                }}
                onMouseDown={(e) => {
                  console.log(`Mouse down on floating image ${selectedIndex}`);
                  e.stopPropagation(); // Prevent grid interaction
                }}
              />
              
              {/* Subtle glow effect */}
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

export default ThiingsIcons;
