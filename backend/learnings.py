"""
Learnings — Persist developer feedback to improve future reviews.
Mirrors CodeRabbit's learning system that adapts to team preferences.

Stores:
- False positive dismissals (finding ID + repo → suppress in future)
- Resolved findings (cached so they're not re-reported)
- Custom patterns teams want flagged

Backed by a simple JSON file (can be swapped for a DB later).
"""

import json
import os
import time
from pathlib import Path


LEARNINGS_FILE = os.path.join(
    os.path.expanduser("~"), ".vulnguard", "learnings.json"
)


def _load() -> dict:
    try:
        if os.path.exists(LEARNINGS_FILE):
            with open(LEARNINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "false_positives": {},   # repo -> [finding_id, ...]
        "resolved": {},          # repo -> [finding_id, ...]
        "reviewed_commits": {},  # repo -> [sha, ...]
        "custom_rules": {},      # repo -> [instruction, ...]
        "stats": {},             # repo -> { scans, findings_found, findings_resolved }
    }


def _save(data: dict) -> None:
    Path(LEARNINGS_FILE).parent.mkdir(parents=True, exist_ok=True)
    with open(LEARNINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def mark_false_positive(repo_url: str, finding_id: str) -> None:
    """Record a developer-dismissed finding as a false positive."""
    data = _load()
    fps = data.setdefault("false_positives", {})
    repo_fps = fps.setdefault(repo_url, [])
    if finding_id not in repo_fps:
        repo_fps.append(finding_id)
    _save(data)


def mark_resolved(repo_url: str, finding_id: str) -> None:
    """Record a developer-resolved finding."""
    data = _load()
    resolved = data.setdefault("resolved", {})
    repo_resolved = resolved.setdefault(repo_url, [])
    if finding_id not in repo_resolved:
        repo_resolved.append(finding_id)

    # Update stats
    stats = data.setdefault("stats", {}).setdefault(repo_url, {})
    stats["findings_resolved"] = stats.get("findings_resolved", 0) + 1
    _save(data)


def was_commit_reviewed(repo_url: str, commit_sha: str) -> bool:
    """Return True if this exact commit was already reviewed (incremental reviews)."""
    data = _load()
    return commit_sha in data.get("reviewed_commits", {}).get(repo_url, [])


def mark_commit_reviewed(repo_url: str, commit_sha: str) -> None:
    """Mark a commit SHA as reviewed so we skip it on the next push."""
    data = _load()
    commits = data.setdefault("reviewed_commits", {}).setdefault(repo_url, [])
    if commit_sha not in commits:
        commits.append(commit_sha)
        # Keep only last 50 SHAs per repo
        data["reviewed_commits"][repo_url] = commits[-50:]
    _save(data)


def add_custom_rule(repo_url: str, instruction: str) -> None:
    """Add a per-repo custom review instruction (from @vulnguard commands)."""
    data = _load()
    rules = data.setdefault("custom_rules", {}).setdefault(repo_url, [])
    if instruction not in rules:
        rules.append(instruction)
    _save(data)


def get_custom_rules(repo_url: str) -> list[str]:
    """Get per-repo custom review instructions to inject into AI prompts."""
    return _load().get("custom_rules", {}).get(repo_url, [])


def record_scan(repo_url: str, findings_count: int) -> None:
    """Update aggregate scan stats for a repo."""
    data = _load()
    stats = data.setdefault("stats", {}).setdefault(repo_url, {})
    stats["scans"] = stats.get("scans", 0) + 1
    stats["findings_found"] = stats.get("findings_found", 0) + findings_count
    stats["last_scan"] = int(time.time())
    _save(data)


def get_stats(repo_url: str | None = None) -> dict:
    """
    Return scan stats — per-repo if repo_url provided, global aggregate otherwise.
    Used by the /reports endpoint.
    """
    data = _load()
    stats = data.get("stats", {})
    if repo_url:
        return stats.get(repo_url, {})

    # Aggregate across all repos
    total_scans = sum(s.get("scans", 0) for s in stats.values())
    total_findings = sum(s.get("findings_found", 0) for s in stats.values())
    total_resolved = sum(s.get("findings_resolved", 0) for s in stats.values())
    return {
        "total_scans": total_scans,
        "total_findings": total_findings,
        "total_resolved": total_resolved,
        "repos": list(stats.keys()),
        "per_repo": stats,
    }


def filter_suppressed(repo_url: str, findings: list[dict]) -> list[dict]:
    """Remove findings that were previously dismissed as false positives."""
    data = _load()
    fps = set(data.get("false_positives", {}).get(repo_url, []))
    if not fps:
        return findings
    return [f for f in findings if f.get("id", "") not in fps]
