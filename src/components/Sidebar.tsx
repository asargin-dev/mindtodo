import React, { useState } from 'react'
import { MapMeta } from '@/types'
import { Plus, X, Menu, Brain, Trash2, Check } from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  maps: MapMeta[]
  selectedMapId: string
  onSelect: (id: string) => void
  onCreate: (name: string) => void
  onDelete: (id: string) => void
  getProgress: (id: string) => number // 0-100
  collapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  maps,
  selectedMapId,
  onSelect,
  onCreate,
  onDelete,
  getProgress,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = () => {
    if (!newName.trim()) return
    onCreate(newName.trim())
    setNewName('')
    setCreating(false)
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
        className={`fixed inset-y-0 left-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 
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
              className="hover:bg-slate-700/50 rounded-xl transition-all duration-200"
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 hover:bg-red-500/20 hover:text-red-400 rounded-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(map.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
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

          {/* Create new map form */}
          {creating ? (
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleCreate()
                }}
                className="space-y-3"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px bg-gradient-to-r from-blue-500 to-purple-500 flex-1" />
                  <span className="text-xs font-medium text-slate-300">Yeni Harita</span>
                  <div className="h-px bg-gradient-to-r from-purple-500 to-blue-500 flex-1" />
                </div>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-sm 
                    focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 
                    placeholder:text-slate-400 transition-all duration-200"
                  placeholder="Harita adını girin..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl"
                    disabled={!newName.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Oluştur
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => {setCreating(false); setNewName('')}}
                    className="rounded-xl bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 border border-slate-600/50 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full rounded-2xl border-2 border-dashed border-slate-600 hover:border-blue-500/50 
                hover:bg-gradient-to-r hover:from-blue-900/20 hover:to-purple-900/20 transition-all duration-300
                py-6 text-slate-300 hover:text-white group"
              onClick={() => setCreating(true)}
            >
              <Plus className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform" />
              Yeni MindTodo Oluştur
            </Button>
          )}
        </div>

        {/* Footer with gradient */}
        <div className="p-4 border-t border-slate-700/30">
          <div className="text-center">
            <p className="text-xs text-slate-500">
              Düşüncelerini görselleştir • Hedeflerini takip et
            </p>
          </div>
        </div>
      </div>
    </>
  )
} 