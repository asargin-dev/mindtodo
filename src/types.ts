// Define the types for the MindTodo application

// Position type for coordinates
export interface Position {
  x: number;
  y: number;
}

// Todo item interface
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

// Node in the brain map
export interface TodoNode {
  id: string;
  title: string;
  position: Position;
  todos: TodoItem[];
}

// Connection between nodes
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

// After Connection type, add MapMeta interface
export interface MapMeta {
  id: string;
  name: string;
}

// Alias for TodoItem for compatibility with existing code
export type Todo = TodoItem;
