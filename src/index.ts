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
  // TODO: implement streaming message sending
  throw new Error("Not implemented");
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
 * Main REPL loop
 */
async function runREPL(state: SessionState, rl: readline.Interface): Promise<void> {
  // TODO: implement main conversation loop
  throw new Error("Not implemented");
}

/**
 * Parse CLI arguments
 */
function parseArgs(): {
  model: ModelId;
  temperature: number;
} {
  // TODO: implement argument parsing
  throw new Error("Not implemented");
}

/**
 * Initialize session state
 */
function initializeState(model: ModelId, temperature: number): SessionState {
  // TODO: implement
  throw new Error("Not implemented");
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
