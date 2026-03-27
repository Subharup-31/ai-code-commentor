async def post_pr_review_comments(
    pr_url: str,
    vulnerabilities: list[dict],
    github_token: str | None = None,
) -> str:
    """
    Post inline review comments on a GitHub PR diff — one comment per finding,
    anchored to the exact file + line number. Mirrors how CodeRabbit posts reviews.

    Returns the URL of the created review.
    """
    owner, repo, pr_number = _parse_pr_url(pr_url)
    headers = await _get_github_headers(owner, repo, github_token=github_token)

    # Fetch the latest commit SHA on the PR head (required for review comments)
    async with httpx.AsyncClient(timeout=30.0) as client:
        pr_info_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}"
        pr_resp = await client.get(pr_info_url, headers=headers)
        if pr_resp.status_code != 200:
            raise Exception(f"Failed to fetch PR info ({pr_resp.status_code})")
        pr_data = pr_resp.json()
        commit_id = pr_data["head"]["sha"]

        # Build review comments — one per finding, anchored to file:line
        comments = []
        for vuln in vulnerabilities:
            file_path = vuln.get("file", "")
            line = vuln.get("line", 1)
            severity = vuln.get("severity", "Medium")
            issue = vuln.get("issue", "Security finding")
            cvss = vuln.get("cvss_score", 0.0)
            explanation = vuln.get("explanation", "")
            secure_fix = vuln.get("secure_fix", {})
            cve = vuln.get("cve", {})

            sev_emoji = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "🔵"}.get(severity, "⚠️")

            body = (
                f"{sev_emoji} **[VulnGuard AI] {severity}: {issue}**\n\n"
                f"**CVSS Score:** `{cvss:.1f}`\n\n"
            )
            if cve.get("cve_id") and cve["cve_id"] != "N/A":
                body += f"**CVE:** [{cve['cve_id']}](https://nvd.nist.gov/vuln/detail/{cve['cve_id']})\n\n"
            if explanation:
                body += f"**Explanation:** {explanation}\n\n"
            if secure_fix.get("description"):
                body += f"**Recommended Fix:** {secure_fix['description']}\n\n"
            if secure_fix.get("code"):
                body += f"```suggestion\n{secure_fix['code']}\n```\n"

            if file_path and line:
                comments.append({
                    "path": file_path,
                    "line": line,
                    "side": "RIGHT",
                    "body": body,
                })

        if not comments:
            return f"https://github.com/{owner}/{repo}/pull/{pr_number}"

        # Create a single PR review with all inline comments
        review_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
        review_payload = {
            "commit_id": commit_id,
            "body": (
                f"## 🛡️ VulnGuard AI Security Review\n\n"
                f"Found **{len(comments)}** security finding(s) in this PR.\n"
                f"Review each inline comment for details and suggested fixes.\n\n"
                f"*Powered by [VulnGuard AI](https://github.com/vulnguard)*"
            ),
            "event": "COMMENT",  # Don't block merge — just comment
            "comments": comments,
        }
        review_resp = await client.post(review_url, headers=headers, json=review_payload)
        if review_resp.status_code not in (200, 201):
            raise Exception(f"Failed to post PR review ({review_resp.status_code}): {review_resp.text[:300]}")

        review_data = review_resp.json()
        return review_data.get("html_url", f"https://github.com/{owner}/{repo}/pull/{pr_number}")
