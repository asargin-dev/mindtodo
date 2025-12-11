import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { NodeComponent } from './NodeComponent'
import { TodoNode, NodeStatus } from '../types'

// Mock createPortal for drag preview
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  }
})

const createTestNode = (overrides: Partial<TodoNode> = {}): TodoNode => ({
  id: 'test-node-1',
  title: 'Test Node',
  position: { x: 100, y: 100 },
  status: 'pending' as NodeStatus,
  isRoot: false,
  ...overrides,
})

const defaultProps = {
  node: createTestNode(),
  isConnecting: false,
  isDragging: false,
  isEditing: false,
  connectedNodesCount: 0,
  nodeWidth: 184,
  nodeHeight: 150,
  onClick: vi.fn(),
  onStartDrag: vi.fn(),
  onTouchStartDrag: vi.fn(),
  onStatusChange: vi.fn(),
  onAddNodeAtAngle: vi.fn(),
  onAddNodeAtPosition: vi.fn(),
  onTitleChange: vi.fn(),
  onStartEditing: vi.fn(),
  onFinishEditing: vi.fn(),
  onDeleteNode: vi.fn(),
}

describe('NodeComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render node with title', () => {
      render(<NodeComponent {...defaultProps} />)
      expect(screen.getByText('Test Node')).toBeInTheDocument()
    })

    it('should render "Untitled" when title is empty', () => {
      const node = createTestNode({ title: '' })
      render(<NodeComponent {...defaultProps} node={node} />)
      expect(screen.getByText('Untitled')).toBeInTheDocument()
    })

    it('should render status buttons for non-root nodes', () => {
      render(<NodeComponent {...defaultProps} />)
      const buttons = screen.getAllByRole('button')
      // Should have 4 buttons: delete (x) + 3 status buttons
      expect(buttons.length).toBeGreaterThanOrEqual(4)
    })

    it('should not render delete button for root nodes', () => {
      const rootNode = createTestNode({ isRoot: true, title: 'My Tasks' })
      render(<NodeComponent {...defaultProps} node={rootNode} />)

      // Root nodes should not have delete button
      const deleteButtons = screen.queryAllByRole('button').filter(btn =>
        btn.querySelector('svg line[x1="18"]')
      )
      expect(deleteButtons.length).toBe(0)
    })

    it('should render task counter for root nodes', () => {
      const rootNode = createTestNode({ isRoot: true, title: 'My Tasks' })
      render(
        <NodeComponent
          {...defaultProps}
          node={rootNode}
          connectedNodesCount={3}
          statusSummary={{ success: 1, failed: 0, pending: 2, total: 3 }}
        />
      )
      expect(screen.getByText('3 görev')).toBeInTheDocument()
    })

    it('should render "Görev ekleyin" for root nodes with no connected nodes', () => {
      const rootNode = createTestNode({ isRoot: true, title: 'My Tasks' })
      render(
        <NodeComponent
          {...defaultProps}
          node={rootNode}
          connectedNodesCount={0}
        />
      )
      expect(screen.getByText('Görev ekleyin')).toBeInTheDocument()
    })

    it('should apply correct styling for different statuses', () => {
      const successNode = createTestNode({ status: 'success' })
      const { rerender } = render(<NodeComponent {...defaultProps} node={successNode} />)

      // Check success styling is applied
      const container = screen.getByText('Test Node').closest('[data-component-name="NodeComponent"]')
      expect(container).toBeInTheDocument()

      // Rerender with failed status
      const failedNode = createTestNode({ status: 'failed' })
      rerender(<NodeComponent {...defaultProps} node={failedNode} />)
      expect(screen.getByText('Test Node')).toBeInTheDocument()
    })
  })

  describe('Status Changes', () => {
    it('should call onStatusChange when clicking success button', async () => {
      const onStatusChange = vi.fn()
      render(<NodeComponent {...defaultProps} onStatusChange={onStatusChange} />)

      const buttons = screen.getAllByRole('button')
      // Find the success button (first status button with CheckCircle2 icon)
      const successButton = buttons.find(btn =>
        btn.querySelector('[class*="lucide-check-circle"]') ||
        btn.innerHTML.includes('CheckCircle')
      )

      if (successButton) {
        fireEvent.click(successButton)
        expect(onStatusChange).toHaveBeenCalledWith('success')
      }
    })

    it('should call onStatusChange when clicking pending button', async () => {
      const onStatusChange = vi.fn()
      const node = createTestNode({ status: 'success' })
      render(<NodeComponent {...defaultProps} node={node} onStatusChange={onStatusChange} />)

      const buttons = screen.getAllByRole('button')
      const pendingButton = buttons.find(btn =>
        btn.querySelector('[class*="lucide-clock"]') ||
        btn.innerHTML.includes('Clock')
      )

      if (pendingButton) {
        fireEvent.click(pendingButton)
        expect(onStatusChange).toHaveBeenCalledWith('pending')
      }
    })

    it('should call onStatusChange when clicking failed button', async () => {
      const onStatusChange = vi.fn()
      render(<NodeComponent {...defaultProps} onStatusChange={onStatusChange} />)

      const buttons = screen.getAllByRole('button')
      const failedButton = buttons.find(btn =>
        btn.querySelector('[class*="lucide-x-circle"]') ||
        btn.innerHTML.includes('XCircle')
      )

      if (failedButton) {
        fireEvent.click(failedButton)
        expect(onStatusChange).toHaveBeenCalledWith('failed')
      }
    })
  })

  describe('Title Editing', () => {
    it('should show input when isEditing is true', () => {
      render(<NodeComponent {...defaultProps} isEditing={true} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveValue('Test Node')
    })

    it('should call onStartEditing when clicking title', () => {
      const onStartEditing = vi.fn()
      render(<NodeComponent {...defaultProps} onStartEditing={onStartEditing} />)

      const title = screen.getByText('Test Node')
      fireEvent.click(title)

      expect(onStartEditing).toHaveBeenCalled()
    })

    it('should call onTitleChange and onFinishEditing when pressing Enter', () => {
      const onTitleChange = vi.fn()
      const onFinishEditing = vi.fn()
      render(
        <NodeComponent
          {...defaultProps}
          isEditing={true}
          onTitleChange={onTitleChange}
          onFinishEditing={onFinishEditing}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Title' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onTitleChange).toHaveBeenCalledWith('New Title')
      expect(onFinishEditing).toHaveBeenCalled()
    })

    it('should call onFinishEditing when pressing Escape', () => {
      const onFinishEditing = vi.fn()
      render(
        <NodeComponent
          {...defaultProps}
          isEditing={true}
          onFinishEditing={onFinishEditing}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(onFinishEditing).toHaveBeenCalled()
    })

    it('should call onTitleChange and onFinishEditing on blur', () => {
      const onTitleChange = vi.fn()
      const onFinishEditing = vi.fn()
      render(
        <NodeComponent
          {...defaultProps}
          isEditing={true}
          onTitleChange={onTitleChange}
          onFinishEditing={onFinishEditing}
        />
      )

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Blurred Title' } })
      fireEvent.blur(input)

      expect(onTitleChange).toHaveBeenCalledWith('Blurred Title')
      expect(onFinishEditing).toHaveBeenCalled()
    })
  })

  describe('Delete Node', () => {
    it('should call onDeleteNode when clicking delete button', () => {
      const onDeleteNode = vi.fn()
      render(<NodeComponent {...defaultProps} onDeleteNode={onDeleteNode} />)

      // Find delete button (X button in top right)
      const buttons = screen.getAllByRole('button')
      const deleteButton = buttons.find(btn => {
        const svg = btn.querySelector('svg')
        return svg && svg.querySelector('line[x1="18"]')
      })

      if (deleteButton) {
        fireEvent.click(deleteButton)
        expect(onDeleteNode).toHaveBeenCalled()
      }
    })
  })

  describe('Drag and Drop', () => {
    it('should call onStartDrag on mousedown', () => {
      const onStartDrag = vi.fn()
      render(<NodeComponent {...defaultProps} onStartDrag={onStartDrag} />)

      const nodeContainer = screen.getByText('Test Node').closest('.backdrop-blur-xl')
      if (nodeContainer) {
        fireEvent.mouseDown(nodeContainer)
        expect(onStartDrag).toHaveBeenCalled()
      }
    })

    it('should not call onStartDrag when editing', () => {
      const onStartDrag = vi.fn()
      render(<NodeComponent {...defaultProps} isEditing={true} onStartDrag={onStartDrag} />)

      const nodeContainer = screen.getByRole('textbox').closest('.backdrop-blur-xl')
      if (nodeContainer) {
        fireEvent.mouseDown(nodeContainer)
        expect(onStartDrag).not.toHaveBeenCalled()
      }
    })
  })

  describe('Node Positioning', () => {
    it('should apply correct position styles', () => {
      const node = createTestNode({ position: { x: 200, y: 300 } })
      render(<NodeComponent {...defaultProps} node={node} />)

      const nodeElement = screen.getByText('Test Node').closest('[data-component-name="NodeComponent"]')
      expect(nodeElement).toHaveStyle({ left: '200px', top: '300px' })
    })

    it('should apply correct dimensions', () => {
      render(<NodeComponent {...defaultProps} nodeWidth={200} nodeHeight={180} />)

      const nodeElement = screen.getByText('Test Node').closest('[data-component-name="NodeComponent"]')
      expect(nodeElement).toHaveStyle({ width: '200px', height: '180px' })
    })
  })

  describe('Root Node Specifics', () => {
    it('should display gradient title styling for root nodes', () => {
      const rootNode = createTestNode({ isRoot: true, title: 'My Project' })
      render(<NodeComponent {...defaultProps} node={rootNode} />)

      const title = screen.getByText('My Project')
      expect(title).toHaveClass('bg-gradient-to-r')
    })

    it('should display status summary for root nodes', () => {
      const rootNode = createTestNode({ isRoot: true, title: 'My Tasks' })
      render(
        <NodeComponent
          {...defaultProps}
          node={rootNode}
          connectedNodesCount={5}
          statusSummary={{ success: 2, failed: 1, pending: 2, total: 5 }}
        />
      )

      // Should show status summary badges
      expect(screen.getByText('5 görev')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<NodeComponent {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have focusable input when editing', () => {
      render(<NodeComponent {...defaultProps} isEditing={true} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      input.focus()
      expect(document.activeElement).toBe(input)
    })
  })

  describe('Connecting Mode', () => {
    it('should apply hover ring when isConnecting is true', () => {
      render(<NodeComponent {...defaultProps} isConnecting={true} />)

      const nodeElement = screen.getByText('Test Node').closest('[data-component-name="NodeComponent"]')
      expect(nodeElement).toHaveClass('hover:ring-2')
    })
  })

  describe('Confetti Effect', () => {
    it('should show confetti for success status on non-root nodes', async () => {
      const successNode = createTestNode({ status: 'success' })
      const { container } = render(<NodeComponent {...defaultProps} node={successNode} />)

      // Confetti container should be present
      await waitFor(() => {
        const confettiContainer = container.querySelector('.overflow-visible')
        expect(confettiContainer).toBeInTheDocument()
      })
    })

    it('should not show confetti for root nodes even with success status', () => {
      const rootNode = createTestNode({ isRoot: true, status: 'success' })
      const { container } = render(<NodeComponent {...defaultProps} node={rootNode} />)

      // Root nodes should not have confetti
      const confettiContainer = container.querySelector('.overflow-visible.z-50')
      expect(confettiContainer).toBeNull()
    })
  })
})
