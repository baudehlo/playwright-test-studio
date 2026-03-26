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

// Mirrors the network-failure parsing logic used in runner.ts
function parseNetworkFailures(
  content: Array<{ text?: string }>,
): Array<{ url: string; method: string; status: number }> {
  const failures: Array<{ url: string; method: string; status: number }> = [];
  for (const item of content) {
    if (!item.text) continue;
    try {
      const requests = JSON.parse(item.text) as Array<{
        url?: string;
        method?: string;
        status?: number;
        [key: string]: unknown;
      }>;
      for (const req of requests) {
        if (typeof req.status === 'number' && req.status >= 400) {
          failures.push({
            url: req.url ?? '',
            method: req.method ?? 'GET',
            status: req.status,
          });
        }
      }
    } catch { /* not JSON */ }
  }
  return failures;
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

describe('parseNetworkFailures (browser_network_requests parsing)', () => {
  it('returns empty array for empty content', () => {
    expect(parseNetworkFailures([])).toEqual([]);
  });

  it('filters out successful requests (2xx/3xx)', () => {
    const content = [{ text: JSON.stringify([
      { url: 'https://example.com/api', method: 'GET', status: 200 },
      { url: 'https://example.com/redirect', method: 'GET', status: 301 },
    ]) }];
    expect(parseNetworkFailures(content)).toEqual([]);
  });

  it('captures 4xx client error responses', () => {
    const content = [{ text: JSON.stringify([
      { url: 'https://example.com/not-found', method: 'GET', status: 404 },
    ]) }];
    const failures = parseNetworkFailures(content);
    expect(failures).toHaveLength(1);
    expect(failures[0].status).toBe(404);
    expect(failures[0].url).toBe('https://example.com/not-found');
    expect(failures[0].method).toBe('GET');
  });

  it('captures 5xx server error responses', () => {
    const content = [{ text: JSON.stringify([
      { url: 'https://api.example.com/data', method: 'POST', status: 500 },
    ]) }];
    const failures = parseNetworkFailures(content);
    expect(failures).toHaveLength(1);
    expect(failures[0].status).toBe(500);
    expect(failures[0].method).toBe('POST');
  });

  it('handles mixed success and failure responses', () => {
    const content = [{ text: JSON.stringify([
      { url: 'https://example.com/ok', method: 'GET', status: 200 },
      { url: 'https://example.com/fail', method: 'DELETE', status: 403 },
      { url: 'https://example.com/error', method: 'GET', status: 503 },
    ]) }];
    const failures = parseNetworkFailures(content);
    expect(failures).toHaveLength(2);
    expect(failures.map(f => f.status)).toEqual([403, 503]);
  });

  it('defaults method to GET when missing', () => {
    const content = [{ text: JSON.stringify([{ url: 'https://example.com/', status: 404 }]) }];
    const failures = parseNetworkFailures(content);
    expect(failures[0].method).toBe('GET');
  });

  it('defaults url to empty string when missing', () => {
    const content = [{ text: JSON.stringify([{ method: 'GET', status: 500 }]) }];
    const failures = parseNetworkFailures(content);
    expect(failures[0].url).toBe('');
  });

  it('skips non-JSON content without throwing', () => {
    const content = [{ text: 'Not JSON at all' }, { text: JSON.stringify([{ url: 'https://x.com', method: 'GET', status: 401 }]) }];
    const failures = parseNetworkFailures(content);
    expect(failures).toHaveLength(1);
    expect(failures[0].status).toBe(401);
  });

  it('skips items with no text field', () => {
    const content: Array<{ text?: string }> = [
      {},
      { text: JSON.stringify([{ url: 'https://x.com', method: 'GET', status: 429 }]) },
    ];
    const failures = parseNetworkFailures(content);
    expect(failures).toHaveLength(1);
  });
});
