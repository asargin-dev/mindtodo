import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TodoNode, NodeStatus } from '../types';
import { CheckCircle2, XCircle, Clock3, Sparkles } from 'lucide-react';

const STATUS_STYLES: Record<NodeStatus, {
  backgroundClass: string;
  borderClass: string;
  hoverGlow: string;
  label: string;
  labelClass: string;
  iconClass: string;
}> = {
  success: {
    backgroundClass: 'bg-gradient-to-br from-emerald-500/20 via-green-600/30 to-teal-700/20',
    borderClass: 'border-emerald-500/50',
    hoverGlow: '0 0 25px rgba(16, 185, 129, 0.5), 0 0 50px rgba(16, 185, 129, 0.25), 0 0 80px rgba(16, 185, 129, 0.1)',
    label: 'Tamamlandı',
    labelClass: 'text-emerald-300',
    iconClass: 'text-emerald-400',
  },
  failed: {
    backgroundClass: 'bg-gradient-to-br from-rose-500/20 via-red-600/30 to-pink-700/20',
    borderClass: 'border-rose-500/50',
    hoverGlow: '0 0 25px rgba(239, 68, 68, 0.5), 0 0 50px rgba(239, 68, 68, 0.25), 0 0 80px rgba(239, 68, 68, 0.1)',
    label: 'Başarısız',
    labelClass: 'text-rose-300',
    iconClass: 'text-rose-400',
  },
  pending: {
    backgroundClass: 'bg-gradient-to-br from-slate-700/40 via-slate-800/60 to-slate-900/40',
    borderClass: 'border-slate-600/50',
    hoverGlow: '0 0 25px rgba(148, 163, 184, 0.4), 0 0 50px rgba(148, 163, 184, 0.2), 0 0 80px rgba(148, 163, 184, 0.1)',
    label: 'Bekliyor',
    labelClass: 'text-slate-400',
    iconClass: 'text-slate-400',
  }
};

// Custom plus cursor as SVG data URL - normal state (blue)
const PLUS_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2360a5fa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10' fill='%233b82f6' fill-opacity='0.3'/%3E%3Cline x1='12' y1='8' x2='12' y2='16'/%3E%3Cline x1='8' y1='12' x2='16' y2='12'/%3E%3C/svg%3E") 12 12, crosshair`;

// Darker plus cursor for active drag state (deeper blue/indigo)
const PLUS_CURSOR_ACTIVE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28' fill='none' stroke='%234f46e5' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='14' cy='14' r='12' fill='%234338ca' fill-opacity='0.5'/%3E%3Cline x1='14' y1='8' x2='14' y2='20'/%3E%3Cline x1='8' y1='14' x2='20' y2='14'/%3E%3C/svg%3E") 14 14, crosshair`;

interface StatusSummary {
  success: number;
  failed: number;
  pending: number;
  total: number;
}

interface NodeComponentProps {
  node: TodoNode;
  isConnecting: boolean;
  isDragging: boolean;
  isEditing: boolean;
  connectedNodesCount: number;
  statusSummary?: StatusSummary;
  size: number;
  onClick: (e: React.MouseEvent) => void;
  onStartDrag: (node: TodoNode, event: React.MouseEvent) => void;
  onStatusChange: (status: NodeStatus) => void;
  onAddNodeAtAngle: (angle: number) => void;
  onAddNodeAtPosition: (screenX: number, screenY: number) => void;
  onTitleChange: (title: string) => void;
  onStartEditing: () => void;
  onFinishEditing: () => void;
  onDeleteNode: () => void;
}

