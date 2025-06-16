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
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number;
    type: 'circle' | 'square' | 'triangle' | 'star';
    color: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    size: number;
    gravity: number;
    life: number;
  }>>([]);
  
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
    const shouldShowConfetti = isRootNode 
      ? (fillPercentage >= 100 && connectedNodesTodos.total > 0)
      : (fillPercentage >= 100 && todoCount > 0);
      
    if (shouldShowConfetti) {
      // Create confetti particles with physics
      const particleCount = isRootNode ? 60 : 40; // More particles for root nodes
      const particles = Array.from({ length: particleCount }, (_, i) => {
        // Create radial explosion pattern
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
        const velocity = Math.random() * 6 + 3; // Slightly slower for more control
        
        const colors = [
          '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
          '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
          '#FF9F43', '#10AC84', '#EE5A24', '#0984E3', '#A29BFE'
        ];
        
        return {
          id: i,
          type: ['circle', 'square', 'triangle', 'star'][Math.floor(Math.random() * 4)] as any,
          color: colors[Math.floor(Math.random() * colors.length)],
          x: 50, // Start from node center (percentage)
          y: 50, // Start from node center (percentage)
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 10,
          size: Math.random() * 8 + 4,
          gravity: Math.random() * 0.3 + 0.1,
          life: 1.0,
        };
      });
      
      setConfettiParticles(particles);
      setShowConfetti(true);
      
      // Animate particles
      const animateParticles = () => {
        setConfettiParticles(prev => 
          prev.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vx: particle.vx * 0.98, // Air resistance
            vy: particle.vy + particle.gravity, // Gravity
            rotation: particle.rotation + particle.rotationSpeed,
            life: particle.life - 0.02
          })).filter(particle => {
            // Keep particles only if they're alive and within circular bounds
            const centerX = 50;
            const centerY = 50;
            const maxDistance = 150; // Maximum distance from center
            const distance = Math.sqrt((particle.x - centerX) ** 2 + (particle.y - centerY) ** 2);
            return particle.life > 0 && distance < maxDistance;
          })
        );
      };
      
      const interval = setInterval(animateParticles, 16); // 60fps
      const timer = setTimeout(() => {
        setShowConfetti(false);
        setConfettiParticles([]);
        clearInterval(interval);
      }, 4000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isRootNode, fillPercentage, connectedNodesTodos.total, todoCount]);

  // Render individual confetti particle
  const renderParticle = (particle: typeof confettiParticles[0]) => {
    const opacity = Math.max(0, particle.life);
    
    if (particle.type === 'circle') {
      return (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity,
            boxShadow: `0 0 ${particle.size}px ${particle.color}40`,
          }}
        />
      );
    }
    
    if (particle.type === 'square') {
      return (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity,
            borderRadius: '2px',
          }}
        />
      );
    }
    
    if (particle.type === 'triangle') {
      return (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: 0,
            height: 0,
            borderLeft: `${particle.size / 2}px solid transparent`,
            borderRight: `${particle.size / 2}px solid transparent`,
            borderBottom: `${particle.size}px solid ${particle.color}`,
            transform: `rotate(${particle.rotation}deg)`,
            opacity,
            filter: `drop-shadow(0 0 ${particle.size / 2}px ${particle.color}60)`,
          }}
        />
      );
    }
    
    if (particle.type === 'star') {
      return (
        <div
          key={particle.id}
          className="absolute text-center font-bold"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            fontSize: `${particle.size}px`,
            color: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            opacity,
            textShadow: `0 0 ${particle.size / 2}px ${particle.color}`,
            lineHeight: '1',
          }}
        >
          ⭐
        </div>
      );
    }
    
    return null;
  };

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
        <div 
          className="absolute pointer-events-none z-50 overflow-visible"
          style={{
            left: `-${baseSize/2}px`,
            top: `-${baseSize/2}px`,
            width: `${baseSize * 2}px`,
            height: `${baseSize * 2}px`,
            borderRadius: '50%',
          }}
        >
          {confettiParticles.map(renderParticle)}
          
          {/* Victory burst effect - centered on node */}
          <div className="absolute inset-0">
            <div 
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
              style={{
                width: `${baseSize}px`,
                height: `${baseSize}px`,
                background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,107,107,0.2) 50%, rgba(138,43,226,0.1) 100%)'
              }}
            />
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
