import type { Finding } from '../types/finding.js';

export const COMPLIANCE_FRAMEWORKS = ['nist_csf', 'soc2', 'iso27001', 'pci_dss', 'hipaa'] as const;
export type ComplianceFramework = (typeof COMPLIANCE_FRAMEWORKS)[number];

type FrameworkMap = Record<ComplianceFramework, string>;

/**
 * Informational mapping of rule_id to compliance controls. This is NOT a
 * certified audit; every report must carry the mandatory disclaimer.
 */
export const COMPLIANCE_MAP: Record<string, FrameworkMap> = {
  BOLA_ACCESS_CROSS_USER: { nist_csf: 'PR.AC-4', soc2: 'CC6.3', iso27001: 'A.9.4.1', pci_dss: '7.2', hipaa: '164.312(a)(1)' },
  BFLA_ADMIN_ACCESS: { nist_csf: 'PR.AC-4', soc2: 'CC6.3', iso27001: 'A.9.4.1', pci_dss: '7.2', hipaa: '164.312(a)(1)' },
  BROKEN_AUTH: { nist_csf: 'PR.AC-1', soc2: 'CC6.1', iso27001: 'A.9.4.2', pci_dss: '8.1', hipaa: '164.312(a)(1)' },
  JWT_ALG_NONE_ACCEPTED: { nist_csf: 'PR.AC-1', soc2: 'CC6.1', iso27001: 'A.9.4.2', pci_dss: '8.1', hipaa: '164.312(a)(1)' },
  JWT_WEAK_SECRET: { nist_csf: 'PR.AC-1', soc2: 'CC6.1', iso27001: 'A.9.4.2', pci_dss: '8.1', hipaa: '164.312(a)(1)' },
  MASS_ASSIGNMENT: { nist_csf: 'PR.AC-4', soc2: 'CC6.3', iso27001: 'A.9.4.1', pci_dss: '7.2', hipaa: '164.312(a)(1)' },
  NO_RATE_LIMIT: { nist_csf: 'PR.PT-3', soc2: 'CC7.2', iso27001: 'A.12.6.2', pci_dss: '6.6', hipaa: '164.312(a)(1)' },
  SSRF_INTERNAL_PROBE_REFLECTED: { nist_csf: 'PR.AC-3', soc2: 'CC6.6', iso27001: 'A.13.1.3', pci_dss: '6.5', hipaa: '164.312(a)(1)' },
  MISSING_HSTS: { nist_csf: 'PR.DS-2', soc2: 'CC6.7', iso27001: 'A.10.1.2', pci_dss: '4.1', hipaa: '164.312(e)(1)' },
  CORS_WILD_CARD: { nist_csf: 'PR.AC-3', soc2: 'CC6.6', iso27001: 'A.13.1.3', pci_dss: '6.5', hipaa: '164.312(a)(1)' },
  API_KEY_EXPOSED: { nist_csf: 'PR.DS-5', soc2: 'CC6.1', iso27001: 'A.9.4.2', pci_dss: '3.2', hipaa: '164.312(a)(1)' },
  PASSWORD_EXPOSED: { nist_csf: 'PR.DS-5', soc2: 'CC6.1', iso27001: 'A.9.4.2', pci_dss: '3.2', hipaa: '164.312(a)(1)' },
  PRIVATE_KEY_EXPOSED: { nist_csf: 'PR.DS-5', soc2: 'CC6.1', iso27001: 'A.10.1.2', pci_dss: '3.2', hipaa: '164.312(a)(1)' }
};

/**
 * Attach compliance mappings to a finding for the requested frameworks.
 */
export function withComplianceCategories<T extends Finding>(
  finding: T,
  frameworks: ComplianceFramework[]
): T {
  const compliance: Record<string, string> = {};
  const map = COMPLIANCE_MAP[finding.rule_id];

  if (map) {
    for (const framework of frameworks) {
      if (map[framework]) compliance[framework] = map[framework];
    }
  }

  if (Object.keys(compliance).length === 0) return finding;
  return { ...finding, compliance };
}

export function mapComplianceCategories<T extends Finding>(
  findings: T[],
  frameworks: ComplianceFramework[]
): T[] {
  return findings.map((f) => withComplianceCategories(f, frameworks));
}

export const COMPLIANCE_DISCLAIMER =
  'Compliance mapping is informational and does not replace a certified compliance audit.';
