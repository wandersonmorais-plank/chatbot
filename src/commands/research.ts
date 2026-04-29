/**
 * /research command — multi-step research pipeline
 * Step 1 (Haiku): Generate 3 search queries
 * Step 2 (tools): Execute web searches
 * Step 3 (Sonnet): Read top 3 URLs and extract key info
 * Step 4 (Sonnet): Synthesize structured report with citations
 */

import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";
import { toolRegistry } from "../tools/index";
import type { SlashCommand } from "../types";

dotenv.config();


const HAIKU = "claude-haiku-4-5-20251001";
const SONNET = "claude-sonnet-4-6";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

async function generateQueries(topic: string): Promise<string[]> {
  console.log(`[research] Step 1/4 — Generating search queries (Haiku)...\n`);

  const response = await client.messages.create({
    model: HAIKU,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `Generate 3 specific, targeted search queries to research: "${topic}". Return ONLY a JSON array of 3 strings, like ["query 1", "query 2", "query 3"]. No other text.`,
      },
    ],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  try {
    const match = content.match(/\[.*\]/s);
    if (!match) throw new Error("No array found");
    const queries = JSON.parse(match[0]);
    if (!Array.isArray(queries) || queries.length !== 3) {
      throw new Error("Invalid format");
    }
    return queries;
  } catch {
    throw new Error(`Failed to parse queries from Haiku response: ${content}`);
  }
}

async function runSearches(
  queries: string[]
): Promise<{ query: string; results: SearchResult[] }[]> {
  console.log(`[research] Step 2/4 — Running ${queries.length} web searches...\n`);

  const searchResults = await Promise.all(
    queries.map(async (query) => {
      const result = await toolRegistry.execute("web_search", { query });
      if (!result.success) {
        throw new Error(`Web search failed for "${query}": ${result.error}`);
      }
      const results = Array.isArray(result.data)
        ? (result.data as SearchResult[])
        : ((result.data as { results: SearchResult[] }).results || []);
      return { query, results };
    })
  );

  return searchResults;
}

async function readAndExtract(
  topic: string,
  searchResults: { query: string; results: SearchResult[] }[]
): Promise<{ url: string; extraction: string }[]> {
  console.log(`[research] Step 3/4 — Reading top 3 URLs and extracting key info (Sonnet)...\n`);

  // Collect unique URLs and sort by score
  const urlMap = new Map<string, number>();
  for (const { results } of searchResults) {
    for (const result of results) {
      const currentScore = urlMap.get(result.url) || 0;
      urlMap.set(result.url, Math.max(currentScore, result.score));
    }
  }

  const topUrls = Array.from(urlMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([url]) => url);

  // Read each URL
  const urlContents: { url: string; content: string }[] = [];
  for (const url of topUrls) {
    const result = await toolRegistry.execute("read_url", { url });
    if (result.success) {
      const content = (result.data as { content: string }).content || "";
      urlContents.push({ url, content });
    }
  }

  // Use Sonnet to extract key information from each URL
  const extractions: { url: string; extraction: string }[] = [];
  for (const { url, content } of urlContents) {
    const extractionResponse = await client.messages.create({
      model: SONNET,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `From this content about "${topic}", extract key facts, data points, statistics, and important quotes:\n\n${content.slice(0, 3000)}`,
        },
      ],
    });

    const extractedText =
      extractionResponse.content[0].type === "text"
        ? extractionResponse.content[0].text
        : "";

    extractions.push({ url, extraction: extractedText });
  }

  return extractions;
}

async function synthesizeReport(
  topic: string,
  extractions: { url: string; extraction: string }[]
): Promise<string> {
  console.log(`[research] Step 4/4 — Synthesizing structured report (Sonnet)...\n`);

  const sourcesText = extractions
    .map((e, i) => `[${i + 1}] ${e.url}\n${e.extraction}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Synthesize a comprehensive research report on "${topic}" using the following extracted information. Structure it with:
- Executive Summary
- Key Findings (cite sources like [1], [2], [3])
- Analysis & Insights
- References

Sources:
${sourcesText}`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

export const researchCommand: SlashCommand = {
  name: "research",
  description: "Conduct multi-step research and generate a structured report",
  usage: "/research <topic>",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      console.error("Usage: /research <topic>");
      return;
    }

    const topic = ctx.args.join(" ");

    try {
      // Step 1: Generate search queries
      const queries = await generateQueries(topic);
      console.log(`Generated queries: ${queries.join(", ")}\n`);

      // Step 2: Run searches
      const searchResults = await runSearches(queries);
      const totalResults = searchResults.reduce((sum, r) => sum + r.results.length, 0);
      console.log(`Found ${totalResults} total search results\n`);

      // Step 3: Read top URLs and extract
      const extractions = await readAndExtract(topic, searchResults);
      console.log(`Extracted key info from ${extractions.length} URLs\n`);

      // Step 4: Synthesize report
      const report = await synthesizeReport(topic, extractions);

      console.log("=".repeat(60));
      console.log(`Research Report: ${topic}`);
      console.log("=".repeat(60));
      console.log(report);
      console.log("=".repeat(60));
    } catch (err) {
      console.error(
        `Research failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
};
