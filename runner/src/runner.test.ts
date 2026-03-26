import { describe, it, expect } from 'vitest';

function expandVariables(script: string, variables: Record<string, string>): string {
  return script.replace(/\$\{(\w+)\}/g, (_, key) => variables[key] ?? `\${${key}}`);
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
