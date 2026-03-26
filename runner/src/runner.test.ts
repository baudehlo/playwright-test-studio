import { describe, it, expect } from 'vitest';

function expandVariables(script: string, variables: Record<string, string>): string {
  return script.replace(/\$\{(\w+)\}/g, (_, key) => variables[key] ?? `\${${key}}`);
}

interface TestData {
  name: string;
  script: string;
  variables: Record<string, string>;
}

function buildFullScript(test: TestData, parentTests: TestData[]): string {
  const expandedScript = expandVariables(test.script, test.variables);
  if (parentTests.length === 0) return expandedScript;

  const parentContext = parentTests
    .map(pt => {
      const parentScript = expandVariables(pt.script, pt.variables);
      return `[${pt.name}]\n${parentScript}`;
    })
    .join('\n\n');

  const PARENT_HEADER =
    'PREVIOUSLY COMPLETED STEPS (the browser should already be in this state' +
    ' — do NOT re-execute these, just use them as context):';
  const CURRENT_HEADER = 'CURRENT STEPS TO EXECUTE NOW:';
  return `${PARENT_HEADER}\n${parentContext}\n\n${CURRENT_HEADER}\n${expandedScript}`;
}

describe('expandVariables', () => {
  it('expands known variables', () => {
    expect(expandVariables('Go to ${url}', { url: 'https://example.com' }))
      .toBe('Go to https://example.com');
  });

  it('keeps unknown variables intact', () => {
    expect(expandVariables('${missing}', {})).toBe('${missing}');
  });

  it('handles multiple variables', () => {
    expect(expandVariables('${a} and ${b}', { a: 'foo', b: 'bar' })).toBe('foo and bar');
  });

  it('handles no placeholders', () => {
    expect(expandVariables('plain text', { url: 'x' })).toBe('plain text');
  });
});

describe('buildFullScript (parent test chaining)', () => {
  it('returns just the child script when no parents', () => {
    const test = { name: 'Child', script: 'Click submit', variables: {} };
    expect(buildFullScript(test, [])).toBe('Click submit');
  });

  it('prepends parent context when one parent exists', () => {
    const parent = { name: 'Login', script: 'Navigate to ${url}\nClick sign in', variables: { url: 'https://example.com' } };
    const child = { name: 'Dashboard', script: 'Verify dashboard is visible', variables: {} };
    const result = buildFullScript(child, [parent]);
    expect(result).toContain('PREVIOUSLY COMPLETED STEPS');
    expect(result).toContain('[Login]');
    expect(result).toContain('Navigate to https://example.com');
    expect(result).toContain('CURRENT STEPS TO EXECUTE NOW:');
    expect(result).toContain('Verify dashboard is visible');
  });

  it('expands variables in parent scripts', () => {
    const parent = { name: 'Setup', script: 'Go to ${env}', variables: { env: 'https://staging.example.com' } };
    const child = { name: 'Test', script: 'Do something', variables: {} };
    const result = buildFullScript(child, [parent]);
    expect(result).toContain('Go to https://staging.example.com');
  });

  it('orders multiple parents correctly (ancestor first)', () => {
    const grandparent = { name: 'GP', script: 'Step A', variables: {} };
    const parent = { name: 'P', script: 'Step B', variables: {} };
    const child = { name: 'C', script: 'Step C', variables: {} };
    const result = buildFullScript(child, [grandparent, parent]);
    const gpIndex = result.indexOf('[GP]');
    const pIndex = result.indexOf('[P]');
    const currentIndex = result.indexOf('CURRENT STEPS');
    expect(gpIndex).toBeLessThan(pIndex);
    expect(pIndex).toBeLessThan(currentIndex);
  });
});
