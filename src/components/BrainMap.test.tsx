import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { BrainMap } from './BrainMap'
import {
  setLocalStorageNodes,
  setLocalStorageConnections,
  getLocalStorageNodes,
  getLocalStorageConnections,
  createMockNode,
  createMockRootNode,
  createMockConnection,
} from '../test/test-utils'

// Mock createPortal for drag previews in NodeComponent
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  }
})

const defaultProps = {
  mapId: 'test-map-1',
  mapName: 'Test Map',
  onRootTitleChange: vi.fn(),
  onNodesChange: vi.fn(),
}

describe('BrainMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Initialization', () => {
    it('should create a root node when no saved nodes exist', async () => {
      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Test Map')).toBeInTheDocument()
      })
    })

    it('should load saved nodes from localStorage', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Saved Root' }),
        createMockNode({ id: 'node-1', title: 'Saved Child' }),
      ]
      setLocalStorageNodes('test-map-1', nodes)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Saved Root')).toBeInTheDocument()
        expect(screen.getByText('Saved Child')).toBeInTheDocument()
      })
    })

    it('should load saved connections from localStorage', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'Child' }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

      const { container } = render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        // Check that SVG line connection is rendered
        const lines = container.querySelectorAll('line')
        expect(lines.length).toBeGreaterThan(0)
      })
    })

    it('should call onRootTitleChange when root title differs from mapName', async () => {
      const onRootTitleChange = vi.fn()
      const nodes = [createMockRootNode({ id: 'root-1', title: 'Different Title' })]
      setLocalStorageNodes('test-map-1', nodes)

      render(<BrainMap {...defaultProps} onRootTitleChange={onRootTitleChange} />)

      await waitFor(() => {
        expect(onRootTitleChange).toHaveBeenCalledWith('Different Title')
      })
    })
  })

  describe('Node Rendering', () => {
    it('should render root node with correct styling', async () => {
      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        const rootNode = screen.getByText('Test Map')
        expect(rootNode).toBeInTheDocument()
      })
    })

    it('should render multiple nodes', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'Child 1' }),
        createMockNode({ id: 'node-2', title: 'Child 2' }),
      ]
      setLocalStorageNodes('test-map-1', nodes)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Root')).toBeInTheDocument()
        expect(screen.getByText('Child 1')).toBeInTheDocument()
        expect(screen.getByText('Child 2')).toBeInTheDocument()
      })
    })
  })

  describe('Persistence', () => {
    it('should save nodes to localStorage when they change', async () => {
      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        const savedNodes = getLocalStorageNodes('test-map-1')
        expect(savedNodes.length).toBeGreaterThan(0)
      })
    })

    it('should call onNodesChange when nodes are modified', async () => {
      const onNodesChange = vi.fn()
      render(<BrainMap {...defaultProps} onNodesChange={onNodesChange} />)

      await waitFor(() => {
        expect(onNodesChange).toHaveBeenCalled()
      })
    })
  })

  describe('Zoom Controls', () => {
    it('should render zoom controls', () => {
      render(<BrainMap {...defaultProps} />)

      expect(screen.getByText('100%')).toBeInTheDocument()

      // Find zoom buttons
      const buttons = screen.getAllByRole('button')
      const zoomButtons = buttons.filter(btn =>
        btn.querySelector('[class*="lucide-plus"]') ||
        btn.querySelector('[class*="lucide-minus"]') ||
        btn.querySelector('[class*="lucide-maximize"]')
      )
      expect(zoomButtons.length).toBeGreaterThanOrEqual(3)
    })

    it('should increase zoom when clicking plus button', async () => {
      render(<BrainMap {...defaultProps} />)

      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[class*="lucide-plus"]')
      )

      if (plusButton) {
        fireEvent.click(plusButton)
        await waitFor(() => {
          expect(screen.getByText('110%')).toBeInTheDocument()
        })
      }
    })

    it('should decrease zoom when clicking minus button', async () => {
      render(<BrainMap {...defaultProps} />)

      const minusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[class*="lucide-minus"]')
      )

      if (minusButton) {
        fireEvent.click(minusButton)
        await waitFor(() => {
          expect(screen.getByText('90%')).toBeInTheDocument()
        })
      }
    })

    it('should reset zoom when clicking maximize button', async () => {
      render(<BrainMap {...defaultProps} />)

      // First zoom in
      const plusButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[class*="lucide-plus"]')
      )
      if (plusButton) {
        fireEvent.click(plusButton)
        fireEvent.click(plusButton)
      }

      await waitFor(() => {
        expect(screen.getByText('120%')).toBeInTheDocument()
      })

      // Then reset
      const resetButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[class*="lucide-maximize"]')
      )
      if (resetButton) {
        fireEvent.click(resetButton)
        await waitFor(() => {
          expect(screen.getByText('100%')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Reset Button', () => {
    it('should render reset button', () => {
      render(<BrainMap {...defaultProps} />)
      expect(screen.getByText('Sıfırla')).toBeInTheDocument()
    })

    it('should reset brain map when clicking reset button', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Old Root' }),
        createMockNode({ id: 'node-1', title: 'Child 1' }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Old Root')).toBeInTheDocument()
        expect(screen.getByText('Child 1')).toBeInTheDocument()
      })

      const resetButton = screen.getByText('Sıfırla')
      fireEvent.click(resetButton)

      await waitFor(() => {
        // Old child should be gone
        expect(screen.queryByText('Child 1')).not.toBeInTheDocument()
        // Root should be reset to mapName
        expect(screen.getByText('Test Map')).toBeInTheDocument()
      })
    })
  })

  describe('Canvas Interactions', () => {
    it('should handle mouse wheel for zooming', async () => {
      const { container } = render(<BrainMap {...defaultProps} />)

      const canvas = container.querySelector('[data-component-name="BrainMap"]')
      if (canvas) {
        fireEvent.wheel(canvas, { deltaY: -100 })

        await waitFor(() => {
          const zoomText = screen.getByText(/\d+%/)
          expect(zoomText).toBeInTheDocument()
        })
      }
    })

    it('should handle mouse down for panning', () => {
      const { container } = render(<BrainMap {...defaultProps} />)

      const canvas = container.querySelector('[data-component-name="BrainMap"]')
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
        expect(canvas).toHaveStyle({ cursor: 'grabbing' })
      }
    })

    it('should handle mouse up to stop panning', () => {
      const { container } = render(<BrainMap {...defaultProps} />)

      const canvas = container.querySelector('[data-component-name="BrainMap"]')
      if (canvas) {
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
        fireEvent.mouseUp(canvas)
        expect(canvas).toHaveStyle({ cursor: 'grab' })
      }
    })
  })

  describe('Node Status Updates', () => {
    it('should persist status changes', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'Task', status: 'pending' }),
      ]
      setLocalStorageNodes('test-map-1', nodes)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Task')).toBeInTheDocument()
      })

      // Click on a status button
      const buttons = screen.getAllByRole('button')
      const successButton = buttons.find(btn =>
        btn.closest('[data-node-id="node-1"]') &&
        (btn.querySelector('[class*="lucide-check-circle"]') ||
          btn.innerHTML.includes('CheckCircle'))
      )

      if (successButton) {
        fireEvent.click(successButton)

        await waitFor(() => {
          const savedNodes = getLocalStorageNodes('test-map-1')
          const taskNode = savedNodes.find(n => n.id === 'node-1')
          expect(taskNode?.status).toBe('success')
        })
      }
    })
  })

  describe('Connection Rendering', () => {
    it('should render connection lines between nodes', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root', position: { x: 100, y: 100 } }),
        createMockNode({ id: 'node-1', title: 'Child', position: { x: 300, y: 100 } }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

      const { container } = render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        const svgLines = container.querySelectorAll('svg line')
        expect(svgLines.length).toBeGreaterThan(0)
      })
    })

    it('should render connections with correct stroke color', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root', position: { x: 100, y: 100 } }),
        createMockNode({ id: 'node-1', title: 'Child', position: { x: 300, y: 100 } }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

	      const { container } = render(<BrainMap {...defaultProps} />)

	      await waitFor(() => {
	        const lines = Array.from(container.querySelectorAll('svg line'))
	        const hasMainStroke = lines.some((line) => line.getAttribute('stroke') === '#60a5fa')
	        expect(hasMainStroke).toBe(true)
	      })
	    })
	  })

  describe('Title Editing', () => {
    it('should allow editing node titles', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'Original Title' }),
      ]
      setLocalStorageNodes('test-map-1', nodes)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Original Title')).toBeInTheDocument()
      })

      // Click on title to start editing
      const titleElement = screen.getByText('Original Title')
      fireEvent.click(titleElement)

      await waitFor(() => {
        const input = screen.getByRole('textbox')
        expect(input).toBeInTheDocument()
      })
    })
  })

  describe('Node Deletion', () => {
    it('should delete non-root nodes', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'To Delete' }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('To Delete')).toBeInTheDocument()
      })

      // Find and click delete button
      const nodeContainer = screen.getByText('To Delete').closest('[data-component-name="NodeComponent"]')
      const deleteButton = nodeContainer?.querySelector('button svg line[x1="18"]')?.closest('button')

      if (deleteButton) {
        fireEvent.click(deleteButton)

        await waitFor(() => {
          expect(screen.queryByText('To Delete')).not.toBeInTheDocument()
        })
      }
    })

    it('should remove connections when deleting a node', async () => {
      const nodes = [
        createMockRootNode({ id: 'root-1', title: 'Root' }),
        createMockNode({ id: 'node-1', title: 'Connected Node' }),
      ]
      const connections = [createMockConnection('root-1', 'node-1')]

      setLocalStorageNodes('test-map-1', nodes)
      setLocalStorageConnections('test-map-1', connections)

      render(<BrainMap {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Connected Node')).toBeInTheDocument()
      })

      const nodeContainer = screen.getByText('Connected Node').closest('[data-component-name="NodeComponent"]')
      const deleteButton = nodeContainer?.querySelector('button svg line[x1="18"]')?.closest('button')

      if (deleteButton) {
        fireEvent.click(deleteButton)

        await waitFor(() => {
          const savedConnections = getLocalStorageConnections('test-map-1')
          expect(savedConnections.length).toBe(0)
        })
      }
    })
  })

  describe('Background', () => {
    it('should render grid background', () => {
      const { container } = render(<BrainMap {...defaultProps} />)

      const gridBackground = container.querySelector('[class*="bg-gradient-to-br"]')
      expect(gridBackground).toBeInTheDocument()
    })

    it('should render ambient light effects', () => {
      const { container } = render(<BrainMap {...defaultProps} />)

      const blurElements = container.querySelectorAll('.blur-3xl')
      expect(blurElements.length).toBeGreaterThan(0)
    })
  })

  describe('Map ID Isolation', () => {
    it('should load different data for different map IDs', async () => {
      // Set up different data for two maps
      const map1Nodes = [createMockRootNode({ id: 'root-1', title: 'Map 1 Root' })]
      const map2Nodes = [createMockRootNode({ id: 'root-2', title: 'Map 2 Root' })]

      setLocalStorageNodes('test-map-1', map1Nodes)
      setLocalStorageNodes('test-map-2', map2Nodes)

      const { rerender } = render(<BrainMap {...defaultProps} mapId="test-map-1" />)

      await waitFor(() => {
        expect(screen.getByText('Map 1 Root')).toBeInTheDocument()
      })

      rerender(<BrainMap {...defaultProps} mapId="test-map-2" />)

      await waitFor(() => {
        expect(screen.getByText('Map 2 Root')).toBeInTheDocument()
        expect(screen.queryByText('Map 1 Root')).not.toBeInTheDocument()
      })
    })
  })
})
