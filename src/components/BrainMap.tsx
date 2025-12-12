import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Maximize } from 'lucide-react'
import { Button } from './ui/button'
import type { Connection, NodeStatus, Position, TodoNode } from '@/types'
import { NodeComponent } from './NodeComponent'
import { ROOT_TITLES, isRootNode } from '@/lib/rootNode'
import { getNodeSize } from '@/lib/nodeSizing'
import { useBrainMapStorage } from './brainmap/useBrainMapStorage'

interface BrainMapProps {
  mapId: string
  mapName: string
  onRootTitleChange?: (title: string) => void
  onNodesChange?: () => void
}

const DEFAULT_STATUS: NodeStatus = 'pending'

const deriveStatusFromLegacyTodos = (legacyTodos: any[]): NodeStatus => {
  if (!Array.isArray(legacyTodos) || legacyTodos.length === 0) {
    return DEFAULT_STATUS
  }

  const allCompleted = legacyTodos.every((todo) => !!todo?.completed)
  return allCompleted ? 'success' : DEFAULT_STATUS
}

const normalizeNode = (node: any): TodoNode => {
  const status: NodeStatus =
    node?.status === 'success' || node?.status === 'failed' || node?.status === 'pending'
      ? node.status
      : deriveStatusFromLegacyTodos(node?.todos)

  const root =
    typeof node?.isRoot === 'boolean'
      ? node.isRoot
      : node?.id === 'root' || ROOT_TITLES.has(node?.title)

  return {
    id: node?.id?.toString() ?? Date.now().toString(),
    title: typeof node?.title === 'string' ? node.title : 'Untitled',
    position:
      node?.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
        ? node.position
        : { x: 0, y: 0 },
    status,
    isRoot: root,
  }
}

const normalizeNodes = (rawNodes: any[]): TodoNode[] => {
  const normalized = rawNodes.map((node) => normalizeNode(node))

  if (!normalized.some((node) => node.isRoot)) {
    if (normalized.length > 0) {
      normalized[0] = { ...normalized[0], isRoot: true }
    }
  }

  return normalized
}

interface StatusSummary {
  success: number
  failed: number
  pending: number
  total: number
}

