"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { 
  Volume2, 
  Play, 
  Pause, 
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  Mic,
  Headphones,
  VolumeX,
  Volume1
} from "lucide-react"
import { updateGenerationWithAudio } from "@/lib/firestore"

interface AudioSegment {
  speaker: string;
  text: string;
  instruction: string;
}

interface PodcastScript {
  podcast: {
    title: string;
    description: string;
    estimatedDuration: string;
    speakers: {
      A: string;
      B: string;
    };
    script: AudioSegment[];
  };
}

interface AudioGenerationProps {
  script: string;
  onComplete?: (audioUrl: string) => void;
  generationId?: string;
}

interface GeneratedSegment {
  audioUrl: string;
  filename: string;
  metadata: AudioSegment;
  fileSize?: number;
}

export function AudioGeneration({ script, onComplete, generationId }: AudioGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isCombining, setIsCombining] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState("")
  const [totalSegments, setTotalSegments] = useState(0)
  const [currentSegment, setCurrentSegment] = useState(0)
  const [audioSegments, setAudioSegments] = useState<GeneratedSegment[]>([])
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null)
  const [finalAudioId, setFinalAudioId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playingSegment, setPlayingSegment] = useState<number | null>(null)
  const [testMode, setTestMode] = useState(false)
  const [combinationStarted, setCombinationStarted] = useState(false)
  const [isPlayingCombined, setIsPlayingCombined] = useState(false)

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Format time in MM:SS format
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Update progress when audio is playing
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateProgress = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', updateProgress)
    audio.addEventListener('loadedmetadata', updateProgress)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', updateProgress)
      audio.removeEventListener('loadedmetadata', updateProgress)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [audioRef.current])

  const startAudioGeneration = async () => {
    let parsedScript: PodcastScript;
    
    try {
      parsedScript = JSON.parse(script);
    } catch (error) {
      setError("Invalid script format");
      return;
    }

    if (!parsedScript.podcast?.script || !Array.isArray(parsedScript.podcast.script)) {
      setError("No valid script found");
      return;
    }

    // Limit to 3 segments in test mode
    const scriptToProcess = testMode 
      ? parsedScript.podcast.script.slice(0, 3)
      : parsedScript.podcast.script;

    // Reset state
    setIsGenerating(true)
    setIsCombining(false)
    setProgress(0)
    setCurrentStep(testMode ? "Starting test audio generation (3 segments only)..." : "Starting audio generation...")
    setTotalSegments(scriptToProcess.length)
    setCurrentSegment(0)
    setAudioSegments([])
    setFinalAudioUrl(null)
    setFinalAudioId(null)
    setError(null)
    setPlayingSegment(null)
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setCombinationStarted(false)
    setIsPlayingCombined(false)

    abortControllerRef.current = new AbortController();

    try {
      // Step 1: Generate audio segments
      const response = await fetch("/api/generate-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script: scriptToProcess,
          speakers: parsedScript.podcast.speakers,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      const segments: GeneratedSegment[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Split by double newlines to separate complete SSE events
        const events = buffer.split('\n\n');
        
        // Keep the last (potentially incomplete) event in the buffer
        buffer = events.pop() || '';
        
        for (const event of events) {
          const lines = event.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));
                
                if (eventData.type === "progress") {
                  setProgress(eventData.data.progress || 0);
                  setCurrentStep(eventData.data.step || "");
                  setCurrentSegment(eventData.data.currentSegment || 0);
                  setTotalSegments(eventData.data.totalSegments || 0);
                } else if (eventData.type === "segment_complete") {
                  const newSegment = eventData.data;
                  // Check if this segment was already added to avoid duplicates
                  if (!segments.some(seg => seg.filename === newSegment.filename)) {
                    segments.push(newSegment);
                    setAudioSegments(prev => {
                      // Also check for duplicates in state
                      if (prev.some(seg => seg.filename === newSegment.filename)) {
                        return prev;
                      }
                      return [...prev, newSegment];
                    });
                  }
                } else if (eventData.type === "complete") {
                  // Step 2: Automatically combine the audio
                  console.log("Audio generation complete, starting combination...");
                  if (!combinationStarted) {
                    setCombinationStarted(true);
                    await combineAudioSegments(segments, parsedScript.podcast.title);
                  }
                  return; // Exit the function to prevent further processing
                } else if (eventData.type === "error") {
                  throw new Error(eventData.data.error);
                }
              } catch (e) {
                console.warn("Failed to parse SSE data:", line);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setError("Audio generation cancelled");
      } else {
        setError(error instanceof Error ? error.message : "Unknown error occurred");
      }
      setIsGenerating(false);
    }
  };

  const combineAudioSegments = async (segments: GeneratedSegment[], title: string) => {
    setIsCombining(true);
    setCurrentStep("🔗 Combining audio segments...");

    try {
      const response = await fetch("/api/combine-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioSegments: segments,
          title,
          testMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to combine audio");
      }

      const result = await response.json();
      
      setFinalAudioUrl(result.audioUrl);
      setFinalAudioId(result.audioId);
      setCurrentStep("✅ Podcast ready! Combined audio available for download.");
      
      if (onComplete) {
        onComplete(result.audioUrl);
      }

      if (generationId) {
        await updateGenerationWithAudio(generationId, {
          audioUrl: result.audioUrl,
          audioId: result.audioId,
          audioMetadata: {
            format: 'wav',
            // TODO: Add duration and file size if available in result
          }
        });
      }
    } catch (error) {
      setError("Failed to combine audio: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsGenerating(false);
      setIsCombining(false);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const playAudioSegment = (segmentIndex: number, audioUrl: string) => {
    if (playingSegment === segmentIndex) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingSegment(null);
      setIsPlayingCombined(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Create audio element with direct URL
      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => {
        audio.play().catch(e => {
          console.error('Error playing audio:', e);
          setPlayingSegment(null);
        });
      };

      audio.onended = () => {
        setPlayingSegment(null);
        audioRef.current = null;
        setIsPlayingCombined(false);
      };

      audio.onerror = () => {
        console.error('Error loading audio from URL:', audioUrl);
        setPlayingSegment(null);
        audioRef.current = null;
        setIsPlayingCombined(false);
      };

      audioRef.current = audio;
      setPlayingSegment(segmentIndex);
      setIsPlayingCombined(false);
    }
  };

  const togglePlayPause = () => {
    // If no audio is loaded, initialize the final audio first
    if (!audioRef.current && finalAudioUrl) {
      initializeFinalAudio();
      return; // Let the user click play again after initialization
    }
    
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      // When starting to play, mark as playing combined
      setIsPlayingCombined(true);
      setPlayingSegment(null);
      audio.play().catch(e => console.error('Error playing audio:', e))
    }
  }

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const newTime = (value[0] / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100
    setVolume(newVolume)
    
    const audio = audioRef.current
    if (audio) {
      audio.volume = newVolume
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isMuted) {
      audio.volume = volume
      setIsMuted(false)
    } else {
      audio.volume = 0
      setIsMuted(true)
    }
  }

  const initializeFinalAudio = () => {
    if (!finalAudioUrl) return

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
    }

    // Create new audio element
    const audio = new Audio(finalAudioUrl)
    audio.volume = volume
    audio.preload = 'metadata'
    
    audioRef.current = audio
    
    // Set up event handlers
    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setIsPlayingCombined(false);
    };
  }

  const playCombinedAudio = () => {
    if (!finalAudioUrl) return;
    
    // Stop any individual segment that might be playing
    if (audioRef.current && playingSegment !== null) {
      audioRef.current.pause();
    }
    
    // Initialize combined audio but don't auto-play
    setPlayingSegment(null);
    initializeFinalAudio();
  }

  const downloadFinalAudio = async () => {
    if (!finalAudioUrl) return;
    
    try {
      // Try direct link download first (simpler and more reliable)
      const link = document.createElement('a');
      link.href = finalAudioUrl;
      link.download = `podcast_${finalAudioId || Date.now()}.wav`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Add to DOM temporarily to trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Download initiated successfully');
    } catch (error) {
      console.error('Download failed:', error);
      
      // Fallback: Open in new tab
      try {
        window.open(finalAudioUrl, '_blank');
      } catch (fallbackError) {
        console.error('Fallback download also failed:', fallbackError);
        alert('Download failed. Please try right-clicking the audio player and selecting "Save audio as..."');
      }
    }
  };

  // Initialize audio when finalAudioUrl is set
  useEffect(() => {
    if (finalAudioUrl) {
      initializeFinalAudio()
    }
  }, [finalAudioUrl])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Headphones className="w-5 h-5" />
          Audio Generation
          {(isGenerating || isCombining) && (
            <div className="ml-auto flex items-center gap-2">
              <Button onClick={stopGeneration} variant="destructive" size="sm">
                <Pause className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Generate realistic AI voices for your podcast script and download as one combined file.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 whitespace-pre-line">{error}</span>
          </div>
        )}

        {/* Initial State - Ready to Generate */}
        {!isGenerating && !isCombining && !finalAudioUrl && audioSegments.length === 0 && (
          <div className="text-center py-8">
            <Button onClick={startAudioGeneration} size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Volume2 className="w-4 h-4 mr-2" />
              Generate Audio
            </Button>
          </div>
        )}

        {/* Generation Progress */}
        {(isGenerating || isCombining) && (
          <div className="space-y-6">
            {/* Segment Generation Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isGenerating ? "Generating Audio Segments" : "Audio Segments Complete"}
                </span>
                <Badge variant={isGenerating ? "default" : "secondary"}>
                  {currentSegment} / {totalSegments} segments
                </Badge>
              </div>
              <Progress 
                value={totalSegments > 0 ? (currentSegment / totalSegments) * 100 : 0} 
                className="w-full" 
              />
              <p className="text-xs text-gray-600">
                {isGenerating ? 
                  `Creating individual audio files for each segment...` : 
                  "All audio segments have been generated successfully"
                }
              </p>
            </div>

            {/* Combining Progress */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {isCombining ? "Combining Audio Segments" : "Ready to Combine"}
                </span>
                <Badge variant={isCombining ? "default" : "outline"}>
                  {isCombining ? "Processing" : "Pending"}
                </Badge>
              </div>
              <Progress 
                value={isCombining ? 50 : (currentSegment === totalSegments && totalSegments > 0 ? 100 : 0)} 
                className="w-full" 
              />
              <p className="text-xs text-gray-600">
                {isCombining ? 
                  "Merging all segments into one complete podcast file..." : 
                  currentSegment === totalSegments && totalSegments > 0 ? 
                    "Ready to combine segments into final podcast" : 
                    "Waiting for segment generation to complete"
                }
              </p>
            </div>

            {/* Current Step Info */}
            {currentStep && (
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">{currentStep}</p>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Audio Player for Final Result */}
        {finalAudioUrl && (
          <div className="py-6 bg-green-50 border border-green-200 rounded-lg">
            <div className="px-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium text-green-800 mb-2">
                  🎉 Podcast Generated Successfully!
                </h3>
                <p className="text-green-700 mb-4">
                  Your podcast is ready to play and download.
                </p>
              </div>
              
              {/* Enhanced Audio Player */}
              <div className="bg-white rounded-lg p-4 border shadow-sm">
                {/* Player Controls */}
                <div className="flex items-center gap-4 mb-4">
                  <Button
                    onClick={togglePlayPause}
                    variant="outline"
                    size="lg"
                    className="rounded-full w-12 h-12 p-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </Button>
                  
                  {/* Show what's currently playing */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <div className="flex items-center gap-2">
                        <span>{formatTime(currentTime)}</span>
                        <Badge variant="secondary" className="text-xs">
                          Combined Podcast
                        </Badge>
                      </div>
                      <span>{formatTime(duration)}</span>
                    </div>
                    <Slider
                      value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                      onValueChange={handleSeek}
                      max={100}
                      step={0.1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : volume > 0.5 ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <Volume1 className="w-4 h-4" />
                      )}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume * 100]}
                      onValueChange={handleVolumeChange}
                      max={100}
                      step={1}
                      className="w-20"
                    />
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-center gap-3">
                  <Button onClick={downloadFinalAudio} className="bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download Podcast
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 