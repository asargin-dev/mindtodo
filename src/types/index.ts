export interface Position {
  x: number;
  y: number;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoNode {
  id: string;
  title: string;
  position: Position;
  todos: Todo[];
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}
