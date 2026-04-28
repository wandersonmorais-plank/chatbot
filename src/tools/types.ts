/**
 * Tool type definitions
 */

export interface ToolInput {
  [key: string]: string | number | boolean | unknown;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Tool {
  name: string;
  description: string;
  execute: (input: ToolInput) => Promise<ToolOutput>;
}
