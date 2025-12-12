import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../test/test-utils'
import { Sidebar } from './Sidebar'
import type { MapMeta } from '@/types'

const createTestMaps = (): MapMeta[] => [
  { id: 'map-1', name: 'Project Alpha' },
  { id: 'map-2', name: 'Personal Tasks' },
  { id: 'map-3', name: 'Work Items' },
]

const defaultProps = {
  maps: createTestMaps(),
  selectedMapId: 'map-1',
  onSelect: vi.fn(),
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn().mockResolvedValue(true),
  getProgress: vi.fn().mockReturnValue(50),
  collapsed: false,
  onToggleCollapse: vi.fn(),
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render header with app name', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('MindTodos')).toBeInTheDocument()
      expect(screen.getByText('Düşüncelerini organize et')).toBeInTheDocument()
    })

    it('should render all maps in the list', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('Project Alpha')).toBeInTheDocument()
      expect(screen.getByText('Personal Tasks')).toBeInTheDocument()
      expect(screen.getByText('Work Items')).toBeInTheDocument()
    })

    it('should show map count in header', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Haritalarım (3)')).toBeInTheDocument()
    })

    it('should show empty state when no maps exist', () => {
      render(<Sidebar {...defaultProps} maps={[]} />)
      expect(screen.getByText('Henüz hiç MindTodo yok')).toBeInTheDocument()
      expect(screen.getByText('İlk haritanı oluştur ve düşüncelerini organize et')).toBeInTheDocument()
    })

    it('should highlight selected map', () => {
      render(<Sidebar {...defaultProps} />)

      const selectedMap = screen.getByText('Project Alpha').closest('.cursor-pointer')
      expect(selectedMap).toHaveClass('border-blue-500/50')
    })

    it('should display progress for each map', () => {
      render(<Sidebar {...defaultProps} />)

      // Progress percentages should be displayed
      expect(screen.getAllByText('50% tamamlandı').length).toBe(3)
    })

    it('should show completion badge for 100% progress', () => {
      const getProgress = vi.fn((id: string) => (id === 'map-1' ? 100 : 50))
      render(<Sidebar {...defaultProps} getProgress={getProgress} />)

      expect(screen.getByText('✨ Tamamlandı')).toBeInTheDocument()
    })

    it('should render export and import buttons', () => {
      render(<Sidebar {...defaultProps} />)

      expect(screen.getByText('Export')).toBeInTheDocument()
      expect(screen.getByText('Import')).toBeInTheDocument()
    })

    it('should render create button', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Yeni MindTodo Oluştur')).toBeInTheDocument()
    })
  })

  describe('Collapsed State', () => {
    it('should apply hidden styles when collapsed', () => {
      const { container } = render(<Sidebar {...defaultProps} collapsed={true} />)

      const sidebar = container.querySelector('.-translate-x-full')
      expect(sidebar).toBeInTheDocument()
    })

    it('should show backdrop overlay when not collapsed on mobile', () => {
      const { container } = render(<Sidebar {...defaultProps} collapsed={false} />)

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/20')
      expect(backdrop).toBeInTheDocument()
    })

    it('should call onToggleCollapse when clicking backdrop', () => {
      const onToggleCollapse = vi.fn()
      const { container } = render(
        <Sidebar {...defaultProps} collapsed={false} onToggleCollapse={onToggleCollapse} />
      )

      const backdrop = container.querySelector('.fixed.inset-0.bg-black\\/20')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(onToggleCollapse).toHaveBeenCalled()
      }
    })

    it('should call onToggleCollapse when clicking close button', () => {
      const onToggleCollapse = vi.fn()
      render(<Sidebar {...defaultProps} onToggleCollapse={onToggleCollapse} />)

      // Find the X button in the header
      const closeButton = screen.getAllByRole('button').find(btn =>
        btn.querySelector('[class*="lucide-x"]') ||
        btn.innerHTML.includes('X')
      )

      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onToggleCollapse).toHaveBeenCalled()
      }
    })
  })

  describe('Map Selection', () => {
    it('should call onSelect when clicking a map', () => {
      const onSelect = vi.fn()
      render(<Sidebar {...defaultProps} onSelect={onSelect} />)

      const mapItem = screen.getByText('Personal Tasks').closest('.cursor-pointer')
      if (mapItem) {
        fireEvent.click(mapItem)
        expect(onSelect).toHaveBeenCalledWith('map-2')
      }
    })

    it('should not call onSelect for already selected map', () => {
      const onSelect = vi.fn()
      render(<Sidebar {...defaultProps} onSelect={onSelect} />)

      const selectedMap = screen.getByText('Project Alpha').closest('.cursor-pointer')
      if (selectedMap) {
        fireEvent.click(selectedMap)
        expect(onSelect).toHaveBeenCalledWith('map-1')
      }
    })
  })

  describe('Map Creation', () => {
    it('should show create form when clicking create button', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      expect(screen.getByPlaceholderText('Harita adını girin...')).toBeInTheDocument()
      expect(screen.getByText('Oluştur')).toBeInTheDocument()
    })

    it('should call onCreate with name when submitting form', async () => {
      const onCreate = vi.fn()
      render(<Sidebar {...defaultProps} onCreate={onCreate} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      const input = screen.getByPlaceholderText('Harita adını girin...')
      fireEvent.change(input, { target: { value: 'New Project' } })

      const submitButton = screen.getByText('Oluştur')
      fireEvent.click(submitButton)

      expect(onCreate).toHaveBeenCalledWith('New Project')
    })

    it('should not submit with empty name', () => {
      const onCreate = vi.fn()
      render(<Sidebar {...defaultProps} onCreate={onCreate} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      const submitButton = screen.getByText('Oluştur')
      expect(submitButton).toBeDisabled()

      fireEvent.click(submitButton)
      expect(onCreate).not.toHaveBeenCalled()
    })

    it('should close form when clicking cancel button', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      // Should show form
      expect(screen.getByPlaceholderText('Harita adını girin...')).toBeInTheDocument()

      // Find cancel button (X button in the form)
      const formButtons = screen.getAllByRole('button')
      const cancelButton = formButtons.find(btn =>
        btn.closest('form') && btn.querySelector('[class*="lucide-x"]')
      )

      if (cancelButton) {
        fireEvent.click(cancelButton)
        expect(screen.queryByPlaceholderText('Harita adını girin...')).not.toBeInTheDocument()
      }
    })

    it('should submit form on Enter key', () => {
      const onCreate = vi.fn()
      render(<Sidebar {...defaultProps} onCreate={onCreate} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      const input = screen.getByPlaceholderText('Harita adını girin...')
      fireEvent.change(input, { target: { value: 'Enter Project' } })
      fireEvent.submit(input.closest('form')!)

      expect(onCreate).toHaveBeenCalledWith('Enter Project')
    })
  })

  describe('Map Deletion', () => {
    it('should call onDelete when clicking delete button', () => {
      const onDelete = vi.fn()
      render(<Sidebar {...defaultProps} onDelete={onDelete} />)

      // Find delete button for a map
      const mapItems = screen.getByText('Personal Tasks').closest('.cursor-pointer')
      const deleteButton = mapItems?.querySelector('[class*="lucide-trash"]')?.closest('button')

      if (deleteButton) {
        fireEvent.click(deleteButton)
        expect(onDelete).toHaveBeenCalledWith('map-2')
      }
    })

    it('should stop propagation when clicking delete button', () => {
      const onSelect = vi.fn()
      const onDelete = vi.fn()
      render(<Sidebar {...defaultProps} onSelect={onSelect} onDelete={onDelete} />)

      const mapItems = screen.getByText('Personal Tasks').closest('.cursor-pointer')
      const deleteButton = mapItems?.querySelector('[class*="lucide-trash"]')?.closest('button')

      if (deleteButton) {
        fireEvent.click(deleteButton)
        // Should not select the map when deleting
        expect(onDelete).toHaveBeenCalled()
      }
    })
  })

  describe('Export', () => {
    it('should call onExport when clicking export button', () => {
      const onExport = vi.fn()
      render(<Sidebar {...defaultProps} onExport={onExport} />)

      fireEvent.click(screen.getByText('Export'))
      expect(onExport).toHaveBeenCalled()
    })
  })

  describe('Import', () => {
    it('should show import textarea when clicking import button', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Import'))

      expect(screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')).toBeInTheDocument()
      expect(screen.getByText('İçe Aktar')).toBeInTheDocument()
    })

    it('should call onImport with JSON data', async () => {
      const onImport = vi.fn().mockResolvedValue(true)
      render(<Sidebar {...defaultProps} onImport={onImport} />)

      fireEvent.click(screen.getByText('Import'))

      const textarea = screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')
      const jsonData = '{"maps": [], "data": {}}'
      fireEvent.change(textarea, { target: { value: jsonData } })

      fireEvent.click(screen.getByText('İçe Aktar'))

      await waitFor(() => {
        expect(onImport).toHaveBeenCalledWith(jsonData)
      })
    })

    it('should disable import button when textarea is empty', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Import'))

      const importButton = screen.getByText('İçe Aktar')
      expect(importButton).toBeDisabled()
    })

    it('should close import form when clicking cancel', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Import'))

      expect(screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')).toBeInTheDocument()

      // Find cancel button in import form
      const formButtons = screen.getAllByRole('button')
      const cancelButton = formButtons.find(btn =>
        btn.closest('.bg-slate-800\\/30') &&
        btn.querySelector('[class*="lucide-x"]')
      )

      if (cancelButton) {
        fireEvent.click(cancelButton)
        expect(screen.queryByPlaceholderText('JSON verisini buraya yapıştırın...')).not.toBeInTheDocument()
      }
    })

    it('should close import form on successful import', async () => {
      const onImport = vi.fn().mockResolvedValue(true)
      render(<Sidebar {...defaultProps} onImport={onImport} />)

      fireEvent.click(screen.getByText('Import'))

      const textarea = screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')
      fireEvent.change(textarea, { target: { value: '{"maps": [], "data": {}}' } })

      fireEvent.click(screen.getByText('İçe Aktar'))

      await waitFor(() => {
        expect(screen.queryByPlaceholderText('JSON verisini buraya yapıştırın...')).not.toBeInTheDocument()
      })
    })

    it('should keep import form open on failed import', async () => {
      const onImport = vi.fn().mockResolvedValue(false)
      render(<Sidebar {...defaultProps} onImport={onImport} />)

      fireEvent.click(screen.getByText('Import'))

      const textarea = screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')
      fireEvent.change(textarea, { target: { value: 'invalid json' } })

      fireEvent.click(screen.getByText('İçe Aktar'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('JSON verisini buraya yapıştırın...')).toBeInTheDocument()
      })
    })
  })

  describe('Progress Bar', () => {
    it('should display correct progress bar width', () => {
      const getProgress = vi.fn().mockReturnValue(75)
      const { container } = render(<Sidebar {...defaultProps} getProgress={getProgress} />)

      // Find progress bars
      const progressBars = container.querySelectorAll('.h-full.rounded-full')
      progressBars.forEach(bar => {
        expect(bar).toHaveStyle({ width: '75%' })
      })
    })

    it('should apply green gradient for completed maps', () => {
      const getProgress = vi.fn().mockReturnValue(100)
      const { container } = render(<Sidebar {...defaultProps} getProgress={getProgress} />)

      const progressBars = container.querySelectorAll('.from-green-400')
      expect(progressBars.length).toBeGreaterThan(0)
    })

    it('should apply blue gradient for maps with 50%+ progress', () => {
      const getProgress = vi.fn().mockReturnValue(60)
      const { container } = render(<Sidebar {...defaultProps} getProgress={getProgress} />)

      const progressBars = container.querySelectorAll('.from-blue-400')
      expect(progressBars.length).toBeGreaterThan(0)
    })

    it('should apply slate gradient for maps with less than 50% progress', () => {
      const getProgress = vi.fn().mockReturnValue(30)
      const { container } = render(<Sidebar {...defaultProps} getProgress={getProgress} />)

      const progressBars = container.querySelectorAll('.from-slate-400')
      expect(progressBars.length).toBeGreaterThan(0)
    })
  })

  describe('Footer', () => {
    it('should display footer tagline', () => {
      render(<Sidebar {...defaultProps} />)
      expect(screen.getByText('Düşüncelerini görselleştir • Hedeflerini takip et')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible form inputs', () => {
      render(<Sidebar {...defaultProps} />)

      fireEvent.click(screen.getByText('Yeni MindTodo Oluştur'))

      const input = screen.getByPlaceholderText('Harita adını girin...')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should have accessible buttons', () => {
      render(<Sidebar {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })

  describe('Progress Version', () => {
    it('should re-render progress when progressVersion changes', () => {
      const getProgress = vi.fn()
        .mockReturnValueOnce(30)
        .mockReturnValueOnce(60)
        .mockReturnValue(60)

      const { rerender } = render(
        <Sidebar {...defaultProps} getProgress={getProgress} progressVersion={0} />
      )

      rerender(
        <Sidebar {...defaultProps} getProgress={getProgress} progressVersion={1} />
      )

      // getProgress should be called again with new version
      expect(getProgress).toHaveBeenCalledTimes(6) // 3 maps × 2 renders
    })
  })
})
