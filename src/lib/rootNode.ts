import type { TodoNode } from '@/types'

export const ROOT_TITLES = new Set(['My Tasks', 'Work', 'Personal'])

export function isRootNode(node: TodoNode): boolean {
  if (typeof node.isRoot === 'boolean') return node.isRoot
  return node.id === 'root' || ROOT_TITLES.has(node.title)
}

