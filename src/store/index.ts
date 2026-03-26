import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Test, Run, Settings, LogEntry, Screenshot, HttpFailure } from '../types';

interface RunEvent {
  type: 'log' | 'screenshot' | 'http_failure' | 'complete' | 'error';
  level?: 'info' | 'warn' | 'error';
  message?: string;
  timestamp?: string;
  id?: string;
  path?: string;
  description?: string;
  url?: string;
  method?: string;
  status?: number;
  runId?: string;
  error?: string;
}

interface AppState {
  tests: Test[];
  selectedTestId: string | null;
  runs: Record<string, Run[]>;
  selectedRun: Run | null;
  isRunning: boolean;
  settings: Settings;
  currentRunLog: LogEntry[];
  currentRunScreenshots: Screenshot[];
  currentRunHttpFailures: HttpFailure[];

  loadTests: () => Promise<void>;
  saveTest: (test: Test) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  selectTest: (id: string | null) => void;
  loadRuns: (testId: string) => Promise<void>;
  selectRun: (run: Run | null) => void;
  runTest: (test: Test) => Promise<void>;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}

const defaultSettings: Settings = {
  aiProvider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
};

export const useStore = create<AppState>((set, get) => ({
  tests: [],
  selectedTestId: null,
  runs: {},
  selectedRun: null,
  isRunning: false,
  settings: defaultSettings,
  currentRunLog: [],
  currentRunScreenshots: [],
  currentRunHttpFailures: [],

  loadTests: async () => {
    try {
      const tests = await invoke<Test[]>('get_tests');
      set({ tests });
    } catch (e) {
      console.error('Failed to load tests:', e);
    }
  },

  saveTest: async (test: Test) => {
    const { tests } = get();
    const existing = tests.findIndex(t => t.id === test.id);
    const updated = existing >= 0
      ? tests.map(t => t.id === test.id ? test : t)
      : [...tests, test];
    await invoke('save_tests', { tests: updated });
    set({ tests: updated });
  },

  deleteTest: async (id: string) => {
    const { tests } = get();
    const updated = tests.filter(t => t.id !== id && t.parentId !== id);
    await invoke('save_tests', { tests: updated });
    set({ tests: updated, selectedTestId: null });
  },

  selectTest: (id: string | null) => {
    set({ selectedTestId: id, selectedRun: null });
    if (id) get().loadRuns(id);
  },

  loadRuns: async (testId: string) => {
    try {
      const runs = await invoke<Run[]>('get_runs', { testId });
      set(state => ({ runs: { ...state.runs, [testId]: runs } }));
    } catch (e) {
      console.error('Failed to load runs:', e);
    }
  },

  selectRun: (run: Run | null) => {
    set({ selectedRun: run });
  },

  runTest: async (test: Test) => {
    const { settings } = get();
    set({
      isRunning: true,
      currentRunLog: [],
      currentRunScreenshots: [],
      currentRunHttpFailures: [],
    });

    try {
      const unlisten = await listen<RunEvent>('run-event', (event) => {
        const data = event.payload;
        set(state => {
          switch (data.type) {
            case 'log':
              return {
                currentRunLog: [...state.currentRunLog, {
                  level: data.level ?? 'info',
                  message: data.message ?? '',
                  timestamp: data.timestamp ?? new Date().toISOString(),
                }],
              };
            case 'screenshot':
              return {
                currentRunScreenshots: [...state.currentRunScreenshots, {
                  id: data.id ?? crypto.randomUUID(),
                  path: data.path ?? '',
                  description: data.description ?? '',
                  timestamp: data.timestamp ?? new Date().toISOString(),
                }],
              };
            case 'http_failure':
              return {
                currentRunHttpFailures: [...state.currentRunHttpFailures, {
                  url: data.url ?? '',
                  method: data.method ?? 'GET',
                  status: data.status ?? 0,
                  timestamp: data.timestamp ?? new Date().toISOString(),
                }],
              };
            case 'complete':
            case 'error':
              return {};
            default:
              return {};
          }
        });

        if (data.type === 'complete' || data.type === 'error') {
          unlisten();
          set({ isRunning: false });
          if (test.id) get().loadRuns(test.id);
        }
      });

      const appDataDir = await invoke<string>('get_app_data_dir');
      await invoke('run_test', { test, settings, appDataDir });
    } catch (e) {
      console.error('Failed to run test:', e);
      set({
        isRunning: false,
        currentRunLog: [{
          level: 'error',
          message: String(e),
          timestamp: new Date().toISOString(),
        }],
      });
    }
  },

  loadSettings: async () => {
    try {
      const settings = await invoke<Settings>('get_settings');
      set({ settings });
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  },

  saveSettings: async (settings: Settings) => {
    await invoke('save_settings', { settings });
    set({ settings });
  },
}));
