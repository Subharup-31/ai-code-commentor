"""
VulnGuard AI — FastAPI Backend
Main application entry point with /scan-repo endpoint.
"""

import asyncio
import hashlib
import hmac
import json
import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, HttpUrl
from dotenv import load_dotenv

from github_service import fetch_repo, fetch_pr_files, cleanup_repo
from scanner import run_semgrep, run_bandit, run_pip_audit, run_npm_audit, run_go_vuln_check, run_bundler_audit
from vulnerability_parser import parse_all, parse_pylint
from cve_mapper import map_to_cve
from cvss_service import assign_cvss
from ai_engine import analyze_vulnerability
from bug_detector import run_pylint, scan_for_bugs
from pr_review import post_pr_review_comments
from pr_summary import generate_pr_summary, post_pr_summary_comment
from bot_commands import dispatch_command
from config_loader import load_config
import learnings as learnings_db

load_dotenv()


# ── Models ───────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    repo_url: str
    github_token: str = ""   # Injected by Next.js proxy from Nango; falls back to env GITHUB_TOKEN


class AttackSimulation(BaseModel):
    payload: str = ""
    description: str = ""


class SecureFix(BaseModel):
    description: str = ""
    code: str = ""


class CVEInfo(BaseModel):
    cve_id: str = "N/A"
    description: str = ""


class VulnerabilityResult(BaseModel):
    id: str = ""
    file: str = ""
    line: int = 0
    issue: str = ""
    severity: str = ""
    cvss_score: float = 0.0
    tool: str = ""
    code_snippet: str = ""
    cwe: list[str] = []
    cve: CVEInfo = CVEInfo()
    confidence_score: int = 50
    exploitability: str = "Medium"
    mitigations_present: str = "None detected"
    corroborated: bool = False        # True when ≥2 tools flagged same location
    finding_type: str = "security"    # "security" | "bug"
    explanation: str = ""
    attack_simulation: AttackSimulation = AttackSimulation()
    secure_fix: SecureFix = SecureFix()


class ScanResponse(BaseModel):
    repo_url: str
    total_vulnerabilities: int        # security + bugs combined
    security_count: int = 0           # security findings only
    bug_count: int = 0                # code bug findings only
    severity_counts: dict[str, int]
    vulnerabilities: list[VulnerabilityResult]


class ApplyFixRequest(BaseModel):
    repo_url: str
    file_path: str
    line: int
    secure_code: str
    github_token: str = ""   # User's Nango OAuth token for creating PRs


class ApplyFixResponse(BaseModel):
    pr_url: str


# ── App ──────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[+] VulnGuard AI backend starting...")
    yield
    print("[+] VulnGuard AI backend shutting down...")


app = FastAPI(
    title="VulnGuard AI",
    description="AI-powered GitHub repository vulnerability scanner",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "VulnGuard AI"}


