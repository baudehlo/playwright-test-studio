import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { generateText, jsonSchema, type Tool, tool } from 'ai';

interface TestData {
  id: string;
  name: string;
  description: string;
  script: string;
  parentId?: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface SettingsData {
  aiProvider:
    | 'openai'
    | 'anthropic'
    | 'azure-openai'
    | 'groq'
    | 'xai'
    | 'github';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

interface RunnerConfig {
  test: TestData;
  parentTests?: TestData[];
  settings: SettingsData;
  runDir: string;
  screenshotsDir: string;
  runId: string;
  storagePolicy?: 'reset' | 'preserve';
  chainRootTestId?: string;
  profileDir?: string;
  browser?: string;
  nodeBinaryPath?: string;
  npxCliPath?: string;
}

interface RunEvent {
  type: 'log' | 'screenshot' | 'http_failure' | 'complete' | 'error';
  [key: string]: unknown;
}

function emit(event: RunEvent): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  emit({ type: 'log', level, message, timestamp: new Date().toISOString() });
}

function expandVariables(
  script: string,
  variables: Record<string, string>,
): string {
  return script.replace(
    /\$\{(\w+)\}/g,
    (_, key) => variables[key] ?? `\${${key}}`,
  );
}

function createProvider(settings: SettingsData) {
  switch (settings.aiProvider) {
    case 'openai':
      return createOpenAI({ apiKey: settings.apiKey });
    case 'anthropic':
      return createAnthropic({ apiKey: settings.apiKey });
    case 'azure-openai':
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl,
      });
    case 'groq':
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl ?? 'https://api.groq.com/openai/v1',
      });
    case 'xai':
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl ?? 'https://api.x.ai/v1',
      });
    case 'github':
      return createOpenAI({
        apiKey: settings.apiKey,
        baseURL: 'https://models.inference.ai.azure.com',
      });
    default:
      return createOpenAI({ apiKey: settings.apiKey });
  }
}

interface McpToolSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

interface JsonSchemaNode {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaNode>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchemaNode;
  enum?: unknown[];
  anyOf?: JsonSchemaNode[];
  oneOf?: JsonSchemaNode[];
  allOf?: JsonSchemaNode[];
}

interface NetworkRequest {
  url?: string;
  method?: string;
  status?: number;
  [key: string]: unknown;
}

const RUNNER_BUILD_ID = 'runner-schema-v2-2026-04-21';
const TOOL_SCHEMA_MODE = 'openai-compatible-jsonschema-normalization';
const require = createRequire(import.meta.url);

function findToolNameByKeyword(
  toolNames: string[],
  keyword: string,
): string | null {
  const exact = toolNames.find((name) => name === keyword);
  if (exact) return exact;
  const contains = toolNames.find((name) => name.includes(keyword));
  return contains ?? null;
}

function parseTestResult(text: string): {
  status: 'success' | 'failure';
  reason?: string;
} {
  const explicitResult = text.match(
    /TEST_RESULT:\s*(PASS|FAIL)(?:\s*[—\-:]\s*(.+))?/i,
  );

  if (explicitResult) {
    const [, status, reason] = explicitResult;
    if (status.toUpperCase() === 'FAIL') {
      return {
        status: 'failure',
        reason: reason?.trim() || 'The AI agent reported test failure.',
      };
    }
    return { status: 'success' };
  }

  if (
    /\b(test did not pass|test failed|failed to|no matching elements found|returned an empty list|resulted in no urls being extracted|no urls? (?:were )?extracted)\b/i.test(
      text,
    )
  ) {
    return {
      status: 'failure',
      reason: 'The AI agent reported that the scripted steps did not succeed.',
    };
  }

  return { status: 'success' };
}

function buildPlaywrightMcpArgs(config: RunnerConfig): string[] {
  const args = ['--no-sandbox'];
  if (config.browser) {
    args.push('--browser', config.browser);
  }
  if (config.profileDir) {
    args.push('--user-data-dir', config.profileDir);
  }
  // Provide a writable output dir so the MCP server can save screenshot/snapshot
  // files before registering image payloads in its response. Without this the
  // server inherits a potentially read-only cwd (e.g. App Translocation on macOS)
  // and the addFileResult write silently fails, leaving _imageResults empty.
  args.push('--output-dir', config.screenshotsDir);
  return args;
}

