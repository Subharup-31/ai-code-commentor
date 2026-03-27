"""
Scanner — Run Semgrep and Bandit static analysis tools.
Supports all popular programming languages through comprehensive Semgrep rulesets.
"""

import glob as glob_module
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed


# ── Semgrep rule packs ────────────────────────────────────────────────────────
#
# Ordering matters: high-precision packs first, broad packs last.
# Removed: p/ci (CI pipeline linting, not security vulnerabilities in code)
#          p/scala, p/kotlin, p/swift (very small packs, low signal-to-noise)
# Added:   p/trailofbits — Trail of Bits professional security rules (highest precision)
#          p/r2c-security-audit — Curated security audit rules by Semgrep's own team
#
SEMGREP_CONFIGS = [
    # ── Tier 1: Professional, high-precision packs ────────────────────────────
    "p/trailofbits",         # Trail of Bits curated rules — very low false-positive rate
    "p/r2c-security-audit",  # Semgrep's own curated security audit rules
    # ── Tier 2: Standard security frameworks ──────────────────────────────────
    "p/owasp-top-ten",       # OWASP Top 10 (injection, XSS, broken auth, etc.)
    "p/cwe-top-25",          # CWE Top 25 Most Dangerous Software Weaknesses
    "p/secrets",             # Hardcoded secrets, API keys, tokens, passwords
    "p/jwt",                 # JSON Web Token vulnerabilities
    # ── Tier 3: Infrastructure as Code ───────────────────────────────────────
    "p/dockerfile",          # Dockerfile security misconfigurations
    "p/terraform",           # Terraform IaC security issues
    "p/kubernetes",          # Kubernetes manifest security issues
    # ── Tier 4: Language-specific packs (30+ languages) ──────────────────────
    "p/javascript",          # JavaScript
    "p/typescript",          # TypeScript
    "p/python",              # Python
    "p/ruby",                # Ruby
    "p/php",                 # PHP
    "p/java",                # Java
    "p/go",                  # Go
    "p/csharp",              # C#
    "p/rust",                # Rust
    "p/c",                   # C / C++
    "p/kotlin",              # Kotlin (Android, JVM)
    "p/scala",               # Scala (JVM, Spark, Play)
    "p/swift",               # Swift (iOS / macOS)
    "p/solidity",            # Solidity (Ethereum smart contracts)
    "p/elixir",              # Elixir / Phoenix
    # ── Tier 5: Correctness / bug-class rules ─────────────────────────────────
    "p/default",             # Semgrep default pack — includes correctness + bug rules
    # ── Tier 6: Broad catch-all (run last to avoid duplicating Tier 1–5) ──────
    "p/security-audit",      # Broad multi-language security rules
]

# Directories that are almost entirely false-positive sources:
# - test / spec directories contain deliberately insecure code for testing
# - vendor / node_modules are third-party code not owned by the developer
# - build / dist are generated artefacts
# - migrations contain raw SQL that tools often misread as injection
EXCLUDE_DIRS = [
    "test", "tests", "__tests__", "spec", "specs",
    "mocks", "mock", "fixtures", "fixture",
    "node_modules", "vendor", "venv", ".venv", "env",
    "dist", "build", "target", "out", ".next", ".nuxt",
    "migrations", "migration",
    ".git", ".github",
]

# File name patterns to exclude (glob-style, matched against basename)
EXCLUDE_FILE_PATTERNS = [
    "*_test.go", "*_test.py", "*_spec.rb",
    "*.test.js", "*.test.ts", "*.test.jsx", "*.test.tsx",
    "*.spec.js", "*.spec.ts", "*.spec.jsx", "*.spec.tsx",
    "test_*.py", "conftest.py",
]


