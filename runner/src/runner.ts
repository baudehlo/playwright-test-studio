import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, tool, type Tool } from 'ai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';

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
  aiProvider: 'openai' | 'anthropic' | 'azure-openai' | 'groq' | 'xai';
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
}

interface RunEvent {
  type: 'log' | 'screenshot' | 'http_failure' | 'complete' | 'error';
  [key: string]: unknown;
}

function emit(event: RunEvent): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

function log(level: 'info' | 'warn' | 'error', message: string): void {
  emit({ type: 'log', level, message, timestamp: new Date().toISOString() });
}

function expandVariables(script: string, variables: Record<string, string>): string {
  return script.replace(/\$\{(\w+)\}/g, (_, key) => variables[key] ?? `\${${key}}`);
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
    default:
      return createOpenAI({ apiKey: settings.apiKey });
  }
}

interface McpToolSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

async function readConfig(): Promise<RunnerConfig> {
  return new Promise((resolve, reject) => {
    let data = '';
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', line => { data += line; });
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
    emit({ type: 'error', message: `Failed to read config: ${e}`, timestamp: new Date().toISOString() });
    process.exit(1);
  }

  const { test, settings, runDir, screenshotsDir, runId } = config;
  const screenshots: Array<{ id: string; path: string; description: string; timestamp: string }> = [];
  const httpFailures: Array<{ url: string; method: string; status: number; timestamp: string }> = [];
  const logEntries: Array<{ level: string; message: string; timestamp: string }> = [];

  function addLog(level: 'info' | 'warn' | 'error', message: string) {
    const entry = { level, message, timestamp: new Date().toISOString() };
    logEntries.push(entry);
    emit({ type: 'log', ...entry });
  }

  addLog('info', `Starting test: ${test.name}`);

  const expandedScript = expandVariables(test.script, test.variables);
  addLog('info', `Expanded script variables`);

  // If this test has parent tests, prepend their scripts as context so the AI
  // knows what was previously completed and can continue from that state.
  let fullScript = expandedScript;
  if (config.parentTests && config.parentTests.length > 0) {
    const parentContext = config.parentTests
      .map(pt => {
        const parentScript = expandVariables(pt.script, pt.variables);
        return `[${pt.name}]\n${parentScript}`;
      })
      .join('\n\n');
    const PARENT_HEADER =
      'PREVIOUSLY COMPLETED STEPS (the browser should already be in this state' +
      ' — do NOT re-execute these, just use them as context):';
    const CURRENT_HEADER = 'CURRENT STEPS TO EXECUTE NOW:';
    fullScript = `${PARENT_HEADER}\n${parentContext}\n\n${CURRENT_HEADER}\n${expandedScript}`;
    addLog('info', `Loaded context from ${config.parentTests.length} parent test(s): ${config.parentTests.map(p => p.name).join(' → ')}`);
  }

  // Connect to Playwright MCP server
  let mcpClient: Client | null = null;
  let transport: StdioClientTransport | null = null;

  try {
    addLog('info', 'Connecting to Playwright MCP server...');
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['@playwright/mcp@latest', '--no-sandbox'],
    });

    mcpClient = new Client({ name: 'playwright-test-studio', version: '1.0.0' }, {
      capabilities: {},
    });

    await mcpClient.connect(transport);
    addLog('info', 'Connected to Playwright MCP server');
  } catch (e) {
    addLog('error', `Failed to connect to Playwright MCP: ${e}`);
    const run = buildRun(runId, test.id, 'failure', screenshots, httpFailures, logEntries, String(e));
    writeRun(runDir, run);
    emit({ type: 'error', message: String(e), runId, timestamp: new Date().toISOString() });
    process.exit(1);
  }

  try {
    // Get tools from MCP
    const toolsResult = await mcpClient.listTools();
    addLog('info', `Available tools: ${toolsResult.tools.map(t => t.name).join(', ')}`);

    // Build AI SDK tools from MCP tools
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiTools: Record<string, Tool<any, any>> = {};
    let screenshotCount = 0;

    for (const mcpTool of toolsResult.tools) {
      const toolName = mcpTool.name;
      const inputSchema = (mcpTool.inputSchema as McpToolSchema) ?? { type: 'object', properties: {} };
      
      // Build a zod schema from the JSON schema
      const zodProps: Record<string, z.ZodTypeAny> = {};
      const properties = inputSchema.properties ?? {};
      const required = inputSchema.required ?? [];

      for (const [propName, propSchema] of Object.entries(properties)) {
        const prop = propSchema as { type?: string; description?: string };
        let zodType: z.ZodTypeAny;
        switch (prop.type) {
          case 'number':
          case 'integer':
            zodType = z.number();
            break;
          case 'boolean':
            zodType = z.boolean();
            break;
          case 'array':
            zodType = z.array(z.unknown());
            break;
          case 'object':
            zodType = z.record(z.unknown());
            break;
          default:
            zodType = z.string();
        }
        if (prop.description) {
          zodType = zodType.describe(prop.description);
        }
        if (!required.includes(propName)) {
          zodType = zodType.optional();
        }
        zodProps[propName] = zodType;
      }

      const zodSchema = z.object(zodProps);
      const capturedToolName = toolName;

      aiTools[toolName] = tool({
        description: mcpTool.description ?? `MCP tool: ${toolName}`,
        parameters: zodSchema,
        execute: async (params: Record<string, unknown>) => {
          addLog('info', `Calling tool: ${capturedToolName}`);
          try {
            const result = await mcpClient!.callTool({
              name: capturedToolName,
              arguments: params,
            });

            // Check for HTTP failures in tool results
            const resultStr = JSON.stringify(result);
            if (resultStr.includes('"status"') && (resultStr.includes('"4') || resultStr.includes('"5'))) {
              // Attempt to extract HTTP failures from network-related tool results
              try {
                if (Array.isArray(result.content)) {
                  for (const item of result.content) {
                    if (typeof item === 'object' && item !== null && 'text' in item) {
                      const text = String((item as { text: unknown }).text);
                      const failureMatch = text.match(/(\w+)\s+(https?:\/\/[^\s]+).*?(\d{3})/);
                      if (failureMatch) {
                        const [, method, url, statusStr] = failureMatch;
                        const status = parseInt(statusStr, 10);
                        if (status >= 400) {
                          const failure = { url, method, status, timestamp: new Date().toISOString() };
                          httpFailures.push(failure);
                          emit({ type: 'http_failure', ...failure });
                        }
                      }
                    }
                  }
                }
              } catch { /* ignore */ }
            }

            // Auto-capture screenshot after navigation/click actions
            const navActions = ['browser_navigate', 'browser_click', 'browser_type', 'browser_select_option', 'browser_fill'];
            if (navActions.includes(capturedToolName) && aiTools['browser_screenshot']) {
              try {
                screenshotCount++;
                const screenshotFilename = `screenshot-${String(screenshotCount).padStart(3, '0')}-${Date.now()}.png`;
                const screenshotPath = path.join(screenshotsDir, screenshotFilename);
                
                const screenshotResult = await mcpClient!.callTool({
                  name: 'browser_screenshot',
                  arguments: {},
                });
                
                // Extract image data from screenshot result
                if (Array.isArray(screenshotResult.content)) {
                  for (const item of screenshotResult.content) {
                    if (typeof item === 'object' && item !== null && 'type' in item && (item as { type: string }).type === 'image') {
                      const imageItem = item as { type: string; data: string; mimeType?: string };
                      const imageData = Buffer.from(imageItem.data, 'base64');
                      fs.writeFileSync(screenshotPath, imageData);
                      
                      const screenshotId = `ss-${screenshotCount}-${Date.now()}`;
                      const screenshotEntry = {
                        id: screenshotId,
                        path: screenshotFilename,
                        description: `After ${capturedToolName}`,
                        timestamp: new Date().toISOString(),
                      };
                      screenshots.push(screenshotEntry);
                      emit({ type: 'screenshot', ...screenshotEntry });
                      break;
                    }
                  }
                }
              } catch (screenshotErr) {
                addLog('warn', `Screenshot capture failed: ${screenshotErr}`);
              }
            }

            return result;
          } catch (e) {
            addLog('error', `Tool ${capturedToolName} failed: ${e}`);
            throw e;
          }
        },
      });
    }

    const provider = createProvider(settings);
    
    addLog('info', 'Starting AI agent...');

    const systemPrompt = `You are a browser test automation agent. You have access to browser control tools via Playwright.
Execute the following test step by step, using the available browser tools.
After completing all steps, output a brief summary of what was done and whether the test passed.
If any step fails, explain why.`;

    await generateText({
      model: provider(settings.model),
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
          addLog('info', step.text);
        }
      },
    });

    addLog('info', 'Test completed successfully');

    const run = buildRun(runId, test.id, 'success', screenshots, httpFailures, logEntries, undefined);
    writeRun(runDir, run);
    emit({ type: 'complete', runId, status: 'success', timestamp: new Date().toISOString() });

  } catch (e) {
    addLog('error', `Test failed: ${e}`);
    const run = buildRun(runId, test.id, 'failure', screenshots, httpFailures, logEntries, String(e));
    writeRun(runDir, run);
    emit({ type: 'complete', runId, status: 'failure', error: String(e), timestamp: new Date().toISOString() });
  } finally {
    if (mcpClient) {
      try { await mcpClient.close(); } catch { /* ignore */ }
    }
  }
}

function buildRun(
  runId: string,
  testId: string,
  status: 'success' | 'failure',
  screenshots: Array<{ id: string; path: string; description: string; timestamp: string }>,
  httpFailures: Array<{ url: string; method: string; status: number; timestamp: string }>,
  logEntries: Array<{ level: string; message: string; timestamp: string }>,
  error: string | undefined,
) {
  return {
    id: runId,
    testId,
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
    fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2));
  } catch (e) {
    process.stderr.write(`Failed to write run.json: ${e}\n`);
  }
}

// Suppress unused warning - log is used for top-level error reporting
void (log);

main().catch(e => {
  emit({ type: 'error', message: String(e), timestamp: new Date().toISOString() });
  process.exit(1);
});
