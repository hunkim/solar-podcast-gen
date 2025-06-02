"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"
import { parseDocument, extractTextFromUpstageResponse, UpstageResponse } from "@/lib/upstage"

interface FileUploadProps {
  onFileProcessed: (text: string, originalResponse: UpstageResponse) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number // in MB
}

interface UploadState {
  file: File | null
  isUploading: boolean
  progress: number
  status: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  error: string | null
  result: string | null
}

export function FileUpload({ 
  onFileProcessed, 
  acceptedFileTypes = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'],
  maxFileSize = 10 
}: FileUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    file: null,
    isUploading: false,
    progress: 0,
    status: 'idle',
    error: null,
    result: null
  })
  const [isDragOver, setIsDragOver] = useState(false)

  const validateFile = (file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `File type not supported. Accepted types: ${acceptedFileTypes.join(', ')}`
    }
    
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size too large. Maximum size: ${maxFileSize}MB`
    }
    
    return null
  }

  const processFile = async (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: validationError
      }))
      return
    }

    setUploadState(prev => ({
      ...prev,
      file,
      isUploading: true,
      status: 'uploading',
      progress: 0,
      error: null
    }))

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }))
      }, 200)

      setUploadState(prev => ({ ...prev, status: 'processing' }))
      
      const response = await parseDocument(file)
      const extractedText = extractTextFromUpstageResponse(response)
      
      clearInterval(progressInterval)
      
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        status: 'success',
        progress: 100,
        result: extractedText
      }))

      onFileProcessed(extractedText, response)
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Failed to process file'
      }))
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const resetUpload = () => {
    setUploadState({
      file: null,
      isUploading: false,
      progress: 0,
      status: 'idle',
      error: null,
      result: null
    })
  }

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />
      case 'uploading':
      case 'processing':
        return <FileText className="w-8 h-8 text-blue-500 animate-pulse" />
      default:
        return <Upload className="w-8 h-8 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (uploadState.status) {
      case 'uploading':
        return 'Uploading file...'
      case 'processing':
        return 'Processing document with Upstage AI...'
      case 'success':
        return 'Document processed successfully!'
      case 'error':
        return uploadState.error || 'An error occurred'
      default:
        return 'Drag and drop your document here, or click to browse'
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${uploadState.status === 'success' ? 'border-green-500 bg-green-50' : ''}
            ${uploadState.status === 'error' ? 'border-red-500 bg-red-50' : ''}
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center space-y-4">
            {getStatusIcon()}
            
            <div className="text-lg font-medium text-gray-900">
              {getStatusText()}
            </div>
            
            {uploadState.file && (
              <div className="text-sm text-gray-600 flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <span>{uploadState.file.name}</span>
                {uploadState.status === 'idle' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetUpload}
                    className="h-6 w-6 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
            
            {(uploadState.status === 'uploading' || uploadState.status === 'processing') && (
              <div className="w-full max-w-xs">
                <Progress value={uploadState.progress} className="w-full" />
                <div className="text-sm text-gray-500 mt-1">
                  {uploadState.progress}%
                </div>
              </div>
            )}
            
            {uploadState.status === 'idle' || uploadState.status === 'error' ? (
              <>
                <div className="text-gray-500 text-sm">
                  Supports: {acceptedFileTypes.join(', ')} (max {maxFileSize}MB)
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" asChild>
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      Choose File
                    </label>
                  </Button>
                  {uploadState.status === 'error' && (
                    <Button onClick={resetUpload} variant="outline">
                      Try Again
                    </Button>
                  )}
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept={acceptedFileTypes.join(',')}
                  onChange={handleFileSelect}
                />
              </>
            ) : uploadState.status === 'success' && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Extracted {uploadState.result?.length} characters
                </div>
                <Button onClick={resetUpload} variant="outline">
                  Upload Another File
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 