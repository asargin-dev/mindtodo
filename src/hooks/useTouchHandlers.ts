import { useCallback, useRef, useState } from 'react';

// Types for touch handling
export interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

export interface GestureState {
  // Single touch / drag
  isDragging: boolean;
  startPoint: TouchPoint | null;
  currentPoint: TouchPoint | null;

  // Pinch zoom
  isPinching: boolean;
  initialPinchDistance: number;
  currentPinchDistance: number;
  pinchCenter: { x: number; y: number } | null;

  // Two-finger pan
  isTwoFingerPan: boolean;
  twoFingerStartCenter: { x: number; y: number } | null;
}

// Utility to check if device supports touch
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Calculate distance between two touch points
export const getTouchDistance = (touch1: Touch, touch2: Touch): number => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate center point between two touches
export const getTouchCenter = (touch1: Touch, touch2: Touch): { x: number; y: number } => {
  return {
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  };
};

// Get coordinates from either mouse or touch event
export const getEventCoordinates = (
  event: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
): { x: number; y: number } | null => {
  // Check if it's a touch event
  if ('touches' in event) {
    if (event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
    // For touchend, use changedTouches
    if ('changedTouches' in event && event.changedTouches.length > 0) {
      return {
        x: event.changedTouches[0].clientX,
        y: event.changedTouches[0].clientY,
      };
    }
    return null;
  }

  // Mouse event
  return {
    x: event.clientX,
    y: event.clientY,
  };
};

// Hook for managing pinch-to-zoom gesture
export function usePinchZoom(
  onZoom: (scale: number, center: { x: number; y: number }) => void
) {
  const initialDistanceRef = useRef<number>(0);
  const initialZoomRef = useRef<number>(1);

  const handleTouchStart = useCallback((event: TouchEvent, currentZoom: number) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      initialDistanceRef.current = getTouchDistance(event.touches[0], event.touches[1]);
      initialZoomRef.current = currentZoom;
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      const currentDistance = getTouchDistance(event.touches[0], event.touches[1]);
      const scale = currentDistance / initialDistanceRef.current;
      const newZoom = Math.max(0.1, Math.min(3, initialZoomRef.current * scale));
      const center = getTouchCenter(event.touches[0], event.touches[1]);
      onZoom(newZoom, center);
    }
  }, [onZoom]);

  return { handleTouchStart, handleTouchMove };
}

// Hook for managing single-finger pan
export function useTouchPan(
  onPanStart: () => void,
  onPanMove: (deltaX: number, deltaY: number) => void,
  onPanEnd: () => void
) {
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const isPanningRef = useRef(false);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (event.touches.length === 1) {
      lastPointRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      isPanningRef.current = true;
      onPanStart();
    }
  }, [onPanStart]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (event.touches.length === 1 && isPanningRef.current && lastPointRef.current) {
      const currentX = event.touches[0].clientX;
      const currentY = event.touches[0].clientY;
      const deltaX = currentX - lastPointRef.current.x;
      const deltaY = currentY - lastPointRef.current.y;
      lastPointRef.current = { x: currentX, y: currentY };
      onPanMove(deltaX, deltaY);
    }
  }, [onPanMove]);

  const handleTouchEnd = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      lastPointRef.current = null;
      onPanEnd();
    }
  }, [onPanEnd]);

  return { handleTouchStart, handleTouchMove, handleTouchEnd };
}

// Hook for managing touch-based node dragging
export function useTouchDrag<T>(
  onDragStart: (item: T, x: number, y: number) => void,
  onDragMove: (x: number, y: number) => void,
  onDragEnd: (x: number, y: number) => void
) {
  const isDraggingRef = useRef(false);
  const dragItemRef = useRef<T | null>(null);

  const startDrag = useCallback((item: T, event: TouchEvent | React.TouchEvent) => {
    if ('touches' in event && event.touches.length === 1) {
      event.preventDefault();
      event.stopPropagation();
      isDraggingRef.current = true;
      dragItemRef.current = item;
      const touch = event.touches[0];
      onDragStart(item, touch.clientX, touch.clientY);
    }
  }, [onDragStart]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (isDraggingRef.current && event.touches.length === 1) {
      event.preventDefault();
      const touch = event.touches[0];
      onDragMove(touch.clientX, touch.clientY);
    }
  }, [onDragMove]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragItemRef.current = null;
      const coords = getEventCoordinates(event);
      if (coords) {
        onDragEnd(coords.x, coords.y);
      }
    }
  }, [onDragEnd]);

  return { startDrag, handleTouchMove, handleTouchEnd, isDragging: isDraggingRef };
}

// Hook to detect if current interaction is touch
export function useIsTouchInteraction() {
  const [isTouch, setIsTouch] = useState(false);

  const markAsTouch = useCallback(() => setIsTouch(true), []);
  const markAsMouse = useCallback(() => setIsTouch(false), []);

  return { isTouch, markAsTouch, markAsMouse };
}

// Combined touch handlers for a component
export function useTouchHandlers() {
  const [isTouchActive, setIsTouchActive] = useState(false);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Detect tap vs drag (tap is < 200ms and < 10px movement)
  const isTap = useCallback((endX: number, endY: number): boolean => {
    const duration = Date.now() - touchStartTimeRef.current;
    const startPos = touchStartPosRef.current;
    if (!startPos) return false;

    const distance = Math.sqrt(
      Math.pow(endX - startPos.x, 2) + Math.pow(endY - startPos.y, 2)
    );

    return duration < 200 && distance < 10;
  }, []);

  const handleTouchStart = useCallback((x: number, y: number) => {
    setIsTouchActive(true);
    touchStartTimeRef.current = Date.now();
    touchStartPosRef.current = { x, y };
  }, []);

  const handleTouchEnd = useCallback(() => {
    setIsTouchActive(false);
    touchStartPosRef.current = null;
  }, []);

  return {
    isTouchActive,
    isTap,
    handleTouchStart,
    handleTouchEnd,
    isTouchDevice: isTouchDevice(),
  };
}
