/**
 * Synthesis Agent
 * Step 4: Synthesize structured report with citations using Sonnet
 */

import Anthropic from "@anthropic-ai/sdk";
import { startAgent, endAgent } from "./agent-tracker";

const SONNET = "claude-sonnet-4-6";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function synthesisAgent(
  topic: string,
  extractions: { url: string; extraction: string }[]
): Promise<string> {
  const agentName = "synthesisAgent";
  startAgent(agentName);

  try {
    console.log(`[research-v2] Step 4/4 — Agent synthesizes final report\n`);

    // Format sources for the prompt
    const sourcesText = extractions
      .map((e, i) => `[${i + 1}] Source: ${e.url}\n${e.extraction}`)
      .join("\n\n");

    const response = await client.messages.create({
      model: SONNET,
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Synthesize a comprehensive research report on "${topic}" using the following extracted information. Structure it with:

- **Executive Summary** (2-3 sentences)
- **Key Findings** (cite sources like [1], [2], [3])
- **Analysis & Insights**
- **References** (list the sources)

Sources:
${sourcesText}`,
        },
      ],
    });

    const report =
      response.content[0].type === "text" ? response.content[0].text : "";

    endAgent(agentName);
    return report;
  } catch (err) {
    endAgent(agentName);
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`Synthesis agent failed: ${errorMsg}`);
  }
}
