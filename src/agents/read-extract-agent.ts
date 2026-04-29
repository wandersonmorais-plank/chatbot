/**
 * Read & Extract Agent
 * Step 3: Read a single URL and extract key information using Sonnet
 * This agent is called once per URL; multiple calls run in parallel at the command level
 */

import Anthropic from "@anthropic-ai/sdk";
import { toolRegistry } from "../tools/index";
import { startAgent, endAgent } from "./agent-tracker";

const SONNET = "claude-sonnet-4-6";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function readExtractAgent(
  url: string,
  topic: string
): Promise<{ url: string; extraction: string }> {
  const agentName = `readExtractAgent(${url.slice(0, 30)}...)`;
  startAgent(agentName);

  try {
    // Step 1: Read URL content
    const readResult = await toolRegistry.execute("read_url", { url });

    if (!readResult.success) {
      throw new Error(`Failed to read URL: ${readResult.error}`);
    }

    const content = (readResult.data as { content: string }).content || "";

    // Step 2: Use Sonnet to extract key information
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

    const extraction =
      extractionResponse.content[0].type === "text"
        ? extractionResponse.content[0].text
        : "";

    endAgent(agentName);
    return { url, extraction };
  } catch (err) {
    endAgent(agentName);
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Read extract agent failed: ${errorMsg}`);
  }
}
