#!/usr/bin/env python3
"""
VulnGuard AI — CLI
Usage:
  python cli.py scan <repo_url>
  python cli.py scan-pr <pr_url>
  python cli.py scan <repo_url> --output report.json
  python cli.py scan <repo_url> --min-severity high
"""

from __future__ import annotations

import argparse
import asyncio
import itertools
import json
import os
import shutil
import sys
import time
from datetime import datetime

import httpx
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

# ── Terminal capabilities ──────────────────────────────────────────────────────

IS_TTY   = sys.stdout.isatty()
TERM_W   = shutil.get_terminal_size((100, 24)).columns

# ANSI codes
RESET    = "\033[0m"  if IS_TTY else ""
BOLD     = "\033[1m"  if IS_TTY else ""
DIM      = "\033[2m"  if IS_TTY else ""
ITALIC   = "\033[3m"  if IS_TTY else ""
UNDERLINE= "\033[4m"  if IS_TTY else ""

FG_WHITE  = "\033[97m"  if IS_TTY else ""
FG_GRAY   = "\033[90m"  if IS_TTY else ""
FG_RED    = "\033[91m"  if IS_TTY else ""
FG_YELLOW = "\033[93m"  if IS_TTY else ""
FG_BLUE   = "\033[94m"  if IS_TTY else ""
FG_CYAN   = "\033[96m"  if IS_TTY else ""
FG_GREEN  = "\033[92m"  if IS_TTY else ""
FG_ORANGE = "\033[38;5;208m" if IS_TTY else ""

BG_RED    = "\033[41m"  if IS_TTY else ""
BG_YELLOW = "\033[43m"  if IS_TTY else ""

CURSOR_UP   = "\033[1A" if IS_TTY else ""
ERASE_LINE  = "\033[2K" if IS_TTY else ""
HIDE_CURSOR = "\033[?25l" if IS_TTY else ""
SHOW_CURSOR = "\033[?25h" if IS_TTY else ""

# ── Severity palette ───────────────────────────────────────────────────────────

SEV_STYLE = {
    "Critical": (FG_RED,    "●"),
    "High":     (FG_ORANGE, "●"),
    "Medium":   (FG_YELLOW, "●"),
    "Low":      (FG_BLUE,   "●"),
}
SEV_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _sev(text: str, severity: str) -> str:
    color, _ = SEV_STYLE.get(severity, (FG_GRAY, "●"))
    return f"{color}{text}{RESET}"


def _dot(severity: str) -> str:
    color, dot = SEV_STYLE.get(severity, (FG_GRAY, "●"))
    return f"{color}{dot}{RESET}"


# ── Layout helpers ─────────────────────────────────────────────────────────────

def _w(n: int | None = None) -> int:
    return min(n or TERM_W, TERM_W)


def _hr(char: str = "─", width: int | None = None, color: str = FG_GRAY) -> str:
    return f"{color}{char * _w(width)}{RESET}"


def _box_top(width: int | None = None, color: str = FG_GRAY) -> str:
    w = _w(width)
    return f"{color}╭{'─' * (w - 2)}╮{RESET}"


def _box_bot(width: int | None = None, color: str = FG_GRAY) -> str:
    w = _w(width)
    return f"{color}╰{'─' * (w - 2)}╯{RESET}"


def _box_row(content: str, width: int | None = None, color: str = FG_GRAY) -> str:
    w = _w(width)
    # Strip ANSI for length calculation
    import re
    plain = re.sub(r"\033\[[0-9;]*m", "", content)
    pad = w - 2 - len(plain)
    return f"{color}│{RESET} {content}{' ' * max(pad - 1, 0)} {color}│{RESET}"


def _box_sep(width: int | None = None, color: str = FG_GRAY) -> str:
    w = _w(width)
    return f"{color}├{'─' * (w - 2)}┤{RESET}"


def _truncate(text: str, max_len: int) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len - 1] + "…"


# ── Spinner ───────────────────────────────────────────────────────────────────

SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

SCAN_STEPS = [
    (1.0,  "Fetching repository via GitHub API"),
    (4.0,  "Running Semgrep static analysis"),
    (3.0,  "Running Bandit security linter"),
    (2.0,  "Running pip-audit dependency scan"),
    (1.5,  "Running Pylint bug detection"),
    (3.0,  "Mapping CVEs and CVSS scores"),
    (5.0,  "AI triage — Pass 1: analysis"),
    (4.0,  "AI triage — Pass 2: skeptic review"),
    (1.0,  "AI bug detection sweep"),
    (0.5,  "Assembling final results"),
]

