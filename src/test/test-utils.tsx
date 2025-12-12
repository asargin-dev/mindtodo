import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TodoNode, Connection, MapMeta, NodeStatus } from '@/types'

// Custom render function that includes common providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const user = userEvent.setup()
  return {
    user,
    ...render(ui, { ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render, userEvent }

// Test data factories
export const createMockNode = (overrides: Partial<TodoNode> = {}): TodoNode => ({
  id: Date.now().toString(),
  title: 'Test Node',
  position: { x: 100, y: 100 },
  status: 'pending' as NodeStatus,
  isRoot: false,
  ...overrides,
})

export const createMockRootNode = (overrides: Partial<TodoNode> = {}): TodoNode => ({
  id: 'root-' + Date.now().toString(),
  title: 'My Tasks',
  position: { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60 },
  status: 'pending' as NodeStatus,
  isRoot: true,
  ...overrides,
})

export const createMockConnection = (
  sourceId: string,
  targetId: string,
  overrides: Partial<Connection> = {}
): Connection => ({
  id: `${sourceId}-${targetId}`,
  sourceId,
  targetId,
  ...overrides,
})

export const createMockMapMeta = (overrides: Partial<MapMeta> = {}): MapMeta => ({
  id: Date.now().toString(),
  name: 'Test Map',
  ...overrides,
})

// Local storage helpers
export const setLocalStorageNodes = (mapId: string, nodes: TodoNode[]) => {
  localStorage.setItem(`brainmap-${mapId}-nodes`, JSON.stringify(nodes))
}

export const setLocalStorageConnections = (mapId: string, connections: Connection[]) => {
  localStorage.setItem(`brainmap-${mapId}-connections`, JSON.stringify(connections))
}

export const setLocalStorageMapsMeta = (maps: MapMeta[]) => {
  localStorage.setItem('mindtodo-maps-meta', JSON.stringify(maps))
}

export const getLocalStorageNodes = (mapId: string): TodoNode[] => {
  const raw = localStorage.getItem(`brainmap-${mapId}-nodes`)
  return raw ? JSON.parse(raw) : []
}

export const getLocalStorageConnections = (mapId: string): Connection[] => {
  const raw = localStorage.getItem(`brainmap-${mapId}-connections`)
  return raw ? JSON.parse(raw) : []
}

export const getLocalStorageMapsMeta = (): MapMeta[] => {
  const raw = localStorage.getItem('mindtodo-maps-meta')
  return raw ? JSON.parse(raw) : []
}

// Mock touch event helper
export const createMockTouchEvent = (
  type: 'touchstart' | 'touchmove' | 'touchend',
  touches: Array<{ clientX: number; clientY: number; identifier?: number }>
): Partial<TouchEvent> => {
  const touchList = touches.map((t, i) => ({
    clientX: t.clientX,
    clientY: t.clientY,
    identifier: t.identifier ?? i,
    target: document.body,
    screenX: t.clientX,
    screenY: t.clientY,
    pageX: t.clientX,
    pageY: t.clientY,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 1,
  })) as unknown as Touch[]

  return {
    type,
    touches: {
      length: type === 'touchend' ? 0 : touchList.length,
      item: (i: number) => touchList[i] ?? null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < this.length; i++) {
          yield this.item(i)
        }
      },
    } as TouchList,
    changedTouches: {
      length: touchList.length,
      item: (i: number) => touchList[i] ?? null,
      [Symbol.iterator]: function* () {
        for (let i = 0; i < this.length; i++) {
          yield this.item(i)
        }
      },
    } as TouchList,
    preventDefault: () => {},
    stopPropagation: () => {},
  }
}

// Wait helper for async operations
export const waitForLocalStorageUpdate = async (
  key: string,
  timeout = 1000
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const check = () => {
      const value = localStorage.getItem(key)
      if (value !== null) {
        resolve(value)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for localStorage key: ${key}`))
      } else {
        setTimeout(check, 50)
      }
    }
    check()
  })
}
