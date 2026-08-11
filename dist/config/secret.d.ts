/** Encrypt a secret (e.g. API key) at rest. Empty input yields empty output. */
export declare function encryptSecret(plain: string): string;
export declare function isEncrypted(value: string): boolean;
/** Decrypt an "enc:..." blob. Plain values pass through unchanged. */
export declare function decryptSecret(stored: string): string;
//# sourceMappingURL=secret.d.ts.map