import * as readline from "readline";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import type { ModelId, SessionState } from "./types";

dotenv.config();

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Stream text chunks to terminal output
 * Handles proper chunk buffering and terminal output without buffering delays
 *
 * @param chunk - Text chunk to stream
 */
function streamChunkToTerminal(chunk: string): void {
  process.stdout.write(chunk);
}

/**
 * Send message to API with streaming response output
 * Streams response chunks in real-time to terminal while collecting full response for history
 *
 * @param state - Session state to update with message history and token counts
 * @param userMessage - Message to send to the API
 * @returns Complete response text collected from all streamed chunks
 */
async function sendMessage(
  state: SessionState,
  userMessage: string
): Promise<string> {
  // Add user message to history
  state.history.push({ role: "user", content: userMessage });

  // Initialize response buffer
  let fullResponse = "";

  // Create stream and collect chunks
  const stream = await client.messages.stream({
    model: state.model,
    max_tokens: 8096,
    temperature: state.temperature,
    system: state.systemPrompt,
    messages: state.history,
  });

  // Process stream events
  for await (const event of stream) {
    // Handle text content block delta events (actual response chunks)
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const textChunk = event.delta.text;
      fullResponse += textChunk;
      streamChunkToTerminal(textChunk);
    }

    // Capture token usage from message delta event
    if (event.type === "message_delta" && event.usage) {
      state.totalOutputTokens += event.usage.output_tokens;
    }

    // Capture input tokens from message start event
    if (event.type === "message_start" && event.message.usage) {
      state.totalInputTokens += event.message.usage.input_tokens;
    }
  }

  // Add assistant response to history
  state.history.push({ role: "assistant", content: fullResponse });

  return fullResponse;
}

/**
 * Handle slash commands
 */
async function handleCommand(
  command: string,
  state: SessionState
): Promise<boolean> {
  // TODO: implement command parsing and dispatch
  // Return true if command was handled, false otherwise
  throw new Error("Not implemented");
}

/**
 * Update system prompt
 */
function setSystemPrompt(state: SessionState, prompt: string): void {
  // TODO: implement
  throw new Error("Not implemented");
}

/**
 * Switch model
 */
function switchModel(state: SessionState, newModel: ModelId): void {
  // TODO: implement
  throw new Error("Not implemented");
}

/**
 * Get cost estimation from token counts
 */
function calculateCost(state: SessionState): {
  inputCost: number;
  outputCost: number;
  total: number;
} {
  // TODO: implement cost calculation
  throw new Error("Not implemented");
}

/**
 * Display usage and cost information
 */
function displayCost(state: SessionState): void {
  // TODO: implement
  throw new Error("Not implemented");
}


/**
 * Parse CLI arguments
 */
function parseArgs(): {
  model: ModelId;
  temperature: number;
} {
  const args = process.argv.slice(2);
  let model: ModelId = "claude-sonnet-4-6";
  let temperature = 0.7;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && i + 1 < args.length) {
      model = args[i + 1];
      i++;
    } else if (args[i] === "--temperature" && i + 1 < args.length) {
      temperature = Math.max(0, Math.min(1, parseFloat(args[i + 1])));
      i++;
    }
  }

  return { model, temperature };
}

/**
 * Initialize session state
 */
function initializeState(model: ModelId, temperature: number): SessionState {
  return {
    model,
    temperature,
    systemPrompt: "You are a helpful assistant.",
    history: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };
}

/**
 * Main REPL loop
 */
async function runREPL(state: SessionState, rl: readline.Interface): Promise<void> {
  const question = (prompt: string): Promise<string> =>
    new Promise((resolve) => rl.question(prompt, resolve));

  while (true) {
    const input = await question("You: ");
    const trimmed = input.trim();

    if (!trimmed) continue;
    if (trimmed === "/exit") break;

    try {
      process.stdout.write("\nAssistant: ");
      await sendMessage(state, trimmed);
      console.log("\n");
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ============================================================================
// Entry Point
// ============================================================================

async function main(): Promise<void> {
  const { model, temperature } = parseArgs();
  const state = initializeState(model, temperature);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`Model: ${state.model} | Temp: ${state.temperature}`);

  await runREPL(state, rl);

  rl.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
