"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Upload, Sparkles } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { UpstageResponse } from "@/lib/upstage"

interface ContentInputProps {
  onGenerate: (data: any) => void
  initialData?: any
}

export function ContentInput({ onGenerate, initialData }: ContentInputProps) {
  const [inputType, setInputType] = useState("text")
  const [textInput, setTextInput] = useState("")
  const [instructions, setInstructions] = useState("")
  const [uploadedDocument, setUploadedDocument] = useState<{
    text: string
    originalResponse: UpstageResponse
  } | null>(null)

  useEffect(() => {
    if (initialData) {
      setInputType(initialData.inputType || "text")
      setTextInput(initialData.content || "")
      setInstructions(initialData.instructions || "")
      
      if (initialData.inputType === "pdf" && initialData.documentMetadata) {
        setUploadedDocument({
          text: initialData.content || "",
          originalResponse: {
            usage: {
              pages: initialData.documentMetadata.pages || 1
            },
            elements: new Array(initialData.documentMetadata.elements || 0)
          } as UpstageResponse
        })
      }
    } else {
      // Clear all form state when starting a new project
      setInputType("text")
      setTextInput("")
      setInstructions("")
      setUploadedDocument(null)
    }
  }, [initialData])

  const handleGenerate = () => {
    const data = {
      inputType,
      content: inputType === "text" ? textInput : uploadedDocument?.text || "",
      instructions,
      timestamp: new Date().toISOString(),
      ...(inputType === "pdf" && uploadedDocument && {
        originalDocument: uploadedDocument.originalResponse,
        documentMetadata: {
          pages: uploadedDocument.originalResponse.usage.pages,
          elements: uploadedDocument.originalResponse.elements.length,
        }
      })
    }
    onGenerate(data)
  }

  const handleFileProcessed = (text: string, originalResponse: UpstageResponse) => {
    setUploadedDocument({ text, originalResponse })
    setTextInput(text) // Also populate the text area for consistency
  }

  const isFormValid = () => {
    if (inputType === "text" && !textInput.trim()) return false
    if (inputType === "pdf" && !uploadedDocument?.text?.trim()) return false
    // Instructions are now optional
    return true
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="space-y-6">
        <div>
          <Tabs value={inputType} onValueChange={setInputType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Input</TabsTrigger>
              <TabsTrigger value="pdf">Document Upload</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <div className="space-y-4">
                <Label htmlFor="text-input">Enter your content</Label>
                <Textarea
                  id="text-input"
                  placeholder="Paste your text content here... This could be an article, blog post, research notes, or any text you want to transform into video/podcast content."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-[200px]"
                />
                <div className="text-sm text-gray-500">{textInput.length} characters</div>
              </div>
            </TabsContent>

            <TabsContent value="pdf" className="mt-4">
              <div className="space-y-4">
                <Label>Upload Document</Label>
                <FileUpload
                  onFileProcessed={handleFileProcessed}
                  acceptedFileTypes={['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg']}
                  maxFileSize={10}
                />
                
                {uploadedDocument && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="extracted-text">Extracted Text Preview</Label>
                      <div className="text-sm text-gray-500">
                        {uploadedDocument.originalResponse.usage.pages} page(s), {uploadedDocument.originalResponse.elements.length} elements
                      </div>
                    </div>
                    <Textarea
                      id="extracted-text"
                      value={uploadedDocument.text}
                      onChange={(e) => setUploadedDocument(prev => prev ? { ...prev, text: e.target.value } : null)}
                      className="min-h-[200px]"
                      placeholder="Extracted text will appear here..."
                    />
                    <div className="text-sm text-gray-500">
                      {uploadedDocument.text.length} characters extracted
                      <span className="ml-2 text-blue-600">• You can edit this text before generating content</span>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Instructions */}
        <div>
          <Label htmlFor="instructions">Instructions (Optional)</Label>
          <Textarea
            id="instructions"
            placeholder="Optional: Specify style, length, target audience, tone, or any specific requirements.

Example: Create a 10-minute professional podcast for healthcare professionals. Use educational but conversational tone with latest statistics and real-world examples."
            className="min-h-[120px]"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
          <div className="text-sm text-gray-500 mt-2">
            Leave blank to use default settings or specify your preferences
          </div>
        </div>

        {/* Generate Button */}
        <Button 
          onClick={handleGenerate} 
          disabled={!isFormValid()} 
          className="w-full" 
          size="lg"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Podcast Script
        </Button>
      </div>
    </div>
  )
}
