import { describe, it, expect } from 'vitest';
import { discoverEndpoints } from '../../src/openapi/parser.js';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('discoverEndpoints', () => {
  it('parses a local OpenAPI JSON spec', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const specPath = join(dir, 'api.json');

    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: { operationId: 'getUsers', summary: 'List users' },
          post: { operationId: 'createUser', summary: 'Create user' }
        },
        '/users/{id}': {
          get: { operationId: 'getUser', summary: 'Get user' },
          delete: { operationId: 'deleteUser', summary: 'Delete user' }
        }
      }
    };

    writeFileSync(specPath, JSON.stringify(spec), 'utf-8');

    const endpoints = await discoverEndpoints(specPath);
    expect(endpoints).toHaveLength(4);

    const getUsers = endpoints.find((e) => e.operationId === 'getUsers');
    expect(getUsers).toBeDefined();
    expect(getUsers?.method).toBe('GET');
    expect(getUsers?.path).toBe('/users');

    const deleteUser = endpoints.find((e) => e.operationId === 'deleteUser');
    expect(deleteUser?.method).toBe('DELETE');
  });

  it('throws on invalid spec', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lexisguard-'));
    const specPath = join(dir, 'empty.json');
    writeFileSync(specPath, JSON.stringify({ openapi: '3.0.0', info: { title: 'Empty', version: '1' } }), 'utf-8');

    await expect(discoverEndpoints(specPath)).rejects.toThrow();
  });
});
