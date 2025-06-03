const UPSTAGE_API_KEY = process.env.UPSTAGE_API_KEY;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export async function* streamChatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    reasoningEffort?: "low" | "medium" | "high";
    temperature?: number;
    maxTokens?: number;
  } = {}
): AsyncGenerator<string, void, unknown> {
  const {
    model = "solar-pro2-preview",
    reasoningEffort = "high",
    temperature = 0.7,
    maxTokens = 4000,
  } = options;

  try {
    const response = await fetch("https://api.upstage.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        reasoning_effort: reasoningEffort,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let contentBuffer = ""; // Buffer to handle partial think tags

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              // Yield any remaining clean content
              if (contentBuffer.trim()) {
                const finalClean = contentBuffer.replace(/<think>[\s\S]*?<\/think>/g, "");
                if (finalClean.trim()) {
                  yield finalClean;
                }
              }
              return;
            }

            try {
              const parsed: StreamChunk = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                // Add to content buffer
                contentBuffer += content;
                
                // Check if we have complete think tags to remove
                const thinkRegex = /<think>[\s\S]*?<\/think>/g;
                let match;
                let lastIndex = 0;
                let cleanContent = "";
                
                while ((match = thinkRegex.exec(contentBuffer)) !== null) {
                  // Add content before the think tag
                  cleanContent += contentBuffer.slice(lastIndex, match.index);
                  lastIndex = match.index + match[0].length;
                }
                
                // Check if there's an incomplete think tag at the end
                const incompleteThinkStart = contentBuffer.lastIndexOf("<think>");
                const incompleteThinkEnd = contentBuffer.lastIndexOf("</think>");
                
                if (incompleteThinkStart > incompleteThinkEnd) {
                  // We have an incomplete think tag, keep everything from the start of it
                  cleanContent += contentBuffer.slice(lastIndex, incompleteThinkStart);
                  contentBuffer = contentBuffer.slice(incompleteThinkStart);
                } else {
                  // No incomplete think tag, add remaining content and clear buffer
                  cleanContent += contentBuffer.slice(lastIndex);
                  contentBuffer = "";
                }
                
                if (cleanContent.trim()) {
                  yield cleanContent;
                }
              }
            } catch (e) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error("Error in stream chat completion:", error);
    throw error;
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: {
    model?: string;
    reasoningEffort?: "low" | "medium" | "high";
    temperature?: number;
    maxTokens?: number;
    responseFormat?: any;
  } = {}
): Promise<string> {
  const {
    model = "solar-pro2-preview",
    reasoningEffort = "high",
    temperature = 0.7,
    maxTokens = 4000,
    responseFormat,
  } = options;

  try {
    const requestBody: any = {
      model,
      messages,
      reasoning_effort: reasoningEffort,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };

    // Add response_format if provided
    if (responseFormat) {
      requestBody.response_format = responseFormat;
    }

    const response = await fetch("https://api.upstage.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const rawContent = result.choices[0]?.message?.content || "";
    
    // Filter out think tags from the response
    return rawContent.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  } catch (error) {
    console.error("Error in chat completion:", error);
    throw error;
  }
} 