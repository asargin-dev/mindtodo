import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, Maximize } from 'lucide-react';
import { Button } from './ui/button';
import { TodoNode, Connection, TodoItem } from '../types';
import { NodeComponent } from './NodeComponent';
import { TodoDialog } from './TodoDialog';

interface Position {
  x: number;
  y: number;
}

export function BrainMap() {
  const [nodes, setNodes] = useState<TodoNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<TodoNode | null>(null);
  const [connectingMode, setConnectingMode] = useState<string | null>(null);
  const [showTodoDialog, setShowTodoDialog] = useState(false);
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

  // Load nodes and connections from localStorage on initial render
  useEffect(() => {
    const savedNodes = localStorage.getItem('brainmap-nodes');
    const savedConnections = localStorage.getItem('brainmap-connections');
    
    if (savedNodes) {
      try {
        const parsedNodes = JSON.parse(savedNodes);
        setNodes(parsedNodes);
      } catch (e) {
        console.error('Error parsing saved nodes:', e);
        // Hata durumunda otomatik olarak My Tasks oluştur
        createRootNode('My Tasks');
      }
    } else {
      // Kayıtlı node yoksa otomatik olarak My Tasks oluştur
      createRootNode('My Tasks');
    }
    
    if (savedConnections) {
      try {
        const parsedConnections = JSON.parse(savedConnections);
        setConnections(parsedConnections);
      } catch (e) {
        console.error('Error parsing saved connections:', e);
      }
    }
  }, []);

  // Save to localStorage whenever nodes or connections change
  useEffect(() => {
    if (nodes.length > 0) {
      localStorage.setItem('brainmap-nodes', JSON.stringify(nodes));
    }
    if (connections.length > 0) {
      localStorage.setItem('brainmap-connections', JSON.stringify(connections));
    }
  }, [nodes, connections]);

  const createRootNode = (title: string) => {
    const newNode: TodoNode = {
      id: Date.now().toString(),
      title,
      position: { x: window.innerWidth / 2 - 60, y: window.innerHeight / 2 - 60 },
      todos: []
    };
    
    setNodes([newNode]);
  };

  const addNode = (parentId: string) => {
    const parentNode = nodes.find(node => node.id === parentId);
    if (!parentNode) return;
    
    // Position the new node near the parent node but with some offset
    const offset = Math.random() * 150 + 100;
    const angle = Math.random() * Math.PI * 2;
    
    const newNode: TodoNode = {
      id: Date.now().toString(),
      title: 'New Node',
      position: {
        x: parentNode.position.x + offset * Math.cos(angle),
        y: parentNode.position.y + offset * Math.sin(angle)
      },
      todos: []
    };
    
    // Create a connection from parent to new node
    const newConnection: Connection = {
      id: `${parentNode.id}-${newNode.id}`,
      sourceId: parentNode.id,
      targetId: newNode.id
    };
    
    setNodes(prev => [...prev, newNode]);
    setConnections(prev => [...prev, newConnection]);
    
    // Yeni node oluşturulduktan sonra dialog'u aç
    setSelectedNode(newNode);
    setShowTodoDialog(true);
  };

  // Start connecting mode on a node
  const startConnecting = (node: TodoNode) => {
    setConnectingMode(node.id);
  };

  // Create a connection between two nodes
  // This function is now unused as we handle connections directly in handleNodeClick
  // const completeConnection = (source: TodoNode, target: TodoNode) => {
  //   const connectionExists = connections.some(conn => 
  //     (conn.sourceId === source.id && conn.targetId === target.id) ||
  //     (conn.sourceId === target.id && conn.targetId === source.id)
  //   );
    
  //   if (!connectionExists) {
  //     const newConnection: Connection = {
  //       id: `${source.id}-${target.id}`,
  //       sourceId: source.id,
  //       targetId: target.id
  //     };
      
  //     setConnections(prev => [...prev, newConnection]);
  //   }
  // };

  // Handle node click - either open dialog or complete connection
  const handleNodeClick = (event: React.MouseEvent, node: TodoNode) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Sadece gerçekten sürükleme olduysa click'i ignore et
    if (wasDragging) {
      return;
    }

    // Check if this is a root node
    const isRootNode = node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';

    // If we're in connecting mode, handle connection logic
    if (connectingMode) {
      if (connectingMode === node.id) {
        setConnectingMode(null);
        return;
      }

      // Create new connection
      const newConnection: Connection = {
        id: `${connectingMode}-${node.id}`,
        sourceId: connectingMode,
        targetId: node.id
      };

      // Check if connection already exists
      const connectionExists = connections.some(
        conn => 
          (conn.sourceId === connectingMode && conn.targetId === node.id) ||
          (conn.sourceId === node.id && conn.targetId === connectingMode)
      );

      if (!connectionExists) {
        setConnections(prev => [...prev, newConnection]);
      }
      
      setConnectingMode(null);
    } else {
      // Eğer tıklanan element button değilse dialog'u aç
      const target = event.target as HTMLElement;
      if (!target.closest('button')) {
        // Only open todo dialog if it's not a root node
        if (!isRootNode) {
          setSelectedNode(node);
          setShowTodoDialog(true);
        }
      }
    }
  };

  // Handle mouse move for dragging and panning
  const handleMouseMove = (event: React.MouseEvent) => {
    if (isDragging && dragNode) {
      // Mouse hareket ettiğinde wasDragging'i true yap
      setWasDragging(true);
      
      // Calculate the movement delta
      const dx = (event.clientX - initialClickPos.x) / zoom;
      const dy = (event.clientY - initialClickPos.y) / zoom;
      
      // Update node position immediately using transform
      const nodeElement = document.querySelector(`[data-node-id="${dragNode.id}"]`);
      if (nodeElement) {
        (nodeElement as HTMLElement).style.transform = `translate(${dx}px, ${dy}px)`;
      }
      
      // Update the state
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
    
    // Handle canvas panning
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

  // Handle mouse down event
  const handleMouseDown = (event: React.MouseEvent) => {
    // Get the element that was clicked
    const target = event.target as HTMLElement;
    
    // Get the closest node component (if any)
    const nodeElement = target.closest('[data-component-name="NodeComponent"]');
    
    // If not clicking on a node or button, start panning
    if (!nodeElement && !target.closest('button')) {
      setIsPanning(true);
      setLastPanPoint({ x: event.clientX, y: event.clientY });
      event.preventDefault();
    }
  };

  // End dragging or panning
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragNode(null);
      
      // Eğer gerçekten sürükleme olduysa (wasDragging true ise)
      if (wasDragging) {
        // Önceki timeout'u temizle
        if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
        }
        // Yeni timeout oluştur
        dragTimeoutRef.current = setTimeout(() => {
          setWasDragging(false);
        }, 100);
      }
    }
    
    if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleStartDrag = (node: TodoNode, event: React.MouseEvent) => {
    event.stopPropagation();
    // Mouse hareket etmeye başlamadan önce wasDragging'i false yap
    setWasDragging(false);
    setDragNode(node);
    setInitialClickPos({ x: event.clientX, y: event.clientY });
    setIsDragging(true);
  };

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    handleMouseDown(event);
  };

  // Handle canvas click - REMOVED automatic node creation
  const handleCanvasClick = (event: React.MouseEvent) => {
    // We no longer create nodes on canvas clicks
    // Instead, we now only handle connecting mode here
    
    // Don't do anything if there's a todo dialog open
    if (showTodoDialog) {
      return;
    }
    
    // Check if we're clicking on a node, button, or dialog element
    const target = event.target as HTMLElement;
    if (
      target.closest('.TodoDialog') || 
      target.closest('[data-component-name="NodeComponent"]') || 
      target.closest('button') ||
      target.tagName.toLowerCase() === 'input' ||
      target.tagName.toLowerCase() === 'form'
    ) {
      return;
    }
    
    // If we're in connecting mode, exit it when clicking on empty canvas
    if (connectingMode) {
      setConnectingMode(null);
    }
    
    // We no longer create nodes on canvas clicks
    // addNodeAtPosition(clickPosition);
  };

  const handleWheel = (event: React.WheelEvent) => {
    event.preventDefault();
    
    // Calculate new zoom level
    const delta = event.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.max(0.1, Math.min(3, zoom + delta));
    
    // Get mouse position relative to the canvas
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    // Calculate how the point under the mouse should move to stay in the same position after zoom
    const scaleChange = newZoom / zoom;
    
    // Adjust pan to keep the point under mouse in the same position
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
    setNodes(prev => 
      prev.map(node => 
        node.id === nodeId ? { ...node, title: newTitle } : node
      )
    );
  };

  const updateNodeTodos = (nodeId: string, todos: TodoItem[]) => {
    setNodes(prev => 
      prev.map(node => 
        node.id === nodeId ? { ...node, todos } : node
      )
    );
  };

  const deleteNode = (nodeId: string) => {
    // Delete the node
    setNodes(prev => prev.filter(node => node.id !== nodeId));
    
    // Delete all connections connected to this node
    setConnections(prev => 
      prev.filter(conn => conn.sourceId !== nodeId && conn.targetId !== nodeId)
    );
    
    setShowTodoDialog(false);
  };

  const resetBrainMap = () => {
    // Create a new root node positioned in the center of the screen
    const rootNode: TodoNode = {
      id: Date.now().toString(), // Use timestamp to ensure unique ID
      title: 'My Tasks',
      position: { 
        x: window.innerWidth / 2 - 60, 
        y: window.innerHeight / 2 - 60 
      },
      todos: []
    };
    
    // Clear all state in a specific order
    setConnections([]);
    setSelectedNode(null);
    setConnectingMode(null);
    setShowTodoDialog(false);
    
    // Reset view parameters
    setZoom(1);
    setPan({ x: 0, y: 0 });
    
    // Set the new node last to trigger a re-render
    setNodes([rootNode]);
    
    // Update localStorage with the reset state
    localStorage.removeItem('brainmap-nodes');
    localStorage.removeItem('brainmap-connections');
    localStorage.setItem('brainmap-nodes', JSON.stringify([rootNode]));
    localStorage.setItem('brainmap-connections', JSON.stringify([]));
    
    console.log('Brain map reset!', rootNode);
  };

  const calculateAllConnectedTodos = (nodeId: string, visited = new Set<string>()): { completed: number, total: number } => {
    if (visited.has(nodeId)) return { completed: 0, total: 0 };
    visited.add(nodeId);
    
    // Get the current node
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return { completed: 0, total: 0 };
    
    // Initialize counters with current node's todos
    let totalTodos = currentNode.todos?.length || 0;
    let completedTodos = currentNode.todos?.filter(todo => todo.completed).length || 0;
    
    // Get all connections for this node
    const directConnections = connections
      .filter(conn => conn.sourceId === nodeId || conn.targetId === nodeId)
      .map(conn => conn.sourceId === nodeId ? conn.targetId : conn.sourceId);
      
    // Recursively get todos from all connected nodes
    for (const connectedNodeId of directConnections) {
      if (!visited.has(connectedNodeId)) {
        const { total, completed } = calculateAllConnectedTodos(connectedNodeId, visited);
        totalTodos += total;
        completedTodos += completed;
      }
    }
    
    return { completed: completedTodos, total: totalTodos };
  };

  // Render connections as SVG lines
  const renderConnections = () => {
    return connections.map(conn => {
      const sourceNode = nodes.find(node => node.id === conn.sourceId);
      const targetNode = nodes.find(node => node.id === conn.targetId);
      
      if (!sourceNode || !targetNode) return null;
      
      // Root node için özel boyut hesaplama
      const isSourceRoot = sourceNode.id === 'root' || sourceNode.title === 'My Tasks' || sourceNode.title === 'Work' || sourceNode.title === 'Personal';
      const isTargetRoot = targetNode.id === 'root' || targetNode.title === 'My Tasks' || targetNode.title === 'Work' || targetNode.title === 'Personal';
      
      // Boyutları NodeComponent ile senkronize et
      const sourceSize = isSourceRoot 
        ? Math.max(180, 180 + ((sourceNode.todos?.length || 0) * 10))
        : Math.max(120, 120 + ((sourceNode.todos?.length || 0) * 10));
      
      const targetSize = isTargetRoot 
        ? Math.max(180, 180 + ((targetNode.todos?.length || 0) * 10))
        : Math.max(120, 120 + ((targetNode.todos?.length || 0) * 10));
      
      // Calculate center points
      const startX = sourceNode.position.x + (sourceSize / 2);
      const startY = sourceNode.position.y + (sourceSize / 2);
      const endX = targetNode.position.x + (targetSize / 2);
      const endY = targetNode.position.y + (targetSize / 2);
      
      // Calculate direction vector
      const dx = endX - startX;
      const dy = endY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Daha hassas radius hesaplaması
      const sourceRadius = (sourceSize / 2) - 2; // 2px offset ekle
      const targetRadius = (targetSize / 2) - 2; // 2px offset ekle
      
      // Adjust start and end points with more precise calculation
      const startPointX = startX + (dx / distance) * sourceRadius;
      const startPointY = startY + (dy / distance) * sourceRadius;
      const endPointX = endX - (dx / distance) * targetRadius;
      const endPointY = endY - (dy / distance) * targetRadius;
      
      return (
        <svg 
          key={conn.id} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1
          }}
        >
          <line
            x1={startPointX}
            y1={startPointY}
            x2={endPointX}
            y2={endPointY}
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray={connectingMode ? "5,5" : "none"}
          />
        </svg>
      );
    });
  };

  // Temporary line when in connecting mode
  const renderTempConnection = () => {
    if (!connectingMode) return null;
    
    const sourceNode = nodes.find(node => node.id === connectingMode);
    if (!sourceNode) return null;
    
    const sourceSize = Math.min(1.8, 1 + (sourceNode.todos.length * 0.1)) * 120;
    const startX = sourceNode.position.x + sourceSize / 2;
    const startY = sourceNode.position.y + sourceSize / 2;
    
    // Get current mouse position for the end of the temp connection
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    
    const mouseX = rect.left + rect.width / 2; 
    const mouseY = rect.top + rect.height / 2; 
    
    // Calculate direction vector
    const dx = mouseX - startX;
    const dy = mouseY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Adjust start point to be on the edge of the circular node
    const sourceRadius = sourceSize / 2;
    const startPointX = startX + (dx / distance) * sourceRadius;
    const startPointY = startY + (dy / distance) * sourceRadius;
    
    return (
      <svg 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1
        }}
      >
        <line
          x1={startPointX}
          y1={startPointY}
          x2={mouseX}
          y2={mouseY}
          stroke="#94a3b8"
          strokeWidth={2}
          strokeDasharray="5,5"
        />
      </svg>
    );
  };

  // Render each node with its NodeComponent
  const renderNodes = () => {
    return nodes.map(node => {
      const connectedNodesCount = connections.filter(
        conn => conn.sourceId === node.id || conn.targetId === node.id
      ).length;
      
      const isRootNode = node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';
      
      let connectedNodesTodos = { completed: 0, total: 0 };
      
      if (isRootNode) {
        // Calculate todos from all connected nodes
        connectedNodesTodos = calculateAllConnectedTodos(node.id);
        
        // Add todos from the root node itself
        if (node.todos && node.todos.length > 0) {
          connectedNodesTodos.total += node.todos.length;
          connectedNodesTodos.completed += node.todos.filter(todo => todo.completed).length;
        }
      }
      
      return (
        <NodeComponent
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          isConnecting={connectingMode !== null}
          isDragging={isDragging && dragNode?.id === node.id}
          connectedNodesCount={connectedNodesCount}
          connectedNodesTodos={connectedNodesTodos}
          onClick={(e) => handleNodeClick(e, node)}
          onStartDrag={(node: TodoNode, event: React.MouseEvent) => handleStartDrag(node, event)}
          onAddNode={() => addNode(node.id)}
          onConnect={() => startConnecting(node)}
        />
      );
    });
  };

  // showStartScreen ile ilgili render kısmını kaldıralım
  // if (showStartScreen) { ... } bloğunu tamamen silelim

  // Component unmount olduğunda timeout'u temizle
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
      className="fixed inset-0 overflow-hidden bg-gray-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleCanvasMouseDown}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      style={{
        cursor: connectingMode ? 'crosshair' : (isPanning ? 'grabbing' : 'grab')
      }}
      data-component-name="BrainMap"
    >
      {/* Background grid pattern with zoom effect */}
      <div 
        className="absolute inset-0" 
        style={{ 
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), 
                           radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px, ${10 * zoom}px ${10 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px, ${pan.x}px ${pan.y}px`
        }}
      />
      
      {/* Zoom controls */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-2 z-50">
        <Button 
          size="icon"
          onClick={zoomIn} 
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          onClick={zoomOut}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button 
          size="icon" 
          onClick={resetView}
          className="bg-gray-800 hover:bg-gray-700 text-white"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Reset button */}
      <div className="fixed top-6 right-6 z-50">
        <Button 
          onClick={resetBrainMap}
          variant="destructive"
        >
          Reset Brain Map
        </Button>
      </div>
      
      {/* Node container with transform */}
      <div
        ref={nodeContainerRef}
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
        data-component-name="BrainMap"
      >
        {/* Render all connections first (lower z-index) */}
        <div className="absolute inset-0" style={{ zIndex: 1 }}>
          {renderConnections()}
          {renderTempConnection()}
        </div>
        
        {/* Render all nodes on top (higher z-index) */}
        <div className="absolute inset-0" style={{ zIndex: 10 }}>
          {renderNodes()}
        </div>
      </div>
      
      {/* Todo Dialog */}
      {showTodoDialog && selectedNode && (
        <TodoDialog
          node={selectedNode}
          onClose={() => {
            setShowTodoDialog(false);
            setSelectedNode(null);
          }}
          onUpdateTitle={(title: string) => updateNodeTitle(selectedNode.id, title)}
          onUpdateTodos={(todos: TodoItem[]) => updateNodeTodos(selectedNode.id, todos)}
          onDeleteNode={() => deleteNode(selectedNode.id)}
        />
      )}
    </div>
  );
}
