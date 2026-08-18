import type { AuditModule } from '../modules/audit-module.js';

/**
 * Protocol families a plugin may target. Drives discovery and, in the future,
 * how the orchestrator hands transport primitives to the plugin.
 */
export type AuditProtocol = 'http' | 'graphql' | 'websocket' | 'grpc';

/**
 * A versioned, protocol-aware audit module. This is the stable extension point
 * for everything moved into the future phase: new modules register here without
 * the orchestrator ever learning about them.
 */
export interface AuditPlugin extends AuditModule {
  /** Plugin format version, bumped on breaking changes to the interface. */
  version: string;
  /** Transport family; defaults to plain HTTP when omitted. */
  protocol?: AuditProtocol;
}