PR_STEPS = [
    (1.5,  "Fetching PR diff from GitHub"),
    (2.0,  "Running Semgrep on changed files"),
    (1.5,  "Running Bandit on changed files"),
    (2.0,  "Mapping CVEs and CVSS scores"),
    (4.0,  "AI triage — Pass 1: analysis"),
    (3.0,  "AI triage — Pass 2: skeptic review"),
    (0.5,  "Assembling final results"),
]


class Spinner:
    """Animated progress indicator with step tracking."""

    def __init__(self, steps: list[tuple[float, str]]) -> None:
        self._steps    = steps
        self._task: asyncio.Task | None = None
        self._stopped  = False
        self._step_idx = 0
        self._start    = time.monotonic()
        self._done_steps: list[str] = []

    def _elapsed(self) -> str:
        secs = time.monotonic() - self._start
        return f"{secs:.1f}s"

    async def _run(self) -> None:
        frames = itertools.cycle(SPINNER_FRAMES)
        step_start = time.monotonic()
        printed_lines = 0

        while not self._stopped:
            frame   = next(frames)
            now     = time.monotonic()
            elapsed = now - step_start

            # Advance pseudo-step based on elapsed time within each step
            if self._step_idx < len(self._steps):
                expected_dur, label = self._steps[self._step_idx]
                if elapsed >= expected_dur:
                    self._done_steps.append(label)
                    self._step_idx += 1
                    step_start = now
                    if self._step_idx < len(self._steps):
                        _, label = self._steps[self._step_idx]
            else:
                _, label = self._steps[-1]

            if self._step_idx < len(self._steps):
                _, label = self._steps[self._step_idx]

            # Clear previous render
            if printed_lines:
                sys.stdout.write(f"\033[{printed_lines}A\033[J")

            lines = []
            # Completed steps
            for s in self._done_steps[-3:]:  # show last 3 done
                lines.append(f"  {FG_GREEN}✓{RESET} {DIM}{s}{RESET}")
            # Current step
            lines.append(
                f"  {FG_CYAN}{frame}{RESET} {BOLD}{label}{RESET}"
                f"  {DIM}{self._elapsed()}{RESET}"
            )

            output = "\n".join(lines) + "\n"
            sys.stdout.write(output)
            sys.stdout.flush()
            printed_lines = len(lines)

            await asyncio.sleep(0.08)

        # Final clear
        if printed_lines:
            sys.stdout.write(f"\033[{printed_lines}A\033[J")
        sys.stdout.flush()

    def start(self) -> None:
        if IS_TTY:
            sys.stdout.write(HIDE_CURSOR)
            sys.stdout.flush()
            self._task = asyncio.ensure_future(self._run())

    async def stop(self, success: bool = True) -> None:
        self._stopped = True
        if self._task:
            await asyncio.sleep(0.12)
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        if IS_TTY:
            sys.stdout.write(SHOW_CURSOR)
            sys.stdout.flush()


# ── Banner ────────────────────────────────────────────────────────────────────

def _print_banner() -> None:
    w = _w(72)
    print()
    print(_box_top(w, FG_CYAN))
    title = f"{BOLD}{FG_WHITE}VulnGuard AI{RESET}"
    sub   = f"{DIM}NVIDIA Nemotron · OpenRouter · SAST + AI{RESET}"
    print(_box_row(f"  {title}  {sub}", w, FG_CYAN))
    print(_box_bot(w, FG_CYAN))
    print()


# ── Results renderer ──────────────────────────────────────────────────────────

def _render_stats(data: dict) -> None:
    sev   = data["severity_counts"]
    total = data["total_vulnerabilities"]
    sec   = data.get("security_count", 0)
    bugs  = data.get("bug_count", 0)

    c = sev.get("Critical", 0)
    h = sev.get("High", 0)
    m = sev.get("Medium", 0)
    l = sev.get("Low", 0)

    # Risk level
    if c > 0:
        risk_color, risk_label = FG_RED,    "CRITICAL RISK"
    elif h > 0:
        risk_color, risk_label = FG_ORANGE, "HIGH RISK"
    elif m > 0:
        risk_color, risk_label = FG_YELLOW, "MEDIUM RISK"
    elif l > 0:
        risk_color, risk_label = FG_BLUE,   "LOW RISK"
    else:
        risk_color, risk_label = FG_GREEN,  "CLEAN"

    w = _w(72)
    print(_box_top(w))

    # Repo line
    repo_short = _truncate(data["repo_url"], w - 12)
    print(_box_row(f"{DIM}repo{RESET}  {FG_CYAN}{repo_short}{RESET}", w))
    print(_box_row(f"{DIM}time{RESET}  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", w))
    print(_box_sep(w))

    # Counts row
    stat = (
        f"  {BOLD}{risk_color}{total:3d}{RESET} total"
        f"  {DIM}│{RESET}"
        f"  {FG_GRAY}{sec} security  {bugs} bugs{RESET}"
    )
    print(_box_row(stat, w))
    print(_box_sep(w))

    # Severity bar
    cells = [
        f"  {_sev(f'● {c:2d}', 'Critical')} {DIM}Critical{RESET}",
        f"  {_sev(f'● {h:2d}', 'High')}     {DIM}High{RESET}",
        f"  {_sev(f'● {m:2d}', 'Medium')}   {DIM}Medium{RESET}",
        f"  {_sev(f'● {l:2d}', 'Low')}      {DIM}Low{RESET}",
    ]
    print(_box_row("".join(cells), w))

    print(_box_bot(w))
    print()


