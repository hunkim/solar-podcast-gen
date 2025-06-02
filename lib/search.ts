import { tavily } from "@tavily/core";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  images?: Array<{
    url: string;
    description: string;
  }>;
  answer?: string;
}

let tavilyClient: ReturnType<typeof tavily> | null = null;

function getTavilyClient() {
  if (!tavilyClient) {
    if (!TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not configured");
    }
    tavilyClient = tavily({ apiKey: TAVILY_API_KEY });
  }
  return tavilyClient;
}

export async function searchWeb(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeImages?: boolean;
    includeAnswer?: boolean;
    domains?: string[];
    excludeDomains?: string[];
  } = {}
): Promise<SearchResponse> {
  const {
    maxResults = 5,
    searchDepth = "advanced",
    includeImages = false,
    includeAnswer = true,
    domains,
    excludeDomains,
  } = options;

  try {
    const client = getTavilyClient();
    
    const response = await client.search(query, {
      search_depth: searchDepth,
      max_results: maxResults,
      include_images: includeImages,
      include_answer: includeAnswer,
      include_domains: domains,
      exclude_domains: excludeDomains,
    });

    return {
      query,
      results: response.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score || 0,
      })),
      images: response.images?.map((image: any) => ({
        url: image.url,
        description: image.description || "",
      })) || [],
      answer: response.answer,
    };
  } catch (error) {
    console.error("Error in web search:", error);
    throw error;
  }
}

export async function generateSearchQueries(
  content: string,
  instructions: string,
  maxQueries: number = 3
): Promise<string[]> {
  // Extract key topics and generate search queries
  const contentSnippet = content.length > 1000 ? content.substring(0, 1000) + "..." : content;
  
  // Simple keyword extraction for now - could be enhanced with NLP
  const queries = [];
  
  // Extract main topics from instructions
  const instructionsLower = instructions.toLowerCase();
  if (instructionsLower.includes("statistics") || instructionsLower.includes("data")) {
    queries.push(`${extractMainTopic(content)} latest statistics data 2024`);
  }
  
  if (instructionsLower.includes("examples") || instructionsLower.includes("case studies")) {
    queries.push(`${extractMainTopic(content)} real world examples case studies`);
  }
  
  if (instructionsLower.includes("trends") || instructionsLower.includes("future")) {
    queries.push(`${extractMainTopic(content)} future trends predictions 2024`);
  }
  
  // Add a general query about the main topic
  queries.push(`${extractMainTopic(content)} recent developments news`);
  
  return queries.slice(0, maxQueries);
}

function extractMainTopic(content: string): string {
  // Simple topic extraction - get the most common meaningful words
  const words = content
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(word => word.length > 3 && !isStopWord(word));
  
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topWords = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([word]) => word);
  
  return topWords.join(" ");
}

function isStopWord(word: string): boolean {
  const stopWords = [
    "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "into", "through", "during", "before",
    "after", "above", "below", "between", "among", "within", "without",
    "this", "that", "these", "those", "they", "them", "their", "there",
    "here", "where", "when", "what", "which", "who", "whom", "whose",
    "how", "why", "will", "would", "could", "should", "might", "must",
    "can", "may", "shall", "have", "has", "had", "been", "being",
    "are", "was", "were", "am", "is", "be", "do", "does", "did",
    "get", "got", "give", "gave", "take", "took", "make", "made",
    "come", "came", "go", "went", "see", "saw", "know", "knew",
    "think", "thought", "say", "said", "tell", "told", "become",
    "became", "find", "found", "use", "used", "work", "worked",
    "way", "ways", "time", "times", "year", "years", "day", "days"
  ];
  
  return stopWords.includes(word.toLowerCase());
} 