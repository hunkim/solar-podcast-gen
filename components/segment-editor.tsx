"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { 
  Edit3, 
  Save,
  X,
  Play,
  User,
  Mic,
  Clock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle,
  Volume2,
  FileText,
  ArrowRight
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AudioSegment, PodcastScript } from "@/lib/types"

interface SegmentEditorProps {
  script: string;
  onScriptChange: (newScript: string) => void;
  onGenerateAudio: () => void;
  isGenerating?: boolean;
}

export function SegmentEditor({ script, onScriptChange, onGenerateAudio, isGenerating = false }: SegmentEditorProps) {
  const [parsedScript, setParsedScript] = useState<PodcastScript | null>(null)
  const [editingSegment, setEditingSegment] = useState<number | null>(null)
  const [editedText, setEditedText] = useState("")
  const [editedInstruction, setEditedInstruction] = useState("")
  const [expandedSegments, setExpandedSegments] = useState<Set<number>>(new Set())
  const [hasChanges, setHasChanges] = useState(false)

  // Parse the script when it changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(script)
      setParsedScript(parsed)
      // Set all segments to expanded by default
      if (parsed?.podcast?.script) {
        setExpandedSegments(new Set(Array.from({ length: parsed.podcast.script.length }, (_, i) => i)))
      }
    } catch (error) {
      console.error("Failed to parse script:", error)
      setParsedScript(null)
    }
  }, [script])

  const handleEditSegment = (index: number, segment: AudioSegment) => {
    setEditingSegment(index)
    setEditedText(segment.text)
    setEditedInstruction(segment.instruction)
    // Expand the segment being edited
    setExpandedSegments(prev => new Set(prev).add(index))
  }

  const handleSaveSegment = (index: number) => {
    if (!parsedScript) return

    const updatedScript = { ...parsedScript }
    updatedScript.podcast.script[index] = {
      ...updatedScript.podcast.script[index],
      text: editedText.trim(),
      instruction: editedInstruction.trim()
    }

    const newScriptString = JSON.stringify(updatedScript, null, 2)
    onScriptChange(newScriptString)
    setParsedScript(updatedScript)
    setEditingSegment(null)
    setEditedText("")
    setEditedInstruction("")
    setHasChanges(true)
  }

  const handleCancelEdit = () => {
    setEditingSegment(null)
    setEditedText("")
    setEditedInstruction("")
  }

  const toggleSegmentExpansion = (index: number) => {
    setExpandedSegments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const expandAllSegments = () => {
    if (!parsedScript) return
    setExpandedSegments(new Set(Array.from({ length: parsedScript.podcast.script.length }, (_, i) => i)))
  }

  const collapseAllSegments = () => {
    setExpandedSegments(new Set())
  }

  const resetChanges = () => {
    // This would require keeping track of the original script
    // For now, just indicate that changes were reset
    setHasChanges(false)
  }

  const getSpeakerColor = (speaker: string) => {
    if (speaker === "Hanna" || speaker === parsedScript?.podcast.speakers.A) {
      return "bg-blue-50 border-blue-200 text-blue-900"
    }
    return "bg-purple-50 border-purple-200 text-purple-900"
  }

  const getSpeakerIcon = (speaker: string) => {
    if (speaker === "Hanna" || speaker === parsedScript?.podcast.speakers.A) {
      return "👩‍💼"
    }
    return "👨‍💼"
  }

  if (!parsedScript) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>Unable to parse script for editing</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full">
      {/* Segment Editor */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Edit Segments</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={expandAllSegments}
                className="text-xs"
              >
                Expand All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAllSegments}
                className="text-xs"
              >
                Collapse All
              </Button>
              {hasChanges && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Changes Saved
                </Badge>
              )}
              <Button
                onClick={onGenerateAudio}
                disabled={isGenerating || editingSegment !== null}
                className="bg-green-600 hover:bg-green-700"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Generating Audio...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    Generate Audio
                  </>
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
            Review and edit each segment before generating audio. Click on any segment to expand and edit the text or voice instructions.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[600px] px-6 pb-6">
            <div className="space-y-3">
              {parsedScript.podcast.script.map((segment, index) => {
                const isExpanded = expandedSegments.has(index)
                const isEditing = editingSegment === index
                const speakerName = segment.speaker === "A" ? parsedScript.podcast.speakers.A : 
                                 segment.speaker === "B" ? parsedScript.podcast.speakers.B : segment.speaker

                return (
                  <Card key={index} className={`transition-all duration-200 ${isEditing ? 'ring-2 ring-blue-500' : ''}`}>
                    <Collapsible open={isExpanded} onOpenChange={() => !isEditing && toggleSegmentExpansion(index)}>
                      <CollapsibleTrigger asChild>
                        <div className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isEditing ? 'cursor-default' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{getSpeakerIcon(speakerName)}</span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getSpeakerColor(speakerName)}`}
                                >
                                  {speakerName}
                                </Badge>
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 line-clamp-2">
                                  {segment.text}
                                </p>
                                {segment.instruction && !isExpanded && (
                                  <p className="text-xs text-gray-500 mt-1 italic">
                                    Voice: {segment.instruction.substring(0, 50)}...
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              {!isEditing && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditSegment(index, segment)
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              )}
                              {!isEditing && (
                                <div className="text-gray-400">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          {isEditing ? (
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label htmlFor={`text-${index}`} className="text-sm font-medium">
                                  Dialogue Text
                                </Label>
                                <Textarea
                                  id={`text-${index}`}
                                  value={editedText}
                                  onChange={(e) => setEditedText(e.target.value)}
                                  className="mt-1"
                                  rows={4}
                                  placeholder="Enter the dialogue text..."
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor={`instruction-${index}`} className="text-sm font-medium">
                                  Voice Instructions
                                </Label>
                                <Input
                                  id={`instruction-${index}`}
                                  value={editedInstruction}
                                  onChange={(e) => setEditedInstruction(e.target.value)}
                                  className="mt-1"
                                  placeholder="e.g., excited, thoughtful, questioning..."
                                />
                              </div>

                              <div className="flex justify-end gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveSegment(index)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Save Changes
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="pt-4 space-y-3">
                              <div>
                                <Label className="text-xs font-medium text-gray-600">DIALOGUE</Label>
                                <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                                  {segment.text}
                                </p>
                              </div>
                              
                              {segment.instruction && (
                                <div>
                                  <Label className="text-xs font-medium text-gray-600">VOICE INSTRUCTION</Label>
                                  <p className="text-sm text-gray-700 mt-1 italic">
                                    {segment.instruction}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
} 