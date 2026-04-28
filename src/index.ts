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
 * Send message to API and stream response
 */
async function sendMessage(
  state: SessionState,
  userMessage: string
): Promise<string> {
  // Add user message to history
  state.history.push({ role: "user", content: userMessage });

  // Call API
  const msg = await client.messages.create({
    model: state.model,
    max_tokens: 8096,
    temperature: state.temperature,
    system: state.systemPrompt,
    messages: state.history,
  });

  // Extract response text
  const responseText = msg.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Add assistant response to history
  state.history.push({ role: "assistant", content: responseText });

  // Update token counts
  state.totalInputTokens += msg.usage.input_tokens;
  state.totalOutputTokens += msg.usage.output_tokens;

  return responseText;
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
      const response = await sendMessage(state, trimmed);
      console.log(`\nAssistant: ${response}\n`);
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
