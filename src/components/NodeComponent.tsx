import React, { useState, useEffect } from 'react';
import { TodoNode, TodoItem } from '../types';
import { Button } from './ui/button';
import { Plus, Link } from 'lucide-react';

interface NodeComponentProps {
  node: TodoNode;
  isSelected: boolean;
  isConnecting: boolean;
  isDragging: boolean;
  connectedNodesCount: number;
  connectedNodesTodos?: { completed: number; total: number };
  onClick: (e: React.MouseEvent) => void;
  onStartDrag: (node: TodoNode, event: React.MouseEvent) => void;
  onAddNode: () => void;
  onConnect: () => void;
}

export function NodeComponent({
  node,
  isSelected,
  isConnecting,
  isDragging,
  connectedNodesCount,
  connectedNodesTodos = { completed: 0, total: 0 },
  onClick,
  onStartDrag,
  onAddNode,
  onConnect
}: NodeComponentProps) {
  // Check if this is a root node (has no incoming connections)
  const isRootNode = node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';
  
  // State for confetti
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Calculate node size based on todos count or connected nodes
  const todoCount = node.todos?.length || 0;
  const baseSize = isRootNode 
    ? Math.max(180, 180 + (connectedNodesCount * 20)) // Root node is always bigger
    : Math.max(120, 120 + (todoCount * 10)); // Normal nodes grow with todos
  
  // Calculate the fill percentage based on completed todos
  const completedTodos = node.todos?.filter((todo: TodoItem) => todo.completed).length || 0;
  
  // For root nodes, calculate fill based on all connected nodes' todos
  const fillPercentage = isRootNode 
    ? (connectedNodesTodos.total > 0 
        ? (connectedNodesTodos.completed / connectedNodesTodos.total) * 100 
        : 0)
    : (todoCount > 0 ? (completedTodos / todoCount) * 100 : 0);
  
  // Show confetti when root node is completed
  useEffect(() => {
    if (isRootNode && fillPercentage >= 100 && connectedNodesTodos.total > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isRootNode, fillPercentage, connectedNodesTodos.total]);

  return (
    <div
      className={`absolute select-none cursor-pointer transition-all duration-200 
        ${isSelected ? 'z-50' : 'z-20'}
        ${isDragging ? 'z-50' : ''}
        ${isConnecting ? 'hover:ring-2 hover:ring-green-400' : ''}
      `}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        width: `${baseSize}px`,
        height: `${baseSize}px`,
        transform: isSelected ? 'scale(1.05)' : 'scale(1)',
        transition: isDragging ? 'none' : 'all 0.2s ease', // Sürükleme sırasında transition'ı kaldır
      }}
      onClick={onClick}
      data-component-name="NodeComponent"
      data-node-id={node.id} // Node ID'sini ekleyelim
    >
      {/* Show confetti when completed */}
      {showConfetti && (
        <div className="absolute -top-20 -left-20 -right-20 -bottom-20 pointer-events-none z-50">
          <div className="absolute inset-0 animate-confetti-explosion">
            {Array.from({ length: 50 }).map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${Math.random() * 3 + 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Node circle with water fill effect */}
      <div 
        className="absolute inset-0 rounded-full overflow-hidden flex flex-col items-center justify-center" 
        style={{ 
          backgroundColor: isRootNode ? '#2D6A9F' : '#334155',
          boxShadow: isSelected 
            ? '0 0 0 4px rgba(59, 130, 246, 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.3)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
        }}
        onMouseDown={(e) => onStartDrag(node, e)}
      >
        {/* Water fill effect for all nodes */}
        {fillPercentage > 0 && (
          <div
            className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${
              isRootNode 
                ? 'bg-gradient-to-t from-blue-600 to-blue-500' 
                : 'bg-gradient-to-t from-blue-500 to-blue-400'
            }`}
            style={{ 
              height: `${fillPercentage}%`,
              boxShadow: fillPercentage >= 100 ? '0 0 20px rgba(59, 130, 246, 0.8)' : 'none'
            }}
          >
            {fillPercentage >= 100 && (
              <div className="absolute inset-0 animate-pulse opacity-30 bg-white"></div>
            )}
          </div>
        )}
        
        {/* Root node special design */}
        {isRootNode && (
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-gradient-radial from-blue-300 to-transparent opacity-50"></div>
          </div>
        )}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 z-10">
          <div className={`text-white font-medium text-center mb-1 truncate ${isRootNode ? 'text-xl w-[80%]' : 'w-[90%]'}`}>
            {node.title || 'Untitled'}
          </div>
          
          {/* Show todos count for non-root nodes */}
          {!isRootNode && (
            <div className="text-xs text-gray-300 mb-2">
              {todoCount > 0 
                ? `${completedTodos}/${todoCount} todos` 
                : 'No todos'}
            </div>
          )}
          
          {/* Show connected nodes and todos count for root node */}
          {isRootNode && (
            <div className="text-xs text-gray-300 mb-2">
              {connectedNodesCount > 0 
                ? `${connectedNodesCount} node${connectedNodesCount !== 1 ? 's' : ''} · ${connectedNodesTodos.completed}/${connectedNodesTodos.total} todos` 
                : 'No connected nodes'}
            </div>
          )}
          
          <div className="flex space-x-2 mt-1">
            <Button 
              size="icon"
              className="h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600"
              onClick={onAddNode}
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            {/* Only show connect button for non-root nodes */}
            {!isRootNode && (
              <Button 
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-700 hover:bg-gray-600"
                onClick={onConnect}
              >
                <Link className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
