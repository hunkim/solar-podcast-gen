/**
 * Utility functions for handling LLM responses, especially from reasoning models
 */

/**
 * Cleans LLM response text for JSON parsing by removing:
 * - Reasoning model <think>...</think> tags
 * - Markdown code blocks (```json and ```)
 * - Leading/trailing whitespace
 * - Common JSON formatting issues
 * 
 * @param response - Raw response text from LLM
 * @returns Cleaned text ready for JSON.parse()
 */
export function cleanResponseForJSON(response: string): string {
  let cleaned = response
    .replace(/<think>[\s\S]*?<\/think>/g, "") // Remove reasoning model think tags
    .replace(/```json\n?|```\n?/g, "")       // Remove markdown code blocks
    .replace(/```typescript\n?|```ts\n?/g, "")       // Remove TypeScript code blocks
    .trim();

  // Find the JSON object boundaries more accurately
  const startBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (startBrace !== -1 && lastBrace !== -1 && lastBrace > startBrace) {
    cleaned = cleaned.substring(startBrace, lastBrace + 1);
  }
  
  return cleaned;
}

/**
 * Fixes common JSON formatting issues
 * @param jsonStr - JSON string to fix
 * @returns Fixed JSON string
 */
function fixCommonJSONIssues(jsonStr: string): string {
  return jsonStr
    // Fix trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix unescaped quotes in string values (more careful approach)
    .replace(/(":\s*")([^"]*)\\n([^"]*")/g, '$1$2 $3') // Fix escaped newlines in strings
    // Fix single quotes to double quotes (but be careful of apostrophes)
    .replace(/([{,]\s*)'([^']*)'(\s*:)/g, '$1"$2"$3') // Property names
    // Fix missing quotes around property names
    .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
    // Fix incomplete arrays or objects
    .replace(/,(\s*)$/, '$1'); // Remove trailing comma at end
}

/**
 * Validates that a parsed outline doesn't contain placeholder content
 * @param outline - Parsed outline object
 * @returns true if valid, throws error if contains placeholders
 */
export function validateOutlineContent(outline: any): boolean {
  const placeholderTerms = [
    'string', 'your title here', 'title here', 'section title', 
    'description here', 'add description', 'insert', 'example',
    'placeholder', 'template', 'sample', 'todo', 'tbd', 'fill in'
  ];

  // Valid duration patterns - these should NOT be flagged as placeholders
  const validDurations = ['3 minutes', '2-3 minutes', '12-15 minutes', '10-15 minutes'];

  // Check overview
  if (outline.overview) {
    for (const [key, value] of Object.entries(outline.overview)) {
      if (typeof value === 'string') {
        const lowerValue = (value as string).toLowerCase();
        
        // Skip duration validation for valid duration patterns
        if (key === 'totalDuration' && validDurations.some(dur => lowerValue.includes(dur.toLowerCase()))) {
          continue;
        }
        
        if (placeholderTerms.some(term => lowerValue.includes(term)) || 
            (value as string).trim().length < 3) {
          throw new Error(`Overview ${key} contains placeholder or insufficient content: "${value}"`);
        }
      }
    }
  }

  // Check sections
  if (outline.sections && Array.isArray(outline.sections)) {
    for (let i = 0; i < outline.sections.length; i++) {
      const section = outline.sections[i];
      
      // Check section properties
      for (const [key, value] of Object.entries(section)) {
        if (typeof value === 'string') {
          const lowerValue = (value as string).toLowerCase();
          
          // Skip duration validation for valid duration patterns
          if (key === 'duration' && validDurations.some(dur => lowerValue.includes(dur.toLowerCase()))) {
            continue;
          }
          
          // More lenient length requirements
          const minLength = key === 'id' ? 3 : key === 'title' ? 8 : 5;
          
          if (placeholderTerms.some(term => lowerValue.includes(term)) ||
              (value as string).trim().length < minLength) {
            throw new Error(`Section ${i + 1} ${key} contains placeholder content: "${value}"`);
          }
        } else if (key === 'keyPoints' && Array.isArray(value)) {
          for (let j = 0; j < value.length; j++) {
            const point = value[j];
            if (typeof point === 'string') {
              const lowerPoint = point.toLowerCase();
              if (placeholderTerms.some(term => lowerPoint.includes(term)) ||
                  point.trim().length < 8) { // More lenient for key points
                throw new Error(`Section ${i + 1} key point ${j + 1} contains placeholder content: "${point}"`);
              }
            }
          }
        }
      }
    }
  }

  // Check final thoughts
  if (outline.finalThoughts) {
    for (const [key, value] of Object.entries(outline.finalThoughts)) {
      if (typeof value === 'string') {
        const lowerValue = (value as string).toLowerCase();
        
        // Skip duration validation for valid duration patterns
        if (key === 'duration' && validDurations.some(dur => lowerValue.includes(dur.toLowerCase()))) {
          continue;
        }
        
        if (placeholderTerms.some(term => lowerValue.includes(term)) ||
            (value as string).trim().length < 3) {
          throw new Error(`Final thoughts ${key} contains placeholder content: "${value}"`);
        }
      } else if (key === 'keyTakeaways' && Array.isArray(value)) {
        for (let j = 0; j < value.length; j++) {
          const takeaway = value[j];
          if (typeof takeaway === 'string') {
            const lowerTakeaway = takeaway.toLowerCase();
            if (placeholderTerms.some(term => lowerTakeaway.includes(term)) ||
                takeaway.trim().length < 8) { // More lenient
              throw new Error(`Final thoughts takeaway ${j + 1} contains placeholder content: "${takeaway}"`);
            }
          }
        }
      }
    }
  }

  return true;
}

/**
 * Safely parses JSON from an LLM response, handling reasoning model output
 * 
 * @param response - Raw response text from LLM
 * @param validateContent - Whether to validate content for placeholders (default: true)
 * @returns Parsed JSON object
 * @throws Error if JSON parsing fails after cleaning or content validation fails
 */
export function parseJSONFromResponse<T = any>(response: string, validateContent: boolean = true): T {
  const cleanJson = cleanResponseForJSON(response);
  
  if (!cleanJson || cleanJson.length < 10) {
    throw new Error("Response appears to be empty or too short to contain valid JSON");
  }
  
  try {
    const parsed = JSON.parse(cleanJson) as T;
    
    // Validate content if requested and it looks like a podcast outline
    if (validateContent && typeof parsed === 'object' && parsed !== null) {
      const obj = parsed as any;
      if (obj.overview || obj.sections || obj.finalThoughts) {
        validateOutlineContent(obj);
      }
    }
    
    return parsed;
  } catch (error) {
    // Try to fix common JSON issues and parse again
    try {
      const fixedJson = fixCommonJSONIssues(cleanJson);
      const parsed = JSON.parse(fixedJson) as T;
      
      // Validate content again after fixing
      if (validateContent && typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as any;
        if (obj.overview || obj.sections || obj.finalThoughts) {
          validateOutlineContent(obj);
        }
      }
      
      return parsed;
    } catch (secondError) {
      console.error("Failed to parse JSON after cleaning and fixing:", {
        originalResponse: response.substring(0, 500) + "...",
        cleanedResponse: cleanJson.substring(0, 500) + "...",
        originalError: error instanceof Error ? error.message : "Unknown error",
        secondError: secondError instanceof Error ? secondError.message : "Unknown error"
      });
      
      // Provide more specific error information
      const errorMessage = error instanceof Error ? error.message : "Unknown JSON parsing error";
      if (errorMessage.includes("Unterminated string")) {
        throw new Error("JSON parsing failed: Found unterminated string. The LLM may have generated incomplete JSON.");
      } else if (errorMessage.includes("Expected")) {
        throw new Error("JSON parsing failed: Invalid JSON structure. The LLM may have generated malformed JSON.");
      } else if (errorMessage.includes("placeholder content")) {
        throw new Error(`Content validation failed: ${errorMessage}`);
      } else {
        throw new Error(`Failed to parse JSON response: ${errorMessage}. Please try again with more specific content.`);
      }
    }
  }
} 