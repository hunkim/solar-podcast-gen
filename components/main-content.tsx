"use client"

import { useState, useEffect } from "react"
import { ContentInput } from "@/components/content-input"
import { PodcastGeneration } from "@/components/podcast-generation"
import { ProjectView } from "@/components/project-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Plus, ArrowLeft, Play, Download, Copy, Mic, FileText, Loader2, Edit3, Save, Calendar, Volume2, Sparkles } from "lucide-react"
import { getGeneration, type GenerationRecord, saveGenerationResult } from "@/lib/firestore"
import { AudioGeneration } from "@/components/audio-generation"
import { Badge } from "@/components/ui/badge"
import { SegmentEditor } from "@/components/segment-editor"

interface MainContentProps {
  selectedProject: string | null
  onNewProject: () => void
  sidebarOpen: boolean
}

export function MainContent({ selectedProject, onNewProject, sidebarOpen }: MainContentProps) {
  const [generationData, setGenerationData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [finalScript, setFinalScript] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [restartKey, setRestartKey] = useState(0)
  const [showGenerationComponent, setShowGenerationComponent] = useState(false)
  
  // Project view states
  const [projectData, setProjectData] = useState<GenerationRecord | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [showAudioGeneration, setShowAudioGeneration] = useState(false)

  // State for script editing in history view
  const [editedScript, setEditedScript] = useState<string | null>(null)
  const [isEditingScript, setIsEditingScript] = useState(false)

  // State for tracking input content for button activation
  const [hasContent, setHasContent] = useState(false)
  const [inputFormData, setInputFormData] = useState<any>(null)

  // State for controlling generation component in history view
  const [showHistoryGeneration, setShowHistoryGeneration] = useState(false)

  // Load project data when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject)
    } else {
      // Clear ALL project data when going back to new project
      // We need to reset all state variables to prevent prefilled fields
      setGenerationData(null)
      setIsGenerating(false)
      setFinalScript(null)
      setGenerationId(null)
      setLoadingProject(false)
      setProjectError(null)
      setProjectData(null)
      setShowAudioGeneration(false)
      setEditedScript(null)
      setIsEditingScript(false)
      // Force a restart to clear any retained data in child components
      setRestartKey(prev => prev + 1)
      // Reset history generation state
      setShowHistoryGeneration(false)
    }
  }, [selectedProject])

  const loadProjectData = async (projectId: string) => {
    try {
      setLoadingProject(true)
      setProjectError(null)
      
      const data = await getGeneration(projectId)
      
      if (!data) {
        setProjectError("Project not found")
        return
      }
      
      // Set the project data for the UI to use
      setProjectData(data)
      
      // Pre-populate the form with existing project data
      const populatedData = {
        inputType: data.content.inputType,
        content: data.content.originalContent,
        instructions: data.content.instructions,
        timestamp: data.createdAt,
        ...(data.content.documentMetadata && {
          documentMetadata: data.content.documentMetadata
        })
      }
      
      setGenerationData(populatedData)
      setGenerationId(data.id)
      
      // Set states based on project status
      if (data.result?.finalScript) {
        setFinalScript(data.result.finalScript)
        setIsGenerating(false)
      } else if (data.status === "in_progress") {
        setIsGenerating(true)
        setFinalScript(null)
      } else {
        setIsGenerating(false)
        setFinalScript(null)
      }
      
    } catch (err) {
      console.error("❌ Error loading project:", err)
      setProjectError("Failed to load project")
    } finally {
      setLoadingProject(false)
    }
  }

  const handleGenerate = (data: any) => {
    setInputFormData(data)
    setGenerationData(data)
    setIsGenerating(true)
    setFinalScript(null)
    setGenerationId(null)
    setShowGenerationComponent(true)
  }

  const handleGenerationComplete = (script: string, id?: string) => {
    setFinalScript(script)
    setGenerationId(id || null)
    setIsGenerating(false)
    // Real-time listeners now handle sidebar updates automatically
  }

  const handleStartNew = () => {
    setGenerationData(null)
    setIsGenerating(false)
    setFinalScript(null)
    setGenerationId(null)
    setShowGenerationComponent(false)
    setRestartKey(prev => prev + 1)
  }

  const handleGenerationStop = () => {
    // Only clear the generation-specific state, preserve input data
    setIsGenerating(false)
    setFinalScript(null)
    setGenerationId(null)
    setShowGenerationComponent(false)
    // Keep generationData and inputFormData so user can regenerate easily
    // Don't reset restartKey here - it causes ContentInput to remount and lose hasContent state
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
      
      // Format time for recent dates
      const timeOptions: Intl.DateTimeFormatOptions = { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      }
      const time = date.toLocaleTimeString('en-US', timeOptions)
      
      if (days === 0) {
        // Show "Today, 2:30 PM"
        return `Today, ${time}`
      }
      if (days === 1) {
        // Show "Yesterday, 2:30 PM"
        return `Yesterday, ${time}`
      }
      if (days < 7) {
        // Show "3 days ago (Dec 15, 2:30 PM)"
        const dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        return `${days} days ago (${dateStr}, ${time})`
      }
      if (days < 30) {
        // Show "2 weeks ago (Dec 8)"
        const dateStr = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        })
        return `${Math.floor(days / 7)} weeks ago (${dateStr})`
      }
      // For older dates, show full date
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Unknown'
    }
  }

  // Show existing project - SIMPLE DATABASE VIEW
  if (selectedProject) {
    if (loadingProject) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      )
    }

    if (projectError) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{projectError}</p>
            <Button onClick={onNewProject} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      )
    }

    if (!projectData) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">Project not found</p>
            <Button onClick={onNewProject} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      )
    }

    // Simple view showing what's stored in database
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              {projectData.title}
            </h1>
            <div className="flex items-center justify-center gap-3">
              <Badge variant="outline" className="text-xs px-2 py-1 border-purple-300 text-purple-700">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(projectData.createdAt)}
              </Badge>
              {projectData.status === 'completed' && (
                <Badge variant="outline" className="text-xs px-2 py-1 border-blue-300 text-blue-700">
                  <FileText className="w-3 h-3 mr-1" />
                  Script
                </Badge>
              )}
              {projectData.result?.audioUrl && (
                <Badge variant="outline" className="text-xs px-2 py-1 border-green-300 text-green-700">
                  <Volume2 className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
            </div>
          </div>

          {/* User Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                User Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Content Type:</p>
                <Badge variant="outline">{projectData.content.inputType}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Original Content:</p>
                <ScrollArea className="h-32 w-full border rounded p-3 bg-gray-50">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                    {projectData.content.originalContent}
                  </p>
                </ScrollArea>
              </div>
              {projectData.content.instructions && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Instructions:</p>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                    {projectData.content.instructions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Script Section - Only show if script exists in DB */}
          {projectData.result?.finalScript && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Podcast Script
                </CardTitle>
                <CardDescription>
                  Generated script ready for audio production
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 mb-4">
                  <Button 
                    onClick={() => navigator.clipboard.writeText(editedScript || projectData.result?.finalScript || "")} 
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Script
                  </Button>
                  <Button 
                    onClick={() => {
                      const script = editedScript || projectData.result?.finalScript || ""
                      const blob = new Blob([script], { type: "text/plain" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = `${projectData.title}-script.txt`
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                      URL.revokeObjectURL(url)
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button 
                    onClick={() => {
                      setIsEditingScript(!isEditingScript)
                      if (!isEditingScript) {
                        setEditedScript(projectData.result?.finalScript || "")
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    {isEditingScript ? "Cancel Edit" : "Edit Script"}
                  </Button>
                  {!projectData.result?.audioUrl && (
                    <Button 
                      onClick={() => setShowAudioGeneration(true)}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Generate Audio
                    </Button>
                  )}
                </div>

                {/* Script Editor or Preview */}
                {isEditingScript ? (
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded border">
                      <p className="text-sm text-blue-800 mb-3">
                        Edit your script below. Changes will be saved and can be used for audio generation.
                      </p>
                    </div>
                    <SegmentEditor
                      script={editedScript || projectData.result?.finalScript || ""}
                      onScriptChange={(newScript) => setEditedScript(newScript)}
                      onGenerateAudio={() => {
                        setIsEditingScript(false)
                        setShowAudioGeneration(true)
                      }}
                      isGenerating={false}
                    />
                    <div className="flex gap-3">
                      <Button 
                        onClick={async () => {
                          if (editedScript && projectData.id) {
                            try {
                              // Save the edited script back to database
                              await saveGenerationResult(projectData.id, {
                                finalScript: editedScript,
                              })
                              // Reload project data to show updated script
                              loadProjectData(selectedProject)
                              setIsEditingScript(false)
                            } catch (error) {
                              console.error("Failed to save edited script:", error)
                            }
                          }
                        }}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={!editedScript || editedScript === projectData.result?.finalScript}
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button 
                        onClick={() => {
                          setIsEditingScript(false)
                          setEditedScript(null)
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Script Preview:</p>
                    <ScrollArea className="h-64 w-full border rounded p-4 bg-gray-50">
                      {(() => {
                        const scriptToShow = editedScript || projectData.result?.finalScript || ""
                        try {
                          const parsed = JSON.parse(scriptToShow)
                          if (parsed.podcast?.script) {
                            return (
                              <div className="space-y-4">
                                <div className="bg-blue-50 p-3 rounded border mb-4">
                                  <h4 className="font-semibold text-blue-900">{parsed.podcast.title}</h4>
                                  <p className="text-sm text-blue-700 mt-1">{parsed.podcast.description}</p>
                                  <div className="flex gap-4 mt-2 text-sm text-blue-600">
                                    <span>Duration: {parsed.podcast.estimatedDuration}</span>
                                    <span>Speakers: {parsed.podcast.speakers.A} & {parsed.podcast.speakers.B}</span>
                                  </div>
                                </div>
                                
                                {parsed.podcast.script.slice(0, 10).map((segment: any, index: number) => (
                                  <div key={index} className="text-sm">
                                    <span className="font-medium text-blue-600">{segment.speaker}:</span>
                                    <span className="ml-2 text-gray-700">{segment.text}</span>
                                  </div>
                                ))}
                                
                                {parsed.podcast.script.length > 10 && (
                                  <div className="text-sm text-gray-500 italic">
                                    ... and {parsed.podcast.script.length - 10} more segments
                                  </div>
                                )}
                              </div>
                            )
                          }
                        } catch (e) {
                          return (
                            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                              {scriptToShow.substring(0, 1000)}...
                            </pre>
                          )
                        }
                      })()}
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Podcast Generation - Show button if no script exists, show component only when button clicked */}
          {!projectData.result?.finalScript && !showHistoryGeneration && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                    2
                  </div>
                  Generate Podcast Script
                </CardTitle>
                <CardDescription>
                  Create an AI-powered podcast script with research and optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <p className="text-gray-600 mb-6">
                  {finalScript ? 
                    "Generation was stopped. Click the button below to restart and complete your podcast script." :
                    "Your content is ready. Click the button below to generate a podcast script with AI-powered research and writing."
                  }
                </p>
                <Button 
                  onClick={() => setShowHistoryGeneration(true)}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {finalScript ? "Restart Generation" : "Generate Podcast Script"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Podcast Generation Component - Only show when button clicked */}
          {!projectData.result?.finalScript && showHistoryGeneration && (
            <PodcastGeneration
              key={`project-generation-${projectData.id}`}
              content={projectData.content.originalContent}
              instructions={projectData.content.instructions}
              inputType={projectData.content.inputType}
              documentMetadata={projectData.content.documentMetadata}
              autoStart={false}
              startImmediately={true}
              onComplete={(script, id) => {
                setFinalScript(script)
                setGenerationId(id || null)
                setIsGenerating(false)
                setShowHistoryGeneration(false)
                // Reload project data to show updated script
                loadProjectData(selectedProject)
              }}
              onRestart={() => {
                setGenerationData(null)
                setIsGenerating(false)
                setFinalScript(null)
                setShowHistoryGeneration(false)
              }}
              onStop={() => {
                // For project view, hide the generation component but keep it available to restart
                setIsGenerating(false)
                setShowHistoryGeneration(false)
              }}
              existingScript={finalScript}
              existingGenerationId={generationId}
            />
          )}

          {/* Audio Section - Only show if audio exists in DB */}
          {projectData.result?.audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Podcast Audio
                </CardTitle>
                <CardDescription>
                  Generated audio ready to play and download
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 mb-4">
                  <Button 
                    onClick={() => {
                      if (projectData.result?.audioUrl) {
                        const a = document.createElement("a")
                        a.href = projectData.result.audioUrl
                        a.download = `${projectData.title}.wav`
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Audio
                  </Button>
                </div>

                {/* Audio Player */}
                <div className="bg-gray-50 p-4 rounded border">
                  <audio controls className="w-full">
                    <source src={projectData.result.audioUrl} type="audio/wav" />
                    Your browser does not support the audio element.
                  </audio>
                  {projectData.result.audioMetadata && (
                    <div className="mt-3 text-sm text-gray-600 flex gap-4">
                      {projectData.result.audioMetadata.duration && (
                        <span>Duration: {Math.round(projectData.result.audioMetadata.duration / 60)} minutes</span>
                      )}
                      {projectData.result.audioMetadata.fileSize && (
                        <span>Size: {Math.round(projectData.result.audioMetadata.fileSize / 1024 / 1024)} MB</span>
                      )}
                      <span>Format: {projectData.result.audioMetadata.format || 'WAV'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Show audio generation component when needed (triggered from script editor) */}
          {showAudioGeneration && projectData.result?.finalScript && (
            <Card>
              <CardContent>
                <AudioGeneration 
                  script={editedScript || projectData.result.finalScript} 
                  generationId={projectData.id}
                  onComplete={(audioUrl) => {
                    setShowAudioGeneration(false)
                    // Reload project data to show updated state
                    loadProjectData(selectedProject)
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Show new project creation flow
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Podcast Generator
          </h1>
          <p className="text-gray-600">
            Transform your content into engaging podcast scripts with AI-powered research and writing
          </p>
        </div>

        {/* Main Content */}
        <div className="w-full space-y-6">
          {/* Step 1: Content Input */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                  1
                </div>
                Content Input
              </CardTitle>
              <CardDescription>
                Provide your source material and customization preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContentInput 
                key={`content-input-${restartKey}`} 
                onGenerate={(data) => setInputFormData(data)}
                initialData={null} // Always start with null data for a new project
                onContentChange={setHasContent}
                onFormDataChange={setInputFormData}
              />
              <div className="mt-8 text-center">
                <h3 className="text-xl font-semibold mb-2">Ready to Generate Podcast Script</h3>
                <p className="text-gray-600 mb-4">
                  Click the button below to start generating your AI-powered podcast script with research and optimization.
                </p>
                <Button 
                  onClick={() => inputFormData && handleGenerate(inputFormData)} 
                  disabled={!hasContent || !inputFormData}
                  className="bg-blue-600 hover:bg-blue-700 px-6"
                  size="lg"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Podcast Script
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Simple Generation Component - Only show when showGenerationComponent is true */}
          {showGenerationComponent && generationData && (
            <PodcastGeneration
              key={selectedProject ? `project-${selectedProject}` : restartKey}
              content={generationData.content}
              instructions={generationData.instructions}
              inputType={generationData.inputType}
              documentMetadata={generationData.documentMetadata}
              onComplete={handleGenerationComplete}
              onRestart={handleStartNew}
              onStop={handleGenerationStop}
              existingScript={finalScript} // Pass existing script if available
              existingGenerationId={generationId} // Pass existing ID if available
            />
          )}

          {/* No content state - only show when no generation component and no form data */}
          {!showGenerationComponent && !hasContent && (
            <div className="text-center py-12 text-gray-500">
              <Plus className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>Start by entering your content above to generate a new podcast script</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
