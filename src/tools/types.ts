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

export interface InputSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  [key: string]: unknown;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: InputSchema;
  execute: (input: ToolInput) => Promise<ToolOutput>;
}
