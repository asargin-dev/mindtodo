import { describe, it, expect } from 'vitest'
import type { Position, NodeStatus, TodoNode, Connection, MapMeta } from './index'

describe('Type Definitions', () => {
  describe('Position', () => {
    it('should accept valid position object', () => {
      const position: Position = { x: 100, y: 200 }
      expect(position.x).toBe(100)
      expect(position.y).toBe(200)
    })

    it('should accept negative coordinates', () => {
      const position: Position = { x: -50, y: -100 }
      expect(position.x).toBe(-50)
      expect(position.y).toBe(-100)
    })

    it('should accept decimal coordinates', () => {
      const position: Position = { x: 100.5, y: 200.75 }
      expect(position.x).toBe(100.5)
      expect(position.y).toBe(200.75)
    })
  })

  describe('NodeStatus', () => {
    it('should accept pending status', () => {
      const status: NodeStatus = 'pending'
      expect(status).toBe('pending')
    })

    it('should accept success status', () => {
      const status: NodeStatus = 'success'
      expect(status).toBe('success')
    })

    it('should accept failed status', () => {
      const status: NodeStatus = 'failed'
      expect(status).toBe('failed')
    })
  })

  describe('TodoNode', () => {
    it('should accept valid todo node', () => {
      const node: TodoNode = {
        id: 'node-1',
        title: 'Test Task',
        position: { x: 100, y: 200 },
        status: 'pending',
      }

      expect(node.id).toBe('node-1')
      expect(node.title).toBe('Test Task')
      expect(node.position).toEqual({ x: 100, y: 200 })
      expect(node.status).toBe('pending')
      expect(node.isRoot).toBeUndefined()
    })

    it('should accept node with isRoot flag', () => {
      const rootNode: TodoNode = {
        id: 'root-1',
        title: 'My Tasks',
        position: { x: 0, y: 0 },
        status: 'pending',
        isRoot: true,
      }

      expect(rootNode.isRoot).toBe(true)
    })

    it('should accept node with success status', () => {
      const completedNode: TodoNode = {
        id: 'node-2',
        title: 'Completed Task',
        position: { x: 50, y: 50 },
        status: 'success',
      }

      expect(completedNode.status).toBe('success')
    })

    it('should accept node with failed status', () => {
      const failedNode: TodoNode = {
        id: 'node-3',
        title: 'Failed Task',
        position: { x: 75, y: 75 },
        status: 'failed',
      }

      expect(failedNode.status).toBe('failed')
    })

    it('should handle empty title', () => {
      const emptyTitleNode: TodoNode = {
        id: 'node-4',
        title: '',
        position: { x: 0, y: 0 },
        status: 'pending',
      }

      expect(emptyTitleNode.title).toBe('')
    })

    it('should handle long titles', () => {
      const longTitle = 'This is a very long title that might need to wrap across multiple lines in the node component'
      const longTitleNode: TodoNode = {
        id: 'node-5',
        title: longTitle,
        position: { x: 0, y: 0 },
        status: 'pending',
      }

      expect(longTitleNode.title).toBe(longTitle)
    })
  })

  describe('Connection', () => {
    it('should accept valid connection', () => {
      const connection: Connection = {
        id: 'conn-1',
        sourceId: 'node-1',
        targetId: 'node-2',
      }

      expect(connection.id).toBe('conn-1')
      expect(connection.sourceId).toBe('node-1')
      expect(connection.targetId).toBe('node-2')
    })

    it('should accept connection with composite id', () => {
      const connection: Connection = {
        id: 'node-1-node-2',
        sourceId: 'node-1',
        targetId: 'node-2',
      }

      expect(connection.id).toBe('node-1-node-2')
    })
  })

  describe('MapMeta', () => {
    it('should accept valid map metadata', () => {
      const mapMeta: MapMeta = {
        id: 'map-1',
        name: 'My Project',
      }

      expect(mapMeta.id).toBe('map-1')
      expect(mapMeta.name).toBe('My Project')
    })

    it('should handle timestamp-based id', () => {
      const timestamp = Date.now().toString()
      const mapMeta: MapMeta = {
        id: timestamp,
        name: 'Time-based Map',
      }

      expect(mapMeta.id).toBe(timestamp)
    })

    it('should handle unicode characters in name', () => {
      const mapMeta: MapMeta = {
        id: 'map-unicode',
        name: 'Proje Görevleri 🎯',
      }

      expect(mapMeta.name).toBe('Proje Görevleri 🎯')
    })
  })
})

describe('Type Relationships', () => {
  it('should allow TodoNode position to be used as Position type', () => {
    const node: TodoNode = {
      id: 'node-1',
      title: 'Test',
      position: { x: 100, y: 200 },
      status: 'pending',
    }

    const position: Position = node.position
    expect(position.x).toBe(100)
    expect(position.y).toBe(200)
  })

  it('should allow Connection to reference TodoNode ids', () => {
    const nodes: TodoNode[] = [
      { id: 'node-1', title: 'Source', position: { x: 0, y: 0 }, status: 'pending' },
      { id: 'node-2', title: 'Target', position: { x: 100, y: 100 }, status: 'pending' },
    ]

    const connection: Connection = {
      id: `${nodes[0].id}-${nodes[1].id}`,
      sourceId: nodes[0].id,
      targetId: nodes[1].id,
    }

    expect(nodes.find(n => n.id === connection.sourceId)).toBeDefined()
    expect(nodes.find(n => n.id === connection.targetId)).toBeDefined()
  })
})
