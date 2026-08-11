import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  isEncrypted
} from '../../src/config/secret.js';

describe('secret encryption', () => {
  beforeEach(() => {
    // lexis: tests use the real ~/.lexisguard/.secret (same as runtime).
    // Encryption is self-contained: the key is created once and reused.
  });

  it('encrypts and decrypts round-trip', () => {
    const plain = 'sk-test-1234567890';
    const stored = encryptSecret(plain);
    expect(isEncrypted(stored)).toBe(true);
    expect(stored.startsWith('enc:')).toBe(true);
    expect(stored).not.toContain(plain);
    expect(decryptSecret(stored)).toBe(plain);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('same-key')).not.toBe(encryptSecret('same-key'));
  });

  it('empty input yields empty output and decryption is a passthrough', () => {
    expect(encryptSecret('')).toBe('');
    expect(decryptSecret('plain-value')).toBe('plain-value');
    expect(isEncrypted('plain-value')).toBe(false);
  });
});