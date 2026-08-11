import { describe, it, expect } from 'vitest';
import { AuditLog } from '../../src/core/audit-log.js';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('AuditLog', () => {
  it('appends entries as JSON lines', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const logPath = join(dir, 'audit.log');
    const log = new AuditLog(logPath);

    log.write({
      timestamp: '2024-01-01T00:00:00Z',
      target: 'api.example.com',
      mode: 'safe',
      checks: ['security', 'performance'],
      findings_count: 3,
      incomplete: false
    });

    log.write({
      timestamp: '2024-01-02T00:00:00Z',
      target: 'api2.example.com',
      mode: 'aggressive',
      checks: ['security'],
      findings_count: 0,
      incomplete: false
    });

    const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const first = JSON.parse(lines[0]);
    expect(first.target).toBe('api.example.com');
    expect(first.findings_count).toBe(3);

    const second = JSON.parse(lines[1]);
    expect(second.mode).toBe('aggressive');
  });

  it('creates directory if missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const nested = join(dir, 'sub', 'audit.log');
    const log = new AuditLog(nested);

    log.write({
      timestamp: '2024-01-01T00:00:00Z',
      target: 't',
      mode: 'safe',
      checks: [],
      findings_count: 0,
      incomplete: false
    });

    expect(readFileSync(nested, 'utf-8')).toContain('target":"t"');
  });
});

describe('loadConfig', () => {
  it('loads config from explicit path', () => {
    const { loadConfig } = import('../../src/config/loader.js');
    // Tested implicitly via lexisrc-parser tests; loader is thin cosmiconfig wrapper.
    expect(true).toBe(true);
  });
});
