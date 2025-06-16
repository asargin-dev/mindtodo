import { BrainMap } from './components/BrainMap'
import { useEffect, useState } from 'react'
import { MapMeta, TodoNode, TodoItem } from './types'
import { Sidebar } from './components/Sidebar'
import { Button } from './components/ui/button'
import './App.css'

const MAPS_META_KEY = 'mindtodo-maps-meta'

function getMapProgress(mapId: string): number {
  try {
    const nodesRaw = localStorage.getItem(`brainmap-${mapId}-nodes`)
    if (!nodesRaw) return 0
    const nodes = JSON.parse(nodesRaw) as TodoNode[]
    let total = 0
    let completed = 0
    nodes.forEach((node) => {
      total += node.todos?.length || 0
      completed += (node.todos?.filter((t: TodoItem) => t.completed).length) || 0
    })
    return total > 0 ? (completed / total) * 100 : 0
  } catch (e) {
    console.error('Progress calc error', e)
    return 0
  }
}

function App() {
  const [maps, setMaps] = useState<MapMeta[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string>('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false)

  // Load maps meta on mount
  useEffect(() => {
    const raw = localStorage.getItem(MAPS_META_KEY)
    if (raw) {
      try {
        const parsed: MapMeta[] = JSON.parse(raw)
        setMaps(parsed)
        if (parsed.length > 0) {
          setSelectedMapId(parsed[0].id)
        }
      } catch (e) {
        console.error('Failed to parse maps meta', e)
      }
    }
  }, [])

  // Persist meta
  useEffect(() => {
    localStorage.setItem(MAPS_META_KEY, JSON.stringify(maps))
  }, [maps])

  const createMap = (name: string) => {
    const id = Date.now().toString()
    const newMeta = { id, name }
    setMaps((prev) => [...prev, newMeta])
    setSelectedMapId(id)
  }

  const deleteMap = (id: string) => {
    if (!confirm('Bu MindTodo silinsin mi?')) return
    setMaps((prev) => prev.filter((m) => m.id !== id))
    // Temizle localStorage
    localStorage.removeItem(`brainmap-${id}-nodes`)
    localStorage.removeItem(`brainmap-${id}-connections`)

    // Eğer silinen seçiliyse, başka birini seç
    setSelectedMapId((prevSelected) => {
      if (prevSelected === id) {
        const remaining = maps.filter((m) => m.id !== id)
        return remaining[0]?.id || ''
      }
      return prevSelected
    })
  }

  const selectMap = (id: string) => setSelectedMapId(id)

  const toggleSidebar = () => setSidebarCollapsed((c) => !c)

  // Export all data
  const exportData = () => {
    try {
      const exportData = {
        maps: maps,
        data: {} as Record<string, any>
      }
      
      // Collect all map data
      maps.forEach(map => {
        const nodesKey = `brainmap-${map.id}-nodes`
        const connectionsKey = `brainmap-${map.id}-connections`
        
        const nodes = localStorage.getItem(nodesKey)
        const connections = localStorage.getItem(connectionsKey)
        
        if (nodes) exportData.data[nodesKey] = JSON.parse(nodes)
        if (connections) exportData.data[connectionsKey] = JSON.parse(connections)
      })
      
      const dataStr = JSON.stringify(exportData, null, 2)
      
      // Copy to clipboard
      navigator.clipboard.writeText(dataStr).then(() => {
        alert('✅ Veriler panoya kopyalandı! Başka tarayıcıda yapıştırabilirsiniz.')
      }).catch(() => {
        // Fallback: Download as file
        const blob = new Blob([dataStr], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mindtodos-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        alert('📁 Veriler dosya olarak indirildi!')
      })
      
    } catch (error) {
      console.error('Export failed:', error)
      alert('❌ Export sırasında hata oluştu!')
    }
  }
  
  // Import data
  const importData = async (jsonData: string): Promise<boolean> => {
    try {
      const data = JSON.parse(jsonData)
      
      // Validate data structure
      if (!data.maps || !Array.isArray(data.maps) || !data.data) {
        alert('❌ Geçersiz veri formatı!')
        return false
      }
      
      // Confirm import
      const confirmMessage = `${data.maps.length} adet MindTodo içe aktarılacak. Mevcut veriler korunacak. Devam edilsin mi?`
      if (!confirm(confirmMessage)) {
        return false
      }
      
      // Import maps metadata
      const newMaps = data.maps.map((map: MapMeta) => ({
        ...map,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9) // New unique ID
      }))
      
      // Import each map's data with new IDs
      for (let i = 0; i < data.maps.length; i++) {
        const oldMap = data.maps[i]
        const newMap = newMaps[i]
        
        const oldNodesKey = `brainmap-${oldMap.id}-nodes`
        const oldConnectionsKey = `brainmap-${oldMap.id}-connections`
        const newNodesKey = `brainmap-${newMap.id}-nodes`
        const newConnectionsKey = `brainmap-${newMap.id}-connections`
        
        if (data.data[oldNodesKey]) {
          localStorage.setItem(newNodesKey, JSON.stringify(data.data[oldNodesKey]))
        }
        if (data.data[oldConnectionsKey]) {
          localStorage.setItem(newConnectionsKey, JSON.stringify(data.data[oldConnectionsKey]))
        }
      }
      
      // Update maps state
      setMaps(prev => [...prev, ...newMaps])
      
      // Select first imported map
      if (newMaps.length > 0) {
        setSelectedMapId(newMaps[0].id)
      }
      
      alert(`✅ ${newMaps.length} adet MindTodo başarıyla içe aktarıldı!`)
      return true
      
    } catch (error) {
      console.error('Import failed:', error)
      alert('❌ Import sırasında hata oluştu! JSON formatını kontrol edin.')
      return false
    }
  }

  return (
    <div className="app flex">
      <Sidebar
        maps={maps}
        selectedMapId={selectedMapId}
        onSelect={selectMap}
        onCreate={createMap}
        onDelete={deleteMap}
        onExport={exportData}
        onImport={importData}
        getProgress={getMapProgress}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className="flex-1 relative" style={{ marginLeft: sidebarCollapsed ? 0 : '20rem' }}>
        {/* Hamburger menu button - always visible with better design */}
        {sidebarCollapsed && (
          <div className="fixed top-4 left-4 z-50 transition-all duration-300">
            <Button
              variant="ghost"
              size="icon"
              className={`relative h-12 w-12 rounded-xl transition-all duration-300 hover:scale-110 group hamburger-pulse bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-lg border border-slate-700/50 shadow-2xl hover:shadow-blue-500/20`}
              onClick={toggleSidebar}
            >
              {/* Animated hamburger icon with glow effect */}
              <div className="flex flex-col gap-1.5 items-center justify-center hamburger-gradient">
                <div className="h-0.5 w-5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-blue-400/50" />
                <div className="h-0.5 w-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-purple-400/50" />
                <div className="h-0.5 w-5 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-pink-400/50" />
              </div>
              
              {/* Pulse animation ring */}
              <div className="absolute inset-0 rounded-xl border-2 border-blue-400/0 group-hover:border-blue-400/30 transition-all duration-300" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/0 to-purple-400/0 group-hover:from-blue-400/10 group-hover:to-purple-400/10 transition-all duration-300" />
            </Button>
            
            {/* Tooltip when sidebar is collapsed */}
            <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <div className="bg-slate-800 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg border border-slate-700/50 whitespace-nowrap">
                MindTodos Menüsünü Aç
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-800 border-l border-b border-slate-700/50 rotate-45" />
              </div>
            </div>
          </div>
        )}
        {selectedMapId ? (
          <BrainMap key={selectedMapId} mapId={selectedMapId} />
        ) : (
          <div className="h-screen w-full flex items-center justify-center text-gray-500">
            Henüz MindTodo yok. Soldan ekleyebilirsiniz.
          </div>
        )}
      </div>
    </div>
  )
}

export default App
