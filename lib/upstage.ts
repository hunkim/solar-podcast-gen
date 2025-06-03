import FormData from "form-data";

const API_KEY = process.env.NEXT_PUBLIC_UPSTAGE_API_KEY || "up_ncaavCBkmSZg5lLjDOgtFeRw80UNK";

export interface UpstageResponse {
  api: string;
  content: {
    html: string;
    markdown: string;
    text: string;
  };
  elements: Array<{
    category: string;
    content: {
      html: string;
      markdown: string;
      text: string;
    };
    coordinates: Array<{
      x: number;
      y: number;
    }>;
    id: number;
    page: number;
  }>;
  model: string;
  usage: {
    pages: number;
  };
}

export async function parseDocument(file: File): Promise<UpstageResponse> {
  // Use the browser's native FormData for client-side uploads
  const formData = new globalThis.FormData();
  
  formData.append("document", file);
  // Use exact parameters from Python reference
  formData.append("ocr", "force");
  formData.append("base64_encoding", "['table']");
  formData.append("model", "document-parse");

  try {
    // Call our API route instead of directly calling Upstage
    const response = await fetch("/api/parse-document", {
      method: "POST",
      body: formData as BodyInit,
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("API response error:", errorDetails);
      throw new Error(`HTTP error! status: ${response.status} - ${errorDetails}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error parsing document:", error);
    throw error;
  }
}

export function extractTextFromUpstageResponse(response: UpstageResponse): string {
  // Extract HTML content first to preserve table and structured information
  if (response.content.html && response.content.html.trim()) {
    return response.content.html.trim();
  }
  
  // Fall back to markdown if HTML is not available
  if (response.content.markdown && response.content.markdown.trim()) {
    return response.content.markdown.trim();
  }
  
  // Fall back to plain text if neither HTML nor markdown is available
  if (response.content.text && response.content.text.trim()) {
    return response.content.text.trim();
  }

  // Last resort: extract HTML from elements to preserve structure
  return response.elements
    .map(element => element.content.html || element.content.markdown || element.content.text)
    .filter(content => content && content.trim())
    .join('\n')
    .trim();
} 