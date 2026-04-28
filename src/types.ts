import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export type ModelId = string; // TODO: union of valid model IDs

export interface SessionState {
  model: ModelId;
  temperature: number;
  systemPrompt: string;
  history: MessageParam[];
  totalInputTokens: number;
  totalOutputTokens: number;
  debug: boolean;
}

/**
 * Command execution context - contains state and parsed input
 */
export interface CommandContext {
  state: SessionState;
  args: string[];
}

/**
 * Command handler function signature
 * Returns true if command succeeded, false if failed
 * Should throw Error for invalid usage
 */
export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;

/**
 * Registered slash command definition
 */
export interface SlashCommand {
  name: string;
  handler: CommandHandler;
  description: string;
  usage?: string; // Help text for command usage
}

