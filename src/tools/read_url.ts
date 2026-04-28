/**
 * Read URL tool to fetch and extract page content
 */

import type { Tool, ToolInput, ToolOutput } from "./types.js";

export const readUrlTool: Tool = {
  name: "read_url",
  description: "Fetch a URL and return the page content as text",
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

    if (!url) {
      return {
        success: false,
        error: "Missing required parameter: url",
      };
    }

    try {
      const urlObj = new URL(url);
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ChatBot/1.0; +http://example.com/bot)",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("text/html") && !contentType.includes("text/plain") && !contentType.includes("application/json")) {
        return {
          success: false,
          error: `Unsupported content type: ${contentType}`,
        };
      }

      const html = await response.text();

      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      return {
        success: true,
        data: {
          url: urlObj.href,
          content: text,
          length: text.length,
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
