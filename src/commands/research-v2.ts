/**
 * /research-v2 command — agent-based research pipeline
 * Uses subagents for each step instead of direct tool calls
 */

import type { SlashCommand } from "../types";
import {
  generateQueriesAgent,
  webSearchAgent,
  readExtractAgent,
  synthesisAgent,
} from "../agents/research-v2-agents";

export const researchV2Command: SlashCommand = {
  name: "research-v2",
  description: "Agent-based research pipeline (v2)",
  usage: "/research-v2 <topic>",
  handler: async (ctx) => {
    if (ctx.args.length === 0) {
      console.error("Usage: /research-v2 <topic>");
      return;
    }

    const topic = ctx.args.join(" ");

    try {
      console.log(`[research-v2] Starting agent-based research for: ${topic}\n`);

      // Step 1: Generate queries via agent
      const queries = await generateQueriesAgent(topic);
      if (queries.length === 0) {
        console.log("[research-v2] No queries generated");
        return;
      }
      console.log(`Generated queries: ${queries.join(", ")}\n`);

      // Step 2: Run web searches via agent (parallel)
      console.log(`[research-v2] Step 2/4 — Agent executes web searches (${queries.length} queries)\n`);
      const searchResults = await Promise.all(
        queries.map((query) => webSearchAgent(query))
      );
      console.log(`Found ${searchResults.reduce((sum, r) => sum + r.results.length, 0)} total results\n`);

      // Step 3: Read and extract via agent (parallel)
      console.log(`[research-v2] Step 3/4 — Agent reads URLs and extracts key info\n`);

      // Flatten all search results into URLs
      const urls = searchResults.flatMap(({ results }) =>
        results.map(({ url }) => url)
      );

      const extractionResults = await Promise.allSettled(
        urls.map((url) => readExtractAgent(url, topic))
      );

      console.log(extractionResults);

      const extractions = extractionResults
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<{ url: string; extraction: string }>).value);

      const failed = extractionResults.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        console.log(`[research-v2] Warning: ${failed.length} URL(s) failed to extract\n`);
      }
      
      // Step 4: Synthesize report via agent
      const report = await synthesisAgent(topic, extractions);

      if (report) {
        console.log("=".repeat(60));
        console.log(`Research Report: ${topic}`);
        console.log("=".repeat(60));
        console.log(report);
        console.log("=".repeat(60));
      } else {
        console.log("[research-v2] No report generated");
      }
    } catch (err) {
      console.error(
        `[research-v2] Error: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  },
};
