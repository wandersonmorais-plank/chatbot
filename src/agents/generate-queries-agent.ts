/**
 * Generate Queries Agent
 * Step 1: Generate 3 specific search queries from topic using Haiku
 */

import Anthropic from "@anthropic-ai/sdk";
import { startAgent, endAgent } from "./agent-tracker";

const HAIKU = "claude-haiku-4-5-20251001";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateQueriesAgent(topic: string): Promise<string[]> {
  const agentName = "generateQueriesAgent";
  startAgent(agentName);

  try {
    console.log(`[research-v2] Step 1/4 — Agent generates search queries for: "${topic}"\n`);

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

    const match = content.match(/\[.*\]/s);
    if (!match) {
      throw new Error("No JSON array found in response");
    }

    const queries = JSON.parse(match[0]);
    if (!Array.isArray(queries) || queries.length !== 3) {
      throw new Error("Expected array of 3 queries");
    }

    endAgent(agentName);
    return queries;
  } catch (err) {
    endAgent(agentName);
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to generate queries: ${errorMsg}`);
  }
}
