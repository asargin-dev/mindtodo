import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import { TodoNode, Connection, NodeStatus } from '../types';
import { NodeComponent } from './NodeComponent';

interface Position {
  x: number;
  y: number;
}

interface BrainMapProps {
  mapId: string;
  mapName: string;
  onRootTitleChange?: (title: string) => void;
  onNodesChange?: () => void;
}

const ROOT_TITLES = new Set(['My Tasks', 'Work', 'Personal']);
const DEFAULT_STATUS: NodeStatus = 'pending';

const isRootNode = (node: TodoNode) => {
  if (typeof node.isRoot === 'boolean') {
    return node.isRoot;
  }
  return node.id === 'root' || ROOT_TITLES.has(node.title);
};

const deriveStatusFromLegacyTodos = (legacyTodos: any[]): NodeStatus => {
  if (!Array.isArray(legacyTodos) || legacyTodos.length === 0) {
    return DEFAULT_STATUS;
  }

  const allCompleted = legacyTodos.every((todo) => !!todo?.completed);
  return allCompleted ? 'success' : DEFAULT_STATUS;
};

const normalizeNode = (node: any): TodoNode => {
  const status: NodeStatus =
    node?.status === 'success' || node?.status === 'failed' || node?.status === 'pending'
      ? node.status
      : deriveStatusFromLegacyTodos(node?.todos);

  const isRoot =
    typeof node?.isRoot === 'boolean'
      ? node.isRoot
      : node?.id === 'root' || ROOT_TITLES.has(node?.title);

  return {
    id: node?.id?.toString() ?? Date.now().toString(),
    title: typeof node?.title === 'string' ? node.title : 'Untitled',
    position:
      node?.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
        ? node.position
        : { x: 0, y: 0 },
    status,
    isRoot,
  };
};

const normalizeNodes = (rawNodes: any[]): TodoNode[] => {
  const normalized = rawNodes.map((node) => normalizeNode(node));

  if (!normalized.some((node) => node.isRoot)) {
    if (normalized.length > 0) {
      normalized[0] = { ...normalized[0], isRoot: true };
    }
  }

  return normalized;
};

interface StatusSummary {
  success: number;
  failed: number;
  pending: number;
  total: number;
}