def _render_findings(data: dict, min_severity: str) -> None:
    min_rank = SEV_ORDER.get(min_severity.lower(), 0)
    shown = [
        v for v in data["vulnerabilities"]
        if SEV_ORDER.get(v["severity"].lower(), 0) >= min_rank
    ]

    if not shown:
        print(f"  {FG_GREEN}✓{RESET} No findings at or above {BOLD}{min_severity.title()}{RESET} severity.\n")
        return

    w = _w(88)
    total_shown = len(shown)

    for i, v in enumerate(shown, 1):
        sev  = v["severity"]
        ftype = "bug" if v.get("finding_type") == "bug" else "sec"
        dot  = _dot(sev)
        conf = v.get("confidence_score", 0)
        expl = v.get("exploitability", "?")
        issue = _truncate(v.get("issue", "Unknown issue"), w - 20)

        # ── Finding header ─────────────────────────────────────────────────
        num_label  = f"{DIM}{i:2d}/{total_shown}{RESET}"
        type_badge = (
            f"{FG_RED}{BOLD} BUG {RESET}" if ftype == "bug"
            else f"{FG_CYAN}{BOLD} SEC {RESET}"
        )
        sev_badge  = f"{_sev(f' {sev.upper()} ', sev)}"

        print(f"  {dot} {num_label}  {type_badge} {sev_badge}  {BOLD}{issue}{RESET}")

        # ── File location ──────────────────────────────────────────────────
        fpath = v.get("file", "")
        line  = v.get("line", 0)
        print(f"     {DIM}╰─{RESET} {FG_CYAN}{fpath}{RESET}{DIM}:{line}{RESET}"
              f"   {DIM}confidence {RESET}{BOLD}{conf}{RESET}{DIM}/100{RESET}"
              f"   {DIM}exploitability {RESET}{expl}")

        # ── Explanation (first 2 sentences) ────────────────────────────────
        raw_expl = v.get("explanation", "").replace("**", "")
        if raw_expl:
            sentences = [s.strip() for s in raw_expl.split(".") if s.strip()]
            brief = ". ".join(sentences[:2]) + "." if sentences else ""
            brief = _truncate(brief, w - 8)
            print(f"       {DIM}{brief}{RESET}")

        # ── Fix ─────────────────────────────────────────────────────────────
        fix_desc = v.get("secure_fix", {}).get("description", "")
        if fix_desc:
            fix_brief = _truncate(fix_desc.replace("**", ""), w - 12)
            print(f"       {FG_GREEN}fix{RESET}{DIM} → {fix_brief}{RESET}")

        # ── Code fix snippet (if present, show first 4 lines) ──────────────
        fix_code = v.get("secure_fix", {}).get("code", "").strip()
        if fix_code:
            code_lines = fix_code.splitlines()[:4]
            print(f"       {DIM}┌─ suggested fix{RESET}")
            for cl in code_lines:
                cl_trunc = _truncate(cl, w - 12)
                print(f"       {DIM}│{RESET} {FG_GRAY}{cl_trunc}{RESET}")
            if len(fix_code.splitlines()) > 4:
                print(f"       {DIM}│ ... ({len(fix_code.splitlines()) - 4} more lines){RESET}")
            print(f"       {DIM}└{'─' * 20}{RESET}")

        # Separator (not after last item)
        if i < total_shown:
            print(f"  {DIM}{'·' * min(w - 4, 60)}{RESET}")
        print()


