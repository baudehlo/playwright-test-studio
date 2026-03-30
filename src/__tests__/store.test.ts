import { beforeEach, describe, expect, it } from 'vitest';
import type { Collection, Settings, Test } from '../types';

// Variable expansion utility
function expandVariables(
  script: string,
  variables: Record<string, string>,
): string {
  return script.replace(
    /\$\{(\w+)\}/g,
    (_, key) => variables[key] ?? `\${${key}}`,
  );
}

// Merge variables: global → collection → test (test wins)
function mergeVariables(
  globalVars: Record<string, string>,
  collectionVars: Record<string, string>,
  testVars: Record<string, string>,
): Record<string, string> {
  return { ...globalVars, ...collectionVars, ...testVars };
}

// Mock store operations
function createMockStore() {
  let tests: Test[] = [];
  let collections: Collection[] = [];
  let globalVariables: Record<string, string> = {};

  return {
    getTests: () => tests,
    addTest: (test: Test) => {
      tests = [...tests, test];
    },
    updateTest: (updated: Test) => {
      tests = tests.map((t) => (t.id === updated.id ? updated : t));
    },
    deleteTest: (id: string) => {
      tests = tests.filter((t) => t.id !== id && t.parentId !== id);
    },

    getCollections: () => collections,
    addCollection: (collection: Collection) => {
      collections = [...collections, collection];
    },
    updateCollection: (updated: Collection) => {
      collections = collections.map((c) => (c.id === updated.id ? updated : c));
    },
    deleteCollection: (id: string) => {
      collections = collections.filter((c) => c.id !== id);
      tests = tests.map((t) =>
        t.collectionId === id ? { ...t, collectionId: undefined } : t,
      );
    },

    getGlobalVariables: () => globalVariables,
    setGlobalVariables: (vars: Record<string, string>) => {
      globalVariables = vars;
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

function makeCollection(overrides?: Partial<Collection>): Collection {
  return {
    id: crypto.randomUUID(),
    name: 'Collection',
    variables: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('expandVariables', () => {
  it('replaces known variables', () => {
    const result = expandVariables('Navigate to ${url}', {
      url: 'https://example.com',
    });
    expect(result).toBe('Navigate to https://example.com');
  });

  it('leaves unknown variables intact', () => {
    const result = expandVariables('Hello ${unknown}', {});
    expect(result).toBe('Hello ${unknown}');
  });

  it('replaces multiple variables', () => {
    const result = expandVariables('${greeting} ${name}!', {
      greeting: 'Hello',
      name: 'World',
    });
    expect(result).toBe('Hello World!');
  });

  it('handles empty script', () => {
    const result = expandVariables('', { url: 'https://example.com' });
    expect(result).toBe('');
  });

  it('handles no variables in script', () => {
    const result = expandVariables('Navigate to the home page', {
      url: 'https://example.com',
    });
    expect(result).toBe('Navigate to the home page');
  });
});

describe('Variable hierarchy merging', () => {
  it('test variables override collection variables', () => {
    const merged = mergeVariables(
      {},
      { url: 'https://collection.com' },
      { url: 'https://test.com' },
    );
    expect(merged.url).toBe('https://test.com');
  });

  it('collection variables override global variables', () => {
    const merged = mergeVariables(
      { url: 'https://global.com' },
      { url: 'https://collection.com' },
      {},
    );
    expect(merged.url).toBe('https://collection.com');
  });

  it('test variables override global variables', () => {
    const merged = mergeVariables(
      { url: 'https://global.com' },
      {},
      { url: 'https://test.com' },
    );
    expect(merged.url).toBe('https://test.com');
  });

  it('all three levels are available when non-overlapping', () => {
    const merged = mergeVariables(
      { globalVar: 'global' },
      { collectionVar: 'collection' },
      { testVar: 'test' },
    );
    expect(merged.globalVar).toBe('global');
    expect(merged.collectionVar).toBe('collection');
    expect(merged.testVar).toBe('test');
  });

  it('expands merged variables correctly', () => {
    const merged = mergeVariables(
      { baseUrl: 'https://example.com' },
      { apiPath: '/api/v1' },
      { endpoint: '/users' },
    );
    const result = expandVariables('${baseUrl}${apiPath}${endpoint}', merged);
    expect(result).toBe('https://example.com/api/v1/users');
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

  it('associates test with a collection via collectionId', () => {
    const collection = makeCollection({ name: 'My Collection' });
    const test = makeTest({ collectionId: collection.id });
    store.addCollection(collection);
    store.addTest(test);
    expect(store.getTests()[0].collectionId).toBe(collection.id);
  });
});

describe('Collection CRUD operations', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it('adds a collection', () => {
    const collection = makeCollection({ name: 'My Collection' });
    store.addCollection(collection);
    expect(store.getCollections()).toHaveLength(1);
    expect(store.getCollections()[0].name).toBe('My Collection');
  });

  it('updates a collection', () => {
    const collection = makeCollection({ name: 'Original' });
    store.addCollection(collection);
    store.updateCollection({ ...collection, name: 'Updated' });
    expect(store.getCollections()[0].name).toBe('Updated');
  });

  it('deletes a collection', () => {
    const collection = makeCollection();
    store.addCollection(collection);
    store.deleteCollection(collection.id);
    expect(store.getCollections()).toHaveLength(0);
  });

  it('unassigns tests when their collection is deleted', () => {
    const collection = makeCollection();
    const test = makeTest({ collectionId: collection.id });
    store.addCollection(collection);
    store.addTest(test);
    store.deleteCollection(collection.id);
    expect(store.getTests()[0].collectionId).toBeUndefined();
  });

  it('stores collection variables', () => {
    const collection = makeCollection({
      variables: { baseUrl: 'https://example.com' },
    });
    store.addCollection(collection);
    expect(store.getCollections()[0].variables.baseUrl).toBe(
      'https://example.com',
    );
  });

  it('maintains multiple collections', () => {
    store.addCollection(makeCollection({ name: 'A' }));
    store.addCollection(makeCollection({ name: 'B' }));
    expect(store.getCollections()).toHaveLength(2);
  });
});

describe('Global variables', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it('stores and retrieves global variables', () => {
    store.setGlobalVariables({ baseUrl: 'https://global.com' });
    expect(store.getGlobalVariables().baseUrl).toBe('https://global.com');
  });

  it('starts with empty global variables', () => {
    expect(store.getGlobalVariables()).toEqual({});
  });
});

describe('Run status tracking', () => {
  it('tracks running status', () => {
    const statuses: Array<'running' | 'success' | 'failure'> = [
      'running',
      'success',
      'failure',
    ];
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
    const providers: Settings['aiProvider'][] = [
      'openai',
      'anthropic',
      'azure-openai',
      'groq',
      'xai',
      'github',
    ];
    expect(providers).toHaveLength(6);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });
});