export function BrainMap({ mapId, mapName, onRootTitleChange, onNodesChange }: BrainMapProps) {
  const [nodes, setNodes] = useState<TodoNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 })
  const [lastPanPoint, setLastPanPoint] = useState<Position>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [wasDragging, setWasDragging] = useState(false)
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dragRafRef = useRef<number | null>(null)
  const dragStateRef = useRef<{
    nodeId: string
    lastClient: Position
    pendingDelta: Position
  } | null>(null)

  const mapNameRef = useRef(mapName)
  useEffect(() => {
    mapNameRef.current = mapName
  }, [mapName])

  const getRootTitle = useCallback((overrideTitle?: string) => {
    const trimmedOverride = overrideTitle?.trim()
    if (trimmedOverride && trimmedOverride.length > 0) {
      return trimmedOverride
    }

    const rawMapName = mapNameRef.current
    const candidateMapName =
      typeof rawMapName === 'string' ? rawMapName : rawMapName != null ? String(rawMapName) : ''
    const trimmedMapName = candidateMapName.trim()
    if (trimmedMapName.length > 0) {
      return trimmedMapName
    }

    return 'My Tasks'
  }, [])

  const createRootNode = useCallback(
    (overrideTitle?: string) => {
      const rootTitle = getRootTitle(overrideTitle)
      const newNode: TodoNode = {
        id: Date.now().toString(),
        title: rootTitle,
        position: { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60 },
        status: DEFAULT_STATUS,
        isRoot: true,
      }

      setNodes([newNode])
      return newNode
    },
    [getRootTitle],
  )

  useBrainMapStorage({
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
  })

  const { connectedCountById, childrenById } = useMemo(() => {
    const counts = new Map<string, number>()
    const children = new Map<string, string[]>()

    const addChild = (parentId: string, childId: string) => {
      const list = children.get(parentId)
      if (list) list.push(childId)
      else children.set(parentId, [childId])
    }

    for (const conn of connections) {
      counts.set(conn.sourceId, (counts.get(conn.sourceId) ?? 0) + 1)
      counts.set(conn.targetId, (counts.get(conn.targetId) ?? 0) + 1)
      addChild(conn.sourceId, conn.targetId)
    }

    return { connectedCountById: counts, childrenById: children }
  }, [connections])

  const nodeById = useMemo(() => {
    const map = new Map<string, TodoNode>()
    for (const node of nodes) {
      map.set(node.id, node)
    }
    return map
  }, [nodes])

  const leafSummaryById = useMemo(() => {
    const memo = new Map<string, StatusSummary>()
    const visiting = new Set<string>()

    const empty = (): StatusSummary => ({ success: 0, failed: 0, pending: 0, total: 0 })

    const add = (acc: StatusSummary, child: StatusSummary): StatusSummary => ({
      success: acc.success + child.success,
      failed: acc.failed + child.failed,
      pending: acc.pending + child.pending,
      total: acc.total + child.total,
    })

    const fromStatus = (status: NodeStatus | undefined): StatusSummary => {
      if (status === 'success') return { success: 1, failed: 0, pending: 0, total: 1 }
      if (status === 'failed') return { success: 0, failed: 1, pending: 0, total: 1 }
      return { success: 0, failed: 0, pending: 1, total: 1 }
    }

    const compute = (nodeId: string): StatusSummary => {
      const cached = memo.get(nodeId)
      if (cached) return cached
      if (visiting.has(nodeId)) return empty()
      visiting.add(nodeId)

      const children = childrenById.get(nodeId) ?? []
      let summary: StatusSummary
      if (children.length === 0) {
        const node = nodeById.get(nodeId)
        summary = fromStatus(node?.status)
      } else {
        summary = children.reduce((acc, childId) => add(acc, compute(childId)), empty())
      }

      visiting.delete(nodeId)
      memo.set(nodeId, summary)
      return summary
    }

    for (const node of nodes) {
      compute(node.id)
    }
    return memo
  }, [nodes, nodeById, childrenById])

  // Add node at a specific angle from parent (free-form positioning)
  const addNodeAtAngle = (parentId: string, angle: number) => {
    const parentNode = nodes.find((node) => node.id === parentId)
    if (!parentNode) return

    // Get parent node size for proper offset calculation
    const parentConnectedCount = connectedCountById.get(parentId) ?? 0
    const parentSize = getNodeSize(parentNode, parentConnectedCount)

    // Calculate offset - distance from parent center to new node center
    const newNodeSize = 145 // Default size for new nodes
    const offset = parentSize.width / 2 + newNodeSize / 2 + 60 // Gap between nodes

    // Calculate new position based on angle
    const newPosition: Position = {
      x: parentNode.position.x + (parentSize.width - newNodeSize) / 2 + Math.cos(angle) * offset,
      y: parentNode.position.y + (parentSize.height - newNodeSize) / 2 + Math.sin(angle) * offset,
    }

    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: '',
      position: newPosition,
      status: DEFAULT_STATUS,
      isRoot: false,
    }

    // Create connection
    const newConnection: Connection = {
      id: `${parentNode.id}-${newNode.id}`,
      sourceId: parentNode.id,
      targetId: newNode.id,
    }

    setNodes((prev) => [...prev, newNode])
    setConnections((prev) => [...prev, newConnection])

    // Start editing the new node immediately
    setEditingNodeId(newNode.id)
  }

  // Add node at a specific screen position (drag-to-place)
  const addNodeAtPosition = (parentId: string, screenX: number, screenY: number) => {
    const parentNode = nodes.find((node) => node.id === parentId)
    if (!parentNode) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    // Convert screen coordinates to canvas coordinates
    const relX = screenX - rect.left
    const relY = screenY - rect.top
    const canvasX = (relX - pan.x) / zoom
    const canvasY = (relY - pan.y) / zoom

    // Center the new node on the cursor position
    const newNodeSize = 140
    const newPosition: Position = {
      x: canvasX - newNodeSize / 2,
      y: canvasY - newNodeSize / 2,
    }

    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: '',
      position: newPosition,
      status: DEFAULT_STATUS,
      isRoot: false,
    }

    // Create connection from parent to new node
    const newConnection: Connection = {
      id: `${parentNode.id}-${newNode.id}`,
      sourceId: parentNode.id,
      targetId: newNode.id,
    }

    setNodes((prev) => [...prev, newNode])
    setConnections((prev) => [...prev, newConnection])

    // Start editing the new node immediately
    setEditingNodeId(newNode.id)
  }

  // Handle node click - no longer opens dialog, just handles selection
  const handleNodeClick = (event: React.MouseEvent, node: TodoNode) => {
    event.preventDefault()
    event.stopPropagation()

    if (wasDragging) {
      return
    }

    // Don't do anything if clicking buttons or currently editing
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('input') || editingNodeId === node.id) {
      return
    }
  }

  // Start editing a node's title
  const startEditingNode = (nodeId: string) => {
    setEditingNodeId(nodeId)
  }

  const flushDrag = useCallback(() => {
    const dragState = dragStateRef.current
    if (!dragState) return

    const { nodeId, pendingDelta } = dragState
    if (pendingDelta.x === 0 && pendingDelta.y === 0) return

    dragState.pendingDelta = { x: 0, y: 0 }
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              position: {
                x: node.position.x + pendingDelta.x,
                y: node.position.y + pendingDelta.y,
              },
            }
          : node,
      ),
    )
  }, [])

  // Handle mouse move for dragging and panning
  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging && dragStateRef.current) {
      setWasDragging(true)

      const dragState = dragStateRef.current
      const dx = (event.clientX - dragState.lastClient.x) / zoom
      const dy = (event.clientY - dragState.lastClient.y) / zoom

      dragState.lastClient = { x: event.clientX, y: event.clientY }
      dragState.pendingDelta = {
        x: dragState.pendingDelta.x + dx,
        y: dragState.pendingDelta.y + dy,
      }

      if (dragRafRef.current == null) {
        dragRafRef.current = requestAnimationFrame(() => {
          dragRafRef.current = null
          flushDrag()
        })
      }
    }

    if (isPanning) {
      const dx = event.clientX - lastPanPoint.x
      const dy = event.clientY - lastPanPoint.y

      setPan((prevPan: Position) => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy,
      }))

      setLastPanPoint({ x: event.clientX, y: event.clientY })
    }
  }

  const handleMouseDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const nodeElement = target.closest('[data-component-name="NodeComponent"]')

    if (!nodeElement && !target.closest('button') && !target.closest('input')) {
      setIsPanning(true)
      setLastPanPoint({ x: event.clientX, y: event.clientY })
      event.preventDefault()
    }
  }

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false)
      setDraggingNodeId(null)
      dragStateRef.current = null
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current)
        dragRafRef.current = null
      }

      if (wasDragging) {
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current)
        }
        dragTimeoutRef.current = setTimeout(() => {
          setWasDragging(false)
        }, 100)
      }
    }

    if (isPanning) {
      setIsPanning(false)
    }
  }

  const handleStartDrag = (node: TodoNode, event: React.MouseEvent) => {
    event.stopPropagation()
    setWasDragging(false)
    setIsDragging(true)
    setDraggingNodeId(node.id)
    dragStateRef.current = {
      nodeId: node.id,
      lastClient: { x: event.clientX, y: event.clientY },
      pendingDelta: { x: 0, y: 0 },
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    handleMouseDown(event)
  }

  const handleCanvasClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    if (
      target.closest('[data-component-name="NodeComponent"]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.tagName.toLowerCase() === 'input' ||
      target.tagName.toLowerCase() === 'form'
    ) {
      return
    }

    // Click on empty canvas clears editing mode
    if (editingNodeId) {
      setEditingNodeId(null)
    }
  }

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault()

    // Smooth zoom: proportional to scroll amount with damping
    const scrollDelta = event.deltaY
    const zoomSensitivity = 0.001 // Lower = smoother
    const dampingFactor = 0.5 // Reduces large jumps

    // Calculate proportional zoom change (negative deltaY = zoom in)
    let zoomChange = -scrollDelta * zoomSensitivity * zoom * dampingFactor

    // Clamp the zoom change to prevent huge jumps
    zoomChange = Math.max(-0.15, Math.min(0.15, zoomChange))

    const newZoom = Math.max(0.1, Math.min(3, zoom + zoomChange))

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top

    const scaleChange = newZoom / zoom

    const newPanX = (mouseX - pan.x) * (1 - scaleChange) + pan.x
    const newPanY = (mouseY - pan.y) * (1 - scaleChange) + pan.y

    setPan({ x: newPanX, y: newPanY })
    setZoom(newZoom)
  }

  const zoomIn = () => {
    setZoom((prev) => Math.min(3, prev + 0.1))
  }

  const zoomOut = () => {
    setZoom((prev) => Math.max(0.1, prev - 0.1))
  }

  const resetView = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }

  const updateNodeTitle = (nodeId: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim()
    let rootRenamed = false
    let mappedRootTitle: string | null = null

    setNodes((prev) =>
      prev.map((node) => {
        if (node.id !== nodeId) return node

        const root = isRootNode(node)
        if (root) {
          rootRenamed = true
          const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : getRootTitle()
          mappedRootTitle = nextTitle
          return { ...node, title: nextTitle, isRoot: true }
        }

        return {
          ...node,
          title: trimmedTitle.length > 0 ? trimmedTitle : 'Untitled',
          isRoot: false,
        }
      }),
    )

    if (rootRenamed && mappedRootTitle && onRootTitleChange) {
      onRootTitleChange(mappedRootTitle)
    }
  }

  const updateNodeStatus = (nodeId: string, status: NodeStatus) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId ? { ...node, status, isRoot: isRootNode(node) } : node,
      ),
    )
  }

  const deleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId))
    setConnections((prev) =>
      prev.filter((conn) => conn.sourceId !== nodeId && conn.targetId !== nodeId),
    )
    setEditingNodeId(null)
  }

  const resetBrainMap = () => {
    const rootTitle = getRootTitle()
    const rootNode: TodoNode = {
      id: Date.now().toString(),
      title: rootTitle,
      position: {
        x: window.innerWidth / 2 - 60,
        y: window.innerHeight / 2 - 60,
      },
      status: DEFAULT_STATUS,
      isRoot: true,
    }

    setConnections([])
    setEditingNodeId(null)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setNodes([rootNode])

    onRootTitleChange?.(rootTitle)
  }

  // Render connections as SVG lines
  const getEllipseEdge = (w: number, h: number, angle: number) => {
    const a = w / 2 - 2
    const b = h / 2 - 2
    return (a * b) / Math.sqrt(Math.pow(b * Math.cos(angle), 2) + Math.pow(a * Math.sin(angle), 2))
  }

  const renderConnections = () => {
    if (connections.length === 0) return null

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 1,
        }}
      >
        {connections.map((conn) => {
          const sourceNode = nodes.find((node) => node.id === conn.sourceId)
          const targetNode = nodes.find((node) => node.id === conn.targetId)

          if (!sourceNode || !targetNode) return null

          const sourceConnectedCount = connectedCountById.get(sourceNode.id) ?? 0
          const targetConnectedCount = connectedCountById.get(targetNode.id) ?? 0

          const sourceSize = getNodeSize(sourceNode, sourceConnectedCount)
          const targetSize = getNodeSize(targetNode, targetConnectedCount)

          // Calculate centers based on width/height
          const startX = sourceNode.position.x + sourceSize.width / 2
          const startY = sourceNode.position.y + sourceSize.height / 2
          const endX = targetNode.position.x + targetSize.width / 2
          const endY = targetNode.position.y + targetSize.height / 2

          const dx = endX - startX
          const dy = endY - startY
          const distance = Math.sqrt(dx * dx + dy * dy)
          if (distance === 0) return null

          // Use elliptical edge calculation for non-square nodes
          const sourceAngle = Math.atan2(dy, dx)
          const targetAngle = Math.atan2(-dy, -dx)

          const sourceRadius = getEllipseEdge(sourceSize.width, sourceSize.height, sourceAngle)
          const targetRadius = getEllipseEdge(targetSize.width, targetSize.height, targetAngle)

          const startPointX = startX + (dx / distance) * sourceRadius
          const startPointY = startY + (dy / distance) * sourceRadius
          const endPointX = endX - (dx / distance) * targetRadius
          const endPointY = endY - (dy / distance) * targetRadius

          return (
            <line
              key={conn.id}
              x1={startPointX}
              y1={startPointY}
              x2={endPointX}
              y2={endPointY}
              stroke="#60a5fa"
              strokeWidth={3}
              strokeLinecap="round"
              style={{
                filter: 'drop-shadow(0 2px 4px rgba(96, 165, 250, 0.3))',
              }}
            />
          )
        })}
      </svg>
    )
  }

  // Render each node with its NodeComponent
  const renderNodes = () => {
    return nodes.map((node) => {
      const connectedNodesCount = connectedCountById.get(node.id) ?? 0
      const hasChildren = (childrenById.get(node.id)?.length ?? 0) > 0
      const statusSummary = (isRootNode(node) || hasChildren) ? leafSummaryById.get(node.id) : undefined
      const nodeSize = getNodeSize(node, connectedNodesCount)

      return (
        <NodeComponent
          key={node.id}
          node={node}
          isConnecting={false}
          isDragging={isDragging && draggingNodeId === node.id}
          isEditing={editingNodeId === node.id}
          connectedNodesCount={connectedNodesCount}
          statusSummary={statusSummary}
          hasChildren={hasChildren}
          nodeWidth={nodeSize.width}
          nodeHeight={nodeSize.height}
          onClick={(e) => handleNodeClick(e, node)}
          onStartDrag={(node: TodoNode, event: React.MouseEvent) => handleStartDrag(node, event)}
          onStatusChange={(status: NodeStatus) => updateNodeStatus(node.id, status)}
          onAddNodeAtAngle={(angle: number) => addNodeAtAngle(node.id, angle)}
          onAddNodeAtPosition={(screenX: number, screenY: number) =>
            addNodeAtPosition(node.id, screenX, screenY)
          }
          onTitleChange={(title: string) => updateNodeTitle(node.id, title)}
          onStartEditing={() => startEditingNode(node.id)}
          onFinishEditing={() => setEditingNodeId(null)}
          onDeleteNode={() => deleteNode(node.id)}
        />
      )
    })
  }

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current)
      }
      if (dragRafRef.current != null) {
        cancelAnimationFrame(dragRafRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={canvasRef}
      className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      style={{
        cursor: isPanning ? 'grabbing' : 'grab',
      }}
      data-component-name="BrainMap"
    >
      {/* Background grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.15) 1px, transparent 1px),
                           radial-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px, ${10 * zoom}px ${10 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`
        }}
      />

      {/* Subtle ambient light effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Zoom controls */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        <div className="flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <Button
            size="icon"
            onClick={zoomIn}
            className="h-12 w-12 min-w-[48px] min-h-[48px] rounded-xl bg-transparent hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-all touch-manipulation"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <div className="h-px bg-slate-700/50 mx-2" />
          <Button
            size="icon"
            onClick={zoomOut}
            className="h-12 w-12 min-w-[48px] min-h-[48px] rounded-xl bg-transparent hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-all touch-manipulation"
          >
            <Minus className="h-5 w-5" />
          </Button>
          <div className="h-px bg-slate-700/50 mx-2" />
          <Button
            size="icon"
            onClick={resetView}
            className="h-12 w-12 min-w-[48px] min-h-[48px] rounded-xl bg-transparent hover:bg-white/10 active:bg-white/20 text-slate-300 hover:text-white transition-all touch-manipulation"
          >
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
        <div className="text-center text-xs text-slate-500 font-medium">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Reset button */}
      <div className="fixed top-6 right-6 z-50">
        <Button
          onClick={resetBrainMap}
          className="bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/30 backdrop-blur-sm rounded-xl px-5 py-3 min-h-[44px] text-sm transition-all touch-manipulation"
        >
          Sıfırla
        </Button>
      </div>

      {/* Node container with transform */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          transition: isPanning || isDragging ? 'none' : 'transform 0.08s ease-out',
        }}
        data-component-name="BrainMap"
      >
        {/* Render all connections first */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {renderConnections()}
        </div>

        {/* Render all nodes on top */}
        <div className="absolute inset-0" style={{ zIndex: 10 }}>
          {renderNodes()}
        </div>
      </div>
    </div>
  )
}
