# CLI Chatbot

Streaming CLI chatbot powered by Anthropic's TypeScript SDK.

## Features

- **Configurable Models**: Switch between Claude Opus, Sonnet, Haiku
- **Temperature Control**: Adjust response randomness via CLI flags
- **Streaming Output**: Real-time token streaming to terminal
- **Conversation History**: Full context maintained across turns
- **Token Cost Tracking**: `/cost` command shows usage and estimated USD cost
- **Mid-session Model Switching**: `/model` command to swap models
- **Dynamic System Prompts**: `/system` command to update instructions
- **Rate Limit Handling**: Automatic exponential backoff retries

## Setup

```bash
pnpm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Usage

```bash
# Default: claude-sonnet-4-6, temp=0.7
pnpm dev

# Custom model and temperature
pnpm dev -- --model claude-opus-4-6 --temperature 0.9

# Shorthand model names also work
pnpm dev -- --model haiku --temperature 0.3
```

## Commands

| Command | Example | Effect |
|---------|---------|--------|
| `/cost` | `/cost` | Show total tokens used and estimated cost |
| `/model` | `/model sonnet` | Switch to a different model |
| `/system` | `/system be concise` | Update the system prompt |
| `/help` | `/help` | Show available commands |
| `/exit` | `/exit` | Quit the chatbot |

## Token Pricing (per 1M tokens)

| Model | Input | Output |
|-------|-------|--------|
| claude-opus-4-6 | $15.00 | $75.00 |
| claude-sonnet-4-6 | $3.00 | $15.00 |
| claude-haiku-4-5 | $0.80 | $4.00 |

## Build

```bash
pnpm build
node dist/index.js -- --model haiku
```