def _run_semgrep_config(config: str, exclude_flags: list, repo_path: str) -> list:
    """Run a single Semgrep config pack and return its raw results list."""
    cmd = [
        sys.executable, "-m", "semgrep",
        "--config", config,
        "--json",
        "--no-git-ignore",
        "--timeout", "30",
        *exclude_flags,
        repo_path,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.stdout.strip():
            data = json.loads(result.stdout)
            findings = data.get("results", [])
            if findings:
                print(f"[semgrep] {config}: +{len(findings)} findings")
            return findings
    except subprocess.TimeoutExpired:
        print(f"[semgrep] {config}: timed out, skipping")
    except json.JSONDecodeError:
        print(f"[semgrep] {config}: failed to parse output")
    except FileNotFoundError:
        raise  # Re-raise so caller can detect missing binary
    return []


def run_semgrep(repo_path: str) -> dict:
    """
    Run all Semgrep config packs in parallel via a thread pool.
    Each config is a separate subprocess — true parallelism, not GIL-bound.
    Deduplicates findings across all packs by (path, line, check_id).
    """
    exclude_flags: list[str] = []
    for d in EXCLUDE_DIRS:
        exclude_flags += ["--exclude-dir", d]
    for pattern in EXCLUDE_FILE_PATTERNS:
        exclude_flags += ["--exclude", pattern]

    all_results: list = []
    seen_ids: set = set()

    # Run all configs concurrently — each spawns its own semgrep subprocess
    max_workers = min(len(SEMGREP_CONFIGS), os.cpu_count() or 4)
    try:
        with ThreadPoolExecutor(max_workers=max_workers) as pool:
            futures = {
                pool.submit(_run_semgrep_config, cfg, exclude_flags, repo_path): cfg
                for cfg in SEMGREP_CONFIGS
            }
            for future in as_completed(futures):
                try:
                    findings = future.result()
                    for r in findings:
                        key = (
                            f"{r.get('path', '')}:"
                            f"{r.get('start', {}).get('line', 0)}:"
                            f"{r.get('check_id', '')}"
                        )
                        if key not in seen_ids:
                            seen_ids.add(key)
                            all_results.append(r)
                except FileNotFoundError:
                    print("[!] Semgrep not found. Install with: pip install semgrep")
                    return {"results": [], "error": "semgrep not installed"}
                except Exception as exc:
                    print(f"[semgrep] worker error: {exc}")
    except Exception as exc:
        print(f"[semgrep] pool error: {exc}")
        return {"results": [], "error": str(exc)}

    print(f"[semgrep] Total unique findings: {len(all_results)}")
    return {"results": all_results}


def run_bandit(repo_path: str) -> dict:
    """
    Run Bandit on the repository and return JSON results.
    Bandit only scans Python files — returns empty for non-Python repos.
    Test files are excluded to match Semgrep's exclusion policy.
    """
    # Build exclude paths for bandit (comma-separated directory names)
    exclude_paths = ",".join(EXCLUDE_DIRS)

    try:
        print(f"[bandit] Running on: {repo_path}")
        result = subprocess.run(
            [
                sys.executable, "-m", "bandit",
                "-r", repo_path,
                "-f", "json",
                "-ll",                      # Medium severity and above only
                "--exclude", exclude_paths, # Skip test/vendor dirs
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )

        output = result.stdout.strip()
        if output:
            try:
                data = json.loads(output)
                count = len(data.get("results", []))
                print(f"[bandit] Found {count} results")
                return data
            except json.JSONDecodeError:
                print("[bandit] Failed to parse output")
                return {"results": []}

        print("[bandit] No findings (repo may have no Python files)")
        return {"results": []}
    except FileNotFoundError:
        print("[!] Bandit not found. Install with: pip install bandit")
        return {"results": [], "error": "bandit not installed"}
    except subprocess.TimeoutExpired:
        print("[!] Bandit scan timed out after 300s")
        return {"results": [], "error": "timeout"}


def run_pip_audit(repo_path: str) -> dict:
    """
    Run pip-audit against every requirements*.txt found in the repo.

    pip-audit queries the OSV (Open Source Vulnerabilities) database — findings
    are 100% deterministic: a package at a given version either has a published
    CVE/GHSA or it doesn't.  Zero false positives possible.
    """
    req_files = []
    for pattern in ["requirements*.txt", "**/requirements*.txt"]:
        req_files.extend(glob_module.glob(os.path.join(repo_path, pattern), recursive=True))

    if not req_files:
        print("[pip-audit] No requirements*.txt found — skipping")
        return {"results": []}

    all_vulns = []
    for req_file in req_files:
        try:
            print(f"[pip-audit] Scanning: {req_file}")
            result = subprocess.run(
                [
                    sys.executable, "-m", "pip_audit",
                    "--requirement", req_file,
                    "--format", "json",
                    "--no-deps",          # Direct deps only — transitive noise
                    "--skip-editable",    # Skip local editable installs
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            output = result.stdout.strip()
            if output:
                data = json.loads(output)
                for dep in data.get("dependencies", []):
                    for v in dep.get("vulns", []):
                        all_vulns.append({
                            "package": dep.get("name", "unknown"),
                            "version": dep.get("version", "unknown"),
                            "vuln_id": v.get("id", "N/A"),
                            "description": v.get("description", ""),
                            "fix_versions": v.get("fix_versions", []),
                            "req_file": os.path.relpath(req_file, repo_path),
                        })
        except subprocess.TimeoutExpired:
            print(f"[pip-audit] {req_file}: timed out, skipping")
        except (FileNotFoundError, ModuleNotFoundError):
            print("[!] pip-audit not found — install with: pip install pip-audit")
            return {"results": [], "error": "pip-audit not installed"}
        except Exception as e:
            print(f"[pip-audit] Error scanning {req_file}: {e}")

    print(f"[pip-audit] Found {len(all_vulns)} dependency vulnerabilities")
    return {"results": all_vulns}


def run_npm_audit(repo_path: str) -> dict:
    """
    Run npm audit --json against every package-lock.json found in the repo.
    Reports moderate+ severity advisories only.

    Like pip-audit, these are CVE database lookups — 100% deterministic.
    """
    lockfiles = [
        f for f in glob_module.glob(os.path.join(repo_path, "**/package-lock.json"), recursive=True)
        if "node_modules" not in f
    ]

    if not lockfiles:
        print("[npm-audit] No package-lock.json found — skipping")
        return {"results": []}

    all_vulns = []
    for lockfile in lockfiles:
        lockdir = os.path.dirname(lockfile)
        try:
            print(f"[npm-audit] Scanning: {lockfile}")
            result = subprocess.run(
                ["npm", "audit", "--json"],
                capture_output=True,
                text=True,
                timeout=120,
                cwd=lockdir,
            )
            output = result.stdout.strip()
            if output:
                data = json.loads(output)
                for pkg_name, vuln_data in data.get("vulnerabilities", {}).items():
                    if vuln_data.get("severity", "low") == "low":
                        continue
                    for via in vuln_data.get("via", []):
                        if not isinstance(via, dict):
                            continue
                        fix_info = vuln_data.get("fixAvailable")
                        fix_ver = fix_info.get("version", "") if isinstance(fix_info, dict) else ""
                        all_vulns.append({
                            "package": pkg_name,
                            "version": vuln_data.get("range", "unknown"),
                            "vuln_id": str(via.get("source", "N/A")),
                            "description": via.get("title", ""),
                            "severity": vuln_data.get("severity", "high"),
                            "fix_versions": [fix_ver] if fix_ver else [],
                            "lockfile": os.path.relpath(lockfile, repo_path),
                        })
        except subprocess.TimeoutExpired:
            print(f"[npm-audit] {lockfile}: timed out, skipping")
        except FileNotFoundError:
            print("[!] npm not found — skipping npm audit")
            return {"results": [], "error": "npm not installed"}
        except Exception as e:
            print(f"[npm-audit] Error: {e}")

    print(f"[npm-audit] Found {len(all_vulns)} npm dependency vulnerabilities")
    return {"results": all_vulns}


def run_go_vuln_check(repo_path: str) -> dict:
    """
    Run govulncheck on Go modules found in the repo.
    Finds CVE-mapped vulnerabilities in Go dependencies.
    """
    go_mod_files = glob_module.glob(os.path.join(repo_path, "**/go.mod"), recursive=True)
    if not go_mod_files:
        print("[govulncheck] No go.mod found — skipping")
        return {"results": []}

    all_vulns = []
    for go_mod in go_mod_files:
        mod_dir = os.path.dirname(go_mod)
        try:
            print(f"[govulncheck] Scanning: {go_mod}")
            result = subprocess.run(
                ["govulncheck", "-json", "./..."],
                capture_output=True, text=True, timeout=120, cwd=mod_dir,
            )
            output = result.stdout.strip()
            if output:
                # govulncheck emits one JSON object per line
                for line in output.splitlines():
                    try:
                        obj = json.loads(line)
                        vuln = obj.get("vulnerability", {})
                        if not vuln:
                            continue
                        for affected in vuln.get("affected", []):
                            all_vulns.append({
                                "package": affected.get("package", {}).get("name", "unknown"),
                                "version": "unknown",
                                "vuln_id": vuln.get("id", "N/A"),
                                "description": vuln.get("summary", ""),
                                "fix_versions": [],
                                "req_file": os.path.relpath(go_mod, repo_path),
                            })
                    except json.JSONDecodeError:
                        pass
        except FileNotFoundError:
            print("[govulncheck] Not installed — skipping (install: go install golang.org/x/vuln/cmd/govulncheck@latest)")
            return {"results": [], "error": "govulncheck not installed"}
        except subprocess.TimeoutExpired:
            print(f"[govulncheck] {go_mod}: timed out, skipping")
        except Exception as e:
            print(f"[govulncheck] Error: {e}")

    print(f"[govulncheck] Found {len(all_vulns)} Go dependency vulnerabilities")
    return {"results": all_vulns}


def run_bundler_audit(repo_path: str) -> dict:
    """
    Run bundler-audit on Ruby Gemfile.lock files.
    """
    gemfiles = glob_module.glob(os.path.join(repo_path, "**/Gemfile.lock"), recursive=True)
    if not gemfiles:
        print("[bundler-audit] No Gemfile.lock found — skipping")
        return {"results": []}

    all_vulns = []
    for gemfile in gemfiles:
        gem_dir = os.path.dirname(gemfile)
        try:
            print(f"[bundler-audit] Scanning: {gemfile}")
            result = subprocess.run(
                ["bundle", "audit", "check", "--update", "--format", "json"],
                capture_output=True, text=True, timeout=120, cwd=gem_dir,
            )
            output = result.stdout.strip()
            if output:
                data = json.loads(output)
                for vuln in data.get("results", []):
                    all_vulns.append({
                        "package": vuln.get("gem", {}).get("name", "unknown"),
                        "version": vuln.get("gem", {}).get("version", "unknown"),
                        "vuln_id": vuln.get("advisory", {}).get("id", "N/A"),
                        "description": vuln.get("advisory", {}).get("title", ""),
                        "fix_versions": [vuln.get("advisory", {}).get("patched_versions", "")],
                        "req_file": os.path.relpath(gemfile, repo_path),
                    })
        except FileNotFoundError:
            print("[bundler-audit] Not installed — skipping (install: gem install bundler-audit)")
            return {"results": [], "error": "bundler-audit not installed"}
        except Exception as e:
            print(f"[bundler-audit] Error: {e}")

    print(f"[bundler-audit] Found {len(all_vulns)} Ruby gem vulnerabilities")
    return {"results": all_vulns}
