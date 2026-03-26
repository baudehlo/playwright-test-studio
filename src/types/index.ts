export interface Test {
  id: string;
  name: string;
  description: string;
  script: string;
  parentId?: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  testId: string;
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
  aiProvider: 'openai' | 'anthropic' | 'azure-openai' | 'groq' | 'xai';
  apiKey: string;
  model: string;
  baseUrl?: string;
}
