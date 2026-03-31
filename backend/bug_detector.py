"""
Bug Detector — Static (Pylint) + AI-powered code bug detection.

Covers bugs distinct from security vulnerabilities:
  - Logic errors, null / None dereferences
  - Resource leaks (unclosed files, DB connections, sockets)
  - Off-by-one errors in loops / array access
  - Race conditions and missing synchronisation
  - Incorrect / swallowed exception handling
  - Uninitialized variables, incorrect type assumptions
  - Missing return values, unreachable / dead code
  - Async / await mistakes

Two detection layers:
  Layer 1 — Pylint:   static error-level checks for Python files.
  Layer 2 — NVIDIA:   AI review of each source file via OpenRouter for the full
                      bug-class spectrum across all languages.
"""

import json
import os
import re
import subprocess
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
MODEL_NAME = "stepfun/step-3.5-flash:free"
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/vulnguard-ai",
    "X-Title": "VulnGuard AI",
}

# ── Language detection ────────────────────────────────────────────────────────

_EXT_TO_LANG = {
    ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
    ".jsx": "JavaScript", ".tsx": "TypeScript", ".java": "Java",
    ".go": "Go", ".rs": "Rust", ".rb": "Ruby", ".php": "PHP",
    ".cs": "C#", ".cpp": "C++", ".c": "C", ".swift": "Swift",
    ".kt": "Kotlin", ".scala": "Scala",
}

SOURCE_EXTENSIONS = set(_EXT_TO_LANG.keys())

# Directories / patterns to skip (same list as scanner.py)
_SKIP_DIRS = {
    "test", "tests", "__tests__", "spec", "specs",
    "mocks", "mock", "fixtures", "fixture",
    "node_modules", "vendor", "venv", ".venv", "env",
    "dist", "build", "target", "out", ".next", ".nuxt",
    "migrations", "migration", ".git", ".github",
}
_SKIP_FILE_RE = re.compile(
    r"(_test\.(go|py)|_spec\.rb|\.test\.[jt]sx?|\.spec\.[jt]sx?|test_.*\.py|conftest\.py)$"
)

# Max file size (lines) for AI review — larger files are too noisy
_AI_MAX_LINES = 300
# Max files to review with AI per scan (cost guard)
_AI_MAX_FILES = 15


# ── Pylint (Python only) ──────────────────────────────────────────────────────

# Pylint message codes that represent real bugs (not style / conventions).
# E* = errors; selected W* = warnings that are frequently real bugs.
_PYLINT_BUG_CODES = {
    # Errors — definite bugs
    "E0001",  # syntax-error
    "E0100",  # init-is-generator
    "E0101",  # return-in-init
    "E0102",  # function-redefined
    "E0103",  # not-in-loop
    "E0104",  # return-outside-function
    "E0105",  # yield-outside-function
    "E0107",  # nonexistent-operator
    "E0108",  # duplicate-argument-name
    "E0111",  # argument-reversed
    "E0117",  # nonlocal-without-binding
    "E0118",  # used-prior-global-declaration
    "E0119",  # misplaced-format-function
    "E0401",  # import-error
    "E0602",  # undefined-variable
    "E0611",  # no-name-in-module
    "E1120",  # no-value-for-argument
    "E1121",  # too-many-function-args
    "E1123",  # unexpected-keyword-arg
    "E1124",  # redundant-keyword-arg
    "E1125",  # missing-kwoa
    "E1126",  # invalid-sequence-index
    "E1127",  # invalid-slice-index
    "E1128",  # assignment-from-none
    "E1129",  # not-context-manager
    "E1130",  # invalid-unary-operand-type
    "E1131",  # unsupported-binary-operation
    "E1132",  # repeated-keyword
    "E1135",  # unsupported-membership-test
    "E1136",  # unsubscriptable-object
    "E1137",  # unsupported-assignment-operation
    "E1138",  # unsupported-delete-operation
    "E1139",  # invalid-metaclass
    "E1140",  # dict-iter-missing-items
    "E1141",  # unpacking-non-sequence
    "E1142",  # await-outside-async
    "E1200",  # bad-format-string
    "E1205",  # logging-too-many-args
    "E1206",  # logging-too-few-args
    "E1300",  # bad-format-character
    "E1301",  # truncated-format-string
    "E1302",  # mixed-format-string
    "E1303",  # format-needs-mapping
    "E1304",  # missing-format-string-key
    "E1305",  # too-many-format-args
    "E1306",  # too-few-format-args
    # Selected warnings — frequently real bugs
    "W0101",  # unreachable
    "W0102",  # dangerous-default-value
    "W0104",  # pointless-statement
    "W0107",  # unnecessary-pass
    "W0109",  # duplicate-key
    "W0111",  # assign-to-new-keyword
    "W0120",  # useless-else-on-loop
    "W0160",  # consider-ternary-expression
    "W0199",  # assert-on-tuple
    "W0301",  # unnecessary-semicolon
    "W0601",  # global-variable-undefined
    "W0602",  # global-variable-not-assigned
    "W0611",  # unused-import
    "W0612",  # unused-variable
    "W1401",  # anomalous-backslash-in-string
    "W1503",  # redundant-unittest-assert
    "W1509",  # subprocess-popen-preexec-fn (use_in_subprocess)
    "W1510",  # subprocess-run-check
}

