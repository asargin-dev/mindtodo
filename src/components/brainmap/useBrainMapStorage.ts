import { useEffect, useState } from 'react'
import type { Connection, TodoNode } from '@/types'
import { isRootNode } from '@/lib/rootNode'

interface StorageParams {
  mapId: string
  mapName: string
  nodes: TodoNode[]
  connections: Connection[]
  setNodes: (nodes: TodoNode[]) => void
  setConnections: (connections: Connection[]) => void
  createRootNode: (overrideTitle?: string) => TodoNode
  normalizeNodes: (rawNodes: any[]) => TodoNode[]
  onRootTitleChange?: (title: string) => void
  onNodesChange?: () => void
}

export function useBrainMapStorage({
  mapId,
  mapName,
  nodes,
  connections,
  setNodes,
  setConnections,
  createRootNode,
  normalizeNodes,
  onRootTitleChange,
  onNodesChange,
}: StorageParams) {
  const [hydrated, setHydrated] = useState(false)
  const nodesKey = `brainmap-${mapId}-nodes`
  const connectionsKey = `brainmap-${mapId}-connections`

  useEffect(() => {
    setHydrated(false)
  }, [nodesKey, connectionsKey])

  useEffect(() => {
    const savedNodes = localStorage.getItem(nodesKey)
    const savedConnections = localStorage.getItem(connectionsKey)

    if (savedNodes) {
      try {
        const parsedNodes = JSON.parse(savedNodes)
        const normalized = normalizeNodes(parsedNodes)
        if (normalized.length > 0) {
          setNodes(normalized)

          if (onRootTitleChange) {
            const rootCandidate = normalized.find((node) => isRootNode(node))
            const normalizedRootTitle = rootCandidate?.title?.trim()
            const normalizedMapName = mapName?.trim()

            if (
              normalizedRootTitle &&
              (!normalizedMapName || normalizedRootTitle !== normalizedMapName)
            ) {
              onRootTitleChange(normalizedRootTitle)
            }
          }
        } else {
          createRootNode()
        }
      } catch (e) {
        console.error('Error parsing saved nodes:', e)
        createRootNode()
      }
    } else {
      createRootNode()
    }

    if (savedConnections) {
      try {
        const parsedConnections = JSON.parse(savedConnections)
        setConnections(parsedConnections)
      } catch (e) {
        console.error('Error parsing saved connections:', e)
      }
    }

    setHydrated(true)
  }, [
    nodesKey,
    connectionsKey,
    createRootNode,
    normalizeNodes,
    setNodes,
    setConnections,
    onRootTitleChange,
  ])

  useEffect(() => {
    if (!hydrated) return

    if (nodes.length > 0) {
      localStorage.setItem(nodesKey, JSON.stringify(nodes))
      onNodesChange?.()
    }

    localStorage.setItem(connectionsKey, JSON.stringify(connections))
  }, [hydrated, nodes, connections, nodesKey, connectionsKey, onNodesChange])
}
