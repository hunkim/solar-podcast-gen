import { NextRequest, NextResponse } from "next/server";
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

interface GenerateAudioRequest {
  script: AudioSegment[];
  speakers: {
    A: string;
    B: string;
  };
}

// Voice mapping for OpenAI TTS
const OPENAI_VOICES = {
  Hanna: "nova",    // Female voice - warm and engaging
  Abram: "onyx",   // Male voice - professional and clear
} as const

// Mock mode for testing without API costs
const MOCK_MODE = process.env.MOCK_AUDIO_GENERATION === "true";

async function generateAudioSegment(
  text: string,
  speaker: string,
  voiceInstructions: string
): Promise<Buffer> {
  console.log(`🔊 Generating OpenAI TTS audio for ${speaker}: "${text.substring(0, 50)}..."`);
  
  const voice = OPENAI_VOICES[speaker as keyof typeof OPENAI_VOICES];
  if (!voice) {
    throw new Error(`No voice configured for speaker: ${speaker}`);
  }

  // Mock mode - generate silence instead of calling API
  if (MOCK_MODE) {
    console.log(`🎭 MOCK MODE: Simulating audio generation for ${speaker} (${voice} voice)`);
    
    // Generate 3 seconds of silence as WAV
    const sampleRate = 44100;
    const duration = 3; // seconds
    const numSamples = sampleRate * duration;
    const headerSize = 44;
    const dataSize = numSamples * 2; // 16-bit samples
    const fileSize = headerSize + dataSize - 8;
    
    const buffer = Buffer.alloc(headerSize + dataSize);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // PCM chunk size
    buffer.writeUInt16LE(1, 20);  // Audio format (PCM)
    buffer.writeUInt16LE(1, 22);  // Number of channels (mono)
    buffer.writeUInt32LE(sampleRate, 24); // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, 28); // Byte rate
    buffer.writeUInt16LE(2, 32);  // Block align
    buffer.writeUInt16LE(16, 34); // Bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Data section (silence - all zeros)
    // Buffer is already zeroed out, so no need to write anything
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`✅ Mock audio generated successfully for ${speaker} (${voice} voice)`);
    return buffer;
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: voice,
      response_format: "wav"
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OpenAI TTS API error: ${response.status} - ${errorText}`);
    throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
  }

  console.log(`✅ Audio generated successfully for ${speaker} (${voice} voice)`);
  return Buffer.from(await response.arrayBuffer());
}

async function uploadAudioToStorage(audioBuffer: Buffer, filename: string): Promise<string> {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("Storage bucket not configured");
  }

  const storage = getAdminStorage();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(`audio-segments/${filename}`);
  
  await file.save(audioBuffer, {
    metadata: {
      contentType: 'audio/wav',
    }
  });
  
  // Make the file publicly readable
  await file.makePublic();
  
  // Return the public URL
  return `https://storage.googleapis.com/${bucketName}/${file.name}`;
}

