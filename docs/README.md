# Playwright Test Studio

Playwright Test Studio is a desktop application that lets QA engineers write plain-English tests for web applications. Tests are executed by an AI agent that controls a real browser via Playwright.

## What is it?

Instead of writing code, you describe what you want the browser to do in plain English:

```
1. Navigate to https://example.com
2. Click the "Sign In" button
3. Enter username "testuser@example.com" in the email field
4. Enter password "${password}" in the password field
5. Click "Submit"
6. Verify that the dashboard heading is visible
```

The AI reads your instructions and uses Playwright to execute them in a real browser.

## Prerequisites

- **Node.js 18+** — Required to run the test runner
- **An AI provider API key** — OpenAI, Anthropic, Groq, Azure OpenAI, or xAI
- **Operating System**: macOS 11+, Windows 10+, or Ubuntu 20.04+

## Installation

### macOS
Download the `.dmg` file from the [Releases page](https://github.com/your-org/playwright-test-studio/releases) and drag to Applications.

### Windows
Download the `.msi` or `.exe` installer from the [Releases page](https://github.com/your-org/playwright-test-studio/releases).

### Linux
Download the `.AppImage` or `.deb` file from the [Releases page](https://github.com/your-org/playwright-test-studio/releases).

## Setup

1. **Launch the app** — On first launch you'll see an empty test list.
2. **Configure your AI provider** — Click "Settings" in the top navigation.
3. **Select your AI provider** — Choose from OpenAI, Anthropic, Groq, Azure OpenAI, or xAI.
4. **Enter your API key** — Paste your API key in the field provided.
5. **Select a model** — Pick from the dropdown or enter a custom model name.
6. **Save settings** — Click "Save Settings".

## Writing Tests

### Creating a Test
1. Click **New** in the left panel to create a test.
2. Enter a **name** for the test (shown in the tree).
3. Optionally add a **description**.
4. Write your **test script** in the large text area.

### Test Script Format
Write plain English instructions. Number them for clarity:

```
1. Navigate to https://myapp.com
2. Click the login link
3. Fill in the username field with "admin"
4. Fill in the password field with "${adminPassword}"
5. Click the submit button
6. Check that "Welcome, admin" appears on the page
```

### Using Variables
Use `${variableName}` syntax to reference variables. Variables are defined in the **Variables** section below the script.

| Variable | Value |
|----------|-------|
| `baseUrl` | `https://staging.myapp.com` |
| `adminPassword` | `secret123` |

Variables let you:
- Run the same test against different environments
- Keep sensitive values separate from test logic
- Reuse common values (URLs, usernames, etc.)

## Test Hierarchy

Tests can be organized in a parent/child hierarchy. Child tests **continue from where their parent left off**: when a child test runs, the AI agent receives the parent's completed steps as context so it can pick up in that browser state.

This is useful for:
- Chaining multi-step flows (e.g. "Login" → "Create entry" → "Verify entry")
- Re-using a common setup test as the starting point for multiple child tests

To create a child test:
1. Hover over an existing test in the left panel
2. Click the **+** (plus) icon that appears
3. A new child test will be created

## Running Tests

1. Select a test in the left panel
2. Click the **Run** button in the top-right of the editor
3. Watch the log panel at the bottom for progress
4. Screenshots are captured automatically during the test

### Browser State Behavior

- **Root tests start clean**: when you run a top-level test (no parent), the browser profile for that chain is reset before the run.
- **Child tests preserve chain state**: when you run a child test, it reuses the same browser profile as its parent chain so cookies, local storage, and active sessions can continue.
- **Persistence across restarts**: child-chain browser state is preserved between app restarts.
- **Isolation by chain**: each test chain uses its own browser profile, so unrelated chains do not share browser state.

## Viewing Results

### Run History
The **Run Panel** at the bottom shows recent runs for the selected test. Each run shows:
- Status icon (✓ success, ✗ failure, spinning = running)
- Time the run started

Click any run to view its log and screenshots.

### Log
The log shows all actions taken by the AI agent, including:
- Which browser tool was called
- Navigation events
- Error messages

### Screenshots
Screenshots are captured automatically after significant browser actions (clicks, navigation, form fills). Use the navigation arrows to browse through screenshots.

### HTTP Failures
If the AI detects HTTP errors (4xx, 5xx responses) during the test, they are listed in the **HTTP Failures** section above the log.

## Supported AI Providers

| Provider | Models |
|----------|--------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini |
| **Anthropic** | claude-3-5-sonnet, claude-3-5-haiku, claude-3-opus |
| **Groq** | llama-3.3-70b, llama-3.1-70b, mixtral-8x7b |
| **Azure OpenAI** | gpt-4o, gpt-4, gpt-35-turbo (requires Base URL) |
| **xAI / Grok** | grok-2, grok-beta |

## Building from Source

```bash
# Prerequisites: Node.js 20+, Rust, system deps

# Install frontend deps
npm install

# Install runner deps
cd runner && npm install && npm run build && cd ..

# Dev mode
npm run dev

# Build
npm run build
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Tauri v2 (Rust) — file I/O, process spawning
- **Runner**: Node.js script using Vercel AI SDK + Playwright MCP
- **AI**: Vercel AI SDK supports OpenAI, Anthropic, and OpenAI-compatible providers
- **Browser**: Microsoft Playwright via `@playwright/mcp`
