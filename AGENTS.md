# Agent Instructions

## Project Philosophy

**Keep it small and simple.** No frameworks beyond SDK essentials. Single-file architecture. Minimal dependencies.

## Package Management

Use **pnpm** exclusively. Specified in `package.json` via `packageManager: "pnpm@latest"`.

Commands:
- `pnpm install` — install deps
- `pnpm dev` — run dev with ts-node
- `pnpm build` — compile TypeScript
- `pnpm start` — run compiled dist

## Architecture

- `src/index.ts` — single file, all logic
- CLI flags via process.argv parsing (no framework)
- Async readline REPL loop

## Dependencies

- `@anthropic-ai/sdk` — Anthropic API, streaming, typed errors
- `dotenv` — load ANTHROPIC_API_KEY from .env

Keep this minimal. No express, no frameworks, no unnecessary libs.

## Adding Features

When implementing a feature:
1. Ask: "Is this essential?"
2. Prefer inline code over helper modules
3. No premature abstractions
4. Single file until it becomes unmaintainable

## Token Pricing Table

```
claude-opus-4-6:    $15.00 input, $75.00 output (per 1M tokens)
claude-sonnet-4-6:  $3.00 input, $15.00 output (per 1M tokens)
claude-haiku-4-5:   $0.80 input, $4.00 output (per 1M tokens)
```

## Streaming Pattern

```typescript
const stream = await client.messages.stream({
  model,
  max_tokens: 8096,
  messages: history,
});

stream.on("text", (text) => process.stdout.write(text));
const finalMsg = await stream.finalMessage();
// finalMsg.usage has input_tokens, output_tokens
```

## Error Handling

Rate limit retry pattern:

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError && attempt < maxRetries) {
        const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30000);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}
```

## Conversation History

MessageParam type from SDK:

```typescript
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

const history: MessageParam[] = [];
history.push({ role: "user", content: input });
history.push({ role: "assistant", content: response });

// Send full history every request (client owns context, no server-side session)
```

System prompt is **not** a history entry. Pass via top-level `system` parameter:

```typescript
const msg = await client.messages.create({
  system: "You are a helpful assistant.",
  messages: history,
  // ...
});
```
