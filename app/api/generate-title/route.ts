import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/llm";

export async function POST(request: NextRequest) {
  try {
    const { content, instructions } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    // Truncate content if it's too long (keep first 2000 characters)
    const truncatedContent = content.length > 2000 ? content.substring(0, 2000) + "..." : content;

    const prompt = `Based on the following content and instructions, generate a concise, engaging title for a podcast episode. The title should be:
- Clear and descriptive
- 3-8 words long
- Engaging and clickable
- Professional but approachable

Content:
${truncatedContent}

${instructions ? `Instructions: ${instructions}` : ''}

Generate only the title, no additional text or quotes:`;

    const title = await chatCompletion([
      {
        role: "system",
        content: "You are a podcast title generator. Generate concise, engaging titles that capture the essence of the content. Return only the title without quotes or additional text."
      },
      {
        role: "user",
        content: prompt
      }
    ], {
      model: "solar-pro2-preview",
      temperature: 0.7,
      maxTokens: 50,
      reasoningEffort: "low" // Low reasoning effort for simple title generation
    });

    if (!title) {
      throw new Error("Failed to generate title");
    }

    return NextResponse.json({ title: title.trim() });

  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json(
      { error: "Failed to generate title" },
      { status: 500 }
    );
  }
} 