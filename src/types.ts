// Define the types for the MindTodo application

// Position type for coordinates
export interface Position {
  x: number;
  y: number;
}

export type NodeStatus = 'pending' | 'success' | 'failed';

// Node in the brain map
export interface TodoNode {
  id: string;
  title: string;
  position: Position;
  status: NodeStatus;
  isRoot?: boolean;
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