export function NodeComponent({
  node,
  isConnecting,
  isDragging,
  isEditing,
  connectedNodesCount,
  statusSummary,
  size,
  onClick,
  onStartDrag,
  onStatusChange,
  onAddNodeAtAngle,
  onAddNodeAtPosition,
  onTitleChange,
  onStartEditing,
  onFinishEditing,
  onDeleteNode
}: NodeComponentProps) {
  const isRootNode =
    typeof node.isRoot === 'boolean'
      ? node.isRoot
      : node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';

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

  // Hover states
  const [isHovering, setIsHovering] = useState(false);
  const [isNearEdge, setIsNearEdge] = useState(false);
  // Drag-to-place state
  const [isDraggingNewNode, setIsDraggingNewNode] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragPreviewPosition, setDragPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  // Refs for values needed in effect without causing re-runs
  const currentAngleRef = useRef(0);
  const dragStartPositionRef = useRef<{ x: number; y: number } | null>(null);

  const [localTitle, setLocalTitle] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  const summary = statusSummary ?? { success: 0, failed: 0, pending: 0, total: 0 };
  const nodeStatus: NodeStatus = node.status ?? 'pending';
  const statusStyle = STATUS_STYLES[nodeStatus];

  // Calculate dynamic size based on localTitle when editing
  const calculateDynamicSize = (title: string): number => {
    const baseNodeSize = isRootNode ? 220 : 140;
    const normalizedTitle = title.trim();
    const totalLength = normalizedTitle.length;
    const longestWord = normalizedTitle.split(/\s+/).reduce((max, word) => Math.max(max, word.length), 0);

    const lengthBoost = Math.max(totalLength - 10, 0) * 3;
    const wordBoost = Math.max(longestWord - 8, 0) * 6;
    const combinedBoost = Math.min(250, lengthBoost + wordBoost);

    return Math.min(450, baseNodeSize + combinedBoost);
  };

  // Use dynamic size when editing, otherwise use prop size
  const baseSize = isEditing ? calculateDynamicSize(localTitle) : size;

  const summaryWithoutSelf = isRootNode
    ? {
        success: Math.max(summary.success - (nodeStatus === 'success' ? 1 : 0), 0),
        failed: Math.max(summary.failed - (nodeStatus === 'failed' ? 1 : 0), 0),
        pending: Math.max(summary.pending - (nodeStatus === 'pending' ? 1 : 0), 0),
        total: Math.max(summary.total - 1, 0),
      }
    : summary;

  const shouldCelebrate = !isRootNode && nodeStatus === 'success';

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update local title when node title changes
  useEffect(() => {
    setLocalTitle(node.title);
  }, [node.title]);

  // Reset hover states when dragging or editing
  useEffect(() => {
    if (isDragging || isEditing) {
      setIsHovering(false);
      setIsNearEdge(false);
      setIsDraggingNewNode(false);
      dragStartPositionRef.current = null;
      setDragStartPosition(null);
      setDragPreviewPosition(null);
    }
  }, [isDragging, isEditing]);

  // Confetti effect
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
        type: ['circle', 'square', 'triangle', 'star'][Math.floor(Math.random() * 4)] as 'circle' | 'square' | 'triangle' | 'star',
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

  // Global mouse tracking for drag-to-place feature
  useEffect(() => {
    if (!isDraggingNewNode) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setDragPreviewPosition({ x: e.clientX, y: e.clientY });
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      const startPos = dragStartPositionRef.current;
      const releaseX = e.clientX;
      const releaseY = e.clientY;

      // Calculate distance from start to release
      const MIN_DRAG_DISTANCE = 50; // Minimum pixels to count as a drag

      if (startPos) {
        const dx = releaseX - startPos.x;
        const dy = releaseY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < MIN_DRAG_DISTANCE) {
          // Quick click - use angle-based positioning with proper offset
          onAddNodeAtAngle(currentAngleRef.current);
        } else {
          // Actual drag - create node at the release position
          onAddNodeAtPosition(releaseX, releaseY);
        }
      } else {
        // Fallback (shouldn't happen)
        onAddNodeAtPosition(releaseX, releaseY);
      }

      // Reset all states
      setIsDraggingNewNode(false);
      dragStartPositionRef.current = null;
      setDragStartPosition(null);
      setDragPreviewPosition(null);
      setIsNearEdge(false);
      setIsHovering(false);
    };

    // Prevent text selection while dragging
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [isDraggingNewNode, onAddNodeAtPosition, onAddNodeAtAngle]);

  // Check if mouse is near edge and calculate angle
  const checkEdgeProximity = useCallback((e: React.MouseEvent): boolean => {
    if (isDragging || isEditing || isDraggingNewNode) return false;

    const nodeRect = nodeRef.current?.getBoundingClientRect();
    if (!nodeRect) return false;

    const nodeWidth = baseSize;
    const nodeHeight = baseSize;

    // Mouse position relative to node's top-left corner
    const mouseX = e.clientX - nodeRect.left;
    const mouseY = e.clientY - nodeRect.top;

    // Distance from each edge (negative = outside node)
    const distFromLeft = mouseX;
    const distFromRight = nodeWidth - mouseX;
    const distFromTop = mouseY;
    const distFromBottom = nodeHeight - mouseY;

    // Edge detection zone: 45px inside, 40px outside
    const innerZone = 45;
    const outerZone = 40;

    // Check if in edge zone for each edge
    const inLeftZone = distFromLeft >= -outerZone && distFromLeft <= innerZone;
    const inRightZone = distFromRight >= -outerZone && distFromRight <= innerZone;
    const inTopZone = distFromTop >= -outerZone && distFromTop <= innerZone;
    const inBottomZone = distFromBottom >= -outerZone && distFromBottom <= innerZone;

    // Must be within bounds on perpendicular axis
    const inVerticalBounds = mouseY >= -outerZone && mouseY <= nodeHeight + outerZone;
    const inHorizontalBounds = mouseX >= -outerZone && mouseX <= nodeWidth + outerZone;

    const nearEdge =
      (inLeftZone && inVerticalBounds) ||
      (inRightZone && inVerticalBounds) ||
      (inTopZone && inHorizontalBounds) ||
      (inBottomZone && inHorizontalBounds);

    if (nearEdge) {
      // Calculate angle from node center to mouse position
      const centerX = nodeWidth / 2;
      const centerY = nodeHeight / 2;
      currentAngleRef.current = Math.atan2(mouseY - centerY, mouseX - centerX);
    }

    return nearEdge;
  }, [isDragging, isEditing, isDraggingNewNode, baseSize]);

  // Handle mouse enter on hover zone
  const handleHoverZoneEnter = useCallback(() => {
    if (!isDragging && !isEditing && !isDraggingNewNode) {
      setIsHovering(true);
    }
  }, [isDragging, isEditing, isDraggingNewNode]);

  // Handle mouse move on hover zone
  const handleHoverZoneMove = useCallback((e: React.MouseEvent) => {
    if (isDraggingNewNode) return; // Don't update edge detection while dragging
    const nearEdge = checkEdgeProximity(e);
    if (nearEdge !== isNearEdge) {
      setIsNearEdge(nearEdge);
    }
  }, [checkEdgeProximity, isNearEdge, isDraggingNewNode]);

  // Handle mouse leave
  const handleHoverZoneLeave = useCallback(() => {
    // Don't reset states if dragging - the global handlers will manage this
    if (isDraggingNewNode) return;
    setIsHovering(false);
    setIsNearEdge(false);
  }, [isDraggingNewNode]);

  // Handle mousedown on hover zone - start drag if near edge
  const handleHoverZoneMouseDown = useCallback((e: React.MouseEvent) => {
    // Check if we're near edge at mousedown time
    const nearEdge = checkEdgeProximity(e);

    if (nearEdge) {
      e.preventDefault();
      e.stopPropagation();
      // Store the initial click position and start drag-to-place mode
      const clickPos = { x: e.clientX, y: e.clientY };
      dragStartPositionRef.current = clickPos; // Ref for effect comparison
      setDragStartPosition(clickPos); // State for rendering
      setDragPreviewPosition(clickPos);
      setIsDraggingNewNode(true);
    }
  }, [checkEdgeProximity]);

  const handleStatusClick = (e: React.MouseEvent, status: NodeStatus) => {
    e.preventDefault();
    e.stopPropagation();
    onStatusChange(status);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onTitleChange(localTitle);
      onFinishEditing();
    } else if (e.key === 'Escape') {
      setLocalTitle(node.title);
      onFinishEditing();
    }
  };

  const handleTitleBlur = () => {
    onTitleChange(localTitle);
    onFinishEditing();
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isEditing) {
      onStartEditing();
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDeleteNode();
  };

  // Render confetti particle
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
      ref={nodeRef}
      className={`absolute select-none transition-all duration-300
        ${isEditing ? 'z-50' : 'z-20'}
        ${isDragging ? 'z-50' : ''}
        ${isConnecting ? 'hover:ring-2 hover:ring-emerald-400/50 hover:ring-offset-2 hover:ring-offset-transparent' : ''}
      `}
      style={{
        left: `${node.position.x}px`,
        top: `${node.position.y}px`,
        width: `${baseSize}px`,
        height: `${baseSize}px`,
        transform: isEditing ? 'scale(1.03)' : 'scale(1)',
        transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onClick={onClick}
      data-component-name="NodeComponent"
      data-node-id={node.id}
    >
      {/* Extended hover zone for edge detection - cursor changes when near edge */}
      <div
        className="absolute z-10"
        style={{
          top: '-45px',
          left: '-45px',
          right: '-45px',
          bottom: '-45px',
          cursor: isDraggingNewNode ? PLUS_CURSOR_ACTIVE : isNearEdge ? PLUS_CURSOR : 'default',
        }}
        onMouseEnter={handleHoverZoneEnter}
        onMouseMove={handleHoverZoneMove}
        onMouseLeave={handleHoverZoneLeave}
        onMouseDown={handleHoverZoneMouseDown}
      />

      {/* Glowing edge ring - shows clickable circumference for adding nodes */}
      <div
        className={`absolute rounded-[2rem] pointer-events-none transition-all duration-300 ${
          isNearEdge || isDraggingNewNode ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: '-12px',
          left: '-12px',
          right: '-12px',
          bottom: '-12px',
          background: isDraggingNewNode
            ? 'linear-gradient(135deg, rgba(79, 70, 229, 0.2) 0%, rgba(67, 56, 202, 0.15) 50%, rgba(79, 70, 229, 0.2) 100%)'
            : 'linear-gradient(135deg, rgba(96, 165, 250, 0.15) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(96, 165, 250, 0.15) 100%)',
          border: isDraggingNewNode ? '2px solid rgba(79, 70, 229, 0.5)' : '2px solid rgba(96, 165, 250, 0.4)',
          boxShadow: isDraggingNewNode
            ? '0 0 25px rgba(79, 70, 229, 0.4), 0 0 50px rgba(67, 56, 202, 0.25), inset 0 0 30px rgba(79, 70, 229, 0.15)'
            : '0 0 20px rgba(96, 165, 250, 0.3), 0 0 40px rgba(139, 92, 246, 0.2), inset 0 0 30px rgba(96, 165, 250, 0.1)',
        }}
      />

      {/* Outer glow aura for edge zone */}
      <div
        className={`absolute rounded-[2.5rem] pointer-events-none transition-all duration-300 ${
          isNearEdge || isDraggingNewNode ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          top: '-25px',
          left: '-25px',
          right: '-25px',
          bottom: '-25px',
          background: isDraggingNewNode
            ? 'radial-gradient(ellipse at center, transparent 50%, rgba(79, 70, 229, 0.1) 70%, transparent 100%)'
            : 'radial-gradient(ellipse at center, transparent 50%, rgba(96, 165, 250, 0.08) 70%, transparent 100%)',
          border: isDraggingNewNode ? '1px solid rgba(79, 70, 229, 0.2)' : '1px solid rgba(96, 165, 250, 0.15)',
        }}
      />

      {/* Preview line during drag-to-place - rendered via portal to escape transforms */}
      {isDraggingNewNode && dragStartPosition && dragPreviewPosition && createPortal(
        <svg
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 9999, width: '100vw', height: '100vh' }}
        >
          {/* Glow effect for the line (render first, behind main line) */}
          <line
            x1={dragStartPosition.x}
            y1={dragStartPosition.y}
            x2={dragPreviewPosition.x}
            y2={dragPreviewPosition.y}
            stroke="rgba(79, 70, 229, 0.2)"
            strokeWidth={10}
            strokeLinecap="round"
            style={{ filter: 'blur(6px)' }}
          />
          {/* Dashed line from click position to cursor */}
          <line
            x1={dragStartPosition.x}
            y1={dragStartPosition.y}
            x2={dragPreviewPosition.x}
            y2={dragPreviewPosition.y}
            stroke="rgba(79, 70, 229, 0.7)"
            strokeWidth={3}
            strokeDasharray="10 6"
            strokeLinecap="round"
          />
          {/* Small circle at the start position */}
          <circle
            cx={dragStartPosition.x}
            cy={dragStartPosition.y}
            r={6}
            fill="rgba(79, 70, 229, 0.6)"
            stroke="rgba(79, 70, 229, 0.8)"
            strokeWidth={2}
          />
          {/* Outer glow circle at cursor */}
          <circle
            cx={dragPreviewPosition.x}
            cy={dragPreviewPosition.y}
            r={32}
            fill="rgba(79, 70, 229, 0.08)"
            stroke="rgba(79, 70, 229, 0.3)"
            strokeWidth={1}
          />
          {/* Circle at cursor showing where node will be placed */}
          <circle
            cx={dragPreviewPosition.x}
            cy={dragPreviewPosition.y}
            r={24}
            fill="rgba(79, 70, 229, 0.15)"
            stroke="rgba(79, 70, 229, 0.5)"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          {/* Inner circle */}
          <circle
            cx={dragPreviewPosition.x}
            cy={dragPreviewPosition.y}
            r={8}
            fill="rgba(79, 70, 229, 0.5)"
          />
          {/* Plus icon at cursor */}
          <line
            x1={dragPreviewPosition.x - 5}
            y1={dragPreviewPosition.y}
            x2={dragPreviewPosition.x + 5}
            y2={dragPreviewPosition.y}
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <line
            x1={dragPreviewPosition.x}
            y1={dragPreviewPosition.y - 5}
            x2={dragPreviewPosition.x}
            y2={dragPreviewPosition.y + 5}
            stroke="white"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>,
        document.body
      )}

      {/* Confetti celebration */}
      {showConfetti && (
        <div
          className="absolute pointer-events-none z-50 overflow-visible"
          style={{
            left: `-${baseSize / 2}px`,
            top: `-${baseSize / 2}px`,
            width: `${baseSize * 2}px`,
            height: `${baseSize * 2}px`,
            borderRadius: '50%',
          }}
        >
          {confettiParticles.map(renderParticle)}
          <div className="absolute inset-0">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
              style={{
                width: `${baseSize}px`,
                height: `${baseSize}px`,
                background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(59,130,246,0.2) 50%, transparent 100%)'
              }}
            />
          </div>
        </div>
      )}

      {/* Main node container */}
      <div
        className={`absolute inset-0 rounded-3xl overflow-hidden backdrop-blur-xl border cursor-pointer z-20 transition-shadow duration-200 ${
          isRootNode
            ? 'bg-gradient-to-br from-blue-600/30 via-purple-600/20 to-slate-800/40 border-blue-500/30'
            : `${statusStyle.backgroundClass} ${statusStyle.borderClass}`
        }`}
        style={{
          boxShadow: isEditing
            ? '0 0 0 2px rgba(59, 130, 246, 0.5), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            : isHovering
            ? isRootNode
              ? '0 0 25px rgba(96, 165, 250, 0.5), 0 0 50px rgba(139, 92, 246, 0.3), 0 0 80px rgba(96, 165, 250, 0.15)'
              : statusStyle.hoverGlow
            : 'none'
        }}
        onMouseDown={(e) => {
          if (!isEditing) {
            onStartDrag(node, e);
          }
        }}
      >
        {/* Decorative inner glow for root node */}
        {isRootNode && (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-purple-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
          </>
        )}

        {/* Delete button for non-root nodes */}
        {!isRootNode && (
          <button
            onClick={handleDeleteClick}
            className="absolute top-2 right-2 z-30 p-1.5 rounded-lg bg-black/20 hover:bg-rose-500/30
              border border-white/10 hover:border-rose-400/50 transition-all duration-200 group"
          >
            <XCircle className="h-4 w-4 text-white/40 group-hover:text-rose-400" />
          </button>
        )}

        {/* Inner content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 z-10 gap-3">
          {/* Title - editable when isEditing, clickable otherwise */}
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={handleTitleBlur}
              className="bg-transparent border-none px-3 py-2 text-lg text-white
                text-center font-semibold focus:outline-none focus:ring-0
                w-[80%] caret-blue-400"
              placeholder=""
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              onClick={handleTitleClick}
              className={`font-semibold text-center leading-tight whitespace-pre-wrap break-words cursor-text
                hover:opacity-80 transition-opacity ${
                isRootNode
                  ? 'text-xl bg-gradient-to-r from-blue-200 via-purple-200 to-blue-200 bg-clip-text text-transparent max-w-[85%]'
                  : 'text-lg text-white/90 max-w-[85%]'
              }`}
            >
              {node.title || 'Untitled'}
            </div>
          )}

          {/* Status buttons for non-root nodes OR root info */}
          {!isRootNode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleStatusClick(e, 'success')}
                className={`p-2 rounded-xl transition-all duration-200 border ${
                  nodeStatus === 'success'
                    ? 'bg-emerald-500/30 border-emerald-400/50 scale-110'
                    : 'bg-white/5 border-white/10 hover:bg-emerald-500/20 hover:border-emerald-400/30'
                }`}
              >
                <CheckCircle2 className={`h-5 w-5 ${nodeStatus === 'success' ? 'text-emerald-400' : 'text-white/60'}`} />
              </button>
              <button
                onClick={(e) => handleStatusClick(e, 'pending')}
                className={`p-2 rounded-xl transition-all duration-200 border ${
                  nodeStatus === 'pending'
                    ? 'bg-blue-500/30 border-blue-400/50 scale-110'
                    : 'bg-white/5 border-white/10 hover:bg-blue-500/20 hover:border-blue-400/30'
                }`}
              >
                <Clock3 className={`h-5 w-5 ${nodeStatus === 'pending' ? 'text-blue-400' : 'text-white/60'}`} />
              </button>
              <button
                onClick={(e) => handleStatusClick(e, 'failed')}
                className={`p-2 rounded-xl transition-all duration-200 border ${
                  nodeStatus === 'failed'
                    ? 'bg-rose-500/30 border-rose-400/50 scale-110'
                    : 'bg-white/5 border-white/10 hover:bg-rose-500/20 hover:border-rose-400/30'
                }`}
              >
                <XCircle className={`h-5 w-5 ${nodeStatus === 'failed' ? 'text-rose-400' : 'text-white/60'}`} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm border border-white/10">
                <Sparkles className="h-3 w-3 text-blue-400" />
                <span className="text-xs text-slate-300">
                  {connectedNodesCount > 0 ? `${connectedNodesCount} görev` : 'Görev ekleyin'}
                </span>
              </div>
              {connectedNodesCount > 0 && (
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {summaryWithoutSelf.success}
                  </span>
                  <span className="flex items-center gap-1 text-rose-400">
                    <XCircle className="h-3.5 w-3.5" />
                    {summaryWithoutSelf.failed}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" />
                    {summaryWithoutSelf.pending}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
