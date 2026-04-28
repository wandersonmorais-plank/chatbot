/**
 * Tool registry for managing and executing tools
 */

import type { Tool, ToolInput, ToolOutput } from "./types";
import { webSearchTool } from "./web_search";
import { readUrlTool } from "./read_url";
import { calculatorTool } from "./calculator";
import { saveNoteTool } from "./save_note";

export type { Tool, ToolInput, ToolOutput, InputSchema } from "./types";
export { webSearchTool } from "./web_search";
export { readUrlTool } from "./read_url";
export { calculatorTool } from "./calculator";
export { saveNoteTool } from "./save_note";

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  async execute(toolName: string, input: ToolInput): Promise<ToolOutput> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      };
    }

    try {
      return await tool.execute(input);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
toolRegistry.register(webSearchTool);
toolRegistry.register(readUrlTool);
toolRegistry.register(calculatorTool);
toolRegistry.register(saveNoteTool);
