/**
 * Web search tool using Tavily API
 */

import type { Tool, ToolInput, ToolOutput } from "./types.js";

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
}

export const webSearchTool: Tool = {
  name: "web_search",
  description: "Search the web using Tavily API and return relevant results",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query to find on the web",
      },
    },
    required: ["query"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const query = input.query as string;
    const apiKey = process.env.TAVILY_API_KEY;

    if (!query) {
      return {
        success: false,
        error: "Missing required parameter: query",
      };
    }

    if (!apiKey) {
      return {
        success: false,
        error: "TAVILY_API_KEY environment variable not set",
      };
    }

    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          include_answer: true,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Tavily API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as TavilyResponse;

      return {
        success: true,
        data: {
          results: data.results.map((result) => ({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score,
          })),
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
