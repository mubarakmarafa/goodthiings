import React, { Component } from "react";

// Grid physics constants
const MIN_VELOCITY = 0.2;
const UPDATE_INTERVAL = 16;
const VELOCITY_HISTORY_SIZE = 5;
const FRICTION = 0.9;
const VELOCITY_THRESHOLD = 0.3;

// Custom debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
) {
  let timeoutId: NodeJS.Timeout | number | undefined = undefined;

  const debouncedFn = function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = undefined;
    }, wait);
  };

  debouncedFn.cancel = function () {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  return debouncedFn;
}

// Custom throttle implementation
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
) {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | number | undefined = undefined;
  const { leading = true, trailing = true } = options;

  const throttledFn = function (...args: Parameters<T>) {
    const now = Date.now();

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      lastCall = now;
      func(...args);
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        lastCall = leading ? Date.now() : 0;
        timeoutId = undefined;
        func(...args);
      }, remaining);
    }
  };

  throttledFn.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return throttledFn;
}

function getDistance(p1: Position, p2: Position) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

type Position = {
  x: number;
  y: number;
};

type GridItem = {
  position: Position;
  gridIndex: number;
};

type State = {
  offset: Position;
  isDragging: boolean;
  startPos: Position;
  restPos: Position;
  velocity: Position;
  gridItems: GridItem[];
  isMoving: boolean;
  lastMoveTime: number;
  velocityHistory: Position[];
};

export type ItemConfig = {
  isMoving: boolean;
  position: Position;
  gridIndex: number;
};

export type ThiingsGridProps = {
  gridSize: number;
  renderItem: (itemConfig: ItemConfig) => React.ReactNode;
  className?: string;
  initialPosition?: Position;
};

class ThiingsGrid extends Component<ThiingsGridProps, State> {
  private containerRef: React.RefObject<HTMLElement | null>;
  private lastPos: Position;
  private animationFrame: number | null;
  private isComponentMounted: boolean;
  private lastUpdateTime: number;
  private debouncedUpdateGridItems: ReturnType<typeof throttle>;

  constructor(props: ThiingsGridProps) {
    super(props);
    const offset = this.props.initialPosition || { x: 0, y: 0 };
    this.state = {
      offset: { ...offset },
      restPos: { ...offset },
      startPos: { ...offset },
      velocity: { x: 0, y: 0 },
      isDragging: false,
      gridItems: [],
      isMoving: false,
      lastMoveTime: 0,
      velocityHistory: [],
    };
    this.containerRef = React.createRef();
    this.lastPos = { x: 0, y: 0 };
    this.animationFrame = null;
    this.isComponentMounted = false;
    this.lastUpdateTime = 0;
    this.debouncedUpdateGridItems = throttle(
      this.updateGridItems,
      UPDATE_INTERVAL,
      {
        leading: true,
        trailing: true,
      }
    );
  }

  componentDidMount() {
    this.isComponentMounted = true;
    this.updateGridItems();
    this.injectHoverStyles();
  }

