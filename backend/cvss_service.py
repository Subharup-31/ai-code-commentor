"""
CVSS Service — Assign CVSS severity scores and labels.
"""


def get_severity(score: float) -> str:
    """Map a CVSS score to a severity label."""
    if score >= 9.0:
        return "Critical"
    elif score >= 7.0:
        return "High"
    elif score >= 4.0:
        return "Medium"
    else:
        return "Low"


# Heuristic scores for when CVE lookup doesn't return a score
SEVERITY_HEURISTICS = {
    "ERROR": 8.5,
    "HIGH": 7.5,
    "WARNING": 5.0,
    "MEDIUM": 5.0,
    "INFO": 2.0,
    "LOW": 2.0,
}


def assign_cvss(vulnerability: dict, cve_data: dict | None = None) -> dict:
    """
    Assign CVSS score and severity to a vulnerability.
    Uses CVE data if available, otherwise heuristic based on tool severity.
    """
    if cve_data and cve_data.get("cvss_score", 0) > 0:
        score = cve_data["cvss_score"]
    else:
        raw_severity = vulnerability.get("severity", "MEDIUM").upper()
        score = SEVERITY_HEURISTICS.get(raw_severity, 5.0)

    severity = get_severity(score)

    return {
        **vulnerability,
        "cvss_score": round(score, 1),
        "severity": severity,
        "cve": cve_data if cve_data else {"cve_id": "N/A", "description": "No CVE data"},
    }
