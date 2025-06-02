"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Play, Download, Share2, Edit3, FileText, Mic, Video, Clock, Calendar, Save, Loader2, Volume2, Pause, Headphones, Copy, CheckCircle } from "lucide-react"
import { getGeneration, type GenerationRecord } from "@/lib/firestore"
import { AudioGeneration } from "@/components/audio-generation"

interface ProjectViewProps {
  projectId: string
  onBack: () => void
}

export function ProjectView({ projectId, onBack }: ProjectViewProps) {
  const [projectData, setProjectData] = useState<GenerationRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedScript, setEditedScript] = useState("")
  const [showAudioGeneration, setShowAudioGeneration] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getGeneration(projectId)
      
      if (!data) {
        setError("Project not found")
        return
      }
      
      setProjectData(data)
    } catch (err) {
      console.error("Error loading project:", err)
      setError("Failed to load project")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    if (projectData?.result?.finalScript) {
      setEditedScript(projectData.result.finalScript)
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    // TODO: Implement script saving
    setIsEditing(false)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString()
  }

  const handleGenerateAudio = () => {
    setShowAudioGeneration(true)
  }

  const handleAudioComplete = (audioUrl: string) => {
    // TODO: Update project data with audio URL
    console.log("Audio generation complete:", audioUrl)
    setShowAudioGeneration(false)
    loadProjectData() // Reload to get updated data
  }

  const handlePlayPause = () => {
    if (!projectData?.result?.audioUrl) return

    if (isPlaying && currentAudio) {
      currentAudio.pause()
      setIsPlaying(false)
    } else {
      if (currentAudio) {
        currentAudio.play()
      } else {
        const audio = new Audio(projectData.result.audioUrl)
        audio.addEventListener('ended', () => setIsPlaying(false))
        audio.addEventListener('pause', () => setIsPlaying(false))
        audio.play()
        setCurrentAudio(audio)
      }
      setIsPlaying(true)
    }
  }

  const handleShare = async () => {
    if (navigator.share && projectData) {
      try {
        await navigator.share({
          title: projectData.title,
          text: `Check out this AI-generated podcast: ${projectData.title}`,
          url: window.location.href,
        })
      } catch (err) {
        // Fallback to copying URL
        handleCopyLink()
      }
    } else {
      handleCopyLink()
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const formatScriptForDisplay = (script: string) => {
    if (!script) return ""
    
    // Split by lines and format nicely
    const lines = script.split('\n')
    return lines.map((line, index) => {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
        // Speaker names
        return `\n${trimmedLine}\n`
      } else if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        // Voice instructions in brackets
        return `  ${trimmedLine}`
      } else if (trimmedLine.startsWith('Voice Direction:')) {
        // Voice direction labels
        const nextLineIndex = index + 1
        const nextLine = lines[nextLineIndex]?.trim() || ''
        
        if (!nextLine || nextLine === '') {
          // Empty voice direction - make it obvious
          return `\n${trimmedLine}\n  [No voice instruction provided]`
        } else {
          return `\n${trimmedLine}`
        }
      } else if (trimmedLine.endsWith(':') && (trimmedLine.includes('Hanna') || trimmedLine.includes('Abram') || trimmedLine.includes('Host') || trimmedLine.includes('Guest'))) {
        // Speaker labels (Hanna:, Abram:, etc.)
        return `\n**${trimmedLine}**\n`
      } else if (trimmedLine) {
        // Dialogue or voice instructions
        return `  ${trimmedLine}`
      }
      return line
    }).join('\n')
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onBack} variant="outline">
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
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (showAudioGeneration && projectData.result?.finalScript) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => setShowAudioGeneration(false)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Project
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Generate Audio</h1>
            </div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto">
            <AudioGeneration 
              script={projectData.result.finalScript}
              onComplete={handleAudioComplete}
              generationId={projectId}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header with Title and Action Buttons */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{projectData.title}</h1>
                <Badge variant="secondary">
                  <Mic className="w-3 h-3 mr-1" /> Podcast
                </Badge>
                <Badge 
                  variant="outline" 
                  className={
                    projectData.status === 'completed' ? 'text-green-600 border-green-600' :
                    projectData.status === 'in_progress' ? 'text-blue-600 border-blue-600' :
                    projectData.status === 'failed' ? 'text-red-600 border-red-600' :
                    'text-gray-600 border-gray-600'
                  }
                >
                  {projectData.status === 'completed' ? 'Completed' :
                   projectData.status === 'in_progress' ? 'In Progress' :
                   projectData.status === 'failed' ? 'Failed' :
                   'Pending'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(projectData.createdAt)}
                </div>
                {projectData.result?.audioMetadata?.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.round(projectData.result.audioMetadata.duration / 60)} minutes
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleShare}>
            {copied ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </>
            )}
          </Button>

          {projectData.result?.audioUrl ? (
            <>
              <Button variant="outline" size="sm" onClick={handlePlayPause}>
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Play Podcast
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={projectData.result.audioUrl} download={`${projectData.title}.wav`}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </a>
              </Button>
            </>
          ) : projectData.result?.finalScript ? (
            <Button size="sm" onClick={handleGenerateAudio}>
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Audio
            </Button>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Audio Player Section (if audio exists) */}
          {projectData.result?.audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  Podcast Audio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectData.result.audioMetadata && (
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      {projectData.result.audioMetadata.duration && (
                        <span>Duration: {Math.round(projectData.result.audioMetadata.duration / 60)} minutes</span>
                      )}
                      {projectData.result.audioMetadata.fileSize && (
                        <span>Size: {(projectData.result.audioMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                      )}
                      {projectData.result.audioMetadata.format && (
                        <span>Format: {projectData.result.audioMetadata.format}</span>
                      )}
                    </div>
                  )}
                  
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <audio controls className="w-full" preload="metadata">
                      <source src={projectData.result.audioUrl} type="audio/wav" />
                      <source src={projectData.result.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Original Content
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-6 text-sm text-gray-600">
                  <span>Input Type: <span className="font-medium">{projectData.content.inputType}</span></span>
                  {projectData.content.documentMetadata && (
                    <span>Document: <span className="font-medium">{projectData.content.documentMetadata.name || 'Uploaded File'}</span></span>
                  )}
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ScrollArea className="h-64">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800">
                      {projectData.content.originalContent}
                    </pre>
                  </ScrollArea>
                </div>

                {projectData.content.instructions && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Instructions</h4>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm text-gray-800">
                        {projectData.content.instructions}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Final Script Section */}
          {projectData.result?.finalScript && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Final Script
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleEdit}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Edit Script
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editedScript}
                    onChange={(e) => setEditedScript(e.target.value)}
                    className="min-h-[600px] font-mono text-sm"
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <ScrollArea className="max-h-[600px]">
                        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          {formatScriptForDisplay(projectData.result.finalScript)}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Outline Section (if available) */}
          {projectData.result?.outline && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Podcast Outline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-2">{projectData.result.outline.overview.title}</h3>
                    <p className="text-gray-600 mb-4">{projectData.result.outline.overview.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>Duration: {projectData.result.outline.overview.totalDuration}</span>
                      <span>Target Audience: {projectData.result.outline.overview.targetAudience}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {projectData.result.outline.sections.map((section, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{section.title}</div>
                            <div className="text-sm text-gray-600 mt-1">{section.description}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              Duration: {section.duration}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
