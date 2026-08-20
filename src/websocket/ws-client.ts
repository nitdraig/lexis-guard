import { WebSocket } from 'ws';

export interface WsProbeResult {
  /** HTTP status from the upgrade handshake (undefined when it failed). */
  statusCode?: number;
  /** Whether the connection upgraded to WebSocket. */
  connected: boolean;
  /** First message received within the window, if any. */
  firstMessage?: string;
  /** Error message when the handshake/connection failed. */
  error?: string;
}

export interface WsProbeOptions {
  /** Absolute ws(s) URL, e.g. `wss://api.example.com/socket`. */
  url: string;
  /** Message to send after a successful upgrade. */
  message?: string;
  /** Optional headers to inject into the handshake. */
  headers?: Record<string, string>;
  /** Timeout for the whole handshake + first-message window. */
  timeoutMs?: number;
}

/**
 * Minimal WebSocket client with timeout. Wraps the handshake and a single
 * outbound message into a bounded result so the audit never hangs on a socket.
 */
export function probeWebSocket(options: WsProbeOptions): Promise<WsProbeResult> {
  return new Promise((resolve) => {
    const timeoutMs = options.timeoutMs ?? 5000;
    let settled = false;

    const finish = (result: WsProbeResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        // lexis: ignore close errors once the probe has settled
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ connected: false, error: `WebSocket probe timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    const ws = new WebSocket(options.url, {
      headers: options.headers,
      handshakeTimeout: timeoutMs
    });

    ws.on('open', () => {
      if (options.message !== undefined) {
        ws.send(options.message);
      }
    });

    ws.on('message', (data) => {
      const message = typeof data === 'string' ? data : data.toString();
      finish({ connected: true, firstMessage: message });
    });

    ws.on('unexpected-response', (_req, res) => {
      finish({ statusCode: res.statusCode, connected: false, error: `Unexpected response ${res.statusCode}` });
    });

    ws.on('error', (err) => {
      finish({ connected: false, error: err.message });
    });

    ws.on('close', (code) => {
      // A clean close right after upgrade with no message is still a valid probe.
      if (!settled && code === 1000) {
        finish({ connected: true });
      }
    });
  });
}