def _render_footer(data: dict, output_file: str | None, elapsed: float) -> None:
    sev = data["severity_counts"]
    c   = sev.get("Critical", 0)
    h   = sev.get("High", 0)

    if c > 0 or h > 0:
        status = f"{FG_RED}{BOLD}✗ Scan failed{RESET}{DIM} — {c} critical, {h} high severity findings{RESET}"
    else:
        status = f"{FG_GREEN}{BOLD}✓ Scan passed{RESET}"

    print(_hr())
    print(f"  {status}   {DIM}completed in {elapsed:.1f}s{RESET}")
    if output_file:
        print(f"  {FG_CYAN}↓{RESET} Report saved  {DIM}{output_file}{RESET}")
    print(_hr())
    print()


# ── Network ───────────────────────────────────────────────────────────────────

async def _scan(
    endpoint: str,
    payload: dict,
    output_file: str | None,
    min_severity: str,
    is_pr: bool = False,
) -> int:
    steps  = PR_STEPS if is_pr else SCAN_STEPS
    url    = f"{BACKEND_URL}{endpoint}"
    t0     = time.monotonic()

    _print_banner()

    # Target line
    target_url = payload.get("repo_url") or payload.get("pr_url", "")
    print(f"  {DIM}Scanning{RESET}  {FG_CYAN}{BOLD}{target_url}{RESET}")
    print(f"  {DIM}Backend   {BACKEND_URL}{RESET}")
    print()

    spinner = Spinner(steps)
    spinner.start()

    data: dict = {}
    error: str = ""

    try:
        async with httpx.AsyncClient(timeout=600.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                error = f"Backend error {resp.status_code}: {resp.text[:200]}"
            else:
                data = resp.json()
    except httpx.ConnectError:
        error = (
            f"Cannot connect to backend at {BACKEND_URL}\n"
            f"  Start it with:  cd backend && uvicorn main:app --reload"
        )
    except httpx.TimeoutException:
        error = "Request timed out — the repository may be too large."
    except Exception as exc:
        error = str(exc)
    finally:
        await spinner.stop(success=not error)

    elapsed = time.monotonic() - t0

    if error:
        print(f"\n  {FG_RED}{BOLD}✗ Error{RESET}  {error}\n")
        return 1

    _render_stats(data)
    _render_findings(data, min_severity)
    _render_footer(data, output_file, elapsed)

    if output_file:
        with open(output_file, "w") as f:
            json.dump(data, f, indent=2)

    sev = data["severity_counts"]
    return 1 if (sev.get("Critical", 0) > 0 or sev.get("High", 0) > 0) else 0


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        prog="vulnguard",
        description="VulnGuard AI — AI-powered vulnerability scanner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  vulnguard scan https://github.com/owner/repo\n"
            "  vulnguard scan-pr https://github.com/owner/repo/pull/42\n"
            "  vulnguard scan https://github.com/owner/repo -o report.json -s high\n"
        ),
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # ── scan ──────────────────────────────────────────────────────────────────
    scan_p = sub.add_parser("scan", help="Scan a full repository")
    scan_p.add_argument("repo_url", help="GitHub repository URL")
    scan_p.add_argument("--output", "-o", metavar="FILE", help="Save full JSON report")
    scan_p.add_argument(
        "--min-severity", "-s",
        default="low",
        choices=["critical", "high", "medium", "low"],
        metavar="LEVEL",
        help="Minimum severity to display: critical|high|medium|low  (default: low)",
    )
    scan_p.add_argument("--backend", metavar="URL", default=BACKEND_URL)

    # ── scan-pr ───────────────────────────────────────────────────────────────
    pr_p = sub.add_parser("scan-pr", help="Scan only the files changed in a pull request")
    pr_p.add_argument("pr_url", help="GitHub PR URL  (…/pull/123)")
    pr_p.add_argument("--output", "-o", metavar="FILE", help="Save full JSON report")
    pr_p.add_argument(
        "--min-severity", "-s",
        default="low",
        choices=["critical", "high", "medium", "low"],
        metavar="LEVEL",
        help="Minimum severity to display: critical|high|medium|low  (default: low)",
    )
    pr_p.add_argument("--backend", metavar="URL", default=BACKEND_URL)

    args = parser.parse_args()

    global BACKEND_URL
    BACKEND_URL = args.backend

    try:
        if args.command == "scan":
            code = asyncio.run(_scan(
                "/scan-repo",
                {"repo_url": args.repo_url},
                args.output,
                args.min_severity,
                is_pr=False,
            ))
        else:
            code = asyncio.run(_scan(
                "/scan-pr",
                {"pr_url": args.pr_url},
                args.output,
                args.min_severity,
                is_pr=True,
            ))
    except KeyboardInterrupt:
        sys.stdout.write(SHOW_CURSOR)
        print(f"\n\n  {FG_YELLOW}⚠{RESET}  Scan interrupted.\n")
        sys.exit(130)

    sys.exit(code)


if __name__ == "__main__":
    main()
