"""
CVE Mapper — Map vulnerability types to known CVE entries using the NVD API.
"""

import os
import httpx  # type: ignore

NVD_API_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0"
NVD_API_KEY = os.getenv("NVD_API_KEY", "")

# Module-level cache: keyed by (issue_type | cwe_ids).
# Avoids duplicate NVD API calls across findings with the same issue type.
_cve_cache: dict[str, dict] = {}

# Fallback mappings for common vulnerability types when NVD API is unavailable.
# CVE IDs are omitted here — we do NOT assign a specific product CVE to a generic
# vulnerability class, as that would be misleading in the report.  Instead we
# reference the authoritative CWE entry and a representative CVSS base score
# derived from the CVSS v3.1 specification for that weakness class.
FALLBACK_CVE_MAP = {
    "sql injection": {
        "cve_id": "N/A",
        "description": "CWE-89: SQL Injection — unsanitised input is incorporated into a SQL query, allowing an attacker to read, modify or delete database records and, in some configurations, execute OS commands.",
        "cvss_score": 9.8,   # CVSS v3.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
        "cwe": "CWE-89",
    },
    "xss": {
        "cve_id": "N/A",
        "description": "CWE-79: Cross-Site Scripting (XSS) — attacker-controlled data is rendered as HTML/JavaScript in a victim's browser, enabling session hijacking, phishing or defacement.",
        "cvss_score": 6.1,   # CVSS v3.1 AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N
        "cwe": "CWE-79",
    },
    "cross-site scripting": {
        "cve_id": "N/A",
        "description": "CWE-79: Cross-Site Scripting (XSS) — attacker-controlled data is rendered as HTML/JavaScript in a victim's browser, enabling session hijacking, phishing or defacement.",
        "cvss_score": 6.1,
        "cwe": "CWE-79",
    },
    "hardcoded secret": {
        "cve_id": "N/A",
        "description": "CWE-798: Use of Hard-coded Credentials — a secret (password, API key, token) is embedded in source code, making it trivially extractable from the repository or binary.",
        "cvss_score": 7.5,   # CVSS v3.1 AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
        "cwe": "CWE-798",
    },
    "hardcoded password": {
        "cve_id": "N/A",
        "description": "CWE-259: Use of Hard-coded Password — a password is embedded directly in the code, enabling anyone with source or binary access to authenticate as that principal.",
        "cvss_score": 7.5,
        "cwe": "CWE-259",
    },
    "insecure deserialization": {
        "cve_id": "N/A",
        "description": "CWE-502: Deserialization of Untrusted Data — deserialising attacker-controlled bytes can trigger arbitrary code execution, denial of service or privilege escalation.",
        "cvss_score": 9.8,
        "cwe": "CWE-502",
    },
    "command injection": {
        "cve_id": "N/A",
        "description": "CWE-78: OS Command Injection — user-supplied input is passed to a shell without sanitisation, allowing an attacker to execute arbitrary operating-system commands.",
        "cvss_score": 9.8,
        "cwe": "CWE-78",
    },
    "path traversal": {
        "cve_id": "N/A",
        "description": "CWE-22: Path Traversal — insufficient validation of file paths allows an attacker to read or write files outside the intended directory.",
        "cvss_score": 7.5,
        "cwe": "CWE-22",
    },
    "insecure authentication": {
        "cve_id": "N/A",
        "description": "CWE-287: Improper Authentication — the application does not correctly verify the identity of a user or system, enabling bypass of authentication controls.",
        "cvss_score": 8.1,
        "cwe": "CWE-287",
    },
    "unsafe file handling": {
        "cve_id": "N/A",
        "description": "CWE-73: External Control of File Name or Path — an attacker can influence file operations to read, overwrite or delete unintended files.",
        "cvss_score": 7.5,
        "cwe": "CWE-73",
    },
    "open redirect": {
        "cve_id": "N/A",
        "description": "CWE-601: URL Redirection to Untrusted Site ('Open Redirect') — the application redirects users to an attacker-controlled URL, facilitating phishing attacks.",
        "cvss_score": 6.1,
        "cwe": "CWE-601",
    },
    "ssrf": {
        "cve_id": "N/A",
        "description": "CWE-918: Server-Side Request Forgery (SSRF) — the server fetches a URL supplied by the user, allowing access to internal services or cloud metadata APIs.",
        "cvss_score": 8.6,
        "cwe": "CWE-918",
    },
    "insecure random": {
        "cve_id": "N/A",
        "description": "CWE-338: Use of Cryptographically Weak Pseudo-Random Number Generator — predictable random values undermine security tokens, session IDs or cryptographic material.",
        "cvss_score": 5.9,
        "cwe": "CWE-338",
    },
    "weak cryptography": {
        "cve_id": "N/A",
        "description": "CWE-327: Use of a Broken or Risky Cryptographic Algorithm — deprecated algorithms (MD5, SHA-1, DES) provide inadequate protection against modern attacks.",
        "cvss_score": 7.5,
        "cwe": "CWE-327",
    },
    "xxe": {
        "cve_id": "N/A",
        "description": "CWE-611: XML External Entity (XXE) Injection — an XML parser processes external entity references, enabling file disclosure or SSRF.",
        "cvss_score": 8.1,
        "cwe": "CWE-611",
    },
}


