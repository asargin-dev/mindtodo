import React, { useState, useEffect } from 'react';
import { TodoNode, NodeStatus } from '../types';
import { Button } from './ui/button';
import { Plus, Link, CheckCircle2, XCircle, Clock3 } from 'lucide-react';

const STATUS_STYLES: Record<NodeStatus, { backgroundClass: string; glow: string; label: string; labelClass: string }> = {
  success: {
    backgroundClass: 'bg-gradient-to-br from-emerald-600 to-green-700',
    glow: '0 0 0 4px rgba(16, 185, 129, 0.4)',
    label: 'Success',
    labelClass: 'text-emerald-100'
  },
  failed: {
    backgroundClass: 'bg-gradient-to-br from-rose-600 to-red-700',
    glow: '0 0 0 4px rgba(239, 68, 68, 0.4)',
    label: 'Failed',
    labelClass: 'text-rose-100'
  },
  pending: {
    backgroundClass: 'bg-gradient-to-br from-slate-700 to-slate-800',
    glow: '0 0 0 4px rgba(59, 130, 246, 0.35)',
    label: 'Pending',
    labelClass: 'text-blue-100'
  }
};

interface StatusSummary {
  success: number;
  failed: number;
  pending: number;
  total: number;
}

interface NodeComponentProps {
  node: TodoNode;
  isSelected: boolean;
  isConnecting: boolean;
  isDragging: boolean;
  connectedNodesCount: number;
  statusSummary?: StatusSummary;
  size: number;
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
  statusSummary,
  size,
  onClick,
  onStartDrag,
  onAddNode,
  onConnect
}: NodeComponentProps) {
  // Check if this is a root node (has no incoming connections)
  const isRootNode =
    typeof node.isRoot === 'boolean'
      ? node.isRoot
      : node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';
  
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
  
  const summary = statusSummary ?? { success: 0, failed: 0, pending: 0, total: 0 };
  const baseSize = size;
  const nodeStatus: NodeStatus = node.status ?? 'pending';
  const statusStyle = STATUS_STYLES[nodeStatus];
  const StatusIcon = nodeStatus === 'success' ? CheckCircle2 : nodeStatus === 'failed' ? XCircle : Clock3;

  const summaryWithoutSelf = isRootNode
    ? {
        success: Math.max(summary.success - (nodeStatus === 'success' ? 1 : 0), 0),
        failed: Math.max(summary.failed - (nodeStatus === 'failed' ? 1 : 0), 0),
        pending: Math.max(summary.pending - (nodeStatus === 'pending' ? 1 : 0), 0),
        total: Math.max(summary.total - 1, 0),
      }
    : summary;

  const shouldCelebrate = !isRootNode && nodeStatus === 'success';

  useEffect(() => {
    if (!shouldCelebrate) {
      setShowConfetti(false);
      setConfettiParticles([]);
      return;
    }

    const particleCount = 40;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.3;
      const velocity = Math.random() * 6 + 3;

      const colors = [
        '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
        '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
        '#FF9F43', '#10AC84', '#EE5A24', '#0984E3', '#A29BFE'
      ];

      return {
        id: i,
        type: ['circle', 'square', 'triangle', 'star'][Math.floor(Math.random() * 4)] as any,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: 50,
        y: 50,
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

    const animateParticles = () => {
      setConfettiParticles(prev =>
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          vx: particle.vx * 0.98,
          vy: particle.vy + particle.gravity,
          rotation: particle.rotation + particle.rotationSpeed,
          life: particle.life - 0.02
        })).filter(particle => {
          const centerX = 50;
          const centerY = 50;
          const maxDistance = 150;
          const distance = Math.sqrt((particle.x - centerX) ** 2 + (particle.y - centerY) ** 2);
          return particle.life > 0 && distance < maxDistance;
        })
      );
    };

    const interval = setInterval(animateParticles, 16);
    const timer = setTimeout(() => {
      setShowConfetti(false);
      setConfettiParticles([]);
      clearInterval(interval);
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [shouldCelebrate]);

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

      <div
        className={`absolute inset-0 rounded-full overflow-hidden flex flex-col items-center justify-center ${
          isRootNode ? 'bg-gradient-to-br from-blue-700 via-slate-800 to-slate-900' : statusStyle.backgroundClass
        }`}
        style={{
          boxShadow: isSelected
            ? '0 0 0 4px rgba(59, 130, 246, 0.5), 0 10px 15px -3px rgba(0, 0, 0, 0.3)'
            : isRootNode
            ? '0 12px 24px rgba(15, 23, 42, 0.4)'
            : statusStyle.glow
        }}
        onMouseDown={(e) => onStartDrag(node, e)}
      >
        {isRootNode && (
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-radial from-blue-300 to-transparent" />
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 z-10 gap-2">
          <div
            className={`text-white font-semibold text-center leading-tight whitespace-pre-wrap break-words ${
              isRootNode ? 'text-xl max-w-[80%]' : 'text-lg max-w-[85%]'
            }`}
          >
            {node.title || 'Untitled'}
          </div>

          {!isRootNode ? (
            <div className={`flex items-center gap-2 text-sm font-medium ${statusStyle.labelClass}`}>
              <StatusIcon className="h-5 w-5" />
              <span>{statusStyle.label}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center text-xs text-slate-200 gap-1">
              <span>
                {connectedNodesCount > 0
                  ? `${connectedNodesCount} bağlı node`
                  : 'Bağlı node yok'}
              </span>
              {connectedNodesCount > 0 && (
                <div className="flex items-center gap-3 text-[0.7rem] font-semibold">
                  <span className="flex items-center gap-1 text-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    {summaryWithoutSelf.success}
                  </span>
                  <span className="flex items-center gap-1 text-rose-200">
                    <XCircle className="h-3 w-3" />
                    {summaryWithoutSelf.failed}
                  </span>
                  <span className="flex items-center gap-1 text-blue-200">
                    <Clock3 className="h-3 w-3" />
                    {summaryWithoutSelf.pending}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-2 mt-1">
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-slate-900/40 hover:bg-slate-900/60 border border-white/10"
              onClick={onAddNode}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {!isRootNode && (
              <Button
                size="icon"
                className="h-8 w-8 rounded-full bg-slate-900/40 hover:bg-slate-900/60 border border-white/10"
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
