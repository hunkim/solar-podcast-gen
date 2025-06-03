"use client"

import { useState, useEffect, forwardRef, useImperativeHandle } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Plus,
  FileText,
  User,
  LogOut,
  Loader2,
  Trash2,
  Edit3,
  Save,
  X,
  MoreVertical,
  Volume2
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { getUserStats, deleteGeneration, updateGenerationTitle, type GenerationRecord, type UserStats } from "@/lib/firestore"
import { db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, onSnapshot, type Unsubscribe } from "firebase/firestore"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  selectedProject: string | null
  onSelectProject: (id: string) => void
  onNewProject: () => void
}

export interface SidebarRef {
  refreshGenerations: () => void
}

export const Sidebar = forwardRef<SidebarRef, SidebarProps>(({ isOpen, onToggle, selectedProject, onSelectProject, onNewProject }, ref) => {
  const { user, loading, signOut, signInWithGoogle } = useAuth()
  const [generations, setGenerations] = useState<GenerationRecord[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [signinError, setSigninError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState<string | null>(null)
  const [editTitleValue, setEditTitleValue] = useState("")

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      loadUserStats()
      setupGenerationsListener()
    } else {
      setGenerations([])
      setUserStats(null)
    }
  }, [user])

  // Setup real-time listener for generations
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null

    if (user) {
      setLoadingData(true)
      
      const q = query(
        collection(db, "generations"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(20)
      )

      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const userGenerations: GenerationRecord[] = querySnapshot.docs.map(doc => {
            const data = doc.data()
            
            return {
              id: doc.id,
              ...data,
              // Ensure timestamps are in the expected format
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              completedAt: data.completedAt,
            } as GenerationRecord
          })
          
          setGenerations(userGenerations)
          setLoadingData(false)
        },
        (error) => {
          console.error("Error listening to generations:", error)
          setLoadingData(false)
        }
      )
    }

    // Cleanup listener on unmount or user change
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [user])

  const loadUserStats = async () => {
    if (!user) return
    
    try {
      const stats = await getUserStats(user.uid)
      setUserStats(stats)
    } catch (error) {
      console.error("Error loading user stats:", error)
    }
  }

  const setupGenerationsListener = () => {
    // This function is now handled by the useEffect above
    // Keeping for backwards compatibility with the ref
  }

  // Expose refresh function to parent components (now triggers stats refresh)
  useImperativeHandle(ref, () => ({
    refreshGenerations: () => {
      if (user) {
        loadUserStats() // Refresh stats, generations are handled by real-time listener
      }
    }
  }))

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const handleSignIn = async () => {
    try {
      setSigninError(null)
      await signInWithGoogle()
    } catch (error: any) {
      setSigninError(error.message || "Failed to sign in")
      // Auto-clear error after 5 seconds
      setTimeout(() => setSigninError(null), 5000)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent, generationId: string) => {
    e.stopPropagation()
    setItemToDelete(generationId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      await deleteGeneration(itemToDelete)
      setGenerations(prev => prev.filter(gen => gen.id !== itemToDelete))
      
      // If the deleted item was selected, clear selection
      if (selectedProject === itemToDelete) {
        onNewProject(); // Use onNewProject instead of onSelectProject with empty string
      }
    } catch (error) {
      console.error("Error deleting generation:", error)
    } finally {
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const handleEditTitleClick = (e: React.MouseEvent, generation: GenerationRecord) => {
    e.stopPropagation()
    setEditingTitle(generation.id)
    setEditTitleValue(generation.title)
  }

  const handleSaveTitle = async (generationId: string) => {
    if (!editTitleValue.trim()) return

    try {
      await updateGenerationTitle(generationId, editTitleValue.trim())
      setGenerations(prev => prev.map(gen => 
        gen.id === generationId 
          ? { ...gen, title: editTitleValue.trim() }
          : gen
      ))
    } catch (error) {
      console.error("Error updating title:", error)
    } finally {
      setEditingTitle(null)
      setEditTitleValue("")
    }
  }

  const formatDate = (timestamp: any) => {
    try {
      if (!timestamp) {
        return 'Unknown'
      }
      
      let date: Date
      
      // Handle Firestore Timestamp objects
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      } 
      // Handle Firestore Timestamp with seconds and nanoseconds
      else if (timestamp && timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
      }
      // Handle ISO string dates
      else if (typeof timestamp === 'string') {
        date = new Date(timestamp)
      }
      // Handle numeric timestamps
      else if (typeof timestamp === 'number') {
        date = new Date(timestamp)
      }
      // Handle Date objects
      else if (timestamp instanceof Date) {
        date = timestamp
      }
      else {
        return 'Unknown'
      }

      // Validate that we have a valid date
      if (isNaN(date.getTime())) {
        return 'Unknown'
      }

      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      
      if (days === 0) return 'Today'
      if (days === 1) return 'Yesterday'
      if (days < 7) return `${days} days ago`
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`
      return date.toLocaleDateString()
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown'
    }
  }

  if (!isOpen) return null

  return (
    <TooltipProvider>
      <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        {/* Login Section */}
        <div className="p-6">
          {user ? (
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName || 'User'}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {user.email}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="p-1 h-auto hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleSignIn}
              variant="outline"
              className="w-full justify-start bg-white border-gray-200 hover:bg-gray-50"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-3" />
              ) : (
                <User className="w-4 h-4 mr-3" />
              )}
              Login
            </Button>
          )}
        </div>

        {/* New Project Section */}
        <div className="px-6 pb-6">
          <Button 
            onClick={onNewProject}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white justify-start"
          >
            <Plus className="w-4 h-4 mr-3" />
            New Project
          </Button>
        </div>

        {/* Recent Projects Section */}
        <div className="flex-1 flex flex-col">
          <div className="px-6 pb-4">
            <h3 className="text-sm font-medium text-gray-700">Recent Projects</h3>
          </div>

          {!user ? (
            <div className="px-6">
              <div className="text-center py-8 text-gray-500">
                <User className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm mb-1">Login to save your project history</p>
                <p className="text-xs text-gray-400">Create and manage your podcast scripts</p>
              </div>
            </div>
          ) : loadingData ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : generations.length === 0 ? (
            <div className="px-6">
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                <p className="text-sm mb-1">No history available</p>
                <Button 
                  variant="link" 
                  className="text-blue-600 hover:text-blue-700 p-0 h-auto"
                  onClick={handleSignIn}
                >
                  Login to save projects
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-2 pb-6">
                {generations.map((generation) => (
                  <div
                    key={generation.id}
                    className={`
                      group p-3 rounded-lg cursor-pointer transition-all duration-200 relative
                      ${selectedProject === generation.id 
                        ? 'bg-blue-50 border border-blue-200' 
                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                      }
                    `}
                    onClick={() => onSelectProject(generation.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-3">
                        {editingTitle === generation.id ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Input
                              value={editTitleValue}
                              onChange={(e) => setEditTitleValue(e.target.value)}
                              className="text-sm h-7 px-2 flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveTitle(generation.id)
                                } else if (e.key === 'Escape') {
                                  setEditingTitle(null)
                                  setEditTitleValue("")
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => handleSaveTitle(generation.id)}
                            >
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 flex-shrink-0"
                              onClick={() => {
                                setEditingTitle(null)
                                setEditTitleValue("")
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h4 className="text-sm font-medium text-gray-900 leading-tight break-words overflow-hidden cursor-help" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as any,
                                maxHeight: '2.5rem'
                              }}>
                                {generation.title}
                              </h4>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {generation.title}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      
                      <div className="flex items-start flex-shrink-0 ml-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTitleClick(e, generation)
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Edit Title
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => handleDeleteClick(e, generation.id)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">
                          {formatDate(generation.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {generation.status === 'completed' && generation.result?.finalScript && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-blue-300 text-blue-700">
                            <FileText className="w-3 h-3 mr-1" />
                            Script
                          </Badge>
                        )}
                        {generation.result?.audioUrl && (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-green-300 text-green-700">
                            <Volume2 className="w-3 h-3 mr-1" />
                            Audio
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this project? This action cannot be undone.
                All associated data including the script and audio will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
})

Sidebar.displayName = "Sidebar"

