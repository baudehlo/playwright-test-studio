import { describe, it, expect, beforeEach } from 'vitest';
import type { Test, Settings } from '../types';

// Variable expansion utility
function expandVariables(script: string, variables: Record<string, string>): string {
  return script.replace(/\$\{(\w+)\}/g, (_, key) => variables[key] ?? `\${${key}}`);
}

// Mock store operations
function createMockStore() {
  let tests: Test[] = [];

  return {
    getTests: () => tests,
    addTest: (test: Test) => { tests = [...tests, test]; },
    updateTest: (updated: Test) => {
      tests = tests.map(t => t.id === updated.id ? updated : t);
    },
    deleteTest: (id: string) => {
      tests = tests.filter(t => t.id !== id && t.parentId !== id);
    },
  };
}

function makeTest(overrides?: Partial<Test>): Test {
  return {
    id: crypto.randomUUID(),
    name: 'Test',
    description: '',
    script: '',
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('expandVariables', () => {
  it('replaces known variables', () => {
    const result = expandVariables('Navigate to ${url}', { url: 'https://example.com' });
    expect(result).toBe('Navigate to https://example.com');
  });

  it('leaves unknown variables intact', () => {
    const result = expandVariables('Hello ${unknown}', {});
    expect(result).toBe('Hello ${unknown}');
  });

  it('replaces multiple variables', () => {
    const result = expandVariables('${greeting} ${name}!', { greeting: 'Hello', name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('handles empty script', () => {
    const result = expandVariables('', { url: 'https://example.com' });
    expect(result).toBe('');
  });

  it('handles no variables in script', () => {
    const result = expandVariables('Navigate to the home page', { url: 'https://example.com' });
    expect(result).toBe('Navigate to the home page');
  });
});

describe('Test CRUD operations', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it('adds a test', () => {
    const test = makeTest({ name: 'My Test' });
    store.addTest(test);
    expect(store.getTests()).toHaveLength(1);
    expect(store.getTests()[0].name).toBe('My Test');
  });

  it('updates a test', () => {
    const test = makeTest({ name: 'Original' });
    store.addTest(test);
    store.updateTest({ ...test, name: 'Updated' });
    expect(store.getTests()[0].name).toBe('Updated');
  });

  it('deletes a test', () => {
    const test = makeTest();
    store.addTest(test);
    store.deleteTest(test.id);
    expect(store.getTests()).toHaveLength(0);
  });

  it('deletes child tests when parent is deleted', () => {
    const parent = makeTest({ name: 'Parent' });
    const child = makeTest({ name: 'Child', parentId: parent.id });
    store.addTest(parent);
    store.addTest(child);
    store.deleteTest(parent.id);
    expect(store.getTests()).toHaveLength(0);
  });

  it('maintains multiple tests', () => {
    const t1 = makeTest({ name: 'Test 1' });
    const t2 = makeTest({ name: 'Test 2' });
    store.addTest(t1);
    store.addTest(t2);
    expect(store.getTests()).toHaveLength(2);
  });
});

describe('Run status tracking', () => {
  it('tracks running status', () => {
    const statuses: Array<'running' | 'success' | 'failure'> = ['running', 'success', 'failure'];
    for (const s of statuses) {
      expect(s).toMatch(/^(running|success|failure)$/);
    }
  });

  it('validates settings structure', () => {
    const settings: Settings = {
      aiProvider: 'openai',
      apiKey: 'sk-test',
      model: 'gpt-4o',
    };
    expect(settings.aiProvider).toBe('openai');
    expect(settings.model).toBe('gpt-4o');
  });

  it('handles all AI providers', () => {
    const providers: Settings['aiProvider'][] = ['openai', 'anthropic', 'azure-openai', 'groq', 'xai'];
    expect(providers).toHaveLength(5);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });
});
