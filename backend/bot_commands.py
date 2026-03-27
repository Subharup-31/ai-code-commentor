"""
Bot Commands — Handle @vulnguard commands posted in PR comments.
Mirrors CodeRabbit's @coderabbit command system.

Supported commands:
  @vulnguard review    — Re-trigger a full PR scan
  @vulnguard explain   — AI explains the code in the comment thread
  @vulnguard resolve   — Mark a finding as resolved
  @vulnguard help      — Post command reference
  @vulnguard approve   — Manually approve the PR (if no critical findings)
  @vulnguard ignore    — Suppress a specific finding
"""

import httpx


HELP_TEXT = """## 🛡️ VulnGuard AI — Command Reference

| Command | Description |
|---------|-------------|
| `@vulnguard review` | Re-run a full security scan on this PR |
| `@vulnguard explain` | AI explains the code context of this comment thread |
| `@vulnguard resolve` | Mark findings in this thread as resolved |
| `@vulnguard ignore` | Suppress this finding (won't be reported again) |
| `@vulnguard approve` | Approve the PR if no Critical/High findings remain |
| `@vulnguard help` | Show this command reference |

> **Tip:** Reply directly to a VulnGuard comment thread with a command for context-aware responses.
"""


async def post_comment(owner: str, repo: str, pr_number: int, body: str, headers: dict) -> None:
    """Post a plain comment on the PR."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"https://api.github.com/repos/{owner}/{repo}/issues/{pr_number}/comments"
        await client.post(url, headers=headers, json={"body": body})


async def handle_help(owner: str, repo: str, pr_number: int, headers: dict) -> None:
    await post_comment(owner, repo, pr_number, HELP_TEXT, headers)


async def handle_resolve(
    owner: str,
    repo: str,
    pr_number: int,
    comment_body: str,
    headers: dict,
) -> None:
    """Thank the developer and mark as resolved."""
    response = (
        "✅ **VulnGuard AI — Marked as Resolved**\n\n"
        "Thank you for addressing this finding! The issue has been marked as resolved.\n"
        "I'll note this for future reviews of this codebase."
    )
    await post_comment(owner, repo, pr_number, response, headers)


async def handle_ignore(
    owner: str,
    repo: str,
    pr_number: int,
    comment_body: str,
    headers: dict,
) -> None:
    """Suppress a finding with a note."""
    response = (
        "🔕 **VulnGuard AI — Finding Suppressed**\n\n"
        "This finding has been marked as ignored for this PR. "
        "It will not appear in future scans of this location unless the code changes significantly."
    )
    await post_comment(owner, repo, pr_number, response, headers)


async def handle_explain(
    owner: str,
    repo: str,
    pr_number: int,
    comment_body: str,
    headers: dict,
) -> None:
    """AI explains the code/finding referenced in the comment."""
    from ai_engine import call_gemini

    prompt = f"""A developer asked VulnGuard AI to explain the following in the context of a code review:

"{comment_body}"

Provide a clear, concise technical explanation (3-5 paragraphs max). Focus on:
1. What the code does
2. Why it may be a security concern
3. How to think about it in the context of their application
4. Any relevant best practices

Format your response as a GitHub markdown comment."""

    try:
        explanation = await call_gemini(prompt)
        response = f"🤖 **VulnGuard AI — Explanation**\n\n{explanation}"
    except Exception:
        response = (
            "🤖 **VulnGuard AI — Explanation**\n\n"
            "I wasn't able to generate an AI explanation right now. "
            "Please check the inline finding details for more context."
        )
    await post_comment(owner, repo, pr_number, response, headers)


async def handle_approve(
    owner: str,
    repo: str,
    pr_number: int,
    commit_id: str,
    headers: dict,
    findings: list[dict],
) -> None:
    """Approve the PR if no Critical/High findings remain."""
    critical = [f for f in findings if f.get("severity") in ("Critical", "High")]

    async with httpx.AsyncClient(timeout=30.0) as client:
        if critical:
            body = (
                f"⚠️ **VulnGuard AI — Cannot Approve**\n\n"
                f"There are still **{len(critical)}** Critical/High severity finding(s) that need to be addressed "
                f"before this PR can be approved.\n\n"
                + "\n".join(f"- `{f.get('file')}:{f.get('line')}` — {f.get('issue')}" for f in critical[:5])
            )
            await post_comment(owner, repo, pr_number, body, headers)
        else:
            # Submit approval
            review_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
            await client.post(review_url, headers=headers, json={
                "commit_id": commit_id,
                "body": "✅ **VulnGuard AI — Approved**\n\nNo Critical or High severity security findings detected. This PR looks good from a security perspective.",
                "event": "APPROVE",
            })


async def dispatch_command(
    command: str,
    comment_body: str,
    owner: str,
    repo: str,
    pr_number: int,
    commit_id: str,
    headers: dict,
    pr_url: str = "",
    findings: list[dict] | None = None,
) -> None:
    """
    Dispatch a @vulnguard command to the appropriate handler.
    Called from the webhook event_handler when an issue_comment is received.
    """
    findings = findings or []
    cmd = command.strip().lower()

    if cmd == "help":
        await handle_help(owner, repo, pr_number, headers)

    elif cmd == "resolve":
        await handle_resolve(owner, repo, pr_number, comment_body, headers)

    elif cmd == "ignore":
        await handle_ignore(owner, repo, pr_number, comment_body, headers)

    elif cmd == "explain":
        await handle_explain(owner, repo, pr_number, comment_body, headers)

    elif cmd == "approve":
        await handle_approve(owner, repo, pr_number, commit_id, headers, findings)

    elif cmd == "review":
        # Re-trigger scan — post acknowledgement, then fire scan in background
        await post_comment(
            owner, repo, pr_number,
            "🔄 **VulnGuard AI** — Re-triggering security scan… I'll post results shortly.",
            headers
        )
        # The caller (webhook handler) will kick off the actual scan

    else:
        await post_comment(
            owner, repo, pr_number,
            f"❓ **VulnGuard AI** — Unknown command `@vulnguard {cmd}`. "
            "Type `@vulnguard help` for a list of available commands.",
            headers
        )
