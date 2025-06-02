"use client"

import { useState, useEffect } from "react"
import { ContentInput } from "@/components/content-input"
import { PodcastGeneration } from "@/components/podcast-generation"
import { ProjectView } from "@/components/project-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle, Plus, ArrowLeft, Play, Download, Copy, Mic, FileText, Loader2, Edit3, Save } from "lucide-react"
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
  
  // Project view states
  const [projectData, setProjectData] = useState<GenerationRecord | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [showAudioGeneration, setShowAudioGeneration] = useState(false)

  // State for script editing in history view
  const [editedScript, setEditedScript] = useState<string | null>(null)
  const [isEditingScript, setIsEditingScript] = useState(false)

  // Load project data when selectedProject changes
  useEffect(() => {
    if (selectedProject) {
      loadProjectData(selectedProject)
    } else {
      // Clear ALL project data when going back to new project
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
    setGenerationData(data)
    setIsGenerating(true)
    setFinalScript(null)
    setGenerationId(null)
    setRestartKey(prev => prev + 1)
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
    setRestartKey(prev => prev + 1)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
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
          <div className="flex items-center justify-between mb-6">
            <Button onClick={onNewProject} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="text-sm text-gray-500">
              Created {formatDate(projectData.createdAt)}
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {projectData.title}
            </h1>
            <p className="text-gray-600">
              Project Status: {projectData.status === 'completed' ? 'Complete' : 
                              projectData.status === 'in_progress' ? 'In Progress' : 
                              'Pending'}
            </p>
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

          {/* Podcast Generation - Always show if no script exists */}
          {!projectData.result?.finalScript && (
            <PodcastGeneration
              key={`project-generation-${projectData.id}`}
              content={projectData.content.originalContent}
              instructions={projectData.content.instructions}
              inputType={projectData.content.inputType}
              documentMetadata={projectData.content.documentMetadata}
              onComplete={(script, id) => {
                setFinalScript(script)
                setGenerationId(id || null)
                setIsGenerating(false)
                // Reload project data to show updated script
                loadProjectData(selectedProject)
              }}
              onRestart={() => {
                setGenerationData(null)
                setIsGenerating(false)
                setFinalScript(null)
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
                      const audio = new Audio(projectData.result?.audioUrl)
                      audio.play()
                    }}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play Audio
                  </Button>
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
                onGenerate={handleGenerate}
                initialData={generationData} // Pass existing data to pre-populate form
              />
            </CardContent>
          </Card>

          {/* Simple Generation Component - Only show when generating or complete */}
          {generationData && (
            <PodcastGeneration
              key={selectedProject ? `project-${selectedProject}` : restartKey}
              content={generationData.content}
              instructions={generationData.instructions}
              inputType={generationData.inputType}
              documentMetadata={generationData.documentMetadata}
              onComplete={handleGenerationComplete}
              onRestart={handleStartNew}
              existingScript={finalScript} // Pass existing script if available
              existingGenerationId={generationId} // Pass existing ID if available
            />
          )}

          {/* No content state */}
          {!generationData && (
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
