"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Play, 
  Download,
  Clock,
  Users,
  FileAudio,
  Trash2,
  RefreshCw
} from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc } from "firebase/firestore"

interface PodcastData {
  id: string;
  title: string;
  filename: string;
  downloadURL: string;
  testMode: boolean;
  segmentCount: number;
  fileSize: number;
  duration: number;
  segments: Array<{
    speaker: string;
    text: string;
    instruction: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export function PodcastLibrary() {
  const [podcasts, setPodcasts] = useState<PodcastData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null)

  const fetchPodcasts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const q = query(
        collection(db, 'podcasts'),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      
      const querySnapshot = await getDocs(q)
      const podcastData: PodcastData[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        podcastData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as PodcastData)
      })
      
      setPodcasts(podcastData)
    } catch (error) {
      console.error("Error fetching podcasts:", error)
      setError("Failed to load podcasts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPodcasts()
  }, [])

  const playPodcast = (podcastId: string, audioUrl: string) => {
    if (playingPodcast === podcastId) {
      // Stop playing
      setPlayingPodcast(null)
      // You could add actual audio control here
    } else {
      // Start playing
      setPlayingPodcast(podcastId)
      // Open audio in new tab or play inline
      window.open(audioUrl, '_blank')
    }
  }

  const downloadPodcast = (audioUrl: string, filename: string) => {
    const a = document.createElement('a')
    a.href = audioUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const deletePodcast = async (podcastId: string) => {
    if (!confirm('Are you sure you want to delete this podcast?')) {
      return
    }

    try {
      await deleteDoc(doc(db, 'podcasts', podcastId))
      setPodcasts(prev => prev.filter(p => p.id !== podcastId))
    } catch (error) {
      console.error("Error deleting podcast:", error)
      setError("Failed to delete podcast")
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileAudio className="w-5 h-5" />
            Podcast Library
          </CardTitle>
          <CardDescription>
            Your generated podcasts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading podcasts...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="w-5 h-5" />
          Podcast Library
          <Badge variant="outline" className="ml-auto">
            {podcasts.length} podcast{podcasts.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
        <CardDescription>
          Your generated podcasts
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {podcasts.length === 0 ? (
          <div className="text-center py-8">
            <FileAudio className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Podcasts Yet</h3>
            <p className="text-gray-600">
              Generate your first podcast to see it here.
            </p>
            <Button onClick={fetchPodcasts} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Showing {podcasts.length} most recent podcasts
              </span>
              <Button onClick={fetchPodcasts} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            <ScrollArea className="h-96 w-full">
              <div className="space-y-3">
                {podcasts.map((podcast) => (
                  <div key={podcast.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate mb-1">
                          {podcast.title}
                          {podcast.testMode && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              Test
                            </Badge>
                          )}
                        </h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(podcast.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {podcast.segmentCount} segments
                          </span>
                          <span>{formatFileSize(podcast.fileSize)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created {podcast.createdAt.toLocaleDateString()} at {podcast.createdAt.toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => playPodcast(podcast.id, podcast.downloadURL)}
                          variant="outline"
                          size="sm"
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Play
                        </Button>
                        <Button
                          onClick={() => downloadPodcast(podcast.downloadURL, podcast.filename)}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        <Button
                          onClick={() => deletePodcast(podcast.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Show first few segments as preview */}
                    <div className="space-y-1">
                      {podcast.segments.slice(0, 2).map((segment, index) => (
                        <div key={index} className="text-xs text-gray-600 bg-white p-2 rounded">
                          <span className={`font-medium ${
                            segment.speaker === 'Hanna' ? 'text-purple-600' : 'text-blue-600'
                          }`}>
                            {segment.speaker}:
                          </span>
                          <span className="ml-2">{segment.text.substring(0, 100)}...</span>
                        </div>
                      ))}
                      {podcast.segments.length > 2 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{podcast.segments.length - 2} more segments
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 