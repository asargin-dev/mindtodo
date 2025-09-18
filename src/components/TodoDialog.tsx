import { useState, useEffect, useRef } from 'react';
import { X, Trash, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { Button } from './ui/button';
import { TodoNode, NodeStatus } from '../types';

interface TodoDialogProps {
  node: TodoNode;
  onClose: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateStatus: (status: NodeStatus) => void;
  onDeleteNode: () => void;
}

export function TodoDialog({
  node,
  onClose,
  onUpdateTitle,
  onUpdateStatus,
  onDeleteNode
}: TodoDialogProps) {
  const [title, setTitle] = useState(node.title);
  const [status, setStatus] = useState<NodeStatus>(node.status ?? 'pending');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Check if this is a root node
  const isRootNode =
    typeof node.isRoot === 'boolean'
      ? node.isRoot
      : node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';

  // Handle closing with save
  const handleClose = () => {
    // Save changes before closing
    onUpdateTitle(title);
    onUpdateStatus(status);
    onClose();
  };

  // For handling the dialog backdrop click - should close the dialog
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    } else {
      // If clicking on any other part of the dialog, just stop propagation
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onUpdateTitle(title);
        onUpdateStatus(status);
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      onUpdateTitle(title);
      onUpdateStatus(status);
    };
  }, [title, status, onClose, onUpdateStatus, onUpdateTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    // Save title changes immediately when focus leaves the input
    onUpdateTitle(title);
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleClose();
    }
  };

  const handleStatusChange = (nextStatus: NodeStatus) => {
    if (isRootNode) return;
    setStatus(nextStatus);
    onUpdateStatus(nextStatus);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const statusOptions = [
    { value: 'success' as NodeStatus, label: 'Success', Icon: CheckCircle2 },
    { value: 'pending' as NodeStatus, label: 'Pending', Icon: Clock3 },
    { value: 'failed' as NodeStatus, label: 'Failed', Icon: XCircle }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 TodoDialog" 
      onClick={handleBackdropClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div 
        ref={dialogRef}
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col TodoDialog"
        onClick={stopPropagation}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gray-900 p-4 flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="bg-transparent text-white text-xl font-semibold focus:outline-none focus:border-blue-500 border-b border-transparent w-full"
            placeholder="Node Title"
          />
          <div className="flex items-center gap-2">
            {!isRootNode && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                onClick={() => {
                  onDeleteNode();
                }}
              >
                <Trash className="h-5 w-5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Status controls */}
        {!isRootNode ? (
          <div className="p-4 border-b border-gray-700 space-y-3">
            <div>
              <h2 className="text-sm font-medium text-gray-200">Node Status</h2>
              <p className="text-xs text-gray-400 mt-1">
                Choose whether this idea succeeds, stays pending, or fails.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map(({ value, label, Icon }) => {
                const isActive = status === value;
                return (
                  <Button
                    key={value}
                    type="button"
                    variant="ghost"
                    className={`h-14 w-full rounded-xl border flex items-center justify-center gap-2 text-sm font-semibold transition-all
                      ${isActive
                        ? 'border-blue-400 bg-blue-500/20 text-blue-100 shadow-inner shadow-blue-500/30'
                        : 'border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500 hover:text-white'}
                    `}
                    onClick={() => handleStatusChange(value)}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 border-b border-gray-700 text-xs text-gray-400">
            Root nodes manage their children and only keep their title.
          </div>
        )}
      </div>
    </div>
  );
}
