import { useState, useEffect, useRef } from 'react';
import { X, Check, Trash, Save } from 'lucide-react';
import { Button } from './ui/button';
import { TodoNode, TodoItem } from '../types';

interface TodoDialogProps {
  node: TodoNode;
  onClose: () => void;
  onUpdateTitle: (title: string) => void;
  onUpdateTodos: (todos: TodoItem[]) => void;
  onDeleteNode: () => void;
}

export function TodoDialog({
  node,
  onClose,
  onUpdateTitle,
  onUpdateTodos,
  onDeleteNode
}: TodoDialogProps) {
  const [title, setTitle] = useState(node.title);
  const [todos, setTodos] = useState<TodoItem[]>(node.todos || []);
  const [newTodoText, setNewTodoText] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check if this is a root node
  const isRootNode = node.id === 'root' || node.title === 'My Tasks' || node.title === 'Work' || node.title === 'Personal';

  // Focus the input on dialog open
  useEffect(() => {
    if (inputRef.current && !isRootNode) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isRootNode]);

  // Save all changes
  const saveChanges = () => {
    onUpdateTitle(title);
    onUpdateTodos(todos);
  };

  // Handle closing with save
  const handleClose = () => {
    // Save changes before closing
    onUpdateTitle(title);
    onUpdateTodos(todos);
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
        saveChanges();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Fallback save on unmount if not saved already
      saveChanges();
    };
  }, [title, todos]);

  const handleFormClick = (e: React.MouseEvent) => {
    // Always stop event propagation completely for any clicks inside the form
    e.preventDefault();
    e.stopPropagation();
  };

  const handleAddTodo = (e: React.FormEvent) => {
    // Make sure we fully stop all event behavior
    e.preventDefault();
    e.stopPropagation();
    
    if (!newTodoText.trim()) return;

    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText.trim(),
      completed: false
    };

    const updatedTodos = [...todos, newTodo];
    
    // Update local state
    setTodos(updatedTodos);
    setNewTodoText('');
    
    // Immediately save to parent component
    onUpdateTodos(updatedTodos);
    
    // Focus the input field again
    inputRef.current?.focus();
  };

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = todos.map(todo => 
      todo.id === todoId 
        ? { ...todo, completed: !todo.completed } 
        : todo
    );
    setTodos(updatedTodos);
    
    // Save changes immediately when toggling a todo
    onUpdateTodos(updatedTodos);
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedTodos = todos.filter(todo => todo.id !== todoId);
    setTodos(updatedTodos);
    
    // Save changes immediately when deleting a todo
    onUpdateTodos(updatedTodos);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    // Save title changes immediately when focus leaves the input
    onUpdateTitle(title);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

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
        <div className="bg-gray-900 p-4 flex items-center justify-between">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            className="bg-transparent text-white text-xl font-semibold focus:outline-none focus:border-blue-500 border-b border-transparent w-full"
            placeholder="Node Title"
          />
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Only show todo management UI for non-root nodes */}
        {!isRootNode && (
          <>
            {/* Todo list */}
            <div className="flex-1 overflow-y-auto p-4">
              {todos.length === 0 ? (
                <div className="text-gray-400 text-center py-4">
                  No todos yet. Add one below!
                </div>
              ) : (
                <ul className="space-y-2">
                  {todos.map(todo => (
                    <li 
                      key={todo.id}
                      className="flex items-center bg-gray-700 rounded-lg p-3 group"
                    >
                      <Button 
                        variant={todo.completed ? "default" : "outline"}
                        size="icon"
                        className="h-6 w-6 mr-3 flex-shrink-0"
                        onClick={() => handleToggleTodo(todo.id)}
                      >
                        {todo.completed && <Check className="h-4 w-4" />}
                      </Button>
                      
                      <span className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                        {todo.text}
                      </span>
                      
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteTodo(todo.id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            {/* Add todo form */}
            <form onSubmit={handleAddTodo} onClick={handleFormClick} className="p-4 border-t border-gray-700">
              <div className="flex">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none"
                  placeholder="Add a new todo..."
                />
                <Button 
                  type="submit" 
                  className="rounded-l-none"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddTodo(e as unknown as React.FormEvent);
                  }}
                >
                  Add
                </Button>
              </div>
            </form>
          </>
    
        )}
        
        {/* Action buttons */}
        <div className="p-4 border-t border-gray-700 flex space-x-3">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={saveChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          
          {!isRootNode && (
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={onDeleteNode}
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete Node
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
