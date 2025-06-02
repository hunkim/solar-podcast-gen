import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

// Initialize Firebase Admin Storage
const getAdminStorage = () => {
  const adminApp = getApps().find(app => app.name === 'admin') || initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  }, 'admin');
  
  return getStorage(adminApp);
};

interface AudioSegment {
  speaker: string;
  text: string;
  instruction: string;
}

interface GeneratedSegment {
  audioUrl: string;
  filename: string;
  metadata: AudioSegment;
}

interface CombineAudioRequest {
  audioSegments: GeneratedSegment[];
  title: string;
  testMode?: boolean;
}

// Function to download audio file from Firebase Storage URL
async function downloadAudioFromUrl(url: string): Promise<Buffer> {
  console.log(`📥 Downloading audio from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  console.log(`✅ Downloaded audio file (${buffer.length} bytes)`);
  
  return buffer;
}

// Function to delete individual segment files from Firebase Storage
async function deleteSegmentFiles(segmentFilenames: string[], bucketName: string): Promise<void> {
  console.log(`🧹 Cleaning up ${segmentFilenames.length} individual segment files...`);
  
  const storage = getAdminStorage();
  const bucket = storage.bucket(bucketName);
  
  const deletePromises = segmentFilenames.map(async (filename) => {
    try {
      const file = bucket.file(`audio-segments/${filename}`);
      await file.delete();
      console.log(`✅ Deleted segment file: ${filename}`);
    } catch (error) {
      console.warn(`⚠️ Failed to delete segment file ${filename}:`, error);
      // Don't throw - cleanup failure shouldn't break the main flow
    }
  });
  
  await Promise.all(deletePromises);
  console.log(`✅ Segment cleanup completed`);
}

// Function to combine multiple WAV buffers into one
function combineWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) {
    throw new Error("No audio buffers to combine");
  }

  // Parse WAV headers to get audio specs
  const firstBuffer = buffers[0];
  const sampleRate = firstBuffer.readUInt32LE(24);
  const bitsPerSample = firstBuffer.readUInt16LE(34);
  const numChannels = firstBuffer.readUInt16LE(22);
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;

  // Calculate total data size (excluding headers)
  let totalDataSize = 0;
  const audioDataChunks: Buffer[] = [];

  for (const buffer of buffers) {
    // Find the data chunk in each WAV file
    let dataStart = 44; // Standard WAV header size
    let dataSize = buffer.readUInt32LE(40); // Data chunk size

    // Extract audio data (skip the header)
    const audioData = buffer.subarray(dataStart, dataStart + dataSize);
    audioDataChunks.push(audioData);
    totalDataSize += audioData.length;
  }

  // Create combined WAV buffer
  const headerSize = 44;
  const totalFileSize = headerSize + totalDataSize - 8;
  const combinedBuffer = Buffer.alloc(headerSize + totalDataSize);

  // Write WAV header
  let offset = 0;

  // RIFF header
  combinedBuffer.write('RIFF', offset); offset += 4;
  combinedBuffer.writeUInt32LE(totalFileSize, offset); offset += 4;
  combinedBuffer.write('WAVE', offset); offset += 4;

  // fmt chunk
  combinedBuffer.write('fmt ', offset); offset += 4;
  combinedBuffer.writeUInt32LE(16, offset); offset += 4; // fmt chunk size
  combinedBuffer.writeUInt16LE(1, offset); offset += 2;  // audio format (PCM)
  combinedBuffer.writeUInt16LE(numChannels, offset); offset += 2;
  combinedBuffer.writeUInt32LE(sampleRate, offset); offset += 4;
  combinedBuffer.writeUInt32LE(sampleRate * blockAlign, offset); offset += 4; // byte rate
  combinedBuffer.writeUInt16LE(blockAlign, offset); offset += 2;
  combinedBuffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk header
  combinedBuffer.write('data', offset); offset += 4;
  combinedBuffer.writeUInt32LE(totalDataSize, offset); offset += 4;

  // Copy all audio data
  for (const audioData of audioDataChunks) {
    audioData.copy(combinedBuffer, offset);
    offset += audioData.length;
  }

  return combinedBuffer;
}

export async function POST(request: NextRequest) {
  try {
    const { audioSegments, title, testMode }: CombineAudioRequest = await request.json();

    if (!audioSegments || !Array.isArray(audioSegments) || audioSegments.length === 0) {
      return NextResponse.json(
        { error: "No audio segments provided" },
        { status: 400 }
      );
    }

    console.log(`🔗 Starting audio combination for ${audioSegments.length} segments`);
    console.log(`📝 Title: ${title}`);
    console.log(`🧪 Test mode: ${testMode ? 'enabled' : 'disabled'}`);

    // Check storage bucket configuration
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!bucketName) {
      console.error("❌ Storage bucket not configured");
      return NextResponse.json(
        { 
          error: "Storage configuration missing", 
          details: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET not found in environment" 
        },
        { status: 500 }
      );
    }

    console.log(`🪣 Using storage bucket: ${bucketName}`);

    // Download audio files from Firebase Storage URLs
    const audioBuffers: Buffer[] = [];
    
    for (let i = 0; i < audioSegments.length; i++) {
      const segment = audioSegments[i];
      try {
        console.log(`📥 Downloading segment ${i + 1}: ${segment.filename}`);
        const audioBuffer = await downloadAudioFromUrl(segment.audioUrl);
        audioBuffers.push(audioBuffer);
        console.log(`✅ Downloaded segment ${i + 1} (${audioBuffer.length} bytes)`);
      } catch (error) {
        console.error(`❌ Failed to download segment ${i + 1}:`, error);
        return NextResponse.json(
          { error: `Failed to download audio segment ${i + 1}: ${segment.filename}` },
          { status: 400 }
        );
      }
    }

    // Combine all audio buffers
    console.log("🎵 Combining audio buffers...");
    const combinedAudioBuffer = combineWavBuffers(audioBuffers);
    console.log(`✅ Combined audio created (${combinedAudioBuffer.length} bytes)`);

    // Generate unique ID for this podcast
    const podcastId = `podcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const filename = `${testMode ? 'test_' : ''}${podcastId}.wav`;

    // Upload to Firebase Storage using Admin SDK
    console.log("☁️ Uploading combined podcast to Firebase Storage...");
    const storage = getAdminStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`podcasts/${filename}`);
    
    await file.save(combinedAudioBuffer, {
      metadata: {
        contentType: 'audio/wav',
        metadata: {
          title: title || 'Untitled Podcast',
          testMode: testMode ? 'true' : 'false',
          segmentCount: audioSegments.length.toString(),
        }
      }
    });
    
    // Make the file publicly readable
    await file.makePublic();
    
    // Get the public URL
    const downloadURL = `https://storage.googleapis.com/${bucketName}/${file.name}`;
    console.log("✅ Combined podcast uploaded successfully");

    // Store metadata in Firestore (without individual segment URLs since we're deleting them)
    console.log("📝 Saving podcast metadata to Firestore...");
    const podcastData = {
      id: podcastId,
      title: title || 'Untitled Podcast',
      filename,
      downloadURL,
      testMode: testMode || false,
      segmentCount: audioSegments.length,
      fileSize: combinedAudioBuffer.length,
      duration: estimateAudioDuration(combinedAudioBuffer),
      segments: audioSegments.map(segment => ({
        speaker: segment.metadata.speaker,
        text: segment.metadata.text,
        instruction: segment.metadata.instruction,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('podcasts').doc(podcastId).set(podcastData);
    console.log("✅ Podcast metadata saved to Firestore");

    // Clean up individual segment files to save storage space
    const segmentFilenames = audioSegments.map(segment => segment.filename);
    await deleteSegmentFiles(segmentFilenames, bucketName);

    return NextResponse.json({
      success: true,
      audioId: podcastId,
      audioUrl: downloadURL,
      filename,
      fileSize: combinedAudioBuffer.length,
      segmentCount: audioSegments.length,
      message: testMode 
        ? "Test podcast combined and saved successfully! Individual segments cleaned up." 
        : "Podcast combined and saved successfully! Individual segments cleaned up."
    });

  } catch (error) {
    console.error("❌ Error in combine-audio API:", error);
    return NextResponse.json(
      { 
        error: "Failed to combine audio", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Rough estimation of audio duration based on file size
function estimateAudioDuration(buffer: Buffer): number {
  // For 16-bit, 44.1kHz, mono WAV: ~88,200 bytes per second
  // For stereo: ~176,400 bytes per second
  // This is a rough estimate - real duration would require parsing the WAV data
  const dataSize = buffer.length - 44; // subtract header
  const estimatedSeconds = dataSize / 88200; // assuming mono, 16-bit, 44.1kHz
  return Math.round(estimatedSeconds);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
} 