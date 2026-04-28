import * as readline from "readline";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import type { ModelId, SessionState, SlashCommand, CommandContext } from "./types";

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

// ============================================================================
// Command Registry and Handler
// ============================================================================

/**
 * Map of registered slash commands
 * Key: command name (without slash), Value: command handler
 */
const commands = new Map<string, SlashCommand>();

/**
 * Register slash command handler
 * @param command - Command definition with name, handler, and description
 */
function registerCommand(command: SlashCommand): void {
  commands.set(command.name, command);
}

/**
 * Parse and execute slash command
 * Input format: /command arg1 arg2 arg3
 * @param input - Full command line input including the slash
 * @param state - Session state
 * @returns true if command was handled and executed, false otherwise
 */
async function handleCommand(
  input: string,
  state: SessionState
): Promise<boolean> {
  // Check if input is a command (starts with /)
  if (!input.startsWith("/")) {
    return false;
  }

  // Parse command and arguments
  const parts = input.slice(1).split(/\s+/);
  const commandName = parts[0];
  const args = parts.slice(1);

  // Lookup command
  const command = commands.get(commandName);
  if (!command) {
    console.error(`Unknown command: /${commandName}`);
    return true;
  }

  // Execute command
  try {
    const ctx: CommandContext = { state, args };
    await command.handler(ctx);
    return true;
  } catch (err) {
    console.error(
      `Command error: ${err instanceof Error ? err.message : String(err)}`
    );
    return true;
  }
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


// ============================================================================
// Slash Command Stubs
// ============================================================================

/**
 * /help - Display available commands
 */
registerCommand({
  name: "help",
  description: "Show available commands",
  usage: "/help",
  handler: async (ctx) => {
    // TODO: implement - show list of registered commands
    console.log("Available commands:");
    for (const cmd of commands.values()) {
      console.log(`  ${cmd.usage || `/${cmd.name}`} - ${cmd.description}`);
    }
  },
});

/**
 * /model - Switch to different model
 */
registerCommand({
  name: "model",
  description: "Switch to a different model",
  usage: "/model <model-id>",
  handler: async (ctx) => {
    // TODO: implement - validate and switch model
    if (ctx.args.length === 0) {
      console.log(`Current model: ${ctx.state.model}`);
      return;
    }
    console.log(`Model switching not yet implemented`);
  },
});

/**
 * /temperature - Set temperature
 */
registerCommand({
  name: "temperature",
  description: "Set response temperature (0-1)",
  usage: "/temperature <value>",
  handler: async (ctx) => {
    // TODO: implement - validate and set temperature
    if (ctx.args.length === 0) {
      console.log(`Current temperature: ${ctx.state.temperature}`);
      return;
    }
    console.log(`Temperature adjustment not yet implemented`);
  },
});

/**
 * /system - Set system prompt
 */
registerCommand({
  name: "system",
  description: "Set system prompt",
  usage: "/system <prompt>",
  handler: async (ctx) => {
    // TODO: implement - set new system prompt
    if (ctx.args.length === 0) {
      console.log(`Current system prompt:\n${ctx.state.systemPrompt}`);
      return;
    }
    console.log(`System prompt update not yet implemented`);
  },
});

/**
 * /clear - Clear conversation history
 */
registerCommand({
  name: "clear",
  description: "Clear conversation history",
  usage: "/clear",
  handler: async (ctx) => {
    // TODO: implement - reset history to empty
    console.log(`Clear history not yet implemented`);
  },
});

/**
 * /cost - Display token usage and estimated cost
 */
registerCommand({
  name: "cost",
  description: "Show token usage and cost estimation",
  usage: "/cost",
  handler: async (ctx) => {
    // TODO: implement - calculate and display cost
    const totalTokens = ctx.state.totalInputTokens + ctx.state.totalOutputTokens;
    console.log(`Total tokens used: ${totalTokens}`);
    console.log(`Input tokens: ${ctx.state.totalInputTokens}`);
    console.log(`Output tokens: ${ctx.state.totalOutputTokens}`);
    console.log(`Cost calculation not yet implemented`);
  },
});

/**
 * /exit - Exit the application
 */
registerCommand({
  name: "exit",
  description: "Exit the chatbot",
  usage: "/exit",
  handler: async (ctx) => {
    // TODO: implement - graceful shutdown
    console.log(`Use Ctrl+C or type "/exit" to exit`);
  },
});

// ============================================================================
// Utility Functions
// ============================================================================

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
      // Check if input is a command
      const isCommand = await handleCommand(trimmed, state);

      if (!isCommand) {
        // Regular message - send to API
        process.stdout.write("\nAssistant: ");
        await sendMessage(state, trimmed);
        console.log("\n");
      }
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