@app.post("/scan-repo/stream")
async def scan_repo_stream(request: ScanRequest):
    """
    Streaming version of /scan-repo using Server-Sent Events (SSE).
    Yields each confirmed finding immediately as it is processed,
    so the client sees results one-by-one without waiting for the full scan.

    Event types emitted:
      event: status   — progress messages (e.g. "Cloning repo…")
      event: finding  — a single VulnerabilityResult JSON object
      event: summary  — final counts once all findings are emitted
      event: error    — error message if the scan fails
    """

    async def event_stream():
        repo_path = None
        try:
            def sse(event: str, data) -> str:
                payload = json.dumps(data) if not isinstance(data, str) else data
                return f"event: {event}\ndata: {payload}\n\n"

            yield sse("status", {"message": "Cloning repository…", "step": 1})

            repo_path = await fetch_repo(request.repo_url)

            yield sse("status", {"message": "Running SAST scanners…", "step": 2})

            semgrep_raw = run_semgrep(repo_path)
            bandit_raw = run_bandit(repo_path)
            loop = asyncio.get_event_loop()
            pip_audit_raw, npm_audit_raw, pylint_raw = await asyncio.gather(
                loop.run_in_executor(None, run_pip_audit, repo_path),
                loop.run_in_executor(None, run_npm_audit, repo_path),
                loop.run_in_executor(None, run_pylint, repo_path),
            )

            yield sse("status", {"message": "Parsing results…", "step": 3})

            vulnerabilities = parse_all(
                semgrep_raw, bandit_raw, repo_path,
                pip_audit_raw=pip_audit_raw,
                npm_audit_raw=npm_audit_raw,
            )
            pylint_bugs = parse_pylint(pylint_raw, repo_path)
            all_vulns = vulnerabilities + pylint_bugs

            yield sse("status", {
                "message": f"AI-analyzing {len(all_vulns)} findings…",
                "step": 4,
                "total": len(all_vulns),
            })

            # ── Process each finding individually and stream it immediately ──
            CONFIDENCE_THRESHOLD = 35
            confirmed_count = 0
            bug_count = 0
            severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}

            semaphore = asyncio.Semaphore(10)

            dep_vulns  = [v for v in all_vulns if v.get("source") == "dependency"]
            sast_vulns = [v for v in all_vulns if v.get("source") != "dependency"]

            # Dependency findings are deterministic — stream them right away
            for v in dep_vulns:
                v.setdefault("finding_type", "security")
                result_obj = VulnerabilityResult(**v)
                if result_obj.severity in severity_counts:
                    severity_counts[result_obj.severity] += 1
                confirmed_count += 1
                yield sse("finding", result_obj.model_dump())

            # SAST findings: pair each vuln with its index so we can stream
            # each confirmed finding the moment its AI call completes.
            async def _analyze_indexed(idx: int, v: dict):
                async with semaphore:
                    result = await analyze_vulnerability(v)
                    return idx, result

            for coro in asyncio.as_completed([_analyze_indexed(i, v) for i, v in enumerate(sast_vulns)]):
                try:
                    i, ai_data = await coro
                    vuln = sast_vulns[i]
                    confidence = int(ai_data.get("confidence_score", 50))
                    if ai_data.get("is_false_positive") or confidence < CONFIDENCE_THRESHOLD:
                        continue
                    vuln["confidence_score"]      = confidence
                    vuln["exploitability"]         = ai_data.get("exploitability", "Medium")
                    vuln["mitigations_present"]    = ai_data.get("mitigations_present", "None detected")
                    vuln["explanation"]            = ai_data.get("explanation", "")
                    vuln["attack_simulation"]      = ai_data.get("attack_simulation", {})
                    vuln["secure_fix"]             = ai_data.get("secure_fix", {})
                    result_obj = VulnerabilityResult(**vuln)
                    if result_obj.severity in severity_counts:
                        severity_counts[result_obj.severity] += 1
                    if result_obj.finding_type == "bug":
                        bug_count += 1
                    confirmed_count += 1
                    # ✅ Yield immediately — client sees this finding right away
                    yield sse("finding", result_obj.model_dump())
                except Exception as exc:
                    print(f"[stream] AI task error: {exc}")

            # AI bug sweep
            yield sse("status", {"message": "Running AI bug sweep…", "step": 5})
            sast_files = {v.get("file", "") for v in sast_vulns}
            ai_bugs = await scan_for_bugs(repo_path, sast_files)
            for bug in ai_bugs:
                bug.setdefault("finding_type", "bug")
                result_obj = VulnerabilityResult(**bug)
                if result_obj.severity in severity_counts:
                    severity_counts[result_obj.severity] += 1
                bug_count += 1
                confirmed_count += 1
                yield sse("finding", result_obj.model_dump())

            yield sse("summary", {
                "repo_url": request.repo_url,
                "total_vulnerabilities": confirmed_count,
                "security_count": confirmed_count - bug_count,
                "bug_count": bug_count,
                "severity_counts": severity_counts,
            })

        except Exception as e:
            yield sse("error", {"message": str(e)})
        finally:
            if repo_path:
                cleanup_repo(repo_path)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering
            "Connection": "keep-alive",
        },
    )