def _parse_nvd_response(data: dict) -> dict | None:
    """Extract a structured result from a raw NVD API response dict."""
    vulns = data.get("vulnerabilities", [])
    if not vulns:
        return None

    nvd_context_parts = []
    primary_cve = None
    primary_desc = "No description available"
    primary_cvss = 0.0

    for i, vuln_item in enumerate(vulns[:5]):
        cve_item = vuln_item.get("cve", {})
        cve_id = str(cve_item.get("id", "N/A"))

        descriptions = cve_item.get("descriptions", [])
        desc = str(next(
            (d["value"] for d in descriptions if d.get("lang") == "en" and isinstance(d.get("value"), str)),
            "No description available",
        ))

        metrics = cve_item.get("metrics", {})
        cvss_score = 0.0
        for version in ["cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]:
            # type: ignore
            metric_list = metrics.get(version, [])
            if metric_list and isinstance(metric_list, list) and len(metric_list) > 0:
                cvss_data = metric_list[0].get("cvssData", {})
                if isinstance(cvss_data, dict):
                    cvss_score = float(cvss_data.get("baseScore", 0.0))
                break

        nvd_context_parts.append(f"- {cve_id} (CVSS: {cvss_score}): {desc}")

        if i == 0:
            primary_cve = cve_id
            primary_desc = desc
            primary_cvss = cvss_score

    if not primary_cve:
        return None

    return {
        "cve_id": str(primary_cve),
        "description": str(primary_desc)[:200],
        "cvss_score": float(primary_cvss),
        "nvd_context": "\n".join(nvd_context_parts),
    }


async def _query_nvd(params: dict, headers: dict) -> dict | None:
    """Fire a single NVD API request and return a parsed result or None."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(NVD_API_BASE, params=params, headers=headers)
            if response.status_code == 200:
                return _parse_nvd_response(response.json())
    except Exception as e:
        print(f"[!] NVD API error: {e}")
    return None


async def map_to_cve(vulnerability_type: str, cwe_ids: list[str] | None = None) -> dict:
    """
    Map a vulnerability finding to CVE / CWE context.

    Strategy (in order):
    1. Module-level cache — skip NVD entirely for duplicate issue types.
    2. Query NVD by CWE ID(s) from scanner metadata — most precise signal.
    3. Fall back to keyword text search — broad but can return unrelated CVEs.
    4. Fall back to local FALLBACK_CVE_MAP — CWE-based, always accurate.
    5. Return a minimal N/A entry if nothing matches.
    """
    cache_key = vulnerability_type + "|" + ",".join(sorted(cwe_ids or []))
    if cache_key in _cve_cache:
        return _cve_cache[cache_key]

    headers = {"apiKey": NVD_API_KEY} if NVD_API_KEY else {}
    vuln_lower = vulnerability_type.lower()

    # ── 1. CWE-based NVD lookup (most accurate) ────────────────────────────────
    # Semgrep annotates every finding with CWE IDs.  Querying NVD by CWE returns
    # CVEs that are genuinely about that weakness class, not random product CVEs.
    if cwe_ids:
        for cwe_id in cwe_ids:
            # Normalise: accept "CWE-89" or "89"
            cwe_num = cwe_id.upper().replace("CWE-", "").strip()
            if not cwe_num.isdigit():
                continue
            result = await _query_nvd(
                {"cweId": f"CWE-{cwe_num}", "resultsPerPage": 5},
                headers,
            )
            if result:
                print(f"[cve_mapper] CWE-{cwe_num} → {result['cve_id']} (CVSS {result['cvss_score']})")
                _cve_cache[cache_key] = result
                return result

    # ── 2. Keyword fallback (less precise) ────────────────────────────────────
    result = await _query_nvd(
        {"keywordSearch": vulnerability_type, "resultsPerPage": 5},
        headers,
    )
    if result:
        print(f"[cve_mapper] keyword '{vulnerability_type}' → {result['cve_id']}")
        _cve_cache[cache_key] = result
        return result

    # ── 3. Local CWE-based map (always accurate, no network) ──────────────────
    for key, value in FALLBACK_CVE_MAP.items():
        if key in vuln_lower:
            hit = {
                **value,
                "nvd_context": f"- {value['cve_id']} (CVSS: {value['cvss_score']}): {value['description']}",
            }
            _cve_cache[cache_key] = hit
            return hit

    # ── 4. Unknown / custom business-logic flaw ────────────────────────────────
    miss = {
        "cve_id": "N/A",
        "description": f"No specific CVE mapped for: {vulnerability_type}. This may be a general security misconfiguration or custom logic flaw.",
        "cvss_score": 5.0, # Default to Medium if completely unknown
        "nvd_context": (
            f"- N/A: No exact CVE data found for '{vulnerability_type}' in the NVD database. "
            "This finding relies on static analysis scanner heuristics."
        ),
    }
    _cve_cache[cache_key] = miss
    return miss
