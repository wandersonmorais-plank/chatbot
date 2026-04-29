/**
 * Web Search Agent
 * Step 2: Execute a single web search query using toolRegistry
 * This agent is called once per query; multiple calls run in parallel at the command level
 */

import { toolRegistry } from "../tools/index";
import { startAgent, endAgent } from "./agent-tracker";

interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export async function webSearchAgent(
  query: string,
  topK: number = 3
): Promise<{ query: string; results: SearchResult[] }> {
  const agentName = `webSearchAgent(${query})`;
  startAgent(agentName);

  try {
    const result = await toolRegistry.execute("web_search", { query });

    if (!result.success) {
      throw new Error(`Web search failed: ${result.error}`);
    }

    const allResults = Array.isArray(result.data)
      ? (result.data as SearchResult[])
      : ((result.data as { results: SearchResult[] }).results || []);

    // Sort by score (highest first) and pick top K results
    const topResults = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    endAgent(agentName);
    return { query, results: topResults };
  } catch (err) {
    endAgent(agentName);
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Web search agent failed: ${errorMsg}`);
  }
}
