import { BrainMap } from './components/BrainMap'
import { useCallback, useEffect, useState } from 'react'
import { MapMeta, TodoNode } from './types'
import { Sidebar } from './components/Sidebar'
import { Button } from './components/ui/button'
import { Brain, Sparkles } from 'lucide-react'

const MAPS_META_KEY = 'mindtodo-maps-meta'

function isRootNode(node: TodoNode) {
  if (node.isRoot !== undefined) {
    return node.isRoot
  }
  return node.id === 'root' || ['My Tasks', 'Work', 'Personal'].includes(node.title)
}

function getMapProgress(mapId: string): number {
  try {
    const nodesRaw = localStorage.getItem(`brainmap-${mapId}-nodes`)
    if (!nodesRaw) return 0
    const nodes = JSON.parse(nodesRaw) as TodoNode[]

    const hasExplicitRoot = nodes.some((node) => isRootNode(node))

    const trackableNodes = nodes.filter((node, index) => {
      if (isRootNode(node)) {
        return false
      }
      if (!hasExplicitRoot && index === 0) {
        return false
      }
      return true
    })
    if (trackableNodes.length === 0) return 0

    const successfulNodes = trackableNodes.filter((node) => node.status === 'success').length
    return (successfulNodes / trackableNodes.length) * 100
  } catch (e) {
    console.error('Progress calc error', e)
    return 0
  }
}

function App() {
  const [maps, setMaps] = useState<MapMeta[]>([])
  const [selectedMapId, setSelectedMapId] = useState<string>('')
  // Start collapsed on mobile (< 768px)
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768
    }
    return false
  })
  const [progressVersion, setProgressVersion] = useState(0) // Triggers sidebar progress refresh
  const [isInitialized, setIsInitialized] = useState(false) // Prevents save-before-load race condition
  const selectedMap = maps.find((map) => map.id === selectedMapId)

  // Callback for BrainMap to signal node changes (status updates, additions, deletions)
  const handleNodesChange = useCallback(() => {
    setProgressVersion(v => v + 1)
  }, [])

  // Auto-collapse sidebar on window resize (mobile detection)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && !sidebarCollapsed) {
        setSidebarCollapsed(true)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [sidebarCollapsed])

  // Load maps meta on mount - MUST complete before save effect runs
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
    // Mark as initialized AFTER load attempt - this allows save effect to proceed
    setIsInitialized(true)
  }, [])

  // Persist meta - ONLY after initial load to prevent overwriting with empty array
  useEffect(() => {
    if (!isInitialized) return // Guard: don't save until load effect completes
    localStorage.setItem(MAPS_META_KEY, JSON.stringify(maps))
  }, [maps, isInitialized])

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

  const handleRootTitleChange = useCallback((title: string) => {
    if (!selectedMapId) return
    const normalizedTitle = title.trim()
    setMaps((prevMaps) =>
      prevMaps.map((map) => {
        if (map.id !== selectedMapId) return map
        const nextName = normalizedTitle.length > 0 ? normalizedTitle : map.name
        if (map.name === nextName) return map
        return { ...map, name: nextName }
      })
    )
  }, [selectedMapId])

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
    <>
      {/* Sidebar - fixed positioned, outside main flow */}
      <Sidebar
        maps={maps}
        selectedMapId={selectedMapId}
        onSelect={selectMap}
        onCreate={createMap}
        onDelete={deleteMap}
        onExport={exportData}
        onImport={importData}
        getProgress={getMapProgress}
        progressVersion={progressVersion}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      {/* Main content area - uses padding to account for fixed sidebar */}
      <main
        className="min-h-screen w-full transition-all duration-500 ease-in-out"
        style={{ paddingLeft: sidebarCollapsed ? 0 : '20rem' }}
      >
        {/* Hamburger menu button - shown when sidebar collapsed */}
        {sidebarCollapsed && (
          <div className="fixed top-4 left-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-12 w-12 rounded-xl transition-all duration-300 hover:scale-110 group hamburger-pulse bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-lg border border-slate-700/50 shadow-2xl hover:shadow-blue-500/20"
              onClick={toggleSidebar}
            >
              <div className="flex flex-col gap-1.5 items-center justify-center hamburger-gradient">
                <div className="h-0.5 w-5 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-blue-400/50" />
                <div className="h-0.5 w-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-purple-400/50" />
                <div className="h-0.5 w-5 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full transition-all duration-300 group-hover:w-6 group-hover:shadow-lg group-hover:shadow-pink-400/50" />
              </div>
              <div className="absolute inset-0 rounded-xl border-2 border-blue-400/0 group-hover:border-blue-400/30 transition-all duration-300" />
            </Button>
          </div>
        )}

        {/* Content: Either BrainMap or Empty State */}
        {selectedMapId ? (
          <BrainMap
            key={selectedMapId}
            mapId={selectedMapId}
            mapName={selectedMap?.name ?? 'My Tasks'}
            onRootTitleChange={handleRootTitleChange}
            onNodesChange={handleNodesChange}
          />
        ) : (
          <div className="min-h-screen w-full flex items-center justify-center relative">
            {/* Background decorative elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-full blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center px-6">
              <div className="relative inline-block mb-8">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 border border-slate-700/50 backdrop-blur-sm">
                  <Brain className="h-16 w-16 text-blue-400" />
                </div>
                <div className="absolute -top-2 -right-2 p-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                MindTodo'ya Hoş Geldiniz
              </h2>
              <p className="text-slate-400 text-lg mb-2">
                Düşüncelerinizi görselleştirin, hedeflerinizi takip edin
              </p>
              <p className="text-slate-500 text-sm">
                Başlamak için yeni bir MindTodo oluşturun
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

export default App
