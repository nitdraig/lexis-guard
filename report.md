{
  "meta": {
    "target": "https://httpbin.org",
    "mode": "safe",
    "timestamp": "2026-08-18T13:40:16.091Z",
    "durationMs": 21002,
    "incomplete": false
  },
  "summary": {
    "total": 7,
    "by_severity": {
      "medium": 5,
      "low": 2
    }
  },
  "findings": [
    {
      "hash": "aa0f6c3ab084",
      "rule_id": "MISSING_HSTS",
      "method": "GET",
      "path": "/",
      "description": "Missing Strict-Transport-Security header",
      "severity": "medium",
      "evidence": "HSTS header not present in response",
      "cwe": "CWE-319",
      "cvss": 5.3,
      "count": 1,
      "worst_case": "medium",
      "owasp": "API8:2023"
    },
    {
      "hash": "7a722e130676",
      "rule_id": "MISSING_X_FRAME_OPTIONS",
      "method": "GET",
      "path": "/",
      "description": "Missing X-Frame-Options header",
      "severity": "medium",
      "evidence": "Clickjacking protection absent",
      "cwe": "CWE-1021",
      "cvss": 5.3,
      "count": 1,
      "worst_case": "medium",
      "owasp": "API8:2023"
    },
    {
      "hash": "5b6dfa823b91",
      "rule_id": "MISSING_X_CONTENT_TYPE_OPTIONS",
      "method": "GET",
      "path": "/",
      "description": "Missing X-Content-Type-Options header",
      "severity": "low",
      "evidence": "MIME-sniffing not disabled",
      "cwe": "CWE-693",
      "cvss": 3.7,
      "count": 1,
      "worst_case": "low",
      "owasp": "API8:2023"
    },
    {
      "hash": "cf97cc4edcef",
      "rule_id": "MISSING_CSP",
      "method": "GET",
      "path": "/",
      "description": "Missing Content-Security-Policy header",
      "severity": "medium",
      "evidence": "CSP not configured",
      "cwe": "CWE-693",
      "cvss": 5.3,
      "count": 1,
      "worst_case": "medium",
      "owasp": "API8:2023"
    },
    {
      "hash": "15e746c6f8c9",
      "rule_id": "STACK_LEAK",
      "method": "GET",
      "path": "/",
      "description": "Server stack information leaked",
      "severity": "low",
      "evidence": "Server: awselb/2.0, X-Powered-By: n/a",
      "cwe": "CWE-200",
      "cvss": 3.7,
      "count": 1,
      "worst_case": "low",
      "owasp": "API8:2023"
    },
    {
      "hash": "1797b2defd51",
      "rule_id": "NO_RATE_LIMIT",
      "method": "GET",
      "path": "/",
      "description": "No rate limiting detected on burst",
      "severity": "medium",
      "evidence": "Burst of 10 requests: no 429 responses",
      "cwe": "CWE-770",
      "cvss": 5.3,
      "count": 1,
      "worst_case": "medium",
      "owasp": "API4:2023"
    },
    {
      "hash": "212132842184",
      "rule_id": "LATENCY_THROTTLE_TRIGGERED",
      "method": "GET",
      "path": "/",
      "description": "Engine throttled due to latency",
      "severity": "medium",
      "evidence": "ThrottleController switched to throttle state",
      "cvss": 4,
      "count": 1,
      "worst_case": "medium"
    }
  ],
  "suppressions": []
}