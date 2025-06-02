import { NextRequest, NextResponse } from "next/server";
import { PodcastGenerator, GenerationProgress } from "@/lib/podcast-generator";

export async function POST(request: NextRequest) {
  try {
    const { content, instructions, generationId } = await request.json();
    
    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Provide default instructions if none given
    const defaultInstructions = "Create an engaging 10-15 minute podcast with fun, tiki-taka style conversation between two hosts. Use conversational tone with natural reactions, quick back-and-forth exchanges, and make it entertaining while informative. Each section should be exactly 3 minutes long.";

    // Instructions are optional, provide default if not provided
    const finalInstructions = instructions?.trim() || defaultInstructions;

    // Create a readable stream for server-sent events
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isControllerClosed = false;
        
        const sendEvent = (data: any) => {
          if (isControllerClosed) {
            console.log("⚠️ Attempted to send data to closed controller, skipping");
            return;
          }
          
          try {
            const eventData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
          } catch (error) {
            console.error("Error sending event:", error);
            isControllerClosed = true;
          }
        };

        // Handle controller close
        const closeController = () => {
          if (!isControllerClosed) {
            isControllerClosed = true;
            try {
              controller.close();
            } catch (error) {
              console.error("Error closing controller:", error);
            }
          }
        };

        try {
          const generator = new PodcastGenerator();
          
          // Send initial progress
          sendEvent({
            type: "progress",
            data: {
              stage: "outline",
              step: "Starting podcast generation...",
              progress: 0,
            }
          });

          // Generate the podcast with progress updates
          for await (const progress of generator.generatePodcastScript(content, finalInstructions)) {
            if (isControllerClosed) {
              console.log("🛑 Controller closed, stopping generation");
              break;
            }
            
            sendEvent({
              type: "progress", 
              data: progress
            });
            
            // If we have a final result, send it
            if (progress.progress === 100 && progress.result) {
              sendEvent({
                type: "complete",
                data: {
                  script: progress.result,
                  progress: progress,
                  generationId: generationId,
                }
              });
            }
          }
          
          // Send completion only if not closed
          if (!isControllerClosed) {
            sendEvent({
              type: "done",
              data: { message: "Generation complete" }
            });
          }
          
        } catch (error) {
          console.error("Error in podcast generation:", error);
          if (!isControllerClosed) {
            sendEvent({
              type: "error",
              data: {
                error: error instanceof Error ? error.message : "Unknown error occurred"
              }
            });
          }
        } finally {
          closeController();
        }
      },
      
      cancel() {
        console.log("🚫 Stream cancelled by client");
      }
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
    console.error("Error in generate-podcast API:", error);
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