/**
 * Calculator tool to evaluate mathematical expressions
 */

import type { Tool, ToolInput, ToolOutput } from "./types";

export const calculatorTool: Tool = {
  name: "calculator",
  description: "Evaluate mathematical expressions and return the result",
  input_schema: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate (e.g., '2 + 2 * 5')",
      },
    },
    required: ["expression"],
  },

  async execute(input: ToolInput): Promise<ToolOutput> {
    const expression = input.expression as string;

    if (!expression) {
      return {
        success: false,
        error: "Missing required parameter: expression",
      };
    }

    try {
      if (!isValidExpression(expression)) {
        return {
          success: false,
          error: "Invalid expression. Only numbers, operators (+, -, *, /, %), and parentheses are allowed",
        };
      }

      const result = Function('"use strict"; return (' + expression + ")")();

      if (typeof result !== "number") {
        return {
          success: false,
          error: "Expression did not evaluate to a number",
        };
      }

      if (!isFinite(result)) {
        return {
          success: false,
          error: "Result is not a finite number",
        };
      }

      return {
        success: true,
        data: {
          expression,
          result,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};

function isValidExpression(expr: string): boolean {
  const sanitized = expr.replace(/\s+/g, "");

  if (sanitized.length === 0) {
    return false;
  }

  const allowedChars = /^[\d+\-*/%().]+$/;
  if (!allowedChars.test(sanitized)) {
    return false;
  }

  let parenCount = 0;
  for (const char of sanitized) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) return false;
  }

  if (parenCount !== 0) return false;

  if (/[+\-*/%]$/.test(sanitized)) return false;
  if (/^[+*/%]/.test(sanitized)) return false;
  if (/[+\-*/%]{2}/.test(sanitized)) return false;

  return true;
}
