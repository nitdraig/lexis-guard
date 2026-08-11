import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';
const SECRET_PATH = join(homedir(), '.lexisguard', '.secret');
const ALGO = 'aes-256-gcm';
const ENC_PREFIX = 'enc:';
// lexis: key material lives in ~/.lexisguard/.secret (never committed). The
// config file only ever stores the "enc:..." blob, so it can be shared/repo'd.
function getKey() {
    if (existsSync(SECRET_PATH)) {
        return Buffer.from(readFileSync(SECRET_PATH, 'utf-8').trim(), 'base64');
    }
    const key = randomBytes(32);
    mkdirSync(dirname(SECRET_PATH), { recursive: true });
    writeFileSync(SECRET_PATH, key.toString('base64'), { encoding: 'utf-8', mode: 0o600 });
    return key;
}
/** Encrypt a secret (e.g. API key) at rest. Empty input yields empty output. */
export function encryptSecret(plain) {
    if (!plain)
        return '';
    const key = getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ENC_PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64');
}
export function isEncrypted(value) {
    return value.startsWith(ENC_PREFIX);
}
/** Decrypt an "enc:..." blob. Plain values pass through unchanged. */
export function decryptSecret(stored) {
    if (!isEncrypted(stored))
        return stored;
    const raw = Buffer.from(stored.slice(ENC_PREFIX.length), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf-8');
}
//# sourceMappingURL=secret.js.map