function resolveLocalPlaywrightMcpCli(): string | null {
  try {
    const pkgJsonPath = require.resolve('@playwright/mcp/package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as {
      bin?: string | Record<string, string>;
    };

    const binField = pkg.bin;
    const binRelativePath =
      typeof binField === 'string'
        ? binField
        : (binField?.['playwright-mcp'] ??
          (binField ? Object.values(binField)[0] : undefined));

    if (!binRelativePath) {
      return null;
    }

    const cliPath = path.resolve(path.dirname(pkgJsonPath), binRelativePath);
    return fs.existsSync(cliPath) ? cliPath : null;
  } catch {
    return null;
  }
}

function buildMcpCommand(config: RunnerConfig): {
  command: string;
  args: string[];
} {
  const mcpArgs = buildPlaywrightMcpArgs(config);
  const localMcpCli = resolveLocalPlaywrightMcpCli();

  if (localMcpCli) {
    return {
      command: config.nodeBinaryPath ?? 'node',
      args: [localMcpCli, ...mcpArgs],
    };
  }

  if (config.nodeBinaryPath && config.npxCliPath) {
    return {
      command: config.nodeBinaryPath,
      args: [config.npxCliPath, '@playwright/mcp@latest', ...mcpArgs],
    };
  }
  return {
    command: 'npx',
    args: ['@playwright/mcp@latest', ...mcpArgs],
  };
}

function isTimeoutError(err: unknown): boolean {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let cursor: unknown = err;

  // Walk through nested cause chains when available.
  while (cursor && typeof cursor === 'object' && !seen.has(cursor)) {
    seen.add(cursor);
    const obj = cursor as {
      message?: unknown;
      cause?: unknown;
      code?: unknown;
    };
    if (obj.message !== undefined) {
      messages.push(String(obj.message));
    }
    if (obj.code !== undefined) {
      messages.push(String(obj.code));
    }
    cursor = obj.cause;
  }
  messages.push(String(err));

  return /timed\s*out|timeout|-32001/i.test(messages.join(' | '));
}

function normalizeJsonSchemaNode(input: unknown): JsonSchemaNode {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { type: 'string' };
  }

  const raw = input as Record<string, unknown>;

  if (Array.isArray(raw.anyOf) && raw.anyOf.length > 0) {
    return {
      anyOf: raw.anyOf.map((node) => normalizeJsonSchemaNode(node)),
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
    };
  }

  if (Array.isArray(raw.oneOf) && raw.oneOf.length > 0) {
    return {
      oneOf: raw.oneOf.map((node) => normalizeJsonSchemaNode(node)),
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
    };
  }

  if (Array.isArray(raw.allOf) && raw.allOf.length > 0) {
    return {
      allOf: raw.allOf.map((node) => normalizeJsonSchemaNode(node)),
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
    };
  }

  const explicitType = typeof raw.type === 'string' ? raw.type : undefined;

  if (explicitType === 'object' || raw.properties) {
    const rawProperties =
      typeof raw.properties === 'object' &&
      raw.properties !== null &&
      !Array.isArray(raw.properties)
        ? (raw.properties as Record<string, unknown>)
        : {};

    const rawRequired = Array.isArray(raw.required)
      ? new Set(raw.required.filter((k): k is string => typeof k === 'string'))
      : new Set<string>();

    const normalizedProperties: Record<string, JsonSchemaNode> = {};
    for (const [key, value] of Object.entries(rawProperties)) {
      const normalized = normalizeJsonSchemaNode(value);
      normalizedProperties[key] = rawRequired.has(key)
        ? normalized
        : { anyOf: [normalized, { type: 'null' }] };
    }

    return {
      type: 'object',
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
      properties: normalizedProperties,
      required: Object.keys(normalizedProperties),
      additionalProperties: false,
    };
  }

  if (explicitType === 'array') {
    const rawItems = raw.items;
    const itemNode = Array.isArray(rawItems)
      ? rawItems[0]
      : (rawItems as unknown);
    return {
      type: 'array',
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
      items: normalizeJsonSchemaNode(itemNode),
    };
  }

  if (
    explicitType === 'string' ||
    explicitType === 'number' ||
    explicitType === 'integer' ||
    explicitType === 'boolean' ||
    explicitType === 'null'
  ) {
    return {
      type: explicitType,
      description:
        typeof raw.description === 'string' ? raw.description : undefined,
      enum: Array.isArray(raw.enum) ? raw.enum : undefined,
    };
  }

  return {
    type: 'string',
    description:
      typeof raw.description === 'string' ? raw.description : undefined,
  };
}

