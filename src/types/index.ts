export type BrowserName = 'chromium' | 'firefox' | 'webkit';

export interface Collection {
  id: string;
  name: string;
  variables: Record<string, string>;
  browsers?: BrowserName[];
  createdAt: string;
  updatedAt: string;
}

export interface Test {
  id: string;
  name: string;
  description: string;
  script: string;
  parentId?: string;
  collectionId?: string;
  variables: Record<string, string>;
  browsers?: BrowserName[];
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  testId: string;
  browser?: BrowserName;
  status: 'running' | 'success' | 'failure';
  startedAt: string;
  completedAt?: string;
  screenshots: Screenshot[];
  httpFailures: HttpFailure[];
  log: LogEntry[];
  error?: string;
}

export interface Screenshot {
  id: string;
  path: string;
  description: string;
  timestamp: string;
}

export interface HttpFailure {
  url: string;
  method: string;
  status: number;
  timestamp: string;
}

export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

export interface Settings {
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
  browsers?: BrowserName[];
}
