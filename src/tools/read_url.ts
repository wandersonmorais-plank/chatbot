/**
 * Read URL tool to fetch and extract page content using Tavily API
 */

import type { Tool, ToolInput, ToolOutput } from "./types";

export const readUrlTool: Tool = {
  name: "read_url",
  description: "Fetch a URL and return the page content as text using Tavily API",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to fetch content from",
      },
    },
    required: ["url"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const url = input.url as string;
    const apiKey = process.env.TAVILY_API_KEY;

    if (!url) {
      return {
        success: false,
        error: "Missing required parameter: url",
      };
    }

    if (!apiKey) {
      return {
        success: false,
        error: "TAVILY_API_KEY environment variable not set",
      };
    }

    try {
      const response = await fetch("https://api.tavily.com/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          urls: [url],
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Tavily API error: ${response.status} ${response.statusText}`,
        };
      }

      const data = (await response.json()) as {
        results: Array<{ url: string; raw_content: string }>;
      };

      if (!data.results || data.results.length === 0) {
        return {
          success: false,
          error: "No content extracted from URL",
        };
      }

      const result = data.results[0];
      const content = result.raw_content || "";

      return {
        success: true,
        data: {
          url: result.url,
          content,
          length: content.length,
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