@app.post("/scan-repo", response_model=ScanResponse)
async def scan_repo(request: ScanRequest):
    """
    Full pipeline:
    1. Clone repo
    2. Run Semgrep + Bandit
    3. Parse results
    4. CVE mapping
    5. CVSS scoring
    6. AI analysis
    7. Return enriched results
    """
    repo_path = None

    try:
        # Step 1: Fetch via GitHub API
        print(f"[1/6] Fetching repository via GitHub API: {request.repo_url}")
        repo_path = await fetch_repo(request.repo_url, github_token=request.github_token or None)

        # Step 2: Scan — all 5 scanners in parallel via thread pool
        print("[2/6] Running security + bug scanners (all parallel)...")
        loop = asyncio.get_event_loop()
        semgrep_raw, bandit_raw, pip_audit_raw, npm_audit_raw, pylint_raw = await asyncio.gather(
            loop.run_in_executor(None, run_semgrep, repo_path),
            loop.run_in_executor(None, run_bandit, repo_path),
            loop.run_in_executor(None, run_pip_audit, repo_path),
            loop.run_in_executor(None, run_npm_audit, repo_path),
            loop.run_in_executor(None, run_pylint, repo_path),
        )

        # Step 3: Parse static findings (security + dependencies + Pylint bugs)
        print("[3/6] Parsing scan results...")
        vulnerabilities = parse_all(
            semgrep_raw, bandit_raw, repo_path,
            pip_audit_raw=pip_audit_raw,
            npm_audit_raw=npm_audit_raw,
        )
        # Add Pylint bug findings
        pylint_bugs = parse_pylint(pylint_raw, repo_path)
        vulnerabilities = vulnerabilities + pylint_bugs
        print(f"     Found {len(vulnerabilities)} total findings "
              f"({len(pylint_bugs)} Pylint bugs)")

        # Step 4 & 5: CVE Mapping + CVSS Scoring — all findings in parallel
        # Shared cache avoids calling NVD multiple times for the same issue type.
        print("[4/6] Mapping CVEs and assigning CVSS scores (parallel)...")
        cve_semaphore = asyncio.Semaphore(8)  # Respect NVD rate limit (10 req/s with key)
        cve_cache: dict[str, dict] = {}

        async def _map_and_score(vuln: dict) -> dict:
            key = vuln.get("issue", "") + "|" + ",".join(sorted(vuln.get("cwe", [])))
            async with cve_semaphore:
                if key not in cve_cache:
                    cve_cache[key] = await map_to_cve(
                        vuln.get("issue", ""), cwe_ids=vuln.get("cwe", [])
                    )
            return assign_cvss(vuln, cve_cache[key])

        enriched_vulns = list(await asyncio.gather(
            *[_map_and_score(v) for v in vulnerabilities]
        ))

        # Separate deterministic dependency findings from SAST findings
        dep_vulns = [v for v in enriched_vulns if v.get("source") == "dependency"]
        sast_vulns = [v for v in enriched_vulns if v.get("source") != "dependency"]

        # Step 6: AI Analysis — SAST findings only (dep findings are already 100% accurate)
        print(f"[5/6] Running AI analysis on {len(sast_vulns)} SAST findings "
              f"({len(dep_vulns)} dependency findings bypass AI — deterministic)...")
        semaphore = asyncio.Semaphore(10)

        async def _analyze_with_limit(v: dict) -> dict:
            async with semaphore:
                return await analyze_vulnerability(v)

        ai_tasks = [_analyze_with_limit(v) for v in sast_vulns]
        ai_results = await asyncio.gather(*ai_tasks, return_exceptions=True)

        # Merge AI results — filter false positives and low-confidence noise
        print("[6/6] Assembling final results...")
        CONFIDENCE_THRESHOLD = 35
        final_vulns = []
        fp_count = 0
        low_conf_count = 0

        for i, vuln in enumerate(sast_vulns):
            if i < len(ai_results) and not isinstance(ai_results[i], Exception):
                ai_data = ai_results[i]
                confidence = int(ai_data.get("confidence_score", 50))

                if ai_data.get("is_false_positive"):
                    fp_count += 1
                    print(f"     [FP] {vuln.get('id')} at {vuln.get('file')}:{vuln.get('line')} — filtered by AI")
                    continue
                if confidence < CONFIDENCE_THRESHOLD:
                    low_conf_count += 1
                    print(f"     [LOW-CONF {confidence}] {vuln.get('id')} at {vuln.get('file')}:{vuln.get('line')} — filtered")
                    continue

                vuln["confidence_score"] = confidence
                vuln["exploitability"] = ai_data.get("exploitability", "Medium")
                vuln["mitigations_present"] = ai_data.get("mitigations_present", "None detected")
                vuln["explanation"] = ai_data.get("explanation", "")
                vuln["attack_simulation"] = ai_data.get("attack_simulation", {})
                vuln["secure_fix"] = ai_data.get("secure_fix", {})
                final_vulns.append(VulnerabilityResult(**vuln))
            else:
                vuln.setdefault("confidence_score", 50)
                vuln.setdefault("exploitability", "Medium")
                vuln.setdefault("mitigations_present", "Unknown — AI unavailable")
                final_vulns.append(VulnerabilityResult(**vuln))

        # Dependency findings: add directly — no AI filtering needed
        for v in dep_vulns:
            v.setdefault("finding_type", "security")
            final_vulns.append(VulnerabilityResult(**v))

        print(f"     Filtered: {fp_count} false positives, {low_conf_count} low-confidence findings")
        print(f"     Remaining: {len(final_vulns)} confirmed security findings")

        # ── AI Bug Sweep ────────────────────────────────────────────────────────
        # Run per-file AI bug detection on source files already flagged by SAST
        # (plus any small remaining source files up to the file cap).
        print("[+] Running AI bug detection sweep...")
        sast_files = {v.get("file", "") for v in sast_vulns}
        ai_bugs = await scan_for_bugs(repo_path, sast_files)
        for bug in ai_bugs:
            bug.setdefault("finding_type", "bug")
            final_vulns.append(VulnerabilityResult(**bug))
        print(f"     AI bug sweep: {len(ai_bugs)} bugs detected")

        # ── Final assembly ──────────────────────────────────────────────────────
        # Sort: security findings by CVSS + confidence; bugs by severity + confidence
        def _sort_key(v: VulnerabilityResult) -> tuple:
            sev_order = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
            if v.finding_type == "security":
                return (1, v.cvss_score, v.confidence_score)
            return (0, sev_order.get(v.severity, 0), v.confidence_score)

        final_vulns.sort(key=_sort_key, reverse=True)

        severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        security_count = 0
        bug_count = 0
        for v in final_vulns:
            if v.severity in severity_counts:
                severity_counts[v.severity] += 1
            if v.finding_type == "bug":
                bug_count += 1
            else:
                security_count += 1

        return ScanResponse(
            repo_url=request.repo_url,
            total_vulnerabilities=len(final_vulns),
            security_count=security_count,
            bug_count=bug_count,
            severity_counts=severity_counts,
            vulnerabilities=final_vulns,
        )

    except Exception as e:
        print(f"[!] Scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scan failed: {str(e)}")

    finally:
        if repo_path:
            cleanup_repo(repo_path)


