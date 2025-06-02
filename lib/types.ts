export interface AudioSegment {
  speaker: string;
  text: string;
  instruction: string;
}

export interface PodcastScript {
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

export interface GeneratedSegment {
  audioUrl: string;
  filename: string;
  metadata: AudioSegment;
  fileSize?: number;
} 