import { useState } from 'react'
import { MapMeta } from '@/types'
import { Plus, X, Brain, Trash2, Check, Download, Upload, ClipboardPaste } from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  maps: MapMeta[]
  selectedMapId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  onExport: () => void
  onImport: (data: string) => Promise<boolean>
  getProgress: (id: string) => number // 0-100
  progressVersion?: number // Triggers re-render when progress changes
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  maps,
  selectedMapId,
  onSelect,
  onCreate,
  onDelete,
  onExport,
  onImport,
  getProgress,
  progressVersion: _progressVersion, // Used to trigger re-render, not directly accessed
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [importing, setImporting] = useState(false)
  const [importText, setImportText] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim())
    setNewName('')
    setCreating(false)
  }

  const handleImport = async () => {
    if (!importText.trim()) return
    try {
      const success = await onImport(importText.trim())
      if (success) {
        setImportText('')
        setImporting(false)
      }
    } catch (error) {
      console.error('Import failed:', error)
    }
  }

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {!collapsed && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={onToggleCollapse}
        />
      )}
      
      <div
        className={`fixed inset-y-0 left-0 flex flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900
          text-white transition-all duration-500 ease-in-out z-40 shadow-2xl border-r border-slate-700/50
          ${collapsed ? '-translate-x-full' : 'translate-x-0'} w-80`}
      >
        {/* Header with glassmorphism effect */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 backdrop-blur-lg" />
          <div className="relative flex items-center justify-between p-6 border-b border-slate-700/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MindTodos
                </h1>
                <p className="text-xs text-slate-400">Düşüncelerini organize et</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="hover:bg-slate-700/50 active:bg-slate-600/50 rounded-xl transition-all duration-200 h-11 w-11 min-w-[44px] min-h-[44px] touch-manipulation"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content area with custom scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
          {/* Maps list */}
          <div className="space-y-3">
            {maps.length > 0 && (
              <div className="flex items-center gap-2 px-2 mb-4">
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1" />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Haritalarım ({maps.length})
                </span>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent flex-1" />
              </div>
            )}
            
            {maps.map((map) => {
              const progress = getProgress(map.id)
              const isSelected = selectedMapId === map.id
              return (
                <div
                  key={map.id}
                  className={`group relative cursor-pointer rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
                    ${isSelected 
                      ? 'border-blue-500/50 bg-gradient-to-br from-blue-900/30 via-slate-800/50 to-purple-900/30 shadow-lg shadow-blue-500/20' 
                      : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-700/50 hover:border-slate-600'
                    }`}
                  onClick={() => onSelect(map.id)}
                >
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-500 rounded-full" />
                  )}
                  
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg transition-all duration-200 ${
                          isSelected 
                            ? 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg' 
                            : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                        }`}>
                          <Brain className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate text-sm">
                            {map.name}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {progress >= 100 ? '✨ Tamamlandı' : `${Math.round(progress)}% tamamlandı`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-40 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity h-10 w-10 min-w-[44px] min-h-[44px] hover:bg-red-500/20 hover:text-red-400 active:bg-red-500/30 active:text-red-400 rounded-lg touch-manipulation"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(map.id)
                        }}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {/* Progress bar with gradient */}
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress >= 100 
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500 shadow-lg shadow-green-500/30' 
                              : progress >= 50 
                              ? 'bg-gradient-to-r from-blue-400 to-blue-600 shadow-lg shadow-blue-500/20' 
                              : 'bg-gradient-to-r from-slate-400 to-slate-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Completion badge */}
                  {progress >= 100 && (
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full p-1 shadow-lg">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Empty state */}
          {maps.length === 0 && !creating && (
            <div className="text-center py-8 px-4">
              <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 mb-4">
                <Brain className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  Henüz hiç MindTodo yok
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  İlk haritanı oluştur ve düşüncelerini organize et
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer with gradient */}
        <div className="p-4 border-t border-slate-700/30">
          <div className="space-y-3">
            {/* Create new map button/form */}
            {creating ? (
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 p-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleCreate()
                  }}
                  className="space-y-2"
                >
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm
                      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                      placeholder:text-slate-400 transition-all duration-200"
                    placeholder="Harita adını girin..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg"
                      disabled={!newName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Oluştur
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {setCreating(false); setNewName('')}}
                      className="rounded-lg bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full rounded-xl border border-dashed border-slate-600 hover:border-blue-500/50
                  bg-slate-800/30 hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-purple-900/30
                  transition-all duration-300 py-3 text-slate-300 hover:text-white group"
                onClick={() => setCreating(true)}
              >
                <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                Yeni MindTodo Oluştur
              </Button>
            )}

            {/* Import/Export buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={onExport}
                className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 active:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 h-11 min-h-[44px] touch-manipulation"
              >
                <Download className="h-5 w-5 mr-2" />
                Export
              </Button>
              <Button
                variant="ghost"
                onClick={() => setImporting(!importing)}
                className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 active:bg-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all duration-200 h-11 min-h-[44px] touch-manipulation"
              >
                <Upload className="h-5 w-5 mr-2" />
                Import
              </Button>
            </div>
            
            {/* Import text area */}
            {importing && (
              <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="JSON verisini buraya yapıştırın..."
                  className="w-full h-24 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={handleImport}
                    disabled={!importText.trim()}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg"
                  >
                    <ClipboardPaste className="h-4 w-4 mr-2" />
                    İçe Aktar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {setImporting(false); setImportText('')}}
                    className="rounded-lg bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            <div className="text-center">
              <p className="text-xs text-slate-500">
                Düşüncelerini görselleştir • Hedeflerini takip et
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 