export async function POST(request: NextRequest) {
  try {
    const { script, speakers }: GenerateAudioRequest = await request.json();

    // Enhanced environment variable checking
    console.log("=== OPENAI TTS ENVIRONMENT CHECK ===");
    console.log("OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY);
    console.log("MOCK_AUDIO_GENERATION:", process.env.MOCK_AUDIO_GENERATION || "false");
    console.log("Mock mode enabled:", MOCK_MODE);
    
    if (process.env.OPENAI_API_KEY) {
      console.log("OPENAI_API_KEY length:", process.env.OPENAI_API_KEY.length);
      console.log("OPENAI_API_KEY starts with:", process.env.OPENAI_API_KEY.substring(0, 10) + "...");
    }
    
    console.log("Available OpenAI voices for Hanna:", OPENAI_VOICES.Hanna);
    console.log("Available OpenAI voices for Abram:", OPENAI_VOICES.Abram);
    console.log("========================================");

    if (!process.env.OPENAI_API_KEY && !MOCK_MODE) {
      console.error("❌ OPENAI_API_KEY not found and mock mode not enabled");
      return NextResponse.json(
        { 
          error: "OPENAI_API_KEY not configured",
          details: "Please add OPENAI_API_KEY to your .env.local file. Get your API key from https://platform.openai.com/api-keys",
          mockMode: "To test without API costs, add MOCK_AUDIO_GENERATION=true to .env.local",
          setup: {
            step1: "Go to https://platform.openai.com/api-keys",
            step2: "Create a new API key",
            step3: "Add OPENAI_API_KEY=your_key_here to .env.local",
            step4: "Or add MOCK_AUDIO_GENERATION=true for testing",
            step5: "Restart the dev server"
          }
        },
        { status: 500 }
      );
    }

    if (!script || !Array.isArray(script)) {
      console.error("❌ Invalid script format:", { script: typeof script, isArray: Array.isArray(script) });
      return NextResponse.json(
        { error: "Invalid script format", details: "Script must be an array of segments" },
        { status: 400 }
      );
    }

    console.log("✅ Starting OpenAI TTS generation for", script.length, "segments");
    console.log("📝 Speakers:", speakers);
    if (MOCK_MODE) {
      console.log("🎭 MOCK MODE: Will generate silence instead of real audio");
    }

    // Generate a unique session ID for this batch
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create a readable stream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: any) => {
          const eventData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          sendEvent({
            type: "progress",
            data: {
              step: "Starting OpenAI TTS audio generation...",
              progress: 0,
              totalSegments: script.length,
              sessionId,
            }
          });

          const audioSegments: { audioUrl: string; metadata: AudioSegment; filename: string }[] = [];

          for (let i = 0; i < script.length; i++) {
            const segment = script[i];
            const progress = Math.round(((i + 1) / script.length) * 100);

            sendEvent({
              type: "progress",
              data: {
                step: MOCK_MODE 
                  ? `🎭 Mock generating TTS for ${segment.speaker}: "${segment.text.substring(0, 50)}..."` 
                  : `Generating TTS for ${segment.speaker}: "${segment.text.substring(0, 50)}..."`,
                progress,
                currentSegment: i + 1,
                totalSegments: script.length,
              }
            });

            try {
              // Generate audio for this segment using OpenAI TTS
              const audioBuffer = await generateAudioSegment(
                segment.text,
                segment.speaker,
                segment.instruction
              );

              // Create filename for this segment
              const filename = `${sessionId}_segment_${String(i).padStart(3, '0')}_${segment.speaker.toLowerCase()}.wav`;
              
              // Upload to Firebase Storage instead of base64
              console.log(`☁️ Uploading segment ${i + 1} to Firebase Storage...`);
              const audioUrl = await uploadAudioToStorage(audioBuffer, filename);
              console.log(`✅ Segment ${i + 1} uploaded successfully`);

              audioSegments.push({
                audioUrl,
                filename,
                metadata: segment,
              });

              sendEvent({
                type: "segment_complete",
                data: {
                  segmentIndex: i,
                  audioUrl,
                  filename,
                  metadata: segment,
                  fileSize: audioBuffer.length,
                }
              });

            } catch (segmentError) {
              console.error(`Error generating audio for segment ${i}:`, segmentError);
              sendEvent({
                type: "segment_error",
                data: {
                  segmentIndex: i,
                  error: segmentError instanceof Error ? segmentError.message : "Unknown error",
                  metadata: segment,
                }
              });
            }
          }

          sendEvent({
            type: "complete",
            data: {
              audioSegments,
              totalSegments: script.length,
              successfulSegments: audioSegments.length,
              sessionId,
            }
          });

        } catch (error) {
          console.error("Error in OpenAI TTS generation:", error);
          sendEvent({
            type: "error",
            data: {
              error: error instanceof Error ? error.message : "Unknown error occurred"
            }
          });
        } finally {
          controller.close();
        }
      },
    });

    // Return the stream with proper headers for SSE
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });

  } catch (error) {
    console.error("Error in generate-audio API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
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