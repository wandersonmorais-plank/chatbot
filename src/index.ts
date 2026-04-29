import * as readline from "readline";
import * as dotenv from "dotenv";
import Anthropic from "@anthropic-ai/sdk";
import type { ModelId, SessionState, SlashCommand, CommandContext } from "./types";
import { toolRegistry } from "./tools/index";
import { researchCommand } from "./commands/research";
import { researchV2Command } from "./commands/research-v2";

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
 * Send message to API with streaming response and tool use handling
 * Streams response chunks in real-time and executes tools if requested
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

  // Validate model ID exists in pricing (ensures full valid model name)
  if (!modelPricing[state.model]) {
    console.error(
      `Invalid model: ${state.model}. Available: ${Object.keys(modelPricing).join(", ")}`
    );
    throw new Error(`Invalid model ID: ${state.model}`);
  }

  let lastTextContent = "";
  let continueLoop = true;

  while (continueLoop) {
    continueLoop = false;

    // Create stream and collect chunks
    const stream = await client.messages.stream({
      model: state.model,
      max_tokens: 8096,
      temperature: state.temperature,
      system: state.systemPrompt,
      messages: state.history,
      tools: toolRegistry.list(),
    });

    // Process stream events and collect text for display
    for await (const event of stream) {
      // Handle text content block delta events (actual response chunks)
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        const textChunk = event.delta.text;
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

    // Get final message with all content blocks
    const finalMessage = await stream.finalMessage();
    const responseContent = finalMessage.content;

    // Add assistant response to history
    state.history.push({ role: "assistant", content: responseContent });

    // Filter for tool use blocks
    const toolUseBlocks = responseContent.filter(
      (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock =>
        block.type === "tool_use"
    );

    // Execute tools if any were requested
    if (toolUseBlocks.length > 0) {
      if (state.debug) {
        console.log(`\n[DEBUG] Agent requested ${toolUseBlocks.length} tool(s)\n`);
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        if (state.debug) {
          console.log(`[DEBUG] Tool: ${toolUse.name}`);
          console.log(`[DEBUG] Input: ${JSON.stringify(toolUse.input)}`);
        }

        const result = await toolRegistry.execute(
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );

        if (state.debug) {
          console.log(`[DEBUG] Result: ${JSON.stringify(result)}\n`);
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      }

      // Add tool results to history and continue loop
      state.history.push({
        role: "user",
        content: toolResults,
      });

      continueLoop = true;
    } else {
      // Extract text content for return value
      lastTextContent = responseContent
        .filter(
          (block: Anthropic.ContentBlock): block is Anthropic.TextBlock =>
            block.type === "text"
        )
        .map((block: Anthropic.TextBlock) => block.text)
        .join("");
    }
  }

  return lastTextContent;
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
 * Pricing per 1M tokens for different models (USD)
 */
const modelPricing: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
};

/**
 * Calculate cost from token counts for given model
 * @param model - Model ID
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost breakdown in USD
 */
function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; total: number } {
  const pricing = modelPricing[model] || { input: 0, output: 0 };

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;

  return {
    inputCost,
    outputCost,
    total: inputCost + outputCost,
  };
}


// ============================================================================
// Slash Command Stubs
// ============================================================================

// --- Slash commands migrated to commands.ts as object literals ---

/*
 * To use object literal commands, import the commands like:
 * import { slashCommands } from './commands';
 * Then register all with:
 *   Object.values(slashCommands).forEach(registerCommand)
 */

/**
 * SlashCommand type definition for slash commands
 */


// Provide modelPricing and calculateCost as required for cost/model commands
// import { modelPricing, calculateCost } from "./costUtils"; // adjust as necessary

// All slash commands as a single object literal
export const slashCommands: Record<string, SlashCommand> = {
  help: {
    name: "help",
    description: "Show available commands",
    usage: "/help",
    handler: async (ctx) => {
      console.log("\n=== Available Commands ===");
      for (const cmd of Object.values(slashCommands)) {
        console.log(`${cmd.usage || `/${cmd.name}`} - ${cmd.description}`);
      }
      console.log("");
    },
  },
  model: {
    name: "model",
    description: "Switch to a different model",
    usage: "/model <index|model-id>",
    handler: async (ctx) => {
      const models = Object.keys(modelPricing);
      if (ctx.args.length === 0) {
        console.log(`Current model: ${ctx.state.model}`);
        console.log("Available models:");
        models.forEach((model, idx) => {
          console.log(`  [${idx}] ${model}`);
        });
        return;
      }

      // Try parsing as index first
      const idx = parseInt(ctx.args[0], 10);
      let newModel: string | null = null;

      if (!isNaN(idx) && idx >= 0 && idx < models.length) {
        newModel = models[idx];
      } else if (models.includes(ctx.args[0])) {
        // Full model ID match
        newModel = ctx.args[0];
      }

      if (newModel) {
        ctx.state.model = newModel;
        saveSetting("CHATBOT_MODEL", newModel);
        console.log(`Switched to model: ${newModel}`);
      } else {
        console.error(
          `Invalid model. Use index [0-${models.length - 1}] or full model ID.`
        );
        console.log("Available models:");
        models.forEach((model, idx) => {
          console.log(`  [${idx}] ${model}`);
        });
      }
    },
  },
  temperature: {
    name: "temperature",
    description: "Set response temperature (0-1)",
    usage: "/temperature <value>",
    handler: async (ctx) => {
      if (ctx.args.length === 0) {
        console.log(`Current temperature: ${ctx.state.temperature}`);
        return;
      }

      const value = parseFloat(ctx.args[0]);
      if (isNaN(value) || value < 0 || value > 1) {
        console.error("Temperature must be a number between 0 and 1");
        return;
      }

      ctx.state.temperature = value;
      saveSetting("CHATBOT_TEMPERATURE", value.toString());
      console.log(`Temperature set to: ${value}`);
    },
  },
  system: {
    name: "system",
    description: "Set system prompt",
    usage: "/system <prompt>",
    handler: async (ctx) => {
      if (ctx.args.length === 0) {
        console.log(`Current system prompt:\n${ctx.state.systemPrompt}`);
        return;
      }
      const newPrompt = ctx.args.join(" ");
      ctx.state.systemPrompt = newPrompt;
      console.log(`System prompt updated`);
    },
  },
  clear: {
    name: "clear",
    description: "Clear conversation history",
    usage: "/clear",
    handler: async (ctx) => {
      ctx.state.history = [];
      console.log("Conversation history cleared");
    },
  },
  cost: {
    name: "cost",
    description: "Show token usage and cost estimation",
    usage: "/cost",
    handler: async (ctx) => {
      const totalTokens = ctx.state.totalInputTokens + ctx.state.totalOutputTokens;
      const cost = calculateCost(
        ctx.state.model,
        ctx.state.totalInputTokens,
        ctx.state.totalOutputTokens
      );

      console.log("\n=== Token Usage & Cost ===");
      console.log(`Model: ${ctx.state.model}`);
      console.log(`Input tokens: ${ctx.state.totalInputTokens}`);
      console.log(`Output tokens: ${ctx.state.totalOutputTokens}`);
      console.log(`Total tokens: ${totalTokens}`);
      console.log("\n=== Cost Breakdown ===");
      console.log(`Input cost: $${cost.inputCost.toFixed(6)}`);
      console.log(`Output cost: $${cost.outputCost.toFixed(6)}`);
      console.log(`Total cost: $${cost.total.toFixed(6)}\n`);
    },
  },
  exit: {
    name: "exit",
    description: "Exit the chatbot",
    usage: "/exit",
    handler: async (ctx) => {
      console.log("Goodbye!");
      process.exit(0);
    },
  },
  debug: {
    name: "debug",
    description: "Toggle debug mode to see tool execution details",
    usage: "/debug [on|off]",
    handler: async (ctx) => {
      if (ctx.args.length === 0) {
        console.log(`Debug mode: ${ctx.state.debug ? "ON" : "OFF"}`);
        return;
      }

      const arg = ctx.args[0].toLowerCase();
      if (arg === "on") {
        ctx.state.debug = true;
        console.log("Debug mode: ON");
      } else if (arg === "off") {
        ctx.state.debug = false;
        console.log("Debug mode: OFF");
      } else {
        console.error(`Invalid argument. Use: /debug [on|off]`);
      }
    },
  },
  research: researchCommand,
  "research-v2": researchV2Command,
};

// Registration pattern for main index.ts
Object.values(slashCommands).forEach(registerCommand);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Load saved settings from environment variables
 * Checks for CHATBOT_MODEL and CHATBOT_TEMPERATURE env vars
 * @returns Saved settings or defaults if not found
 */
function loadSavedSettings(): {
  model: ModelId;
  temperature: number;
} {
  const savedModel = process.env.CHATBOT_MODEL;
  const savedTemp = process.env.CHATBOT_TEMPERATURE;

  return {
    model: (savedModel as ModelId) || "claude-sonnet-4-6",
    temperature: savedTemp ? parseFloat(savedTemp) : 0.7,
  };
}

/**
 * Save settings to environment (for current session persistence)
 * Use this when model or temperature changes via commands
 */
function saveSetting(key: "CHATBOT_MODEL" | "CHATBOT_TEMPERATURE", value: string): void {
  process.env[key] = value;
}

/**
 * Parse CLI arguments with fallback to saved settings
 * Order of precedence: CLI args > saved settings > hardcoded defaults
 */
function parseArgs(): {
  model: ModelId;
  temperature: number;
} {
  const args = process.argv.slice(2);
  const saved = loadSavedSettings();

  let model: ModelId = saved.model;
  let temperature = saved.temperature;

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
    systemPrompt: `You are a knowledgeable and proactive research assistant with access to the following tools:

- **web_search**: Search the web for up-to-date information using the Tavily API.
- **read_url**: Fetch and read the full content of a webpage.
- **calculator**: Perform arithmetic and mathematical calculations.
- **save_note**: Persist notes to a local JSON file for later review.

## Behavior Rules

### Research & Note-Taking (MANDATORY)
Whenever you use **web_search** or **read_url**, you MUST immediately follow up with a **save_note** call to record the findings. Do not skip this step, even when the user does not explicitly ask you to save.

- The note **title** should concisely describe the topic or query.
- The note **content** should include a summary of the key information retrieved, source URLs when available, and any directly relevant excerpts.

### Tool Use Guidelines
- Prefer **web_search** when you need current facts, news, or anything that may have changed recently.
- Use **read_url** to get the full content of a specific page when a search result alone is insufficient.
- Use **calculator** for any numerical computation rather than computing mentally.
- Chain tools as needed: search → read URL → save note, all in the same response loop.

### Communication Style
- Be concise and direct. Avoid unnecessary filler.
- After saving a note, briefly confirm to the user what was saved (title and a one-sentence summary).
- If a tool call fails, explain why and suggest an alternative approach.`,
    history: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    debug: false,
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
