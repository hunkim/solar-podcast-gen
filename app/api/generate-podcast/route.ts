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
        let isCancelled = false;
        
        const sendEvent = (data: any) => {
          if (isControllerClosed || isCancelled) {
            console.log("⚠️ Attempted to send data to closed/cancelled controller, skipping");
            return false;
          }
          
          try {
            const eventData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(eventData));
            return true;
          } catch (error) {
            console.error("Error sending event:", error);
            isControllerClosed = true;
            return false;
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
          
          // Create abort signal to pass to generator
          const abortController = new AbortController();
          
          // Send initial progress
          if (!sendEvent({
            type: "progress",
            data: {
              stage: "outline",
              step: "Starting podcast generation...",
              progress: 0,
            }
          })) {
            console.log("Failed to send initial progress, stopping");
            return;
          }

          // Generate the podcast with progress updates
          const progressIterator = generator.generatePodcastScript(content, finalInstructions);
          
          for await (const progress of progressIterator) {
            // Check if we should stop
            if (isControllerClosed || isCancelled) {
              console.log("🛑 Controller closed or cancelled, stopping generation");
              abortController.abort();
              break;
            }
            
            if (!sendEvent({
              type: "progress", 
              data: progress
            })) {
              console.log("Failed to send progress, stopping generation");
              break;
            }
            
            // If we have a final result, send it
            if (progress.progress === 100 && progress.result) {
              if (!sendEvent({
                type: "complete",
                data: {
                  script: progress.result,
                  progress: progress,
                  generationId: generationId,
                }
              })) {
                console.log("Failed to send completion, stopping");
                break;
              }
            }
          }
          
          // Send completion only if not closed or cancelled
          if (!isControllerClosed && !isCancelled) {
            sendEvent({
              type: "done",
              data: { message: "Generation complete" }
            });
          }
          
        } catch (error) {
          console.error("Error in podcast generation:", error);
          if (!isControllerClosed && !isCancelled) {
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
        // This method is called when the client cancels the stream
        return Promise.resolve();
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