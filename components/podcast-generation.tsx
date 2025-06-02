"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AudioGeneration } from "@/components/audio-generation"
import { SegmentEditor } from "@/components/segment-editor"
import { 
  Wand2, 
  Search, 
  FileText, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Copy,
  Play,
  Pause,
  Save,
  Loader2,
  Edit3,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  Clock,
  RotateCcw,
  Volume2
} from "lucide-react"
import { GenerationProgress } from "@/lib/podcast-generator"
import { useAuth } from "@/components/auth-provider"
import { createGeneration, updateGenerationProgress, saveGenerationResult } from "@/lib/firestore"

interface PodcastGenerationProps {
  content: string
  instructions: string
  inputType: string
  documentMetadata?: any
  onComplete?: (script: string, generationId?: string) => void
  onRestart?: () => void
  existingScript?: string | null
  existingGenerationId?: string | null
}

interface GenerationState {
  isGenerating: boolean
  progress: GenerationProgress | null
  finalScript: string | null
  error: string | null
  generationId: string | null
  stages: {
    outline: boolean
    search: boolean
    script: boolean
    combining: boolean
    finalizing: boolean
  }
  generatedOutline: any | null
  searchKeywords: string[] | null
  sectionProgress: { [key: string]: { status: 'pending' | 'writing' | 'complete', script?: string } }
}

// Global set to track active generations (outside component)
const activeGenerations = new Set<string>();

