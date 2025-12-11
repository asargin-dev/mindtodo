import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  isTouchDevice,
  getTouchDistance,
  getTouchCenter,
  getEventCoordinates,
  usePinchZoom,
  useTouchPan,
  useTouchDrag,
  useIsTouchInteraction,
  useTouchHandlers,
} from './useTouchHandlers'

// Mock Touch object
const createMockTouch = (clientX: number, clientY: number, identifier = 0): Touch => ({
  clientX,
  clientY,
  identifier,
  target: document.body,
  screenX: clientX,
  screenY: clientY,
  pageX: clientX,
  pageY: clientY,
  radiusX: 0,
  radiusY: 0,
  rotationAngle: 0,
  force: 1,
})

describe('isTouchDevice', () => {
  it('should detect touch capability based on environment', () => {
    // jsdom may have ontouchstart defined, so we just verify the function works
    const result = isTouchDevice()
    expect(typeof result).toBe('boolean')
  })

  it('should return true when ontouchstart exists', () => {
    const originalOntouchstart = window.ontouchstart
    const originalMaxTouchPoints = navigator.maxTouchPoints

    window.ontouchstart = vi.fn() as unknown as typeof window.ontouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 1,
      configurable: true,
    })

    expect(isTouchDevice()).toBe(true)

    window.ontouchstart = originalOntouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: originalMaxTouchPoints,
      configurable: true,
    })
  })
})

describe('getTouchDistance', () => {
  it('should calculate distance between two touches correctly', () => {
    const touch1 = createMockTouch(0, 0)
    const touch2 = createMockTouch(3, 4)

    // Pythagorean: sqrt(3^2 + 4^2) = 5
    expect(getTouchDistance(touch1, touch2)).toBe(5)
  })

  it('should return 0 for same position touches', () => {
    const touch1 = createMockTouch(100, 100)
    const touch2 = createMockTouch(100, 100)

    expect(getTouchDistance(touch1, touch2)).toBe(0)
  })

  it('should handle negative coordinates', () => {
    const touch1 = createMockTouch(-5, -5)
    const touch2 = createMockTouch(5, 5)

    // Distance: sqrt(10^2 + 10^2) = sqrt(200) ≈ 14.14
    expect(getTouchDistance(touch1, touch2)).toBeCloseTo(14.14, 1)
  })
})

describe('getTouchCenter', () => {
  it('should calculate center point between two touches', () => {
    const touch1 = createMockTouch(0, 0)
    const touch2 = createMockTouch(100, 100)

    const center = getTouchCenter(touch1, touch2)
    expect(center).toEqual({ x: 50, y: 50 })
  })

  it('should return same point when touches are at same position', () => {
    const touch1 = createMockTouch(50, 50)
    const touch2 = createMockTouch(50, 50)

    const center = getTouchCenter(touch1, touch2)
    expect(center).toEqual({ x: 50, y: 50 })
  })

  it('should handle negative coordinates', () => {
    const touch1 = createMockTouch(-100, -100)
    const touch2 = createMockTouch(100, 100)

    const center = getTouchCenter(touch1, touch2)
    expect(center).toEqual({ x: 0, y: 0 })
  })
})

describe('getEventCoordinates', () => {
  it('should return coordinates from mouse event', () => {
    const mouseEvent = {
      clientX: 100,
      clientY: 200,
    } as MouseEvent

    const coords = getEventCoordinates(mouseEvent)
    expect(coords).toEqual({ x: 100, y: 200 })
  })

  it('should return coordinates from touch event with touches', () => {
    const touchEvent = {
      touches: [createMockTouch(150, 250)],
    } as unknown as TouchEvent

    const coords = getEventCoordinates(touchEvent)
    expect(coords).toEqual({ x: 150, y: 250 })
  })

  it('should return coordinates from changedTouches on touchend', () => {
    const touchEvent = {
      touches: [],
      changedTouches: [createMockTouch(200, 300)],
    } as unknown as TouchEvent

    const coords = getEventCoordinates(touchEvent)
    expect(coords).toEqual({ x: 200, y: 300 })
  })

  it('should return null for empty touch event', () => {
    const touchEvent = {
      touches: [],
      changedTouches: [],
    } as unknown as TouchEvent

    const coords = getEventCoordinates(touchEvent)
    expect(coords).toBeNull()
  })
})

