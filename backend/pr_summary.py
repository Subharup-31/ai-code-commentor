"""
PR Summary — Generate and post a top-level PR summary comment.
Mirrors CodeRabbit's most visible feature: the walkthrough comment.
"""

import os
import httpx
from ai_engine import call_gemini


async def generate_pr_summary(
    pr_url: str,
    changed_files: list[dict],
    findings: list[dict],
    repo_instructions: str = "",
) -> str:
    """
    Use AI to generate a rich PR summary in markdown:
    - High-level summary of what the PR does
    - File-by-file walkthrough table
    - Security findings summary table
    - Estimated review time
    - Release notes draft
    """
    # Build context for the AI
    file_list = "\n".join(
        f"- {f.get('filename', '')} ({f.get('status', 'modified')}, "
        f"+{f.get('additions', 0)}/-{f.get('deletions', 0)} lines)"
        for f in changed_files[:30]  # cap at 30 files
    )

    findings_context = ""
    if findings:
        findings_context = "\n".join(
            f"- [{v.get('severity','?')}] {v.get('issue','')} in {v.get('file','')}:{v.get('line',0)}"
            for v in findings[:20]
        )

    prompt = f"""You are VulnGuard AI, an expert code reviewer. Analyze this pull request and produce a comprehensive review summary.

Pull Request: {pr_url}

Changed Files:
{file_list}

Security Findings Detected:
{findings_context if findings_context else "None detected — clean PR! ✅"}

{f"Repository Instructions: {repo_instructions}" if repo_instructions else ""}

Generate a markdown PR review summary with these exact sections:

## 📋 PR Summary
[2-3 sentence high-level description of what this PR does]

## 📁 File Walkthrough
| File | Change Type | Summary |
|------|-------------|---------|
[one row per changed file, brief description of what changed]

## 🛡️ Security Overview
| Severity | Count | Top Issues |
|----------|-------|-----------|
[summary table of findings by severity]

## ⏱️ Estimated Review Time
[X minutes — based on lines changed and complexity]

## 📝 Release Notes
[one paragraph suitable for a changelog/release notes entry]

Be concise, technical, and actionable. Use emojis sparingly."""

    try:
        summary = await call_gemini(prompt)
        return summary
    except Exception as e:
        # Fallback: generate without AI
        sev_counts = {}
        for f in findings:
            s = f.get("severity", "Unknown")
            sev_counts[s] = sev_counts.get(s, 0) + 1

        table_rows = "\n".join(
            f"| {f.get('filename', '')} | {f.get('status', 'modified')} | {f.get('additions', 0)} additions, {f.get('deletions', 0)} deletions |"
            for f in changed_files[:20]
        )

        return f"""## 📋 PR Summary
This PR modifies {len(changed_files)} file(s) with {sum(f.get('additions',0) for f in changed_files)} additions and {sum(f.get('deletions',0) for f in changed_files)} deletions.

## 📁 File Walkthrough
| File | Status | Changes |
|------|--------|---------|
{table_rows}

## 🛡️ Security Overview
{chr(10).join(f"- **{k}**: {v} finding(s)" for k, v in sev_counts.items()) if sev_counts else "✅ No security findings detected."}

## ⏱️ Estimated Review Time
~{max(1, len(changed_files) * 2)} minutes

## 📝 Release Notes
Updated {len(changed_files)} file(s). See inline comments for details.
"""


async def post_pr_summary_comment(
    pr_url: str,
    summary_md: str,
    findings: list[dict],
    github_token: str | None = None,
) -> str:
    """
    Post the AI-generated summary as the first (top-level) comment on the PR.
    Returns the URL of the created comment.
    """
    from github_service import _parse_pr_url, _get_github_headers

    owner, repo, pr_number = _parse_pr_url(pr_url)
    headers = await _get_github_headers(owner, repo, github_token=github_token)

    # Build the full comment body
    crit = sum(1 for f in findings if f.get("severity") == "Critical")
    high = sum(1 for f in findings if f.get("severity") == "High")
    total = len(findings)

    status_badge = (
        "🔴 **Action Required**" if crit > 0
        else "🟠 **Review Recommended**" if high > 0
        else "🟢 **Looks Good!**" if total == 0
        else "🟡 **Minor Issues**"
    )

    comment_body = f"""<!-- vulnguard-summary -->
# 🛡️ VulnGuard AI — Code Review {status_badge}

> Automated security review powered by VulnGuard AI · Semgrep · Bandit · Gemini 2.5

{summary_md}

---
<details>
<summary>ℹ️ About VulnGuard AI</summary>

VulnGuard AI is an automated security reviewer that scans your code for:
- **SAST findings** via Semgrep + Bandit (30+ languages)
- **Dependency vulnerabilities** via pip-audit, npm audit, govulncheck
- **AI-powered analysis** with CVE mapping and CVSS scoring

**Commands**: Comment `@vulnguard review` · `@vulnguard explain` · `@vulnguard resolve` · `@vulnguard help`
</details>
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Check if we already posted a summary (avoid duplicates)
        comments_url = f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments"
        existing = await client.get(comments_url, headers=headers)
        if existing.status_code == 200:
            for comment in existing.json():
                if "<!-- vulnguard-summary -->" in comment.get("body", ""):
                    # Update existing comment instead of creating a new one
                    update_url = f"https://api.github.com/repos/{owner}/{repo}/issues/comments/{comment['id']}"
                    await client.patch(update_url, headers=headers, json={"body": comment_body})
                    return comment.get("html_url", pr_url)

        # Post new comment
        resp = await client.post(
            comments_url,
            headers=headers,
            json={"body": comment_body},
        )
        if resp.status_code in (200, 201):
            return resp.json().get("html_url", pr_url)
        raise Exception(f"Failed to post summary comment ({resp.status_code}): {resp.text[:200]}")