export function PodcastGeneration({ 
  content, 
  instructions, 
  inputType,
  documentMetadata,
  onComplete,
  onRestart,
  existingScript,
  existingGenerationId
}: PodcastGenerationProps) {
  const { user } = useAuth()
  
  // Add component instance tracking (keep for lock mechanism but remove logging)
  const instanceId = useRef(Math.random().toString(36).substr(2, 9))
  
  const [state, setState] = useState<GenerationState>({
    isGenerating: false,
    progress: null,
    finalScript: null,
    error: null,
    generationId: null,
    stages: {
      outline: false,
      search: false,
      script: false,
      combining: false,
      finalizing: false,
    },
    generatedOutline: null,
    searchKeywords: null,
    sectionProgress: {}
  })
  
  const abortControllerRef = useRef<AbortController | null>(null)
  const generationInitiatedRef = useRef<boolean>(false)
  const currentContentRef = useRef<string>("")

  // Add new state for managing the edited script
  const [editedScript, setEditedScript] = useState<string | null>(null)
  const [showSegmentEditor, setShowSegmentEditor] = useState(false)
  const [isAudioGenerating, setIsAudioGenerating] = useState(false)

  // Reset flag only on component mount
  useEffect(() => {
    generationInitiatedRef.current = false
    currentContentRef.current = ""
  }, [])

  // Initialize state with existing data if provided
  useEffect(() => {
    if (existingScript) {
      setState(prev => ({
        ...prev,
        finalScript: existingScript,
        generationId: existingGenerationId || null,
        isGenerating: false,
        stages: {
          outline: true,
          search: true,
          script: true,
          combining: true,
          finalizing: true,
        }
      }))
      
      // Call onComplete to update parent state
      if (onComplete) {
        onComplete(existingScript, existingGenerationId || undefined)
      }
    }
  }, [existingScript, existingGenerationId, onComplete])

  // Generate title from content using LLM
  const generateTitle = async (): Promise<string> => {
    try {
      const response = await fetch('/api/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          instructions
        })
      })

      if (response.ok) {
        const { title } = await response.json()
        return title
      }
    } catch (error) {
      console.error("Error generating title:", error)
    }
    
    // Fallback title generation
    const instructionsWords = instructions.split(' ').slice(0, 5).join(' ')
    const contentWords = content.split(' ').slice(0, 3).join(' ')
    const fallbackTitle = instructionsWords || contentWords || 'Podcast Generation'
    return fallbackTitle
  }

  const getStageIcon = (stage: keyof GenerationState["stages"], isActive: boolean, isComplete: boolean) => {
    if (isComplete) return <CheckCircle className="w-4 h-4 text-green-500" />
    if (isActive) return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    
    switch (stage) {
      case "outline":
        return <FileText className="w-4 h-4 text-gray-400" />
      case "search":
        return <Search className="w-4 h-4 text-gray-400" />
      case "script":
        return <Wand2 className="w-4 h-4 text-gray-400" />
      case "combining":
        return <Layers className="w-4 h-4 text-gray-400" />
      case "finalizing":
        return <CheckCircle className="w-4 h-4 text-gray-400" />
      default:
        return <div className="w-4 h-4 bg-gray-300 rounded-full" />
    }
  }

  const getStageTitle = (stage: keyof GenerationState["stages"]) => {
    switch (stage) {
      case "outline":
        return "1️⃣ Create Outline & Overview"
      case "search":
        return "2️⃣ Research Each Section"
      case "script":
        return "3️⃣ Write Tiki-Taka Scripts"
      case "combining":
        return "4️⃣ Combine & Refine Flow"
      case "finalizing":
        return "✨ Final Polish"
      default:
        return ""
    }
  }

  const startGeneration = async () => {
    // Create a unique key for this generation attempt
    const generationKey = user ? `${user.uid}-${content.substring(0, 100)}` : `anonymous-${content.substring(0, 100)}`;
    
    // Check if this exact generation is already in progress
    if (activeGenerations.has(generationKey)) {
      return;
    }

    // Add to active generations
    activeGenerations.add(generationKey);

    let generationId: string | null = null

    try {
      // Use existing generation ID if available, otherwise create new one
      if (existingGenerationId) {
        // We're working with an existing project - use its ID
        generationId = existingGenerationId
        
        // Reset the project status to in_progress for regeneration
        if (user) {
          try {
            await updateGenerationProgress(generationId, {
              progress: 0,
              stage: "outline",
              step: "Starting regeneration...",
            })
          } catch (error) {
            console.error("Failed to reset generation status:", error)
          }
        }
      } else if (user) {
        // Create new generation record for new projects
        try {
          generationId = await createGeneration(user.uid, {
            title: await generateTitle(),
            content,
            instructions,
            inputType,
            documentMetadata,
          })
        } catch (error) {
          console.error("Failed to create generation record:", error)
        }
      }

      setState(prev => ({
        ...prev,
        isGenerating: true,
        progress: null,
        finalScript: null,
        error: null,
        generationId,
        stages: {
          outline: false,
          search: false,
          script: false,
          combining: false,
          finalizing: false,
        },
        generatedOutline: null,
        searchKeywords: null,
        sectionProgress: {}
      }))

      abortControllerRef.current = new AbortController()

      const response = await fetch("/api/generate-podcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          instructions,
          generationId, // Pass the generation ID to the API
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("Failed to get response reader")
      }

      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6))
              
              if (eventData.type === "progress") {
                const progress = eventData.data as GenerationProgress
                
                // Update local state
                setState(prev => {
                  const newState = {
                  ...prev,
                  progress,
                  stages: {
                    outline: progress.stage !== "outline" && prev.stages.outline ? true : false,
                    search: progress.stage !== "search" && prev.stages.search ? true : false,
                    script: progress.stage !== "script" && prev.stages.script ? true : false,
                    combining: progress.stage !== "combining" && prev.stages.combining ? true : false,
                    finalizing: progress.stage !== "finalizing" && prev.stages.finalizing ? true : false,
                  }
                  }

                  // Mark stages as completed when we move past them
                  if (progress.stage === "search" || progress.stage === "script" || progress.stage === "combining" || progress.stage === "finalizing") {
                    newState.stages.outline = true
                  }
                  if (progress.stage === "script" || progress.stage === "combining" || progress.stage === "finalizing") {
                    newState.stages.search = true
                  }
                  if (progress.stage === "combining" || progress.stage === "finalizing") {
                    newState.stages.script = true
                  }
                  if (progress.stage === "finalizing") {
                    newState.stages.combining = true
                  }
                  if (progress.progress === 100) {
                    newState.stages.finalizing = true
                  }

                  // Capture outline when generated
                  if (progress.stage === "outline" && progress.result && !prev.generatedOutline) {
                    try {
                      const parsedOutline = JSON.parse(progress.result)
                      console.log("Raw outline structure:", parsedOutline)
                      console.log("Outline overview:", parsedOutline.overview)
                      console.log("Outline sections:", parsedOutline.sections)
                      console.log("Outline finalThoughts:", parsedOutline.finalThoughts)
                      newState.generatedOutline = parsedOutline
                    } catch (e) {
                      console.warn("Failed to parse outline:", e)
                      console.log("Raw outline result:", progress.result)
                    }
                  }

                  // Track section progress with real-time updates
                  if (progress.stage === "script" && (progress.currentSection || progress.step.includes("final thoughts"))) {
                    const isCompleted = progress.step.includes("✅")
                    const isWriting = progress.step.includes("✍️")
                    const sectionKey = progress.currentSection === "final_thoughts" || progress.step.includes("final thoughts") 
                      ? "final_thoughts" 
                      : progress.currentSection || ""
                    
                    if (sectionKey) {
                      newState.sectionProgress = {
                        ...prev.sectionProgress,
                        [sectionKey]: {
                          status: isCompleted ? "complete" : "writing",
                          script: progress.result || prev.sectionProgress[sectionKey]?.script || ""
                        }
                      }
                    }
                  }

                  return newState
                })

                // Update Firestore if user is logged in
                if (user && generationId) {
                  try {
                    await updateGenerationProgress(generationId, progress)
                  } catch (error) {
                    console.error("Failed to update progress in Firestore:", error)
                  }
                }
              } else if (eventData.type === "complete") {
                const finalScript = eventData.data.script
                
                setState(prev => ({
                  ...prev,
                  finalScript,
                }))

                // Save final result to Firestore
                if (user && generationId) {
                  try {
                    await saveGenerationResult(generationId, {
                      finalScript,
                    })
                  } catch (error) {
                    console.error("Failed to save result to Firestore:", error)
                  }
                }

                if (onComplete) {
                  onComplete(finalScript, generationId || undefined)
                }
              } else if (eventData.type === "error") {
                const error = eventData.data.error
                setState(prev => ({
                  ...prev,
                  error,
                  isGenerating: false,
                }))

                // Update error in Firestore
                if (user && generationId) {
                  try {
                    await updateGenerationProgress(generationId, {
                      stage: "finalizing",
                      step: "Error occurred",
                      progress: 100,
                      error,
                    })
                  } catch (firestoreError) {
                    console.error("Failed to update error in Firestore:", firestoreError)
                  }
                }
              } else if (eventData.type === "done") {
                setState(prev => ({
                  ...prev,
                  isGenerating: false,
                }))
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line)
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: "Generation cancelled",
        }))
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
        }))
      }

      // Update error in Firestore
      if (user && generationId) {
        try {
          await updateGenerationProgress(generationId, {
            stage: "finalizing",
            step: "Error occurred",
            progress: 100,
            error: error instanceof Error ? error.message : "Unknown error occurred",
          })
        } catch (firestoreError) {
          console.error("Failed to update error in Firestore:", firestoreError)
        }
      }
    } finally {
      // Always remove from active generations when done
      activeGenerations.delete(generationKey);
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  // Function to separate think content from script
  const separateThinkContent = (text: string) => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;
    const thinkSections: string[] = [];
    let cleanScript = text;
    let match;

    // Extract all think sections
    while ((match = thinkRegex.exec(text)) !== null) {
      thinkSections.push(match[1].trim());
    }

    // Remove think tags from the script
    cleanScript = text.replace(thinkRegex, '').trim();

    return {
      thinkContent: thinkSections,
      cleanScript: cleanScript
    };
  };

  // Add handler for when script is updated
  const handleScriptChange = (newScript: string) => {
    setEditedScript(newScript)
  }

  // Add handler for starting audio generation
  const handleGenerateAudio = () => {
    setShowSegmentEditor(false)
    setIsAudioGenerating(true)
    // The AudioGeneration component will handle the actual generation
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {state.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-red-700">{state.error}</span>
        </div>
      )}

      {/* Progress Tracking - Always show the generation card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Generation Progress
            {state.isGenerating && (
              <div className="ml-auto flex items-center gap-2">
                <Button onClick={stopGeneration} variant="destructive" size="sm">
                  <Pause className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </div>
            )}
          </CardTitle>
          <CardDescription>
            AI is creating your podcast script with research and optimization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Show generate button when not generating and no script exists */}
          {!state.isGenerating && !state.finalScript && !state.progress && (
            <div className="text-center space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Ready to Generate Podcast Script</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Click the button below to start generating your AI-powered podcast script with research and optimization.
                </p>
                <Button 
                  onClick={startGeneration}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  size="lg"
                >
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Podcast Script
                </Button>
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {state.progress && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{state.progress.step}</span>
                <Badge variant="outline">{state.progress.progress}%</Badge>
              </div>
              <Progress value={state.progress.progress} className="w-full" />
              {state.progress.currentSection && (
                <div className="text-sm text-gray-600">
                  Working on: {state.progress.currentSection}
                </div>
              )}
            </div>
          )}

          {/* Stage Indicators with Inline Results */}
          {(state.isGenerating || state.progress || state.finalScript) && (
            <div className="space-y-4">
              {Object.entries(state.stages).map(([stage, isComplete]) => {
                const isActive = state.progress?.stage === stage
                return (
                  <div key={stage} className="space-y-3">
                    {/* Stage Header */}
                    <div className="flex items-center gap-3">
                    {getStageIcon(stage as keyof GenerationState["stages"], isActive, isComplete)}
                    <span className={`text-sm ${isComplete ? "text-green-700 font-medium" : isActive ? "text-blue-700 font-medium" : "text-gray-500"}`}>
                      {getStageTitle(stage as keyof GenerationState["stages"])}
                    </span>
                      {isActive && !isComplete && (
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    )}
                    </div>

                    {/* Inline Results for Each Stage */}
                    {/* 1️⃣ Outline Results */}
                    {stage === "outline" && isComplete && state.generatedOutline && (
                      <div className="ml-7 border rounded-lg p-4 bg-blue-50 border-blue-200">
                        <Collapsible defaultOpen={false}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-blue-900">Generated Outline</span>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                  {state.generatedOutline.sections?.length || 0} sections
                                </Badge>
                              </div>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 pt-2">
                            {/* Podcast Overview */}
                            <div className="bg-white rounded border p-3 mb-3">
                              <h5 className="font-medium text-sm text-gray-900 mb-2">Podcast Overview</h5>
                              <div className="space-y-1 text-xs">
                                <div><span className="font-medium">Title:</span> {state.generatedOutline.overview?.title || "Not generated"}</div>
                                <div><span className="font-medium">Duration:</span> {state.generatedOutline.overview?.totalDuration || "Not specified"}</div>
                                <div><span className="font-medium">Tone:</span> {state.generatedOutline.overview?.tone || "Not specified"}</div>
                                <div><span className="font-medium">Audience:</span> {state.generatedOutline.overview?.targetAudience || "Not specified"}</div>
                              </div>
                            </div>

                            {/* Sections */}
                            <div className="space-y-2">
                              {state.generatedOutline.sections?.map((section: any, index: number) => (
                                <div key={section.id || index} className="bg-white rounded border p-3">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        Section {index + 1}
                                      </Badge>
                                      <span className="text-xs text-gray-500">{section.duration || "3 minutes"}</span>
                                    </div>
                                  </div>
                                  <h6 className="font-medium text-sm">{section.title || `Section ${index + 1}`}</h6>
                                  <p className="text-xs text-gray-600 mt-1">{section.description || "Description not available"}</p>
                                  
                                  {/* Key Points */}
                                  {section.keyPoints && Array.isArray(section.keyPoints) && section.keyPoints.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-gray-700 mb-1">Key Points:</div>
                                      <ul className="text-xs text-gray-600 space-y-1">
                                        {section.keyPoints.map((point: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-1">
                                            <span className="text-blue-500">•</span>
                                            <span>{point || "Key point not available"}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )) || <div className="text-xs text-gray-500">No sections generated</div>}

                              {/* Final Thoughts Section */}
                              {state.generatedOutline.finalThoughts && (
                                <div className="bg-blue-100 rounded border p-3 border-blue-300">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs bg-blue-200 text-blue-800 border-blue-400">
                                      Final Thoughts
                                    </Badge>
                                    <span className="text-xs text-gray-500">{state.generatedOutline.finalThoughts.duration || "3 minutes"}</span>
                                  </div>
                                  <h6 className="font-medium text-sm text-blue-900">{state.generatedOutline.finalThoughts.title || "Wrap-up & Key Takeaways"}</h6>
                                  <p className="text-xs text-blue-700 mt-1">{state.generatedOutline.finalThoughts.description || "Summary and closing thoughts"}</p>
                                  
                                  {/* Key Takeaways */}
                                  {state.generatedOutline.finalThoughts.keyTakeaways && Array.isArray(state.generatedOutline.finalThoughts.keyTakeaways) && state.generatedOutline.finalThoughts.keyTakeaways.length > 0 && (
                                    <div className="mt-2">
                                      <div className="text-xs font-medium text-blue-800 mb-1">Key Takeaways:</div>
                                      <ul className="text-xs text-blue-700 space-y-1">
                                        {state.generatedOutline.finalThoughts.keyTakeaways.map((takeaway: string, idx: number) => (
                                          <li key={idx} className="flex items-start gap-1">
                                            <span className="text-blue-500">★</span>
                                            <span>{takeaway || "Takeaway not available"}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    )}

                    {/* 2️⃣ Research Results */}
                    {stage === "search" && isComplete && (
                      <div className="ml-7 p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Search className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">Research Completed</span>
                        </div>
                        <p className="text-xs text-green-700">
                          Web research completed for all sections. Additional context and examples have been gathered to enrich the content.
                        </p>
                      </div>
                    )}

                    {/* 3️⃣ Script Writing Results */}
                    {stage === "script" && (
                      <div className="ml-7 space-y-3">
                        {/* Script Writing Status (when active) */}
                        {state.progress?.stage === "script" && (
                          <div className="p-3 bg-purple-50 rounded border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Edit3 className="w-4 h-4 text-purple-600" />
                              <span className="text-sm font-medium">Writing Tiki-Taka Scripts</span>
                              {state.progress?.step.includes('[') && (
                                <Badge className="bg-blue-500 text-white text-xs">
                                  {state.progress.step.match(/\[(\d+\/\d+)\]/)?.[1] || 'In Progress'}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-700 mb-2">
                              Creating engaging, fun conversations with quick back-and-forth exchanges between two hosts.
                            </div>
                            {state.progress?.currentSection && (
                              <div className="text-xs">
                                <span className="font-medium">Current:</span> {state.progress.currentSection}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Collapsible Script Results */}
                        {(Object.keys(state.sectionProgress).length > 0 || state.sectionProgress["final_thoughts"]?.script) && (
                          <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                            <Collapsible defaultOpen={false}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                                  <div className="flex items-center gap-2">
                                    <Edit3 className="w-4 h-4 text-purple-600" />
                                    <span className="font-medium text-purple-900">Generated Tiki-Taka Scripts</span>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                      {Object.keys(state.sectionProgress).filter(key => state.sectionProgress[key]?.script).length} scripts
                                    </Badge>
                                  </div>
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="space-y-3 pt-2">
                                {/* Individual Section Scripts */}
                                {state.generatedOutline?.sections?.map((section: any, index: number) => {
                                  const sectionScript = state.sectionProgress[section.title];
                                  if (!sectionScript?.script) return null;
                                  
                                  const { thinkContent, cleanScript } = separateThinkContent(sectionScript.script);
                                  const sectionNumber = index + 1;
                                  const totalMainSections = state.generatedOutline?.sections?.length || 0;
                                  
                                  return (
                                    <div key={section.id || index} className="border rounded-lg p-3 bg-white border-purple-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <Edit3 className="w-4 h-4 text-purple-600" />
                                          <span className="font-medium text-sm text-purple-900">{section.title}</span>
                                          <Badge variant="outline" className="text-xs border-purple-300 text-purple-700">
                                            [{sectionNumber}/{totalMainSections + 1}]
                                          </Badge>
                                        </div>
                                      </div>
                                      
                                      {/* AI Thinking Process */}
                                      {thinkContent.length > 0 && (
                                        <div className="mb-3">
                                          <Collapsible>
                                            <CollapsibleTrigger asChild>
                                              <Button variant="ghost" className="w-full justify-between p-2 h-auto text-xs">
                                                <div className="flex items-center gap-1">
                                                  <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                                                  <span className="font-medium text-gray-700">AI Reasoning Process</span>
                                                </div>
                                                <ChevronDown className="h-3 w-3" />
                                              </Button>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                              <ScrollArea className="h-20 w-full bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                                                {thinkContent.map((think, idx) => (
                                                  <div key={idx} className="text-xs text-yellow-800 italic mb-2 last:mb-0">
                                                    {think}
                                                  </div>
                                                ))}
                                              </ScrollArea>
                                            </CollapsibleContent>
                                          </Collapsible>
                                        </div>
                                      )}
                                      
                                      {/* Generated Script */}
                                      <div>
                                        <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                                          <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                                          Generated Script:
                                        </div>
                                        <ScrollArea className="h-24 w-full border rounded p-2 bg-gray-50">
                                          <pre className="whitespace-pre-wrap text-xs text-gray-800 leading-relaxed">
                                            {cleanScript}
                                          </pre>
                                        </ScrollArea>
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Final Thoughts Script */}
                                {state.sectionProgress["final_thoughts"]?.script && (
                                  <div className="border rounded-lg p-3 bg-white border-blue-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-blue-600" />
                                        <span className="font-medium text-sm text-blue-900">Final Thoughts</span>
                                        <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                                          [{(state.generatedOutline?.sections?.length || 0) + 1}/{(state.generatedOutline?.sections?.length || 0) + 1}]
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    {(() => {
                                      const { thinkContent, cleanScript } = separateThinkContent(state.sectionProgress["final_thoughts"].script || "");
                                      
                                      return (
                                        <>
                                          {/* AI Thinking Process */}
                                          {thinkContent.length > 0 && (
                                            <div className="mb-3">
                                              <Collapsible>
                                                <CollapsibleTrigger asChild>
                                                  <Button variant="ghost" className="w-full justify-between p-2 h-auto text-xs">
                                                    <div className="flex items-center gap-1">
                                                      <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                                                      <span className="font-medium text-gray-700">AI Reasoning Process</span>
                                                    </div>
                                                    <ChevronDown className="h-3 w-3" />
                                                  </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent>
                                                  <ScrollArea className="h-20 w-full bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                                                    {thinkContent.map((think, idx) => (
                                                      <div key={idx} className="text-xs text-yellow-800 italic mb-2 last:mb-0">
                                                        {think}
                                                      </div>
                                                    ))}
                                                  </ScrollArea>
                                                </CollapsibleContent>
                                              </Collapsible>
                                            </div>
                                          )}

                                          {/* Generated Script */}
                                          <div>
                                            <div className="text-xs font-medium text-blue-800 mb-2 flex items-center gap-1">
                                              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                              Generated Script:
                                            </div>
                                            <ScrollArea className="h-24 w-full border rounded p-2 bg-gray-50">
                                              <pre className="whitespace-pre-wrap text-xs text-blue-900 leading-relaxed">
                                                {cleanScript}
                                              </pre>
                                            </ScrollArea>
                                          </div>
                                        </>
                                      );
                                    })()}
                                  </div>
                                )}
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 4️⃣ Final Script Results */}
                    {stage === "finalizing" && isComplete && state.finalScript && (
                      <div className="ml-7 border rounded-lg p-4 bg-green-50 border-green-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="font-medium text-green-900">Complete Tiki-Taka Podcast Script</span>
                            <Badge variant="outline" className="border-green-300 text-green-700">
                              Hanna & Abram
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            onClick={() => navigator.clipboard.writeText(state.finalScript || "")} 
                            variant="outline" 
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-100"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            onClick={() => {
                              const blob = new Blob([state.finalScript || ""], { type: "text/plain" })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement("a")
                              a.href = url
                              a.download = "tiki-taka-podcast-script.json"
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                              URL.revokeObjectURL(url)
                            }} 
                            variant="outline" 
                            size="sm"
                            className="border-green-300 text-green-700 hover:bg-green-100"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          {onRestart && (
                            <Button 
                              onClick={onRestart}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Create New Script
                            </Button>
                          )}
                        </div>
                        <ScrollArea className="h-auto max-h-48 w-full border rounded-lg p-4 bg-white border-green-200">
                          <div className="space-y-2">
                            {(() => {
                              try {
                                // First, clean any think tags from the final script
                                const { cleanScript } = separateThinkContent(state.finalScript || "");
                                const parsed = JSON.parse(cleanScript);
                                
                                if (parsed.podcast?.script) {
                                  return (
                                    <div className="space-y-4">
                                      <div className="bg-blue-50 p-4 rounded border">
                                        <h4 className="font-semibold text-blue-900 text-lg">{parsed.podcast.title}</h4>
                                        <p className="text-sm text-blue-700 mt-2">{parsed.podcast.description}</p>
                                        <div className="flex gap-4 mt-3 text-sm text-blue-600">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            {parsed.podcast.estimatedDuration}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Volume2 className="w-4 h-4" />
                                            {parsed.podcast.speakers.A} & {parsed.podcast.speakers.B}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <FileText className="w-4 h-4" />
                                            {parsed.podcast.script.length} segments
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="text-xs text-gray-500 text-center py-4">
                                        Script generated successfully - ready for review and editing
                                      </div>
                                    </div>
                                  );
                                }
                              } catch (e) {
                                // Fallback to raw text display with think content separation
                                const { thinkContent, cleanScript } = separateThinkContent(state.finalScript || "");
                                return (
                                  <div className="space-y-3">
                                    {thinkContent.length > 0 && (
                                      <div>
                                        <Collapsible>
                                          <CollapsibleTrigger asChild>
                                            <Button variant="ghost" className="w-full justify-between p-2 h-auto text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
                                                <span className="font-medium text-gray-700">AI Reasoning Process</span>
                                              </div>
                                              <ChevronDown className="h-4 w-4" />
                                            </Button>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                            <ScrollArea className="h-32 w-full bg-yellow-50 border border-yellow-200 rounded p-3 mt-2">
                                              {thinkContent.map((think, idx) => (
                                                <div key={idx} className="text-sm text-yellow-800 italic mb-2 last:mb-0">
                                                  {think}
                                                </div>
                                              ))}
                                            </ScrollArea>
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 text-center py-4">
                                      Script generated successfully - ready for review and editing
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </ScrollArea>

                        {/* Segment Editor and Audio Generation - Show immediately after script is ready */}
                        <div className="mt-6">
                          <Separator className="mb-6" />
                          <SegmentEditor
                            script={editedScript || state.finalScript || ""}
                            onScriptChange={handleScriptChange}
                            onGenerateAudio={handleGenerateAudio}
                            isGenerating={isAudioGenerating}
                          />
                        </div>

                        {/* Audio Generation Section - Always visible */}
                        <div className="mt-6">
                          <Separator className="mb-6" />
                          <AudioGeneration 
                            script={editedScript || state.finalScript || ""} 
                            onComplete={(audioUrl) => {
                              setIsAudioGenerating(false)
                              // Could trigger a refresh of the library or other actions
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 