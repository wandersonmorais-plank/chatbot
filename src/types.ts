import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

export type ModelId = string; // TODO: union of valid model IDs

export interface SessionState {
  model: ModelId;
  temperature: number;
  systemPrompt: string;
  history: MessageParam[];
  totalInputTokens: number;
  totalOutputTokens: number;
}

