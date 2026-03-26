import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { Test, Run, Settings, LogEntry, Screenshot, HttpFailure, Collection } from '../types';

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
  status?: number | 'success' | 'failure';
  runId?: string;
  error?: string;
}

interface AppState {
  tests: Test[];
  collections: Collection[];
  globalVariables: Record<string, string>;
  selectedTestId: string | null;
  selectedCollectionId: string | null;
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

  loadCollections: () => Promise<void>;
  saveCollection: (collection: Collection) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  selectCollection: (id: string | null) => void;

  loadGlobalVariables: () => Promise<void>;
  saveGlobalVariables: (variables: Record<string, string>) => Promise<void>;

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
  collections: [],
  globalVariables: {},
  selectedTestId: null,
  selectedCollectionId: null,
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

  loadCollections: async () => {
    try {
      const collections = await invoke<Collection[]>('get_collections');
      set({ collections });
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  },

  saveCollection: async (collection: Collection) => {
    const { collections } = get();
    const existing = collections.findIndex(c => c.id === collection.id);
    const updated = existing >= 0
      ? collections.map(c => c.id === collection.id ? collection : c)
      : [...collections, collection];
    await invoke('save_collections', { collections: updated });
    set({ collections: updated });
  },

  deleteCollection: async (id: string) => {
    const { collections, tests } = get();
    const updatedCollections = collections.filter(c => c.id !== id);
    // Unassign tests that belonged to this collection
    const updatedTests = tests.map(t =>
      t.collectionId === id ? { ...t, collectionId: undefined } : t
    );
    await invoke('save_collections', { collections: updatedCollections });
    await invoke('save_tests', { tests: updatedTests });
    set({ collections: updatedCollections, tests: updatedTests, selectedCollectionId: null });
  },

  selectCollection: (id: string | null) => {
    set({ selectedCollectionId: id, selectedTestId: null, selectedRun: null });
  },

  loadGlobalVariables: async () => {
    try {
      const globalVariables = await invoke<Record<string, string>>('get_global_variables');
      set({ globalVariables });
    } catch (e) {
      console.error('Failed to load global variables:', e);
    }
  },

  saveGlobalVariables: async (variables: Record<string, string>) => {
    await invoke('save_global_variables', { variables });
    set({ globalVariables: variables });
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
    const { settings, collections, globalVariables } = get();

    // Merge variables: global → collection → test (highest priority wins)
    const collection = test.collectionId
      ? collections.find(c => c.id === test.collectionId)
      : undefined;
    const mergedVariables: Record<string, string> = {
      ...globalVariables,
      ...(collection?.variables ?? {}),
      ...test.variables,
    };
    const testWithMergedVars: Test = { ...test, variables: mergedVariables };

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
              if (!data.id) {
                console.warn('[run-event] screenshot event missing id field', data);
              }
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
                  status: typeof data.status === 'number' ? data.status : 0,
                  timestamp: data.timestamp ?? new Date().toISOString(),
                }],
              };
            case 'complete':
              if (data.status === 'failure') {
                return {
                  currentRunLog: [...state.currentRunLog, {
                    level: 'error',
                    message: data.error ?? data.message ?? 'Test run failed',
                    timestamp: data.timestamp ?? new Date().toISOString(),
                  }],
                };
              }
              return {};
            case 'error':
              return {
                currentRunLog: [...state.currentRunLog, {
                  level: 'error',
                  message: data.error ?? data.message ?? 'Runner error',
                  timestamp: data.timestamp ?? new Date().toISOString(),
                }],
              };
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
      await invoke('run_test', { test: testWithMergedVars, settings, appDataDir });
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
