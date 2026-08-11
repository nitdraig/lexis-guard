import type { Finding } from '../types/finding.js';
import type { Lexisrc } from '../config/lexisrc-schema.js';
import type { HttpEngine } from '../core/http-engine.js';
/**
 * BOLA (Broken Object Level Authorization) test:
 * User A tries to access resources owned by User B.
 * If the server returns 200, it's a BOLA violation.
 */
export declare function testBOLA(_target: string, config: Lexisrc, engine: HttpEngine): Promise<Finding[]>;
/**
 * BFLA (Broken Function Level Authorization) test:
 * Standard user tries to perform admin-only operations.
 * If the server accepts the request, it's a BFLA violation.
 */
export declare function testBFLA(_target: string, config: Lexisrc, engine: HttpEngine): Promise<Finding[]>;
//# sourceMappingURL=cross-auth-tester.d.ts.map