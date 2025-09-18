export interface Position {
  x: number;
  y: number;
}

export type NodeStatus = 'pending' | 'success' | 'failed';

export interface TodoNode {
  id: string;
  title: string;
  position: Position;
  status: NodeStatus;
  isRoot?: boolean;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface MapMeta {
  id: string;
  name: string;
}