export function BrainMap({ mapId, mapName, onRootTitleChange, onNodesChange }: BrainMapProps) {
  const [nodes, setNodes] = useState<TodoNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodeContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragNode, setDragNode] = useState<TodoNode | null>(null);
  const [initialClickPos, setInitialClickPos] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [lastPanPoint, setLastPanPoint] = useState<Position>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [wasDragging, setWasDragging] = useState(false);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mapNameRef = useRef(mapName);
  useEffect(() => {
    mapNameRef.current = mapName;
  }, [mapName]);

  const getRootTitle = (overrideTitle?: string) => {
    const trimmedOverride = overrideTitle?.trim();
    if (trimmedOverride && trimmedOverride.length > 0) {
      return trimmedOverride;
    }

    const rawMapName = mapNameRef.current;
    const candidateMapName =
      typeof rawMapName === 'string' ? rawMapName : rawMapName != null ? String(rawMapName) : '';
    const trimmedMapName = candidateMapName.trim();
    if (trimmedMapName.length > 0) {
      return trimmedMapName;
    }

    return 'My Tasks';
  };

  // Helper keys scoped per map
  const nodesKey = `brainmap-${mapId}-nodes`;
  const connectionsKey = `brainmap-${mapId}-connections`;

  // Load nodes and connections from localStorage on initial render
  useEffect(() => {
    const savedNodes = localStorage.getItem(nodesKey);
    const savedConnections = localStorage.getItem(connectionsKey);

    if (savedNodes) {
      try {
        const parsedNodes = JSON.parse(savedNodes);
        const normalized = normalizeNodes(parsedNodes);
        if (normalized.length > 0) {
          setNodes(normalized);

          if (onRootTitleChange) {
            const rootCandidate = normalized.find((node: TodoNode) => node.isRoot ?? isRootNode(node));
            const normalizedRootTitle = rootCandidate?.title?.trim();
            const normalizedMapName = mapName?.trim();

            if (
              normalizedRootTitle &&
              (!normalizedMapName || normalizedRootTitle !== normalizedMapName)
            ) {
              onRootTitleChange(normalizedRootTitle);
            }
          }
        } else {
          createRootNode();
        }
      } catch (e) {
        console.error('Error parsing saved nodes:', e);
        createRootNode();
      }
    } else {
      createRootNode();
    }

    if (savedConnections) {
      try {
        const parsedConnections = JSON.parse(savedConnections);
        setConnections(parsedConnections);
      } catch (e) {
        console.error('Error parsing saved connections:', e);
      }
    }
  }, [mapId, onRootTitleChange]);

  // Save to localStorage whenever nodes or connections change
  useEffect(() => {
    if (nodes.length > 0) {
      localStorage.setItem(nodesKey, JSON.stringify(nodes));
      // Notify parent AFTER localStorage is updated (so sidebar reads fresh data)
      onNodesChange?.();
    }
    if (connections.length > 0) {
      localStorage.setItem(connectionsKey, JSON.stringify(connections));
    }
  }, [nodes, connections, nodesKey, connectionsKey, onNodesChange]);

  const createRootNode = (overrideTitle?: string) => {
    const rootTitle = getRootTitle(overrideTitle);
    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: rootTitle,
      position: { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60 },
      status: DEFAULT_STATUS,
      isRoot: true,
    };

    setNodes([newNode]);
    return newNode;
  };

  // Add node at a specific angle from parent (free-form positioning)
  const addNodeAtAngle = (parentId: string, angle: number) => {
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return;

    // Get parent node size for proper offset calculation
    const parentConnectedCount = connections.filter(
      conn => conn.sourceId === parentId || conn.targetId === parentId
    ).length;
    const parentSize = getNodeSize(parentNode, parentConnectedCount);

    // Calculate offset - distance from parent center to new node center
    const newNodeSize = 140; // Default size for new nodes
    const offset = parentSize / 2 + newNodeSize / 2 + 60; // Gap between nodes

    // Calculate new position based on angle
    const newPosition: Position = {
      x: parentNode.position.x + (parentSize - newNodeSize) / 2 + Math.cos(angle) * offset,
      y: parentNode.position.y + (parentSize - newNodeSize) / 2 + Math.sin(angle) * offset
    };

    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: '',
      position: newPosition,
      status: DEFAULT_STATUS,
      isRoot: false,
    };

    // Create connection
    const newConnection: Connection = {
      id: `${parentNode.id}-${newNode.id}`,
      sourceId: parentNode.id,
      targetId: newNode.id
    };

    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, newConnection]);

    // Start editing the new node immediately
    setEditingNodeId(newNode.id);
  };

  // Add node at a specific screen position (drag-to-place)
  const addNodeAtPosition = (parentId: string, screenX: number, screenY: number) => {
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert screen coordinates to canvas coordinates
    const relX = screenX - rect.left;
    const relY = screenY - rect.top;
    const canvasX = (relX - pan.x) / zoom;
    const canvasY = (relY - pan.y) / zoom;

    // Center the new node on the cursor position
    const newNodeSize = 140;
    const newPosition: Position = {
      x: canvasX - newNodeSize / 2,
      y: canvasY - newNodeSize / 2
    };

    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: '',
      position: newPosition,
      status: DEFAULT_STATUS,
      isRoot: false,
    };

    // Create connection from parent to new node
    const newConnection: Connection = {
      id: `${parentNode.id}-${newNode.id}`,
      sourceId: parentNode.id,
      targetId: newNode.id
    };

    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, newConnection]);

    // Start editing the new node immediately
    setEditingNodeId(newNode.id);
  };

  // Handle node click - no longer opens dialog, just handles selection
  const handleNodeClick = (event: React.MouseEvent, node: TodoNode) => {
    event.preventDefault();
    event.stopPropagation();

    if (wasDragging) {
      return;
    }

    // Don't do anything if clicking buttons or currently editing
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || editingNodeId === node.id) {
      return;
    }
  };

  // Start editing a node's title
  const startEditingNode = (nodeId: string) => {
    setEditingNodeId(nodeId);
  };

  // Handle mouse move for dragging and panning
  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging && dragNode) {
      setWasDragging(true);

      const dx = (event.clientX - initialClickPos.x) / zoom;
      const dy = (event.clientY - initialClickPos.y) / zoom;

      const nodeElement = document.querySelector(`[data-node-id="${dragNode.id}"]`);
      if (nodeElement) {
        (nodeElement as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
      }

      setNodes(prev => prev.map(node =>
        node.id === dragNode.id
          ? {
              ...node,
              position: {
                x: dragNode.position.x + dx,
                y: dragNode.position.y + dy
              }
            }
          : node
      ));

      setInitialClickPos({ x: event.clientX, y: event.clientY });

      const updatedDragNode = {
        ...dragNode,
        position: {
          x: dragNode.position.x + dx,
          y: dragNode.position.y + dy
        }
      };
      setDragNode(updatedDragNode);
    }

    if (isPanning) {
      const dx = event.clientX - lastPanPoint.x;
      const dy = event.clientY - lastPanPoint.y;

      setPan((prevPan: Position) => ({
        x: prevPan.x + dx,
        y: prevPan.y + dy
      }));

      setLastPanPoint({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const nodeElement = target.closest('[data-component-name="NodeComponent"]');

    if (!nodeElement && !target.closest('button') && !target.closest('input')) {
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragNode(null);

      if (wasDragging) {
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        dragTimeoutRef.current = setTimeout(() => {
          setWasDragging(false);
        }, 100);
      }
    }

    if (isPanning) {
      setIsPanning(false);
    }
  };

  const getNodeSize = (node: TodoNode, connectedCount: number) => {
    const baseSize = isRootNode(node)
      ? Math.max(220, 200 + connectedCount * 22)
      : 140;

    const title = node.title ?? '';
    const normalizedTitle = title.trim();
    const totalLength = normalizedTitle.length;
    const longestWord = normalizedTitle.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);

    const lengthBoost = Math.max(totalLength - 18, 0) * 2.5;
    const wordBoost = Math.max(longestWord - 12, 0) * 6;
    const combinedBoost = Math.min(220, lengthBoost + wordBoost);

    return Math.min(420, baseSize + combinedBoost);
  };

  const handleStartDrag = (node: TodoNode, event: React.MouseEvent) => {
    event.stopPropagation();
    setWasDragging(false);
    setDragNode(node);
    setInitialClickPos({ x: event.clientX, y: event.clientY });
    setIsDragging(true);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    handleMouseDown(event);
  };

  const handleCanvasClick = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest('[data-component-name="NodeComponent"]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.tagName.toLowerCase() === 'input' ||
      target.tagName.toLowerCase() === 'form'
    ) {
      return;
    }

    // Click on empty canvas clears editing mode
    if (editingNodeId) {
      setEditingNodeId(null);
    }
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();

    // Smooth zoom: proportional to scroll amount with damping
    const scrollDelta = event.deltaY;
    const zoomSensitivity = 0.001; // Lower = smoother
    const dampingFactor = 0.5; // Reduces large jumps

    // Calculate proportional zoom change (negative deltaY = zoom in)
    let zoomChange = -scrollDelta * zoomSensitivity * zoom * dampingFactor;

    // Clamp the zoom change to prevent huge jumps
    zoomChange = Math.max(-0.15, Math.min(0.15, zoomChange));

    const newZoom = Math.max(0.1, Math.min(3, zoom + zoomChange));

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const scaleChange = newZoom / zoom;

    const newPanX = (mouseX - pan.x) * (1 - scaleChange) + pan.x;
    const newPanY = (mouseY - pan.y) * (1 - scaleChange) + pan.y;

    setPan({ x: newPanX, y: newPanY });
    setZoom(newZoom);
  };

  const zoomIn = () => {
    setZoom(prev => Math.min(3, prev + 0.1));
  };

  const zoomOut = () => {
    setZoom(prev => Math.max(0.1, prev - 0.1));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const updateNodeTitle = (nodeId: string, newTitle: string) => {
    const trimmedTitle = newTitle.trim();
    let rootRenamed = false;
    let mappedRootTitle: string | null = null;

    setNodes(prev =>
      prev.map(node => {
        if (node.id !== nodeId) {
          return node;
        }

        const isRoot = node.isRoot ?? isRootNode(node);

        if (isRoot) {
          rootRenamed = true;
          const nextTitle = trimmedTitle.length > 0 ? trimmedTitle : getRootTitle();
          mappedRootTitle = nextTitle;
          return { ...node, title: nextTitle, isRoot: true };
        }

        return { ...node, title: trimmedTitle.length > 0 ? trimmedTitle : 'Untitled', isRoot };
      })
    );

    if (rootRenamed && mappedRootTitle && onRootTitleChange) {
      onRootTitleChange(mappedRootTitle);
    }
  };

  const updateNodeStatus = (nodeId: string, status: NodeStatus) => {
    setNodes(prev =>
      prev.map(node =>
        node.id === nodeId
          ? { ...node, status, isRoot: node.isRoot ?? isRootNode(node) }
          : node
      )
    );
  };

  const deleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setConnections(prev =>
      prev.filter(conn => conn.sourceId !== nodeId && conn.targetId !== nodeId)
    );
    setEditingNodeId(null);
  };

  const resetBrainMap = () => {
    const rootTitle = getRootTitle();
    const rootNode: TodoNode = {
      id: Date.now().toString(),
      title: rootTitle,
      position: {
        x: window.innerWidth / 2 - 60,
        y: window.innerHeight / 2 - 60
      },
      status: DEFAULT_STATUS,
      isRoot: true,
    };

    setConnections([]);
    setEditingNodeId(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodes([rootNode]);

    localStorage.removeItem(nodesKey);
    localStorage.removeItem(connectionsKey);
    localStorage.setItem(nodesKey, JSON.stringify([rootNode]));
    localStorage.setItem(connectionsKey, JSON.stringify([]));

    if (onRootTitleChange) {
      onRootTitleChange(rootTitle);
    }
  };

  const calculateStatusSummary = (nodeId: string, visited = new Set<string>()): StatusSummary => {
    if (visited.has(nodeId)) {
      return { success: 0, failed: 0, pending: 0, total: 0 };
    }

    visited.add(nodeId);

    const currentNode = nodes.find((n) => n.id === nodeId);
    if (!currentNode) {
      return { success: 0, failed: 0, pending: 0, total: 0 };
    }

    const summary: StatusSummary = { success: 0, failed: 0, pending: 0, total: 0 };

    summary.total += 1;
    if (currentNode.status === 'success') {
      summary.success += 1;
    } else if (currentNode.status === 'failed') {
      summary.failed += 1;
    } else {
      summary.pending += 1;
    }

    const directConnections = connections
      .filter((conn) => conn.sourceId === nodeId || conn.targetId === nodeId)
      .map((conn) => (conn.sourceId === nodeId ? conn.targetId : conn.sourceId));

    for (const connectedNodeId of directConnections) {
      if (!visited.has(connectedNodeId)) {
        const childSummary = calculateStatusSummary(connectedNodeId, visited);
        summary.success += childSummary.success;
        summary.failed += childSummary.failed;
        summary.pending += childSummary.pending;
        summary.total += childSummary.total;
      }
    }

    return summary;
  };

  // Render connections as SVG lines
  const renderConnections = () => {
    if (connections.length === 0) return null;

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'visible',
          zIndex: 1
        }}
      >
        {connections.map(conn => {
          const sourceNode = nodes.find(node => node.id === conn.sourceId);
          const targetNode = nodes.find(node => node.id === conn.targetId);

          if (!sourceNode || !targetNode) return null;

          const sourceConnectedCount = connections.filter(
            connection => connection.sourceId === sourceNode.id || connection.targetId === sourceNode.id
          ).length;

          const targetConnectedCount = connections.filter(
            connection => connection.sourceId === targetNode.id || connection.targetId === targetNode.id
          ).length;

          const sourceSize = getNodeSize(sourceNode, sourceConnectedCount);
          const targetSize = getNodeSize(targetNode, targetConnectedCount);

          const startX = sourceNode.position.x + (sourceSize / 2);
          const startY = sourceNode.position.y + (sourceSize / 2);
          const endX = targetNode.position.x + (targetSize / 2);
          const endY = targetNode.position.y + (targetSize / 2);

          const dx = endX - startX;
          const dy = endY - startY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const sourceRadius = (sourceSize / 2) - 2;
          const targetRadius = (targetSize / 2) - 2;

          const startPointX = startX + (dx / distance) * sourceRadius;
          const startPointY = startY + (dy / distance) * sourceRadius;
          const endPointX = endX - (dx / distance) * targetRadius;
          const endPointY = endY - (dy / distance) * targetRadius;

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
                filter: 'drop-shadow(0 2px 4px rgba(96, 165, 250, 0.3))'
              }}
            />
          );
        })}
      </svg>
    );
  };

  // Render each node with its NodeComponent
  const renderNodes = () => {
    return nodes.map(node => {
      const connectedNodesCount = connections.filter(
        conn => conn.sourceId === node.id || conn.targetId === node.id
      ).length;

      const statusSummary = isRootNode(node) ? calculateStatusSummary(node.id) : undefined;
      const nodeSize = getNodeSize(node, connectedNodesCount);

      return (
        <NodeComponent
          key={node.id}
          node={node}
          isConnecting={false}
          isDragging={isDragging && dragNode?.id === node.id}
          isEditing={editingNodeId === node.id}
          connectedNodesCount={connectedNodesCount}
          statusSummary={statusSummary}
          size={nodeSize}
          onClick={(e) => handleNodeClick(e, node)}
          onStartDrag={(node: TodoNode, event: React.MouseEvent) => handleStartDrag(node, event)}
          onStatusChange={(status: NodeStatus) => updateNodeStatus(node.id, status)}
          onAddNodeAtAngle={(angle: number) => addNodeAtAngle(node.id, angle)}
          onAddNodeAtPosition={(screenX: number, screenY: number) => addNodeAtPosition(node.id, screenX, screenY)}
          onTitleChange={(title: string) => updateNodeTitle(node.id, title)}
          onStartEditing={() => startEditingNode(node.id)}
          onFinishEditing={() => setEditingNodeId(null)}
          onDeleteNode={() => deleteNode(node.id)}
        />
      );
    });
  };

  useEffect(() => {
    return () => {
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

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
        cursor: isPanning ? 'grabbing' : 'grab'
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
        <div className="flex flex-col gap-1 p-1.5 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-slate-700/50 shadow-xl">
          <Button
            size="icon"
            onClick={zoomIn}
            className="h-10 w-10 rounded-xl bg-transparent hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="h-px bg-slate-700/50 mx-2" />
          <Button
            size="icon"
            onClick={zoomOut}
            className="h-10 w-10 rounded-xl bg-transparent hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="h-px bg-slate-700/50 mx-2" />
          <Button
            size="icon"
            onClick={resetView}
            className="h-10 w-10 rounded-xl bg-transparent hover:bg-white/10 text-slate-300 hover:text-white transition-all"
          >
            <Maximize className="h-4 w-4" />
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
          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/30 backdrop-blur-sm rounded-xl px-4 py-2 text-sm transition-all"
        >
          Sıfırla
        </Button>
      </div>

      {/* Node container with transform */}
      <div
        ref={nodeContainerRef}
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
  );
}