_PYLINT_SEVERITY_MAP = {
    "error": "High",
    "warning": "Medium",
    "refactor": "Low",
    "convention": "Low",
    "fatal": "Critical",
}


def run_pylint(repo_path: str) -> dict:
    """
    Run Pylint on all Python files in repo_path.
    Only error-class and selected warning-class messages are returned
    (style / convention messages are excluded — they are not bugs).
    """
    try:
        print(f"[pylint] Scanning: {repo_path}")
        result = subprocess.run(
            [
                sys.executable, "-m", "pylint",
                repo_path,
                "--output-format=json",
                "--recursive=y",
                "--jobs=0",                   # Use all CPU cores
                "--disable=all",
                "--enable=" + ",".join(_PYLINT_BUG_CODES),
                # Ignore test / vendor dirs
                "--ignore=tests,test,__tests__,spec,specs,node_modules,"
                "vendor,venv,.venv,migrations,dist,build,.next",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )
        output = result.stdout.strip()
        if output:
            messages = json.loads(output)
            print(f"[pylint] Found {len(messages)} bug-class messages")
            return {"results": messages}
        print("[pylint] No findings (no Python files or no bugs)")
        return {"results": []}
    except FileNotFoundError:
        print("[!] Pylint not found — install with: pip install pylint")
        return {"results": [], "error": "pylint not installed"}
    except subprocess.TimeoutExpired:
        print("[!] Pylint timed out after 180s")
        return {"results": [], "error": "timeout"}
    except Exception as e:
        print(f"[pylint] Unexpected error: {e}")
        return {"results": [], "error": str(e)}


# ── AI file-level bug detection ───────────────────────────────────────────────

_BUG_PROMPT = """\
You are an expert software engineer reviewing code for bugs.

Your task: find BUGS (logic errors, crashes, resource leaks, data corruption) — \
NOT security vulnerabilities (those are handled by a separate security scanner).

**File:** {file_path}
**Language:** {language}
**Code (line numbers shown):**
```
{code}
```

Find every real bug in this code. Strict criteria:
- Must be a DEFINITE defect that causes incorrect behaviour, crashes, or data loss.
- NOT style issues or "could be improved" suggestions.
- NOT security vulnerabilities.
- Provide a specific line number for each bug.

Bug types to look for:
1. Null / None / nil dereference — accessing attribute of None without guard
2. Off-by-one — loop boundary or index one too many / few
3. Resource leak — file, socket, DB connection opened but never closed
4. Race condition — shared state accessed without lock / synchronization
5. Swallowed exception — bare `except: pass` or caught-and-ignored errors
6. Logic error — wrong operator, inverted boolean, always-true/false condition
7. Uninitialized variable used before assignment
8. Incorrect return type or missing return in non-void function
9. Async / await mistake — missing await, blocking call in async context
10. Dead / unreachable code after return or unconditional break
11. Mutable default argument in Python function definition
12. Integer division when float expected (or vice versa)

Return ONLY valid JSON (no markdown fences):
{{
  "bugs": [
    {{
      "line": <integer>,
      "bug_type": "short name e.g. 'Null Dereference' or 'Resource Leak'",
      "severity": "one of: Critical | High | Medium | Low",
      "description": "Precise description referencing the specific line and variable/function involved.",
      "impact": "What goes wrong at runtime — crash, wrong result, data loss, etc.",
      "fix": {{
        "description": "What to change and why.",
        "code": "The corrected code snippet (syntactically valid)."
      }}
    }}
  ]
}}

If no bugs are found, return: {{"bugs": []}}
"""


def _detect_language(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    return _EXT_TO_LANG.get(ext, "Unknown")


def _should_ai_review(file_path: str, content: str) -> bool:
    """Return True if this file should be sent for AI bug review."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in SOURCE_EXTENSIONS:
        return False
    # Skip test files
    if _SKIP_FILE_RE.search(os.path.basename(file_path)):
        return False
    # Skip files in known noisy directories
    parts = set(file_path.replace("\\", "/").split("/"))
    if parts & _SKIP_DIRS:
        return False
    # Skip very large files
    lines = content.count("\n")
    if lines > _AI_MAX_LINES:
        return False
    return True


async def _call_openrouter(prompt: str, retries: int = 3) -> str:
    """Send a prompt to OpenRouter (NVIDIA model) and return stripped text response."""
    import asyncio
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
    }
    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(OPENROUTER_API_URL, json=payload, headers=_OPENROUTER_HEADERS)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
            if text.startswith("```"):
                lines = text.split("\n")
                text = "\n".join(lines[1:])
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
            return text
        except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
            last_exc = exc
            if attempt < retries - 1:
                await asyncio.sleep(2 ** attempt)
    raise last_exc


def _snippet_at_line(content: str, line: int, context: int = 6) -> str:
    """Extract a small code window around `line` from raw file content."""
    all_lines = content.splitlines()
    target = line - 1
    start = max(0, target - context)
    end = min(len(all_lines), target + context + 1)
    parts = []
    for i in range(start, end):
        marker = ">>>" if i == target else "   "
        parts.append(f"{marker} {i + 1:4d} | {all_lines[i]}")
    return "\n".join(parts)


async def detect_bugs_in_file(rel_path: str, content: str) -> list[dict]:
    """
    Ask OpenRouter AI to find all bugs in a single source file.
    Returns a list of bug findings in the unified VulnerabilityResult format.
    """
    if not OPENROUTER_API_KEY:
        return []

    language = _detect_language(rel_path)
    if language == "Unknown":
        return []

    # Number every line before sending to the model
    numbered = "\n".join(
        f"{i + 1:4d} | {line}"
        for i, line in enumerate(content.splitlines())
    )

    prompt = _BUG_PROMPT.format(
        file_path=rel_path,
        language=language,
        code=numbered,
    )

    try:
        text = await _call_openrouter(prompt)
        data = json.loads(text)
        bugs = data.get("bugs", [])
    except Exception as e:
        print(f"[bug-ai] {rel_path}: AI error — {e}")
        return []

    findings = []
    for bug in bugs:
        line = int(bug.get("line", 0))
        bug_type = bug.get("bug_type", "Bug")
        severity = bug.get("severity", "Medium")
        if severity not in ("Critical", "High", "Medium", "Low"):
            severity = "Medium"
        description = bug.get("description", "")
        impact = bug.get("impact", "")
        fix = bug.get("fix", {})

        findings.append({
            "id": f"ai-bug:{rel_path}:{line}:{bug_type.lower().replace(' ', '-')}",
            "file": rel_path,
            "line": line,
            "issue": f"{bug_type}: {description}",
            "severity": severity,
            "tool": "ai-bug-detector",
            "code_snippet": _snippet_at_line(content, line),
            "cwe": [],
            "source": "bug",
            "finding_type": "bug",
            "corroborated": False,
            "confidence_score": 72,   # AI findings — moderately confident
            "exploitability": "None", # Not a security issue
            "mitigations_present": "None detected",
            "explanation": (
                f"**{bug_type}** — {description}\n\n"
                f"**Impact:** {impact}"
            ),
            "attack_simulation": {
                "payload": "N/A — code bug, not a security vulnerability",
                "description": impact,
            },
            "secure_fix": {
                "description": fix.get("description", ""),
                "code": fix.get("code", ""),
            },
            # Bugs don't have CVSS/CVE — use neutral values
            "cve": {"cve_id": "N/A", "description": ""},
            "cvss_score": 0.0,
        })

    if findings:
        print(f"[bug-ai] {rel_path}: {len(findings)} bugs found")
    return findings


async def scan_for_bugs(repo_path: str, sast_files: set[str]) -> list[dict]:
    """
    Orchestrate AI bug detection across source files in the repo.

    Priority order:
    1. Files already flagged by SAST (most likely to have bugs too)
    2. Other small source files until _AI_MAX_FILES is reached

    sast_files: set of relative file paths that had SAST findings.
    """
    import asyncio

    # Collect all source files in the repo
    all_source: list[tuple[int, str]] = []  # (priority, rel_path)
    for root, dirs, files in os.walk(repo_path):
        # Prune skip dirs in-place so os.walk doesn't descend into them
        dirs[:] = [d for d in dirs if d not in _SKIP_DIRS]
        for fname in files:
            abs_path = os.path.join(root, fname)
            rel_path = os.path.relpath(abs_path, repo_path)
            ext = os.path.splitext(fname)[1].lower()
            if ext not in SOURCE_EXTENSIONS:
                continue
            if _SKIP_FILE_RE.search(fname):
                continue
            priority = 0 if rel_path in sast_files else 1
            all_source.append((priority, rel_path))

    # Sort: SAST-flagged files first, then alphabetical
    all_source.sort(key=lambda x: (x[0], x[1]))

    # Pick up to _AI_MAX_FILES that are small enough
    candidates: list[tuple[str, str]] = []  # (rel_path, content)
    for _, rel_path in all_source:
        if len(candidates) >= _AI_MAX_FILES:
            break
        abs_path = os.path.join(repo_path, rel_path)
        try:
            with open(abs_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            continue
        if not _should_ai_review(rel_path, content):
            continue
        candidates.append((rel_path, content))

    if not candidates:
        print("[bug-ai] No suitable files for AI bug review")
        return []

    print(f"[bug-ai] Running AI bug detection on {len(candidates)} files...")
    semaphore = asyncio.Semaphore(5)  # Conservative limit for bug review calls

    async def _limited(rel_path: str, content: str) -> list[dict]:
        async with semaphore:
            return await detect_bugs_in_file(rel_path, content)

    results = await asyncio.gather(
        *[_limited(rp, ct) for rp, ct in candidates],
        return_exceptions=True,
    )

    all_bugs: list[dict] = []
    for r in results:
        if isinstance(r, list):
            all_bugs.extend(r)

    print(f"[bug-ai] Total AI-detected bugs: {len(all_bugs)}")
    return all_bugs