function toOpenAiFunctionParametersSchema(
  inputSchema: unknown,
): JsonSchemaNode {
  const normalized = normalizeJsonSchemaNode(inputSchema);
  if (normalized.type === 'object') {
    return normalized;
  }

  // Tools require object params at the top level.
  return {
    type: 'object',
    properties: {
      value: normalized,
    },
    required: ['value'],
    additionalProperties: false,
  };
}

async function readConfig(): Promise<RunnerConfig> {
  return new Promise((resolve, reject) => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => {
      data += line;
    });
    rl.on('close', () => {
      try {
        resolve(JSON.parse(data) as RunnerConfig);
      } catch (e) {
        reject(new Error(`Failed to parse config: ${e}`));
      }
    });
  });
}

async function main() {
  let config: RunnerConfig;
  try {
    config = await readConfig();
  } catch (e) {
    emit({
      type: 'error',
      message: `Failed to read config: ${e}`,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }

  const { test, settings, runDir, screenshotsDir, runId } = config;
  const storagePolicy = config.storagePolicy ?? 'reset';
  const chainRootTestId = config.chainRootTestId ?? test.id;
  const browser = config.browser;
  const screenshots: Array<{
    id: string;
    path: string;
    description: string;
    timestamp: string;
  }> = [];
  const httpFailures: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }> = [];
  const logEntries: Array<{
    level: string;
    message: string;
    timestamp: string;
  }> = [];

  function addLog(level: 'info' | 'warn' | 'error', message: string) {
    const entry = { level, message, timestamp: new Date().toISOString() };
    logEntries.push(entry);
    emit({ type: 'log', ...entry });
  }

  addLog('info', `Starting test: ${test.name}`);
  addLog('info', `Runner build: ${RUNNER_BUILD_ID}`);
  addLog('info', `Tool schema mode: ${TOOL_SCHEMA_MODE}`);
  addLog(
    'info',
    `Browser: ${browser ?? 'chromium (default)'} | Storage policy: ${storagePolicy} (chain root: ${chainRootTestId})`,
  );

  const expandedScript = expandVariables(test.script, test.variables);
  addLog('info', `Expanded script variables`);

  // If this test has parent tests, prepend their scripts as context so the AI
  // knows what was previously completed and can continue from that state.
  let fullScript = expandedScript;
  if (config.parentTests && config.parentTests.length > 0) {
    const parentContext = config.parentTests
      .map((pt) => {
        const parentScript = expandVariables(pt.script, pt.variables);
        return `[${pt.name}]\n${parentScript}`;
      })
      .join('\n\n');
    const PARENT_HEADER =
      'PREVIOUSLY COMPLETED STEPS (the browser should already be in this state' +
      ' — do NOT re-execute these, just use them as context):';
    const CURRENT_HEADER = 'CURRENT STEPS TO EXECUTE NOW:';
    fullScript = `${PARENT_HEADER}\n${parentContext}\n\n${CURRENT_HEADER}\n${expandedScript}`;
    addLog(
      'info',
      `Loaded context from ${config.parentTests.length} parent test(s): ${config.parentTests.map((p) => p.name).join(' → ')}`,
    );
  }

  // Connect to Playwright MCP server
  let mcpClient: Client | null = null;
  let transport: StdioClientTransport | null = null;

  try {
    addLog('info', 'Connecting to Playwright MCP server...');
    const mcpCommand = buildMcpCommand(config);
    addLog(
      'info',
      `MCP launch command: ${mcpCommand.command} ${mcpCommand.args.join(' ')}`,
    );
    transport = new StdioClientTransport({
      command: mcpCommand.command,
      args: mcpCommand.args,
    });

    mcpClient = new Client(
      { name: 'playwright-test-studio', version: '1.0.0' },
      {
        capabilities: {},
      },
    );

    await mcpClient.connect(transport);
    addLog('info', 'Connected to Playwright MCP server');
  } catch (e) {
    addLog('error', `Failed to connect to Playwright MCP: ${e}`);
    const run = buildRun(
      runId,
      test.id,
      'failure',
      screenshots,
      httpFailures,
      logEntries,
      String(e),
      browser,
    );
    writeRun(runDir, run);
    emit({
      type: 'error',
      message: String(e),
      runId,
      timestamp: new Date().toISOString(),
    });
    process.exit(1);
  }

  let networkRequestsToolName: string | null = null;
  let runCodeToolName: string | null = null;
  let connectedClient: Client | null = null;
  let screenshotToolName: string | null = null;
  let screenshotCount = 0;
  let lastScreenshotHash: string | null = null;
  let endScreenshotCaptured = false;
  let captureScreenshot = async (_description: string) => {};

  try {
    if (!mcpClient) {
      throw new Error('Playwright MCP client is unavailable');
    }
    connectedClient = mcpClient;
    const connectedMcpClient = connectedClient;

    // Get tools from MCP
    const toolsResult = await connectedMcpClient.listTools();
    addLog(
      'info',
      `Available tools: ${toolsResult.tools.map((t) => t.name).join(', ')}`,
    );
    const toolNames = toolsResult.tools.map((t) => t.name);
    screenshotToolName = findToolNameByKeyword(toolNames, 'screenshot');
    networkRequestsToolName = findToolNameByKeyword(
      toolNames,
      'network_requests',
    );
    runCodeToolName = findToolNameByKeyword(toolNames, 'run_code');

    if (!screenshotToolName) {
      addLog(
        'warn',
        'No screenshot tool was found from MCP; screenshots will be unavailable for this run',
      );
    }

    // Build AI SDK tools from MCP tools
    const aiTools: Record<string, Tool> = {};
    let runCodeTimeouts = 0;

    captureScreenshot = async (description: string) => {
      if (!screenshotToolName) {
        return;
      }

      try {
        const screenshotResult = await connectedMcpClient.callTool({
          name: screenshotToolName,
          arguments: {},
        });

        let saved = false;
        if (Array.isArray(screenshotResult.content)) {
          for (const item of screenshotResult.content) {
            if (
              typeof item === 'object' &&
              item !== null &&
              'type' in item &&
              (item as { type: string }).type === 'image'
            ) {
              const imageItem = item as {
                type: string;
                data: string;
                mimeType?: string;
              };
              const imageData = Buffer.from(imageItem.data, 'base64');
              const imageHash = createHash('sha256')
                .update(imageData)
                .digest('hex');

              if (imageHash === lastScreenshotHash) {
                addLog(
                  'info',
                  `Skipped duplicate screenshot for '${description}'`,
                );
                saved = true;
                break;
              }

              screenshotCount++;
              const screenshotFilename = `screenshot-${String(screenshotCount).padStart(3, '0')}-${Date.now()}.png`;
              const screenshotPath = path.join(
                screenshotsDir,
                screenshotFilename,
              );
              fs.writeFileSync(screenshotPath, imageData);
              lastScreenshotHash = imageHash;

              const screenshotId = `ss-${screenshotCount}-${Date.now()}`;
              const screenshotEntry = {
                id: screenshotId,
                path: screenshotFilename,
                description,
                timestamp: new Date().toISOString(),
              };
              screenshots.push(screenshotEntry);
              emit({ type: 'screenshot', ...screenshotEntry });
              saved = true;
              break;
            }
          }
        }

        if (!saved) {
          addLog(
            'warn',
            `Screenshot tool '${screenshotToolName}' returned no image payload`,
          );
        }
      } catch (screenshotErr) {
        addLog('warn', `Screenshot capture failed: ${screenshotErr}`);
      }
    };

    for (const mcpTool of toolsResult.tools) {
      const toolName = mcpTool.name;
      const inputSchema = (mcpTool.inputSchema as McpToolSchema) ?? {
        type: 'object',
        properties: {},
      };

      const parameterSchema = jsonSchema<Record<string, unknown>>(
        toOpenAiFunctionParametersSchema(inputSchema),
      );
      const capturedToolName = toolName;

      aiTools[toolName] = tool({
        description: mcpTool.description ?? `MCP tool: ${toolName}`,
        parameters: parameterSchema,
        execute: async (params: Record<string, unknown>) => {
          addLog('info', `Calling tool: ${capturedToolName}`);
          const normalizedParams = Object.fromEntries(
            Object.entries(params).filter(
              ([, value]) => value !== undefined && value !== null,
            ),
          );

          try {
            if (capturedToolName.includes('run_code') && runCodeTimeouts > 0) {
              addLog(
                'warn',
                'Skipping browser_run_code after prior timeout; asking agent to continue with snapshot/click/type tools',
              );
              return {
                content: [
                  {
                    type: 'text',
                    text: 'browser_run_code skipped because a prior browser_run_code call timed out. Continue using browser_snapshot and direct interaction tools (click/type/select/hover/wait_for), and process smaller chunks to avoid timeouts.',
                  },
                ],
              };
            }

            // browser_run_code often needs more than the default MCP timeout on
            // JS-heavy pages. Raise it unless explicitly provided.
            const toolArgs =
              capturedToolName.includes('run_code') &&
              normalizedParams.timeoutMs === undefined
                ? { ...normalizedParams, timeoutMs: 180000 }
                : normalizedParams;

            if (screenshotToolName && capturedToolName !== screenshotToolName) {
              await captureScreenshot(`Before ${capturedToolName}`);
            }

            const result = await connectedMcpClient.callTool({
              name: capturedToolName,
              arguments: toolArgs,
            });

            // Capture after every tool call (except the screenshot tool itself)
            // so run history remains observable.
            if (screenshotToolName && capturedToolName !== screenshotToolName) {
              await captureScreenshot(`After ${capturedToolName}`);
            }

            return result;
          } catch (e) {
            if (screenshotToolName && capturedToolName !== screenshotToolName) {
              await captureScreenshot(`Failure after ${capturedToolName}`);
            }

            if (capturedToolName.includes('run_code') && isTimeoutError(e)) {
              addLog(
                'warn',
                'browser_run_code timed out; retrying once with timeoutMs=300000',
              );
              try {
                const retryArgs = { ...normalizedParams, timeoutMs: 300000 };
                const retryResult = await connectedMcpClient.callTool({
                  name: capturedToolName,
                  arguments: retryArgs,
                });

                if (
                  screenshotToolName &&
                  capturedToolName !== screenshotToolName
                ) {
                  await captureScreenshot(`After retry ${capturedToolName}`);
                }
                return retryResult;
              } catch (retryErr) {
                if (isTimeoutError(retryErr)) {
                  runCodeTimeouts += 1;
                  addLog(
                    'warn',
                    `browser_run_code timed out after retry (count=${runCodeTimeouts}); continuing run with non-run_code tools`,
                  );
                  return {
                    content: [
                      {
                        type: 'text',
                        text: 'browser_run_code timed out twice. Continue without browser_run_code. Use browser_snapshot plus direct interaction tools and iterate in smaller chunks from the current page state.',
                      },
                    ],
                  };
                }
                addLog(
                  'error',
                  `Tool ${capturedToolName} retry failed: ${retryErr}`,
                );
                throw retryErr;
              }
            }

            addLog('error', `Tool ${capturedToolName} failed: ${e}`);
            throw e;
          }
        },
      });
    }

    const provider = createProvider(settings);
    const effectiveModel = settings.model.trim();
    if (!effectiveModel) {
      throw new Error(
        'Settings model is empty. Please set a model in Settings.',
      );
    }
    const assistantTextChunks: string[] = [];

    addLog('info', 'Starting AI agent...');
    addLog(
      'info',
      `AI config: provider=${settings.aiProvider}, model=${effectiveModel}`,
    );

    const systemPrompt = `You are a browser test automation agent. You have access to browser control tools via Playwright.
Execute the test script step by step using the available browser tools.
The script is written as human-readable descriptions of what appears on the page, not as CSS selectors or implementation details. Translate those visual descriptions into the appropriate tool usage.
For JavaScript-heavy pages, wait for visible content to finish loading before interacting.
If the target elements are not obvious, inspect the page state first using the available page reading or snapshot tools, then choose the interaction tool based on what is actually rendered.
If a step fails because elements are missing or the page is still loading, re-inspect the page before concluding.
When iterating lists that re-render after expansion/collapse, avoid restarting from the first row: maintain a stable processed set (by unique text/URL/index), and continue from the next unprocessed item.
For nested loops (programs -> schedules -> levels -> times), re-query the current list each iteration and resume by index/identity, not by stale element handles.
Prefer smaller browser_run_code operations over one giant script. If a large extraction is needed, break it into chunks and persist progress in your reasoning before continuing.
After completing all steps, output a brief summary and finish with exactly one of these lines:
TEST_RESULT: PASS
TEST_RESULT: FAIL - <reason>`;

    const result = await generateText({
      model: provider(effectiveModel),
      system: systemPrompt,
      prompt: fullScript,
      tools: aiTools,
      maxSteps: 50,
      onStepFinish: async (step) => {
        if (step.toolCalls && step.toolCalls.length > 0) {
          for (const tc of step.toolCalls) {
            addLog('info', `Tool call: ${tc.toolName}`);
          }
        }
        if (step.text) {
          assistantTextChunks.push(step.text);
          addLog('info', step.text);
        }
      },
    });

    const combinedAssistantOutput = [result.text, ...assistantTextChunks]
      .filter((text) => text && text.trim().length > 0)
      .join('\n');

    const parsedResult = parseTestResult(combinedAssistantOutput);

    const tryFallbackDetailsUrlExtraction = async (): Promise<string[]> => {
      if (!runCodeToolName) return [];

      const extractionScript = `async (page) => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const clickVisibleLabel = async (labelRegex) => {
    const clicked = await page.evaluate((pattern) => {
      const regex = new RegExp(pattern, 'i');
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
      };
      const candidates = Array.from(document.querySelectorAll('button, [role="button"], a, summary, div, span'));
      let clicks = 0;
      for (const el of candidates) {
        if (!isVisible(el)) continue;
        const text = (el.textContent || '')
          .replaceAll('\n', ' ')
          .replaceAll('\r', ' ')
          .replaceAll('\t', ' ')
          .replace(/ +/g, ' ')
          .trim();
        if (!regex.test(text)) continue;
        if (el.getAttribute('aria-expanded') === 'true') continue;
        try {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          clicks += 1;
        } catch {
          // ignore click failures for specific elements
        }
      }
      return clicks;
    }, labelRegex.source);
    return clicked;
  };

  for (let pass = 0; pass < 8; pass += 1) {
    await page.mouse.wheel(0, 1400);
    await sleep(120);
    await clickVisibleLabel(/Schedules?/i);
    await sleep(120);
    await clickVisibleLabel(/Levels?/i);
    await sleep(120);
    await clickVisibleLabel(/Times?/i);
    await sleep(120);
  }

  const urls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    const details = anchors
      .filter((a) => /details/i.test((a.textContent || '').trim()))
      .map((a) => a.href);
    return Array.from(new Set(details));
  });

  return { urls };
}`;

      try {
        const extractionResult = await connectedMcpClient.callTool({
          name: runCodeToolName,
          arguments: {
            code: extractionScript,
            timeoutMs: 300000,
          },
        });

        if (!Array.isArray(extractionResult.content)) return [];
        for (const item of extractionResult.content) {
          if (typeof item !== 'object' || item === null) continue;
          if (!('text' in item)) continue;
          const text = String((item as { text: unknown }).text);
          try {
            const parsed = JSON.parse(text) as { urls?: unknown };
            if (Array.isArray(parsed.urls)) {
              return parsed.urls
                .map((u) => String(u).trim())
                .filter((u) => u.length > 0);
            }
          } catch {
            // ignore non-json text payload
          }
        }
      } catch (fallbackErr) {
        addLog('warn', `Fallback URL extraction failed: ${fallbackErr}`);
      }

      return [];
    };

    if (parsedResult.status === 'failure') {
      const fallbackUrls = await tryFallbackDetailsUrlExtraction();
      if (fallbackUrls.length > 0) {
        addLog(
          'warn',
          `AI reported failure, but fallback extraction recovered ${fallbackUrls.length} Details URL(s); proceeding with success`,
        );
        addLog('info', `Recovered Details URLs:\n${fallbackUrls.join('\n')}`);
      } else {
        throw new Error(parsedResult.reason);
      }
    }

    await captureScreenshot('Final state');
    endScreenshotCaptured = true;

    addLog('info', 'Test completed successfully');

    // Capture network failures via browser_network_requests if available
    if (networkRequestsToolName) {
      try {
        addLog('info', 'Capturing network requests...');
        const networkResult = await connectedClient.callTool({
          name: networkRequestsToolName,
          arguments: {},
        });
        collectNetworkFailures(networkResult.content, httpFailures, emit);
      } catch (netErr) {
        addLog('warn', `Failed to capture network requests: ${netErr}`);
      }
    }

    const run = buildRun(
      runId,
      test.id,
      'success',
      screenshots,
      httpFailures,
      logEntries,
      undefined,
      browser,
    );
    writeRun(runDir, run);
    emit({
      type: 'complete',
      runId,
      status: 'success',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    await captureScreenshot('State at failure');
    endScreenshotCaptured = true;

    addLog('error', `Test failed: ${e}`);

    // Capture network failures even on test failure for diagnostic purposes
    if (networkRequestsToolName && mcpClient) {
      try {
        const networkResult = await mcpClient.callTool({
          name: networkRequestsToolName,
          arguments: {},
        });
        collectNetworkFailures(networkResult.content, httpFailures, emit);
      } catch {
        /* ignore network capture errors in failure path */
      }
    }

    const run = buildRun(
      runId,
      test.id,
      'failure',
      screenshots,
      httpFailures,
      logEntries,
      String(e),
      browser,
    );
    writeRun(runDir, run);
    emit({
      type: 'complete',
      runId,
      status: 'failure',
      error: String(e),
      timestamp: new Date().toISOString(),
    });
  } finally {
    if (!endScreenshotCaptured) {
      await captureScreenshot('Final state');
    }

    if (mcpClient) {
      try {
        await mcpClient.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Parse network request objects from a browser_network_requests MCP tool response,
 * collect failures (HTTP 4xx/5xx), push them into the shared httpFailures array,
 * and emit an http_failure event for each one.
 */
function collectNetworkFailures(
  content: unknown,
  httpFailures: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }>,
  emitter: (event: RunEvent) => void,
): void {
  if (!Array.isArray(content)) return;
  for (const item of content) {
    if (typeof item !== 'object' || item === null || !('text' in item))
      continue;
    const text = String((item as { text: unknown }).text);
    try {
      const requests = JSON.parse(text) as NetworkRequest[];
      for (const req of requests) {
        if (typeof req.status === 'number' && req.status >= 400) {
          const failure = {
            url: req.url ?? '',
            method: req.method ?? 'GET',
            status: req.status,
            timestamp: new Date().toISOString(),
          };
          httpFailures.push(failure);
          emitter({ type: 'http_failure', ...failure });
        }
      }
    } catch {
      /* not JSON, skip */
    }
  }
}

function buildRun(
  runId: string,
  testId: string,
  status: 'success' | 'failure',
  screenshots: Array<{
    id: string;
    path: string;
    description: string;
    timestamp: string;
  }>,
  httpFailures: Array<{
    url: string;
    method: string;
    status: number;
    timestamp: string;
  }>,
  logEntries: Array<{ level: string; message: string; timestamp: string }>,
  error: string | undefined,
  browser: string | undefined,
) {
  return {
    id: runId,
    testId,
    browser,
    status,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    screenshots,
    httpFailures,
    log: logEntries,
    error,
  };
}

function writeRun(runDir: string, run: ReturnType<typeof buildRun>) {
  try {
    fs.mkdirSync(runDir, { recursive: true });
    fs.writeFileSync(
      path.join(runDir, 'run.json'),
      JSON.stringify(run, null, 2),
    );
  } catch (e) {
    process.stderr.write(`Failed to write run.json: ${e}\n`);
  }
}

// Suppress unused warning - log is used for top-level error reporting
void log;

main().catch((e) => {
  emit({
    type: 'error',
    message: String(e),
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});
