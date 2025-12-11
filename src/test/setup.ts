import '@testing-library/jest-dom'
import { afterEach, vi, beforeAll, afterAll } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

window.ResizeObserver = ResizeObserverMock

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1024,
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 768,
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
}

Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  configurable: true,
  writable: true,
})

// Mock confirm dialog
window.confirm = vi.fn(() => true)

// Mock alert dialog
window.alert = vi.fn()

// Suppress console errors during tests (optional)
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterAll(() => {
  vi.restoreAllMocks()
})
