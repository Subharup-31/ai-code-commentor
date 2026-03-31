// ── Types ────────────────────────────────────────────────────────────────────

export interface AttackSimulation {
  payload: string;
  description: string;
}

export interface SecureFix {
  description: string;
  code: string;
}

export interface CVEInfo {
  cve_id: string;
  description: string;
}

export interface Vulnerability {
  id: string;
  file: string;
  line: number;
  issue: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  cvss_score: number;
  tool: string;
  code_snippet: string;
  cwe: string[];
  cve: CVEInfo;
  explanation: string;
  attack_simulation: AttackSimulation;
  secure_fix: SecureFix;
}

export interface ScanResult {
  repo_url: string;
  total_vulnerabilities: number;
  severity_counts: Record<string, number>;
  vulnerabilities: Vulnerability[];
}

// ── API ──────────────────────────────────────────────────────────────────────

function _getNangoConnectionId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage.getItem("nango_connection_id") ?? undefined;
}

export async function scanRepo(repoUrl: string): Promise<ScanResult> {
  // Route through Next.js proxy — it fetches the GitHub token from Nango
  // server-side so it is never exposed to the browser.
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      repo_url: repoUrl,
      connection_id: _getNangoConnectionId(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Scan failed" }));
    throw new Error(error.detail || error.error || "Failed to scan repository");
  }

  return response.json();
}

export async function scanPR(prUrl: string): Promise<ScanResult> {
  const response = await fetch("/api/scan-pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pr_url: prUrl,
      connection_id: _getNangoConnectionId(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Scan failed" }));
    throw new Error(error.detail || error.error || "Failed to scan PR");
  }

  return response.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch("/api/scan", { method: "HEAD" }).catch(() => null);
    return response?.ok ?? false;
  } catch {
    return false;
  }
}
