import { ChatMessage, chatCompletion, streamChatCompletion } from "./llm";
import { searchWeb, generateSearchQueries, SearchResponse } from "./search";
import { parseJSONFromResponse } from "@/lib/llm-utils";

export interface PodcastSection {
  id: string;
  title: string;
  description: string;
  duration: string; // e.g., "3 minutes"
  keyPoints: string[];
  script?: string;
  searchContext?: SearchResponse[];
}

export interface PodcastOutline {
  overview: {
    title: string;
    description: string;
    totalDuration: string;
    targetAudience: string;
    tone: string;
  };
  sections: PodcastSection[];
  finalThoughts: {
    title: string;
    description: string;
    duration: string;
    keyTakeaways: string[];
    script?: string;
  };
}

export interface GenerationProgress {
  stage: "outline" | "search" | "script" | "combining" | "finalizing";
  step: string;
  progress: number; // 0-100
  currentSection?: string;
  result?: string;
  error?: string;
}

export class PodcastGenerator {
  private onProgress?: (progress: GenerationProgress) => void;

  constructor(onProgress?: (progress: GenerationProgress) => void) {
    this.onProgress = onProgress;
  }

  private updateProgress(progress: GenerationProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  async generatePodcastOutline(
    content: string,
    instructions: string
  ): Promise<PodcastOutline> {
    this.updateProgress({
      stage: "outline",
      step: "📝 Creating podcast outline with overview and final thoughts",
      progress: 10,
    });

    // Extract key topics and themes from the content first
    const contentSummary = content.substring(0, 3000);
    
    const systemPrompt = `You are an expert podcast producer. Create detailed, engaging podcast outlines based on provided content.

CRITICAL RULES:
1. Generate REAL, SPECIFIC content - NO generic text like "string" or "section title"
2. Use the actual content to create meaningful sections
3. Each section should be exactly "3 minutes" duration
4. Respond with ONLY valid JSON - no markdown, explanations, or extra text

OUTPUT FORMAT: Valid JSON only with this structure.`;

    const userPrompt = `CONTENT TO ANALYZE:
${contentSummary}

INSTRUCTIONS: ${instructions || "Create an engaging conversational podcast"}

Create a podcast outline with:
- 3-4 main sections (each exactly "3 minutes")
- Specific titles based on the content (not generic)
- Detailed descriptions explaining what each section covers
- 3-4 key points per section from the actual content
- Total duration "12-15 minutes"

RESPOND WITH ONLY THIS JSON STRUCTURE (no markdown, no explanations):

{
  "overview": {
    "title": "Specific podcast title based on the content",
    "description": "What makes this podcast unique and valuable",
    "totalDuration": "12-15 minutes",
    "targetAudience": "Specific audience for this content",
    "tone": "Conversational and engaging"
  },
  "sections": [
    {
      "id": "section_1",
      "title": "Specific section title from content analysis",
      "description": "What this section explores in detail",
      "duration": "3 minutes",
      "keyPoints": [
        "First specific insight from the content",
        "Second concrete point from the material",
        "Third actionable discussion point"
      ]
    },
    {
      "id": "section_2", 
      "title": "Another specific section title",
      "description": "What this section builds upon",
      "duration": "3 minutes",
      "keyPoints": [
        "Specific point from content",
        "Another detailed insight", 
        "Third concrete topic"
      ]
    },
    {
      "id": "section_3",
      "title": "Third specific section title", 
      "description": "Final main section focus",
      "duration": "3 minutes",
      "keyPoints": [
        "Specific insight from content",
        "Detailed discussion point",
        "Concrete topic for conversation"
      ]
    }
  ],
  "finalThoughts": {
    "title": "Meaningful closing section title",
    "description": "How to wrap up with impact",
    "duration": "2-3 minutes", 
    "keyTakeaways": [
      "Actionable insight listeners can apply",
      "Memorable point they'll remember",
      "Clear next step or call to action"
    ]
  }
}

Generate REAL content based on the provided material - not placeholder text!`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // Simplified JSON schema - much more permissive
    const responseFormat = {
      type: "json_schema" as const,
      json_schema: {
        name: "podcast_outline",
        strict: false, // Less strict for better compatibility
        schema: {
          type: "object",
          properties: {
            overview: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                totalDuration: { type: "string" },
                targetAudience: { type: "string" },
                tone: { type: "string" }
              },
              required: ["title", "description", "totalDuration", "targetAudience", "tone"]
            },
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  duration: { type: "string" },
                  keyPoints: {
                    type: "array",
                    items: { type: "string" }
                  }
                },
                required: ["id", "title", "description", "duration", "keyPoints"]
              }
            },
            finalThoughts: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                duration: { type: "string" },
                keyTakeaways: {
                  type: "array",
                  items: { type: "string" }
                }
              },
              required: ["title", "description", "duration", "keyTakeaways"]
            }
          },
          required: ["overview", "sections", "finalThoughts"]
        }
      }
    };

    let lastError: Error | null = null;
    
    // Try up to 3 times to get valid JSON
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        this.updateProgress({
          stage: "outline",
          step: `Generating podcast outline (attempt ${attempt}/3)`,
          progress: 10 + (attempt - 1) * 5,
        });

        let response: string;
        
        // Try with structured output first
        try {
          response = await chatCompletion(messages, {
            temperature: 0.7, // Slightly lower for more consistency
            maxTokens: 2500,
            responseFormat,
          });
        } catch (structuredError) {
          console.warn("Structured output failed, trying with regular prompting:", structuredError);
          
          // Simple fallback without complex examples
          const fallbackMessages: ChatMessage[] = [
            { role: "system", content: systemPrompt + "\n\nYou MUST respond with valid JSON only. No markdown blocks, no explanations." },
            { role: "user", content: userPrompt }
          ];

          response = await chatCompletion(fallbackMessages, {
            temperature: 0.7,
            maxTokens: 2500,
          });
        }

        // Parse with less strict validation initially
        const outline = parseJSONFromResponse<PodcastOutline>(response, false);

        // Basic structure validation
        if (!outline.overview || !outline.sections || !outline.finalThoughts) {
          throw new Error("Invalid outline structure: missing required sections");
        }

        if (!Array.isArray(outline.sections) || outline.sections.length < 3) {
          throw new Error("Invalid outline: must have at least 3 sections");
        }

        // Check for obvious placeholder content (more lenient)
        const hasObviousPlaceholders = (
          outline.overview.title.toLowerCase().includes('string') ||
          outline.overview.title.toLowerCase().includes('title here') ||
          outline.sections.some(section => 
            section.title.toLowerCase().includes('string') ||
            section.title.toLowerCase().includes('section title') ||
            section.keyPoints.some(point => 
              point.toLowerCase().includes('string') ||
              point.trim().length < 5
            )
          )
        );

        if (hasObviousPlaceholders) {
          throw new Error("Generated outline contains obvious placeholder content.");
        }

        this.updateProgress({
          stage: "outline",
          step: "Podcast outline generated successfully",
          progress: 30,
        });

        return outline;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        console.warn(`Outline generation attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < 3) {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // All attempts failed
    this.updateProgress({
      stage: "outline",
      step: "Failed to generate outline after 3 attempts",
      progress: 30,
      error: lastError?.message || "Failed to generate valid outline",
    });
    
    throw new Error(`Failed to generate valid podcast outline after 3 attempts. Last error: ${lastError?.message}`);
  }

  async enrichWithWebSearch(
    outline: PodcastOutline,
    content: string,
    instructions: string
  ): Promise<PodcastOutline> {
    this.updateProgress({
      stage: "search",
      step: "Generating search queries for additional context",
      progress: 35,
    });

    try {
      // Generate search queries based on content and instructions
      const searchQueries = await generateSearchQueries(content, instructions, 3);
      
      const enrichedSections: PodcastSection[] = [];
      
      for (let i = 0; i < outline.sections.length; i++) {
        const section = outline.sections[i];
        
        this.updateProgress({
          stage: "search",
          step: `Searching for additional context: ${section.title}`,
          progress: Math.round(35 + (i / outline.sections.length) * 20),
          currentSection: section.title,
        });

        // Search for relevant information for this section
        const sectionQueries = [
          `${section.title} ${searchQueries[0] || ""}`,
          searchQueries[i % searchQueries.length] || section.title
        ];

        const searchResults: SearchResponse[] = [];
        
        for (const query of sectionQueries.slice(0, 2)) {
          try {
            const result = await searchWeb(query, {
              maxResults: 3,
              searchDepth: "advanced",
            });
            searchResults.push(result);
          } catch (searchError) {
            console.warn(`Search failed for query: ${query}`, searchError);
          }
        }

        enrichedSections.push({
          ...section,
          searchContext: searchResults,
        });
      }

      this.updateProgress({
        stage: "search",
        step: "Web search completed",
        progress: 55,
      });

      return {
        ...outline,
        sections: enrichedSections,
      };
    } catch (error) {
      this.updateProgress({
        stage: "search",
        step: "Web search failed",
        progress: 55,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Continue without search context
      return outline;
    }
  }

  async generateSectionScript(
    section: PodcastSection,
    content: string,
    instructions: string,
    overallContext: PodcastOutline,
    onProgress?: (partialScript: string) => void
  ): Promise<string> {
    const searchContext = section.searchContext
      ?.map(sr => sr.results.map(r => `${r.title}: ${r.content}`).join("\n"))
      .join("\n\n") || "";

    const systemPrompt = `You are a professional podcast scriptwriter specializing in fun, engaging tiki-taka style conversations.

Create a dynamic 3-minute script between two hosts for this podcast section:

STYLE GUIDELINES:
- Write as natural, fun conversation between two people (A and B)
- TIKI-TAKA style: quick back-and-forth, building on each other's points
- Make it entertaining, engaging, and slightly playful
- Include natural reactions, jokes, "wait what?", "that's crazy!", etc.
- Use the provided context and search results for facts and insights
- Each speaker should have substantial contributions (not just "yeah" or "right")
- Add natural conversation flow with questions, follow-ups, and discoveries
- Include [PAUSE], [LAUGH], or [EMPHASIS] stage directions when natural
- Keep exactly to 3 minutes duration
- Match the tone: ${overallContext.overview.tone}

STRICT FORMAT - Use exactly this format:
A: [Speaker A's engaging dialogue with personality]
B: [Speaker B's response with insight or follow-up question]
A: [Speaker A builds on that with examples or context]
B: [Speaker B adds perspective or asks "but what about...?"]

Make each exchange meaningful and build momentum throughout the section.`;

    const userPrompt = `Section: ${section.title}
Description: ${section.description}
Duration: ${section.duration}
Key Points to Cover: ${section.keyPoints.join(", ")}

Original Content Context:
${content.substring(0, 1500)}

Additional Web Context:
${searchContext}

Instructions: ${instructions}

Target Audience: ${overallContext.overview.targetAudience}
Overall Tone: ${overallContext.overview.tone}

Write a fun, engaging 3-minute tiki-taka conversation script using the A:/B: format. Make it entertaining and informative!`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // If onProgress is provided, use streaming
    if (onProgress) {
      let fullScript = "";
      
      const stream = streamChatCompletion(messages, {
        temperature: 0.8,
        maxTokens: 3000,
      });

      for await (const chunk of stream) {
        fullScript += chunk;
        onProgress(fullScript);
      }

      return fullScript;
    } else {
      // Fallback to regular completion
      return await chatCompletion(messages, {
        temperature: 0.8,
        maxTokens: 3000,
      });
    }
  }

  async* generatePodcastScript(
    content: string,
    instructions: string
  ): AsyncGenerator<GenerationProgress, PodcastOutline, unknown> {
    try {
      // Step 1: Generate outline with overview and final thoughts
      const outline = await this.generatePodcastOutline(content, instructions);
      yield {
        stage: "outline",
        step: "✅ Outline created with overview and final thoughts",
        progress: 25,
        result: JSON.stringify(outline, null, 2),
      };

      // Step 2: Research and enhance each section
      const enrichedOutline = await this.enrichWithWebSearch(outline, content, instructions);
      yield {
        stage: "search",
        step: "✅ Research completed for all sections",
        progress: 50,
      };

      // Step 3: Generate tiki-taka scripts for each section
      const sectionsWithScripts: PodcastSection[] = [];
      const totalSections = enrichedOutline.sections.length + 1; // +1 for final thoughts
      
      for (let i = 0; i < enrichedOutline.sections.length; i++) {
        const section = enrichedOutline.sections[i];
        const sectionNumber = i + 1;
        
        yield {
          stage: "script",
          step: `🎭 Writing tiki-taka script [${sectionNumber}/${totalSections}]: ${section.title}`,
          progress: Math.round(50 + (i / enrichedOutline.sections.length) * 25),
          currentSection: section.title,
        };

        // Stream the script generation with real-time updates
        let currentScript = "";
        const script = await this.generateSectionScript(
          section, 
          content, 
          instructions, 
          enrichedOutline,
          (partialScript) => {
            currentScript = partialScript;
            this.updateProgress({
              stage: "script",
              step: `✍️ Writing [${sectionNumber}/${totalSections}]: ${section.title}`,
              progress: Math.round(50 + (i / enrichedOutline.sections.length) * 25),
              currentSection: section.title,
              result: partialScript,
            });
          }
        );

        sectionsWithScripts.push({
          ...section,
          script,
        });

        yield {
          stage: "script",
          step: `✅ Completed [${sectionNumber}/${totalSections}]: ${section.title}`,
          progress: Math.round(50 + ((i + 1) / enrichedOutline.sections.length) * 25),
          currentSection: section.title,
          result: script,
        };
      }

      // Generate final thoughts script
      yield {
        stage: "script",
        step: `🎭 Writing final thoughts [${totalSections}/${totalSections}]: ${enrichedOutline.finalThoughts.title}`,
        progress: 75,
      };

      const finalThoughtsScript = await this.generateSectionScript(
        {
          id: "final_thoughts",
          title: enrichedOutline.finalThoughts.title,
          description: enrichedOutline.finalThoughts.description,
          duration: enrichedOutline.finalThoughts.duration,
          keyPoints: enrichedOutline.finalThoughts.keyTakeaways,
        },
        content,
        instructions,
        enrichedOutline,
        (partialScript) => {
          this.updateProgress({
            stage: "script",
            step: `✍️ Writing final thoughts [${totalSections}/${totalSections}]: ${enrichedOutline.finalThoughts.title}`,
            progress: 75,
            currentSection: "final_thoughts",
            result: partialScript,
          });
        }
      );

      // Step 4: Combine and refine for consistency and flow
      yield {
        stage: "combining",
        step: "🔗 Combining all sections together",
        progress: 85,
      };

      const finalOutline: PodcastOutline = {
        ...enrichedOutline,
        sections: sectionsWithScripts,
        finalThoughts: {
          ...enrichedOutline.finalThoughts,
          script: finalThoughtsScript,
        },
      };

      // Step 4: Final refinement for consistency and flow
      yield {
        stage: "finalizing",
        step: "✨ Starting final script compilation...",
        progress: 87,
      };

      // Generate final script with detailed progress updates
      let finalScript = "";
      for await (const progress of this.createFinalScript(finalOutline, content, instructions)) {
        finalScript = progress.result || finalScript;
        yield progress;
      }

      yield {
        stage: "finalizing",
        step: "🎉 Your tiki-taka podcast script is ready!",
        progress: 100,
        result: finalScript,
      };

      return finalOutline;
    } catch (error) {
      yield {
        stage: "finalizing",
        step: "❌ Error occurred during generation",
        progress: 100,
        error: error instanceof Error ? error.message : "Unknown error",
      };
      throw error;
    }
  }

  private async* createFinalScript(
    outline: PodcastOutline,
    content: string,
    instructions: string
  ): AsyncGenerator<GenerationProgress, string, unknown> {
    // Step 1: Analyze content
    yield {
      stage: "finalizing",
      step: "🔍 Analyzing section scripts and calculating content length...",
      progress: 88,
    };

    // Collect all section scripts
    const allSectionScripts = outline.sections.map(s => s.script || "").filter(script => script.trim());
    const finalThoughtsScript = outline.finalThoughts.script || "";
    
    // Calculate total word count
    const allContent = [...allSectionScripts, finalThoughtsScript].join(" ");
    const wordCount = allContent.split(/\s+/).length;
    const estimatedMinutes = Math.round(wordCount / 150);

    console.log(`Final script compilation: ${allSectionScripts.length} sections + final thoughts, ~${estimatedMinutes} minutes`);

    // Step 2: Prepare compilation prompt
    yield {
      stage: "finalizing",
      step: `📝 Preparing final script compilation (${allSectionScripts.length} sections, ~${estimatedMinutes} min)...`,
      progress: 90,
    };

    // Optimize content size for better performance
    const allContentLength = [...allSectionScripts, finalThoughtsScript].join("").length;
    console.log(`Total content length: ${allContentLength} characters`);
    
    // Determine optimal token limit based on content size
    let maxTokens = 10000; // Increased default for better quality
    if (allContentLength > 50000) {
      maxTokens = 15000; // Increased for very large content
      console.log("Large content detected, increasing token limit to 15000");
    } else if (allContentLength < 15000) {
      maxTokens = 8000; // Increased minimum for small content  
      console.log("Small content size, using 8000 token limit");
    } else {
      console.log("Moderate content size, using 10000 token limit");
    }

    const systemPrompt = `You are a professional podcast script compiler. Your job is to take individual section scripts and compile them into one cohesive, complete podcast script.

CRITICAL INSTRUCTIONS:
- You MUST respond with ONLY valid JSON. No markdown, no explanations, no additional text.
- PRESERVE ALL CONTENT from every section - do not summarize or cut any dialogue
- COMPILE, don't summarize - include every conversation exchange from each section
- Add smooth transitions between sections, but keep all original dialogue
- Convert A:/B: format to Hanna/Abram
- Add detailed voice instructions for each line (bright, fun, engaging for podcast)

COMPILATION PROCESS:
1. Start with a brief engaging introduction (30-60 seconds)
2. Include ALL dialogue from Section 1 with smooth transition
3. Include ALL dialogue from Section 2 with smooth transition  
4. Include ALL dialogue from Section 3 with smooth transition
5. Include ALL dialogue from remaining sections with transitions
6. Include ALL dialogue from Final Thoughts section
7. End with a brief wrap-up if needed

VOICE INSTRUCTION GUIDELINES:
- Use detailed, bright, and fun tone instructions for podcast reading
- Examples: "enthusiastic and energetic with rising intonation"
- "warm and conversational with slight excitement" 
- "playful with emphasis on key words"
- "bright and engaging with natural pauses"
- "curious and questioning tone"
- "excited with quick pace"

Preserve every conversation exchange - just add transitions and format properly!

OUTPUT: Complete JSON podcast script with ALL section content preserved.`;

    const userPrompt = `Podcast Details:
Title: ${outline.overview.title}
Target Duration: ${outline.overview.totalDuration}
Tone: ${outline.overview.tone}

SECTION SCRIPTS TO COMPILE (PRESERVE ALL CONTENT):

${outline.sections.map((section, index) => `
=== SECTION ${index + 1}: ${section.title} ===
Duration: ${section.duration}
Content:
${section.script || "No script generated"}
`).join("\n")}

=== FINAL THOUGHTS ===
Duration: ${outline.finalThoughts.duration}
Content:
${finalThoughtsScript}

COMPILE these sections into a complete podcast script:
- Add brief intro (30-60 seconds)
- Include ALL content from each section in order
- Add smooth 15-30 second transitions between sections
- Convert A:/B: to Hanna/Abram format
- Add detailed voice instructions for each line (bright, fun, engaging for podcast)
- End with brief wrap-up if needed

Voice instruction examples:
- "enthusiastic and energetic with rising intonation"
- "warm and conversational with slight excitement" 
- "playful with emphasis on key words"
- "bright and engaging with natural pauses"
- "curious and questioning tone"
- "excited with quick pace"

Preserve every conversation exchange - just add transitions and format properly!`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    // Step 3: Attempt structured JSON generation
    yield {
      stage: "finalizing",
      step: `🤖 Generating final script with structured JSON format (${maxTokens} tokens)...`,
      progress: 92,
    };

    let finalResponse: string;
    const startTime = Date.now();
    
    // Set up timeout warning
    const timeoutWarning = setTimeout(() => {
      console.warn("Final script generation is taking longer than expected (>30s)");
    }, 30000);
    
    try {
      // Log the start of generation with content size info
      console.log(`Starting final script generation at ${new Date().toISOString()}`);
      console.log(`Content size: ${JSON.stringify(messages[1].content).length} characters`);
      console.log(`Using structured JSON output with ${maxTokens} max tokens`);
      
      // Try with structured output first
      finalResponse = await chatCompletion(messages, {
        temperature: 0.3, // Lower temperature for more consistent compilation
        maxTokens: maxTokens,  // Dynamic token limit based on content
        responseFormat: {
          type: "json_schema" as const,
          json_schema: {
            name: "complete_podcast_script",
            strict: true,
            schema: {
              type: "object",
              properties: {
                podcast: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    estimatedDuration: { type: "string" },
                    speakers: {
                      type: "object",
                      properties: {
                        A: { type: "string" },
                        B: { type: "string" }
                      },
                      required: ["A", "B"],
                      additionalProperties: false
                    },
                    script: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          speaker: { type: "string" },
                          text: { type: "string" },
                          instruction: { type: "string" }
                        },
                        required: ["speaker", "text", "instruction"],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ["title", "description", "estimatedDuration", "speakers", "script"],
                  additionalProperties: false
                }
              },
              required: ["podcast"],
              additionalProperties: false
            }
          }
        }
      });
      
      clearTimeout(timeoutWarning);
      const duration = Date.now() - startTime;
      console.log(`Structured JSON generation completed in ${duration}ms`);
      
      // Step 4: Structured output succeeded
      yield {
        stage: "finalizing",
        step: `✅ Structured JSON generation successful! (${Math.round(duration/1000)}s) Validating output...`,
        progress: 96,
      };
      
    } catch (error) {
      clearTimeout(timeoutWarning);
      const duration = Date.now() - startTime;
      console.warn(`Structured output failed after ${duration}ms:`, error);
      
      // Step 4b: Fallback to regular prompting
      yield {
        stage: "finalizing",
        step: `⚠️ Structured format failed (${Math.round(duration/1000)}s), using fallback prompting...`,
        progress: 94,
      };
      
      const fallbackStartTime = Date.now();
      console.log(`Starting fallback generation at ${new Date().toISOString()}`);
      
      const fallbackMessages: ChatMessage[] = [
        { role: "system", content: systemPrompt + "\n\nRespond with valid JSON in this exact format:\n{\"podcast\":{\"title\":\"...\",\"description\":\"...\",\"estimatedDuration\":\"...\",\"speakers\":{\"A\":\"Hanna\",\"B\":\"Abram\"},\"script\":[{\"speaker\":\"Hanna\",\"text\":\"...\",\"instruction\":\"...\"}]}}" },
        { role: "user", content: userPrompt }
      ];
      
      finalResponse = await chatCompletion(fallbackMessages, {
        temperature: 0.3,
        maxTokens: maxTokens, // Use the same optimized token limit
      });
      
      const fallbackDuration = Date.now() - fallbackStartTime;
      console.log(`Fallback generation completed in ${fallbackDuration}ms`);
      
      yield {
        stage: "finalizing",
        step: `✅ Fallback generation complete! (${Math.round(fallbackDuration/1000)}s) Validating output...`,
        progress: 96,
      };
    }

    // Step 5: Parse and validate
    yield {
      stage: "finalizing",
      step: "🔍 Parsing and validating final script JSON...",
      progress: 98,
    };

    // Parse and validate the response
    const parsed = parseJSONFromResponse(finalResponse);
    
    // Log compilation results
    const scriptLength = parsed.podcast?.script?.length || 0;
    console.log(`Final script compiled: ${scriptLength} dialogue segments`);
    
    // Step 6: Final validation and completion
    yield {
      stage: "finalizing",
      step: `🎉 Final script ready! ${scriptLength} dialogue segments generated`,
      progress: 99,
      result: JSON.stringify(parsed, null, 2),
    };
    
    return JSON.stringify(parsed, null, 2);
  }
} 