describe('usePinchZoom', () => {
  it('should call onZoom with correct scale during pinch', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() => usePinchZoom(onZoom))

    // Simulate pinch start with two touches 100px apart
    const startEvent = {
      touches: [createMockTouch(0, 0), createMockTouch(100, 0)],
      preventDefault: vi.fn(),
    } as unknown as TouchEvent

    result.current.handleTouchStart(startEvent, 1.0)

    // Simulate pinch move with touches 200px apart (zoom in 2x)
    const moveEvent = {
      touches: [createMockTouch(0, 0), createMockTouch(200, 0)],
      preventDefault: vi.fn(),
    } as unknown as TouchEvent

    result.current.handleTouchMove(moveEvent)

    expect(onZoom).toHaveBeenCalled()
    const [newZoom, center] = onZoom.mock.calls[0]
    expect(newZoom).toBe(2.0)
    expect(center).toEqual({ x: 100, y: 0 })
  })

  it('should clamp zoom between 0.1 and 3', () => {
    const onZoom = vi.fn()
    const { result } = renderHook(() => usePinchZoom(onZoom))

    // Start with touches 100px apart
    const startEvent = {
      touches: [createMockTouch(0, 0), createMockTouch(100, 0)],
      preventDefault: vi.fn(),
    } as unknown as TouchEvent

    result.current.handleTouchStart(startEvent, 2.5)

    // Try to zoom way in (500px = 5x from 100px)
    const moveEvent = {
      touches: [createMockTouch(0, 0), createMockTouch(500, 0)],
      preventDefault: vi.fn(),
    } as unknown as TouchEvent

    result.current.handleTouchMove(moveEvent)

    expect(onZoom).toHaveBeenCalled()
    const [newZoom] = onZoom.mock.calls[0]
    expect(newZoom).toBe(3) // Should be clamped to max 3
  })
})

describe('useTouchPan', () => {
  it('should call onPanMove with delta values during single finger pan', () => {
    const onPanStart = vi.fn()
    const onPanMove = vi.fn()
    const onPanEnd = vi.fn()

    const { result } = renderHook(() => useTouchPan(onPanStart, onPanMove, onPanEnd))

    // Start pan
    const startEvent = {
      touches: [createMockTouch(100, 100)],
    } as unknown as TouchEvent

    result.current.handleTouchStart(startEvent)
    expect(onPanStart).toHaveBeenCalled()

    // Move
    const moveEvent = {
      touches: [createMockTouch(150, 120)],
    } as unknown as TouchEvent

    result.current.handleTouchMove(moveEvent)
    expect(onPanMove).toHaveBeenCalledWith(50, 20)

    // End
    result.current.handleTouchEnd()
    expect(onPanEnd).toHaveBeenCalled()
  })
})

describe('useTouchDrag', () => {
  it('should handle touch drag lifecycle', () => {
    const onDragStart = vi.fn()
    const onDragMove = vi.fn()
    const onDragEnd = vi.fn()

    const { result } = renderHook(() => useTouchDrag<string>(onDragStart, onDragMove, onDragEnd))

    const item = 'test-item'
    const startEvent = {
      touches: [createMockTouch(100, 100)],
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as TouchEvent

    result.current.startDrag(item, startEvent)
    expect(onDragStart).toHaveBeenCalledWith(item, 100, 100)
  })
})

describe('useIsTouchInteraction', () => {
  it('should track touch vs mouse interactions', () => {
    const { result } = renderHook(() => useIsTouchInteraction())

    expect(result.current.isTouch).toBe(false)

    act(() => {
      result.current.markAsTouch()
    })
    expect(result.current.isTouch).toBe(true)

    act(() => {
      result.current.markAsMouse()
    })
    expect(result.current.isTouch).toBe(false)
  })
})

describe('useTouchHandlers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should detect tap vs drag based on duration and distance', () => {
    const { result } = renderHook(() => useTouchHandlers())

    // Start touch
    act(() => {
      result.current.handleTouchStart(100, 100)
    })

    expect(result.current.isTouchActive).toBe(true)

    // Quick tap - less than 200ms and less than 10px movement
    vi.advanceTimersByTime(100)
    expect(result.current.isTap(105, 105)).toBe(true)

    // Long press - more than 200ms
    vi.advanceTimersByTime(150)
    expect(result.current.isTap(105, 105)).toBe(false)
  })

  it('should detect drag when movement exceeds threshold', () => {
    const { result } = renderHook(() => useTouchHandlers())

    act(() => {
      result.current.handleTouchStart(100, 100)
    })

    vi.advanceTimersByTime(50)

    // Movement exceeds 10px threshold
    expect(result.current.isTap(150, 150)).toBe(false)
  })

  it('should reset state on touch end', () => {
    const { result } = renderHook(() => useTouchHandlers())

    act(() => {
      result.current.handleTouchStart(100, 100)
    })

    expect(result.current.isTouchActive).toBe(true)

    act(() => {
      result.current.handleTouchEnd()
    })

    expect(result.current.isTouchActive).toBe(false)
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