  private injectHoverStyles = () => {
    // Check if styles already exist
    if (document.getElementById('thiings-grid-hover-styles')) return;

    const style = document.createElement('style');
    style.id = 'thiings-grid-hover-styles';
    style.textContent = `
      .grid-item-hover:hover {
        filter: none !important;
        transition: filter 0.2s ease-in-out !important;
        z-index: 10;
        position: relative;
      }
      .grid-item-hover:hover * {
        transform: scale(1.05);
        transition: transform 0.2s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  };

  componentWillUnmount() {
    this.isComponentMounted = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.debouncedUpdateGridItems.cancel();
    
    // Clean up injected styles if no other ThiingsGrid instances exist
    const existingStyle = document.getElementById('thiings-grid-hover-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  public publicGetCurrentPosition = () => {
    return this.state.offset;
  };

  private calculateVisiblePositions = (): Position[] => {
    if (!this.containerRef.current) return [];

    const rect = this.containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate grid cells needed to fill container
    const cellsX = Math.ceil(width / this.props.gridSize!);
    const cellsY = Math.ceil(height / this.props.gridSize!);

    // Calculate center position based on offset
    const centerX = -Math.round(this.state.offset.x / this.props.gridSize!);
    const centerY = -Math.round(this.state.offset.y / this.props.gridSize!);

    const positions: Position[] = [];
    const halfCellsX = Math.ceil(cellsX / 2);
    const halfCellsY = Math.ceil(cellsY / 2);

    for (let y = centerY - halfCellsY; y <= centerY + halfCellsY; y++) {
      for (let x = centerX - halfCellsX; x <= centerX + halfCellsX; x++) {
        positions.push({ x, y });
      }
    }

    return positions;
  };

  private getItemIndexForPosition = (x: number, y: number): number => {
    // Special case for center
    if (x === 0 && y === 0) return 0;

    // Determine which layer of the spiral we're in
    const layer = Math.max(Math.abs(x), Math.abs(y));

    // Calculate the size of all inner layers
    const innerLayersSize = Math.pow(2 * layer - 1, 2);

    // Calculate position within current layer
    let positionInLayer = 0;

    if (y === 0 && x === layer) {
      // Starting position (middle right)
      positionInLayer = 0;
    } else if (y < 0 && x === layer) {
      // Right side, bottom half
      positionInLayer = -y;
    } else if (y === -layer && x > -layer) {
      // Bottom side
      positionInLayer = layer + (layer - x);
    } else if (x === -layer && y < layer) {
      // Left side
      positionInLayer = 3 * layer + (layer + y);
    } else if (y === layer && x < layer) {
      // Top side
      positionInLayer = 5 * layer + (layer + x);
    } else {
      // Right side, top half (y > 0 && x === layer)
      positionInLayer = 7 * layer + (layer - y);
    }

    const index = innerLayersSize + positionInLayer;
    return index;
  };

  private debouncedStopMoving = debounce(() => {
    this.setState({ isMoving: false, restPos: { ...this.state.offset } });
  }, 200);

  private updateGridItems = () => {
    if (!this.isComponentMounted) return;

    const positions = this.calculateVisiblePositions();
    const newItems = positions.map((position) => {
      const gridIndex = this.getItemIndexForPosition(position.x, position.y);
      return {
        position,
        gridIndex,
      };
    });

    const distanceFromRest = getDistance(this.state.offset, this.state.restPos);

    this.setState({ gridItems: newItems, isMoving: distanceFromRest > 5 });

    this.debouncedStopMoving();
  };

  private animate = () => {
    if (!this.isComponentMounted) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;

    if (deltaTime >= UPDATE_INTERVAL) {
      const { velocity } = this.state;
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );

      if (speed < MIN_VELOCITY) {
        this.setState({ velocity: { x: 0, y: 0 } });
        return;
      }

      // Apply non-linear deceleration based on speed
      let deceleration = FRICTION;
      if (speed < VELOCITY_THRESHOLD) {
        // Apply stronger deceleration at lower speeds for more natural stopping
        deceleration = FRICTION * (speed / VELOCITY_THRESHOLD);
      }

      this.setState(
        (prevState) => ({
          offset: {
            x: prevState.offset.x + prevState.velocity.x,
            y: prevState.offset.y + prevState.velocity.y,
          },
          velocity: {
            x: prevState.velocity.x * deceleration,
            y: prevState.velocity.y * deceleration,
          },
        }),
        this.debouncedUpdateGridItems
      );

      this.lastUpdateTime = currentTime;
    }

    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private handleDown = (p: Position) => {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.setState({
      isDragging: true,
      startPos: {
        x: p.x - this.state.offset.x,
        y: p.y - this.state.offset.y,
      },
      velocity: { x: 0, y: 0 },
    });

    this.lastPos = { x: p.x, y: p.y };
  };
  private handleMove = (p: Position) => {
    if (!this.state.isDragging) return;

    const currentTime = performance.now();
    const timeDelta = currentTime - this.state.lastMoveTime;

    // Calculate raw velocity based on position and time
    const rawVelocity = {
      x: (p.x - this.lastPos.x) / (timeDelta || 1),
      y: (p.y - this.lastPos.y) / (timeDelta || 1),
    };

    // Add to velocity history and maintain fixed size
    const velocityHistory = [...this.state.velocityHistory, rawVelocity];
    if (velocityHistory.length > VELOCITY_HISTORY_SIZE) {
      velocityHistory.shift();
    }

    // Calculate smoothed velocity using moving average
    const smoothedVelocity = velocityHistory.reduce(
      (acc, vel) => ({
        x: acc.x + vel.x / velocityHistory.length,
        y: acc.y + vel.y / velocityHistory.length,
      }),
      { x: 0, y: 0 }
    );

    this.setState(
      {
        velocity: smoothedVelocity,
        offset: {
          x: p.x - this.state.startPos.x,
          y: p.y - this.state.startPos.y,
        },
        lastMoveTime: currentTime,
        velocityHistory,
      },
      this.updateGridItems
    );

    this.lastPos = { x: p.x, y: p.y };
  };
  private handleUp = () => {
    this.setState({ isDragging: false });
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private handleMouseDown = (e: React.MouseEvent) => {
    this.handleDown({
      x: e.clientX,
      y: e.clientY,
    });
  };

  private handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    this.handleMove({
      x: e.clientX,
      y: e.clientY,
    });
  };

  private handleMouseUp = () => {
    this.handleUp();
  };

  private handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    if (!touch) return;

    this.handleDown({
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  private handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    if (!touch) return;

    this.handleMove({
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  private handleTouchEnd = () => {
    this.handleUp();
  };

  private handleWheel = (e: React.WheelEvent) => {
    // Get the scroll deltas
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;

    this.setState(
      (prevState) => ({
        offset: {
          x: prevState.offset.x - deltaX,
          y: prevState.offset.y - deltaY,
        },
        velocity: { x: 0, y: 0 }, // Reset velocity when scrolling
      }),
      this.debouncedUpdateGridItems
    );
  };

  render() {
    const { offset, isDragging, gridItems, isMoving } = this.state;
    const { gridSize, className } = this.props;

    // Get container dimensions
    const containerRect = this.containerRef.current?.getBoundingClientRect();
    const containerWidth = containerRect?.width || 0;
    const containerHeight = containerRect?.height || 0;

    return (
      <div
        ref={this.containerRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseUp}
        onTouchStart={this.handleTouchStart}
        onTouchMove={this.handleTouchMove}
        onTouchEnd={this.handleTouchEnd}
        onTouchCancel={this.handleTouchEnd}
        onWheel={this.handleWheel}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
            willChange: "transform",
          }}
        >
          {gridItems.map((item) => {
            const x = item.position.x * gridSize! + containerWidth / 2;
            const y = item.position.y * gridSize! + containerHeight / 2;

            // Calculate distance from center for depth of field effect
            const distanceFromCenter = Math.sqrt(
              item.position.x * item.position.x + item.position.y * item.position.y
            );
            
            // Calculate blur amount based on distance (max 4px blur)
            const blurAmount = Math.min(distanceFromCenter * 0.8, 4);
            const shouldBlur = distanceFromCenter > 0; // Don't blur center item

            return (
              <div
                key={`${item.position.x}-${item.position.y}`}
                className="grid-item-hover"
                style={{
                  position: "absolute",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  userSelect: "none",
                  width: gridSize,
                  height: gridSize,
                  transform: `translate3d(${x}px, ${y}px, 0)`,
                  marginLeft: `-${gridSize! / 2}px`,
                  marginTop: `-${gridSize! / 2}px`,
                  willChange: "transform",
                  filter: shouldBlur ? `blur(${blurAmount}px)` : "none",
                  transition: "filter 0.3s ease-in-out",
                }}
              >
                {this.props.renderItem({
                  gridIndex: item.gridIndex,
                  position: item.position,
                  isMoving,
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

export default ThiingsGrid;