class ScanPRRequest(BaseModel):
    pr_url: str  # e.g. https://github.com/owner/repo/pull/123
    github_token: str = ""   # Injected by Next.js proxy from Nango; falls back to env GITHUB_TOKEN


@app.post("/scan-pr", response_model=ScanResponse)
async def scan_pr(request: ScanPRRequest):
    """
    PR-targeted scan — mirrors how CodeRabbit works.

    Instead of scanning the entire repository, this endpoint:
    1. Fetches only the files changed in the PR (via GitHub API)
    2. Runs full Semgrep + Bandit analysis on those files only
    3. Filters findings to lines touched by the PR diff ± 10 lines
    4. Runs the same two-pass AI validation pipeline

    Benefits vs full-repo scan:
    - Much smaller surface area → faster and more focused
    - Full file content available → AI sees complete function context
    - Findings are directly actionable (developer just wrote that code)
    - False positive rate drops because test files and unrelated legacy
      code are naturally excluded
    """
    repo_path = None
    try:
        print(f"[PR-SCAN] Fetching changed files from: {request.pr_url}")
        repo_path, changed_files = await fetch_pr_files(request.pr_url, github_token=request.github_token or None)

        # Build a set of (file, line_range) touched by the PR diff
        # so we can filter findings to only PR-relevant lines
        pr_touched: dict[str, set[int]] = {}
        for f in changed_files:
            filename = f.get("filename", "")
            patch = f.get("patch", "")
            touched_lines: set[int] = set()
            if patch:
                # Parse unified diff @@ -old +new,count @@ headers
                import re
                for match in re.finditer(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", patch):
                    start = int(match.group(1))
                    count = int(match.group(2)) if match.group(2) else 1
                    for line in range(start, start + count + 10):  # ± 10 line window
                        touched_lines.add(line)
            pr_touched[filename] = touched_lines

        print(f"[PR-SCAN] Running scanners on {len(changed_files)} changed files (parallel)...")
        loop = asyncio.get_event_loop()
        semgrep_raw, bandit_raw = await asyncio.gather(
            loop.run_in_executor(None, run_semgrep, repo_path),
            loop.run_in_executor(None, run_bandit, repo_path),
        )

        vulnerabilities = parse_all(semgrep_raw, bandit_raw, repo_path)
        print(f"[PR-SCAN] {len(vulnerabilities)} raw findings before PR filtering")

        # Filter to only findings in PR-touched lines
        pr_vulns = []
        for v in vulnerabilities:
            fname = v.get("file", "")
            line = v.get("line", 0)
            touched = pr_touched.get(fname, set())
            # If we have diff data, restrict to touched lines; otherwise keep all
            if not touched or line in touched:
                pr_vulns.append(v)

        print(f"[PR-SCAN] {len(pr_vulns)} findings in PR-changed lines")

        # CVE mapping + CVSS scoring — parallel with cache
        pr_cve_semaphore = asyncio.Semaphore(8)
        pr_cve_cache: dict[str, dict] = {}

        async def _pr_map_and_score(vuln: dict) -> dict:
            key = vuln.get("issue", "") + "|" + ",".join(sorted(vuln.get("cwe", [])))
            async with pr_cve_semaphore:
                if key not in pr_cve_cache:
                    pr_cve_cache[key] = await map_to_cve(
                        vuln.get("issue", ""), cwe_ids=vuln.get("cwe", [])
                    )
            return assign_cvss(vuln, pr_cve_cache[key])

        enriched_vulns = list(await asyncio.gather(
            *[_pr_map_and_score(v) for v in pr_vulns]
        ))

        # Two-pass AI validation on all PR findings
        semaphore = asyncio.Semaphore(10)

        async def _analyze_limited(v: dict) -> dict:
            async with semaphore:
                return await analyze_vulnerability(v)

        ai_results = await asyncio.gather(
            *[_analyze_limited(v) for v in enriched_vulns],
            return_exceptions=True,
        )

        CONFIDENCE_THRESHOLD = 35
        final_vulns = []
        fp_count = low_conf_count = 0

        for i, vuln in enumerate(enriched_vulns):
            if i < len(ai_results) and not isinstance(ai_results[i], Exception):
                ai_data = ai_results[i]
                confidence = int(ai_data.get("confidence_score", 50))
                if ai_data.get("is_false_positive"):
                    fp_count += 1
                    continue
                if confidence < CONFIDENCE_THRESHOLD:
                    low_conf_count += 1
                    continue
                vuln.update({
                    "confidence_score": confidence,
                    "exploitability": ai_data.get("exploitability", "Medium"),
                    "mitigations_present": ai_data.get("mitigations_present", "None detected"),
                    "explanation": ai_data.get("explanation", ""),
                    "attack_simulation": ai_data.get("attack_simulation", {}),
                    "secure_fix": ai_data.get("secure_fix", {}),
                })
                final_vulns.append(VulnerabilityResult(**vuln))
            else:
                vuln.setdefault("confidence_score", 50)
                vuln.setdefault("exploitability", "Medium")
                vuln.setdefault("mitigations_present", "Unknown — AI unavailable")
                final_vulns.append(VulnerabilityResult(**vuln))

        print(f"[PR-SCAN] Filtered {fp_count} FP + {low_conf_count} low-conf → {len(final_vulns)} confirmed")
        final_vulns.sort(key=lambda v: (v.cvss_score, v.confidence_score), reverse=True)

        severity_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
        for v in final_vulns:
            if v.severity in severity_counts:
                severity_counts[v.severity] += 1

        return ScanResponse(
            repo_url=request.pr_url,
            total_vulnerabilities=len(final_vulns),
            severity_counts=severity_counts,
            vulnerabilities=final_vulns,
        )

    except Exception as e:
        print(f"[!] PR scan failed: {e}")
        raise HTTPException(status_code=500, detail=f"PR scan failed: {str(e)}")

    finally:
        if repo_path:
            cleanup_repo(repo_path)


@app.post("/apply-fix", response_model=ApplyFixResponse)
async def apply_fix(request: ApplyFixRequest):
    from github_service import create_pull_request_fix
    try:
        print(f"[+] Generating PR for {request.file_path} in {request.repo_url}")
        pr_url = await create_pull_request_fix(
            request.repo_url,
            request.file_path,
            request.line,
            request.secure_code,
            github_token=request.github_token or None,
        )
        print(f"     [+] PR Created: {pr_url}")
        return ApplyFixResponse(pr_url=pr_url)
    except Exception as e:
        print(f"[!] Apply fix failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Run ──────────────────────────────────────────────────────────────────────


class PostReviewRequest(BaseModel):
    pr_url: str
    vulnerabilities: list
    github_token: str = ""


@app.post("/scan-pr/post-review")
async def post_review(request: PostReviewRequest):
    """
    Post inline review comments on a GitHub PR — one comment per finding,
    anchored to the exact file + line. Mirrors CodeRabbit's core workflow.
    """
    try:
        review_url = await post_pr_review_comments(
            request.pr_url,
            request.vulnerabilities,
            github_token=request.github_token or None,
        )
        return {"review_url": review_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/github")
async def github_webhook(request: Request):
    """
    GitHub webhook handler — CodeRabbit feature parity.

    Handles two event types:
      pull_request  → full automated security review (scan + summary + inline comments)
      issue_comment → @vulnguard bot commands

    Setup:
      GitHub repo → Settings → Webhooks → Payload URL = <backend>/webhook/github
      Content type: application/json
      Events: Pull requests + Issue comments
    """
    # ── Signature verification ────────────────────────────────────────────────
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    body = await request.body()
    if secret:
        sig_header = request.headers.get("X-Hub-Signature-256", "")
        expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig_header, expected):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    event = request.headers.get("X-GitHub-Event", "")
    payload = json.loads(body)

    # ── Issue comment → @vulnguard bot commands ───────────────────────────────
    if event == "issue_comment":
        action = payload.get("action", "")
        if action != "created":
            return {"status": "ignored", "action": action}

        comment_body = payload.get("comment", {}).get("body", "")
        if "@vulnguard" not in comment_body.lower():
            return {"status": "ignored", "reason": "not a vulnguard command"}

        # Parse command: "@vulnguard <command> [args]"
        match = re.search(r"@vulnguard\s+(\w+)", comment_body, re.IGNORECASE)
        if not match:
            return {"status": "ignored", "reason": "no command found"}

        command = match.group(1).lower()
        pr_data = payload.get("issue", {})
        pr_url = pr_data.get("html_url", "")
        pr_number = pr_data.get("number", 0)
        repo_data = payload.get("repository", {})
        owner = repo_data.get("owner", {}).get("login", "")
        repo_name = repo_data.get("name", "")

        from github_service import _get_github_headers
        headers = await _get_github_headers(owner, repo_name)

        # Get current commit SHA for approve command
        commit_id = ""
        try:
            import httpx as _httpx
            async with _httpx.AsyncClient(timeout=10.0) as cl:
                pr_resp = await cl.get(
                    f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{pr_number}",
                    headers=headers,
                )
                if pr_resp.status_code == 200:
                    commit_id = pr_resp.json().get("head", {}).get("sha", "")
        except Exception:
            pass

        async def _dispatch():
            await dispatch_command(
                command=command,
                comment_body=comment_body,
                owner=owner,
                repo=repo_name,
                pr_number=pr_number,
                commit_id=commit_id,
                headers=headers,
                pr_url=pr_url,
            )
            # If "review" command → re-trigger full scan
            if command == "review" and pr_url:
                await _run_full_pr_scan(pr_url, payload.get("repository", {}).get("html_url", ""))

        asyncio.create_task(_dispatch())
        return {"status": "accepted", "command": command}

    # ── Pull request event → automated full review ─────────────────────────────
    if event != "pull_request":
        return {"status": "ignored", "event": event}

    action = payload.get("action", "")
    if action not in ("opened", "reopened", "synchronize"):
        return {"status": "ignored", "action": action}

    pr_html_url = payload.get("pull_request", {}).get("html_url", "")
    commit_sha  = payload.get("pull_request", {}).get("head", {}).get("sha", "")
    repo_url    = payload.get("repository", {}).get("html_url", "")
    is_draft    = payload.get("pull_request", {}).get("draft", False)

    if not pr_html_url:
        return {"status": "ignored", "reason": "no PR URL"}

    print(f"[webhook] PR '{action}': {pr_html_url} (sha={commit_sha[:7]})")

    asyncio.create_task(_run_full_pr_scan(pr_html_url, repo_url, commit_sha, is_draft))
    return {"status": "accepted", "pr_url": pr_html_url}


async def _run_full_pr_scan(
    pr_html_url: str,
    repo_url: str = "",
    commit_sha: str = "",
    is_draft: bool = False,
) -> None:
    """
    Full CodeRabbit-parity PR scan pipeline:
    1. Load per-repo config (vulnguard.yaml)
    2. Skip if commit already reviewed (incremental reviews)
    3. Fetch changed files
    4. Run all scanners
    5. AI-analyze findings in parallel
    6. Filter suppressed/false-positive findings (learnings)
    7. Post PR summary comment (top-level walkthrough)
    8. Post inline review comments (one per finding)
    9. Auto-approve if clean + config says so
    10. Record learnings (commit SHA, scan stats)
    11. Send Telegram notification
    """
    repo_path = None
    try:
        # ── 2. Incremental: skip if already reviewed ─────────────────────────
        if commit_sha and learnings_db.was_commit_reviewed(repo_url or pr_html_url, commit_sha):
            print(f"[webhook] Commit {commit_sha[:7]} already reviewed — skipping")
            return

        # ── 3. Fetch PR files ─────────────────────────────────────────────────
        repo_path, changed_files = await fetch_pr_files(pr_html_url)

        # ── 1. Load per-repo config ───────────────────────────────────────────
        config = load_config(repo_path)

        # Skip draft PRs unless config says otherwise
        if is_draft and not config.review.review_draft_prs:
            print(f"[webhook] Skipping draft PR: {pr_html_url}")
            return

        # Build set of touched lines per file (only scan what changed)
        pr_touched: dict[str, set[int]] = {}
        for f in changed_files:
            filename = f.get("filename", "")
            patch = f.get("patch", "") or ""
            touched: set[int] = set()
            if patch:
                for match in re.finditer(r"@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@", patch):
                    start = int(match.group(1))
                    count = int(match.group(2)) if match.group(2) else 1
                    for ln in range(start, start + count + 15):
                        touched.add(ln)
            pr_touched[filename] = touched

        # ── 4. Run scanners ───────────────────────────────────────────────────
        print(f"[webhook] Running scanners on {len(changed_files)} changed files…")
        semgrep_raw = run_semgrep(repo_path) if config.tools.semgrep else {"results": []}
        bandit_raw  = run_bandit(repo_path)  if config.tools.bandit  else {"results": []}
        loop = asyncio.get_event_loop()
        pip_raw, npm_raw, pylint_raw, go_raw, gem_raw = await asyncio.gather(
            loop.run_in_executor(None, run_pip_audit,       repo_path) if config.tools.pip_audit else asyncio.sleep(0, result={"results": []}),
            loop.run_in_executor(None, run_npm_audit,       repo_path) if config.tools.npm_audit else asyncio.sleep(0, result={"results": []}),
            loop.run_in_executor(None, run_pylint,          repo_path),
            loop.run_in_executor(None, run_go_vuln_check,   repo_path) if config.tools.govulncheck else asyncio.sleep(0, result={"results": []}),
            loop.run_in_executor(None, run_bundler_audit,   repo_path) if config.tools.bundler_audit else asyncio.sleep(0, result={"results": []}),
        )

        vulnerabilities = parse_all(semgrep_raw, bandit_raw, repo_path, pip_audit_raw=pip_raw, npm_audit_raw=npm_raw)
        pylint_bugs = parse_pylint(pylint_raw, repo_path)
        all_vulns = vulnerabilities + pylint_bugs

        # Filter to only findings in changed lines
        pr_vulns = [
            v for v in all_vulns
            if config.should_ignore(v.get("file", ""))  is False
            and (
                not pr_touched.get(v.get("file", ""))
                or v.get("line", 0) in pr_touched.get(v.get("file", ""), set())
            )
        ]

        # ── 5. CVE enrichment + AI analysis ──────────────────────────────────
        enriched = []
        for vuln in pr_vulns:
            cve_data = await map_to_cve(vuln.get("issue", ""), cwe_ids=vuln.get("cwe", []))
            enriched.append(assign_cvss(vuln, cve_data))

        semaphore = asyncio.Semaphore(10)
        custom_rules = learnings_db.get_custom_rules(pr_html_url)
        lang_context = config.language_context()

        async def _ai(v):
            async with semaphore:
                return await analyze_vulnerability(v, extra_context=lang_context)

        ai_results = await asyncio.gather(*[_ai(v) for v in enriched], return_exceptions=True)
        threshold = config.review.confidence_threshold

        final = []
        for i, vuln in enumerate(enriched):
            if i < len(ai_results) and not isinstance(ai_results[i], Exception):
                ai = ai_results[i]
                if ai.get("is_false_positive") or int(ai.get("confidence_score", 50)) < threshold:
                    continue
                vuln.update({k: ai.get(k) for k in
                    ["confidence_score", "exploitability", "mitigations_present",
                     "explanation", "attack_simulation", "secure_fix"]})
            final.append(vuln)

        # ── 6. Filter learnings (suppress known FPs) ──────────────────────────
        final = learnings_db.filter_suppressed(repo_url or pr_html_url, final)

        # ── 7. Post PR summary comment ────────────────────────────────────────
        if config.notifications.summary_comment:
            summary_md = await generate_pr_summary(pr_html_url, changed_files, final, lang_context)
            await post_pr_summary_comment(pr_html_url, summary_md, final)

        # ── 8. Post inline review comments ───────────────────────────────────
        if config.notifications.inline_comments and final:
            await post_pr_review_comments(pr_html_url, final)
            print(f"[webhook] Posted {len(final)} inline findings to {pr_html_url}")
        elif not final and config.notifications.post_on_clean:
            await post_pr_summary_comment(pr_html_url, "✅ **No security findings detected!** This PR looks clean.", [])

        # ── 9. Auto-approve if configured and clean ───────────────────────────
        if config.review.auto_approve_on_clean:
            critical_high = [f for f in final if f.get("severity") in ("Critical", "High")]
            if not critical_high:
                try:
                    from github_service import _parse_pr_url, _get_github_headers
                    import httpx as _httpx
                    owner, repo_name, pr_number = _parse_pr_url(pr_html_url)
                    headers = await _get_github_headers(owner, repo_name)
                    if not commit_sha:
                        async with _httpx.AsyncClient(timeout=10.0) as cl:
                            r = await cl.get(f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{pr_number}", headers=headers)
                            commit_sha = r.json().get("head", {}).get("sha", "")
                    async with _httpx.AsyncClient(timeout=30.0) as cl:
                        await cl.post(
                            f"https://api.github.com/repos/{owner}/{repo_name}/pulls/{pr_number}/reviews",
                            headers=headers,
                            json={"commit_id": commit_sha, "event": "APPROVE",
                                  "body": "✅ **VulnGuard AI — Auto-Approved**\n\nNo Critical or High severity findings. Approved automatically."},
                        )
                    print(f"[webhook] Auto-approved PR: {pr_html_url}")
                except Exception as e:
                    print(f"[webhook] Auto-approve failed: {e}")

        # ── 10. Record learnings ──────────────────────────────────────────────
        if commit_sha:
            learnings_db.mark_commit_reviewed(repo_url or pr_html_url, commit_sha)
        learnings_db.record_scan(repo_url or pr_html_url, len(final))

        # ── 11. Telegram notification ─────────────────────────────────────────
        if config.notifications.telegram:
            try:
                await _send_telegram_pr_notification(pr_html_url, final)
            except Exception as e:
                print(f"[telegram] Notification failed: {e}")

    except Exception as e:
        print(f"[webhook] Scan error: {e}")
    finally:
        if repo_path:
            cleanup_repo(repo_path)


async def _send_telegram_pr_notification(pr_url: str, findings: list[dict]) -> None:
    """Send a Telegram message summarising the PR review results."""
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not bot_token or not chat_id:
        return

    crit = sum(1 for f in findings if f.get("severity") == "Critical")
    high = sum(1 for f in findings if f.get("severity") == "High")
    med  = sum(1 for f in findings if f.get("severity") == "Medium")
    low  = sum(1 for f in findings if f.get("severity") == "Low")

    emoji = "🔴" if crit else "🟠" if high else "🟡" if med else "🟢"
    msg = (
        f"{emoji} *VulnGuard AI — PR Review Complete*\n\n"
        f"🔗 [View PR]({pr_url})\n\n"
        f"📊 *Findings:*\n"
        f"  🔴 Critical: {crit}\n"
        f"  🟠 High: {high}\n"
        f"  🟡 Medium: {med}\n"
        f"  🔵 Low: {low}\n"
        f"  📋 Total: {len(findings)}"
    )

    import httpx as _httpx
    async with _httpx.AsyncClient(timeout=10.0) as cl:
        await cl.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={"chat_id": chat_id, "text": msg, "parse_mode": "Markdown"},
        )


# ── Reports endpoint ──────────────────────────────────────────────────────────

@app.get("/reports")
async def get_reports(repo_url: str | None = None):
    """
    Return aggregated scan statistics.
    Query param: ?repo_url=<url> for per-repo stats, omit for global.
    """
    return learnings_db.get_stats(repo_url)


# ── Learnings endpoints ────────────────────────────────────────────────────────

class LearningRequest(BaseModel):
    repo_url: str
    finding_id: str


@app.post("/learnings/mark-false-positive")
async def mark_false_positive(req: LearningRequest):
    """Mark a finding as a false positive so it's suppressed in future scans."""
    learnings_db.mark_false_positive(req.repo_url, req.finding_id)
    return {"status": "ok", "message": f"Finding {req.finding_id} marked as false positive"}


@app.post("/learnings/mark-resolved")
async def mark_resolved(req: LearningRequest):
    """Mark a finding as resolved by the developer."""
    learnings_db.mark_resolved(req.repo_url, req.finding_id)
    return {"status": "ok", "message": f"Finding {req.finding_id} marked as resolved"}


# ── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


