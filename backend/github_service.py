"""
GitHub Service — Fetch repository files using the GitHub API (no git clone needed).
"""

import asyncio
import os
import base64
import shutil
import stat
import tempfile
import httpx
import uuid
import time
import jwt


CLONE_BASE_DIR = os.path.join(tempfile.gettempdir(), "vulnguard_repos")

# File extensions to download (covers all popular languages)
SUPPORTED_EXTENSIONS = {
    # Python
    ".py",
    # JavaScript / TypeScript
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    # Java
    ".java",
    # C / C++
    ".c", ".h", ".cpp", ".hpp", ".cc", ".cxx",
    # C#
    ".cs",
    # Go
    ".go",
    # Ruby
    ".rb",
    # PHP
    ".php",
    # Rust
    ".rs",
    # Swift
    ".swift",
    # Kotlin
    ".kt", ".kts",
    # Scala
    ".scala",
    # Shell / Bash
    ".sh", ".bash",
    # Web
    ".html", ".htm", ".css", ".vue", ".svelte",
    # Config / Data (can contain secrets)
    ".yaml", ".yml", ".json", ".xml", ".toml", ".ini", ".cfg", ".conf",
    ".env", ".properties",
    # Docker / Infra
    ".dockerfile",
    # SQL
    ".sql",
    # Dart
    ".dart",
    # Lua
    ".lua",
    # R
    ".r",
    # Perl
    ".pl", ".pm",
    # Elixir / Erlang
    ".ex", ".exs", ".erl",
}

# Files to always include regardless of extension
INCLUDE_FILENAMES = {
    "Dockerfile", "Makefile", "Gemfile", "Rakefile",
    ".htaccess", ".gitignore", "Vagrantfile",
}

# Max file size to download (100KB — skip large generated/minified files)
MAX_FILE_SIZE = 100_000

# How many files to fetch concurrently
DOWNLOAD_BATCH_SIZE = 10


def _parse_repo_url(repo_url: str) -> tuple[str, str]:
    """Extract owner and repo name from a GitHub URL."""
    # Handle URLs like:
    #   https://github.com/owner/repo
    #   https://github.com/owner/repo.git
    #   https://github.com/owner/repo/
    url = repo_url.rstrip("/")
    if url.endswith(".git"):
        url = url[:-4]
    parts = url.split("/")
    owner = parts[-2]
    repo = parts[-1]
    return owner, repo


def _force_rmtree(path: str) -> None:
    """Remove a directory tree, handling read-only files (Windows .git compat)."""
    def on_rm_error(func, file_path, exc_info):
        os.chmod(file_path, stat.S_IWRITE)
        func(file_path)

    if os.path.exists(path):
        shutil.rmtree(path, onerror=on_rm_error)


async def _fetch_single_file(
    client: httpx.AsyncClient,
    headers: dict,
    owner: str,
    repo: str,
    item: dict,
    local_path: str,
) -> bool:
    """Download one file from the GitHub contents API and save it locally."""
    path = item["path"]
    file_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
    try:
        file_resp = await client.get(file_url, headers=headers)
        if file_resp.status_code != 200:
            return False

        file_data = file_resp.json()
        content_b64 = file_data.get("content", "")
        if not content_b64:
            return False

        # Decode base64 content
        content = base64.b64decode(content_b64).decode("utf-8", errors="ignore")

        # Save to local directory
        local_file_path = os.path.join(local_path, path)
        dir_name = os.path.dirname(local_file_path)
        if dir_name:  # Guard against empty dirname for root-level files
            os.makedirs(dir_name, exist_ok=True)
        with open(local_file_path, "w", encoding="utf-8") as f:
            f.write(content)

        return True

    except Exception as e:
        print(f"[!] Failed to fetch {path}: {e}")
        return False


async def fetch_repo(repo_url: str, github_token: str | None = None) -> str:
    """
    Fetch repository source files using the GitHub API.
    github_token: user's OAuth token passed from Nango (preferred).
                  Falls back to env GITHUB_TOKEN, then unauthenticated (60 req/hr).
    Returns the local directory path containing the downloaded files.
    """
    owner, repo = _parse_repo_url(repo_url)
    local_path = os.path.join(CLONE_BASE_DIR, repo)

    # Clean up any previous run
    _force_rmtree(local_path)
    os.makedirs(local_path, exist_ok=True)

    print(f"[+] Fetching repo via GitHub API: {owner}/{repo}")

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "VulnGuard-AI",
    }

    # Priority: user Nango OAuth token > env GITHUB_TOKEN > unauthenticated
    token = github_token or os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
        source = "user OAuth (Nango)" if github_token else "env GITHUB_TOKEN"
        print(f"[+] Authenticated via {source}")

    # Use a generous timeout: 60s connect, 120s read for large file downloads
    timeout = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)

    async with httpx.AsyncClient(timeout=timeout) as client:

        # ── Step 1: Resolve the default branch ───────────────────────────────
        repo_info_url = f"https://api.github.com/repos/{owner}/{repo}"
        repo_resp = await client.get(repo_info_url, headers=headers)

        if repo_resp.status_code == 404:
            raise Exception(f"Repository not found: {owner}/{repo}. Check the URL and that the repo is public.")
        if repo_resp.status_code == 401:
            raise Exception("GitHub API authentication failed. Check your GITHUB_TOKEN.")
        if repo_resp.status_code != 200:
            raise Exception(
                f"GitHub API error fetching repo info ({repo_resp.status_code}): {repo_resp.text[:200]}"
            )

        repo_info = repo_resp.json()
        default_branch = repo_info.get("default_branch", "main")
        print(f"[+] Default branch: {default_branch}")

        # ── Step 2: Get the repo file tree (recursive) ───────────────────────
        tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
        tree_resp = await client.get(tree_url, headers=headers)

        if tree_resp.status_code != 200:
            raise Exception(
                f"GitHub API error fetching tree ({tree_resp.status_code}): {tree_resp.text[:200]}"
            )

        tree_data = tree_resp.json()
        tree = tree_data.get("tree", [])

        # Warn if the tree was truncated (repo > 100k files)
        if tree_data.get("truncated"):
            print("[!] Warning: repository tree was truncated by GitHub API (repo is very large)")

        # ── Step 3: Filter files we want to download ──────────────────────────
        files_to_fetch = []
        for item in tree:
            if item.get("type") != "blob":
                continue
            path = item.get("path", "")
            size = item.get("size", 0)

            # Skip large files
            if size > MAX_FILE_SIZE:
                continue

            filename = os.path.basename(path)
            ext = os.path.splitext(filename)[1].lower()

            if ext in SUPPORTED_EXTENSIONS or filename in INCLUDE_FILENAMES:
                files_to_fetch.append(item)

        print(f"[+] Found {len(files_to_fetch)} source files to analyze (out of {len(tree)} total)")

        # ── Step 4: Fetch file contents concurrently in batches ──────────────
        downloaded = 0
        for i in range(0, len(files_to_fetch), DOWNLOAD_BATCH_SIZE):
            batch = files_to_fetch[i: i + DOWNLOAD_BATCH_SIZE]
            tasks = [
                _fetch_single_file(client, headers, owner, repo, item, local_path)
                for item in batch
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            downloaded += sum(1 for r in results if r is True)

        print(f"[+] Downloaded {downloaded}/{len(files_to_fetch)} files to {local_path}")

    return local_path


def cleanup_repo(repo_path: str) -> None:
    """Remove a fetched repository from disk."""
    _force_rmtree(repo_path)
    print(f"[+] Cleaned up: {repo_path}")


def _parse_pr_url(pr_url: str) -> tuple[str, str, int]:
    """
    Extract owner, repo, and PR number from a GitHub PR URL.
    Accepts: https://github.com/owner/repo/pull/123
    """
    url = pr_url.rstrip("/")
    parts = url.split("/")
    try:
        pull_idx = parts.index("pull")
        pr_number = int(parts[pull_idx + 1])
        repo = parts[pull_idx - 1]
        owner = parts[pull_idx - 2]
        return owner, repo, pr_number
    except (ValueError, IndexError):
        raise ValueError(f"Cannot parse PR URL: {pr_url}. Expected format: https://github.com/owner/repo/pull/123")


async def fetch_pr_files(pr_url: str, github_token: str | None = None) -> tuple[str, list[dict]]:
    """
    Fetch only the files changed in a GitHub Pull Request.

    Returns:
        (local_repo_path, changed_files_metadata)

    Each entry in changed_files_metadata contains:
        - filename: relative path
        - patch: unified diff of the changed lines
        - additions: number of lines added
        - deletions: number of lines removed
        - status: 'added' | 'modified' | 'removed' | 'renamed'

    This mirrors how CodeRabbit works — scan only what changed, with full
    file context from disk so the AI sees the complete function, not just the diff.
    """
    owner, repo, pr_number = _parse_pr_url(pr_url)
    local_path = os.path.join(CLONE_BASE_DIR, f"{repo}_pr{pr_number}")
    _force_rmtree(local_path)
    os.makedirs(local_path, exist_ok=True)

    print(f"[+] Fetching PR #{pr_number} files: {owner}/{repo}")

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "VulnGuard-AI",
    }
    token = github_token or os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"

    timeout = httpx.Timeout(connect=30.0, read=120.0, write=30.0, pool=30.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        # ── Get list of changed files with diff patches ────────────────────
        files_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"
        files_resp = await client.get(files_url, headers=headers)
        if files_resp.status_code == 404:
            raise Exception(f"PR not found: {owner}/{repo}#{pr_number}")
        if files_resp.status_code != 200:
            raise Exception(f"GitHub API error ({files_resp.status_code}): {files_resp.text[:200]}")

        changed_files = files_resp.json()
        print(f"[+] PR #{pr_number} changed {len(changed_files)} files")

        # ── Download full content of each changed file ─────────────────────
        # We need the full file (not just the diff patch) so the AI gets
        # complete function context rather than just the changed lines.
        downloaded = 0
        for file_info in changed_files:
            filename = file_info.get("filename", "")
            status = file_info.get("status", "modified")

            if status == "removed":
                continue  # File was deleted — nothing to scan

            ext = os.path.splitext(filename)[1].lower()
            basename = os.path.basename(filename)
            if ext not in SUPPORTED_EXTENSIONS and basename not in INCLUDE_FILENAMES:
                continue

            size = file_info.get("blob_url", "")  # blob_url available for size check
            # Fetch full file content
            file_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{filename}"
            file_resp = await client.get(file_url, headers=headers)
            if file_resp.status_code != 200:
                continue

            file_data = file_resp.json()
            content_b64 = file_data.get("content", "")
            if not content_b64:
                continue

            content = base64.b64decode(content_b64).decode("utf-8", errors="ignore")
            local_file_path = os.path.join(local_path, filename)
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            with open(local_file_path, "w", encoding="utf-8") as f:
                f.write(content)
            downloaded += 1

        print(f"[+] Downloaded {downloaded} changed files to {local_path}")

    return local_path, changed_files


async def _get_github_headers(owner: str, repo: str, github_token: str | None = None) -> dict:
    """
    Generates GitHub API headers.
    Priority: passed token (Nango OAuth) > GitHub App > env GITHUB_TOKEN
    """
    # 1. Use user's Nango OAuth token if provided
    if github_token:
        return {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {github_token}",
            "User-Agent": "VulnGuard-AI",
        }

    app_id = os.getenv("GITHUB_APP_ID")
    installation_id = os.getenv("GITHUB_APP_INSTALLATION_ID")
    private_key = os.getenv("GITHUB_APP_PRIVATE_KEY")

    if app_id and installation_id and private_key:
        print("[+] Generating GitHub App Installation Token for Bot commit...")
        private_key = private_key.replace("\\n", "\n")
        now = int(time.time())
        payload = {
            "iat": now,
            "exp": now + (10 * 60),
            "iss": app_id
        }
        jwt_token = jwt.encode(payload, private_key, algorithm="RS256")
        
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {jwt_token}",
            "User-Agent": "VulnGuard-AI"
        }
        
        # Get the installation access token
        async with httpx.AsyncClient() as client:
            token_url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
            resp = await client.post(token_url, headers=headers)
            if resp.status_code != 201:
                raise Exception(f"Failed to generate Installation Access Token: {resp.text}")
            access_token = resp.json()["token"]
            
        return {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"token {access_token}",
            "User-Agent": "VulnGuard-AI"
        }
    
    # Fallback to Personal Access Token from env
    github_token = os.getenv("GITHUB_TOKEN", "")
    if not github_token:
        raise Exception(
            "No GitHub token available. Connect your GitHub account via the web app "
            "or add GITHUB_TOKEN to your .env file."
        )

    return {
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"token {github_token}",
        "User-Agent": "VulnGuard-AI"
    }


async def create_pull_request_fix(
    repo_url: str,
    file_path: str,
    line: int,
    secure_code: str,
    github_token: str | None = None,
) -> str:
    """
    Creates a new branch, commits the secure code, opens a Pull Request, and auto-merges it.
    github_token: user's Nango OAuth token (preferred over env GITHUB_TOKEN).
    """
    owner, repo = _parse_repo_url(repo_url)
    headers = await _get_github_headers(owner, repo, github_token=github_token)

    async with httpx.AsyncClient(timeout=60.0) as client:
        # 1. Get default branch SHA
        repo_info_url = f"https://api.github.com/repos/{owner}/{repo}"
        repo_resp = await client.get(repo_info_url, headers=headers)
        if repo_resp.status_code != 200:
            raise Exception("Failed to get repository info.")
        default_branch = repo_resp.json().get("default_branch", "main")
        
        ref_url = f"https://api.github.com/repos/{owner}/{repo}/git/ref/heads/{default_branch}"
        ref_resp = await client.get(ref_url, headers=headers)
        if ref_resp.status_code != 200:
            raise Exception("Failed to get base reference from GitHub.")
        base_sha = ref_resp.json()["object"]["sha"]

        # 2. Create new branch
        branch_name = f"vulnguard-fix-{uuid.uuid4().hex[:8]}"
        create_ref_url = f"https://api.github.com/repos/{owner}/{repo}/git/refs"
        create_ref_payload = {"ref": f"refs/heads/{branch_name}", "sha": base_sha}
        create_ref_resp = await client.post(create_ref_url, headers=headers, json=create_ref_payload)
        if create_ref_resp.status_code != 201:
            raise Exception(f"Failed to create branch: {create_ref_resp.text}")

        # 3. Get existing file content & SHA
        file_url = f"https://api.github.com/repos/{owner}/{repo}/contents/{file_path}?ref={branch_name}"
        file_resp = await client.get(file_url, headers=headers)
        if file_resp.status_code != 200:
            raise Exception(f"Failed to fetch file contents for {file_path}.")
        file_data = file_resp.json()
        file_sha = file_data["sha"]
        content_b64 = file_data.get("content", "")
        original_content = base64.b64decode(content_b64).decode("utf-8")

        # 4. Replace vulnerable snippet with secure code
        lines = original_content.splitlines()
        start = max(0, line - 7 - 1)
        end = min(len(lines), line + 7)
        
        # Clean up the AI snippet if it has markdown formatting
        cleaned_secure_code = secure_code.strip()
        if cleaned_secure_code.startswith("```"):
            code_lines = cleaned_secure_code.split("\n")
            if len(code_lines) > 2:
                cleaned_secure_code = "\n".join(code_lines[1:-1])
        
        new_lines = lines[:start] + [cleaned_secure_code] + lines[end:]
        new_content = "\n".join(new_lines) + "\n"
        new_content_b64 = base64.b64encode(new_content.encode("utf-8")).decode("utf-8")

        # 5. Commit updated file
        update_payload = {
            "message": f"Security Fix: Remediate vulnerability in {file_path}",
            "content": new_content_b64,
            "sha": file_sha,
            "branch": branch_name
        }
        update_resp = await client.put(file_url, headers=headers, json=update_payload)
        if update_resp.status_code not in (200, 201):
            raise Exception(f"Failed to update file in branch: {update_resp.text}")

        # 6. Create Pull Request
        pr_url = f"https://api.github.com/repos/{owner}/{repo}/pulls"
        pr_payload = {
            "title": f"Security Fix: Remediate vulnerability in {file_path}",
            "body": "### VulnGuard AI Auto-Fix\\nThis Pull Request was automatically generated by VulnGuard AI to remediate a security vulnerability. Please review the changes before merging.\\n\\n**Fixed File:** `" + file_path + "`",
            "head": branch_name,
            "base": default_branch
        }
        pr_resp = await client.post(pr_url, headers=headers, json=pr_payload)
        if pr_resp.status_code != 201:
            raise Exception(f"Failed to create PR: {pr_resp.text}")
        
        pr_data = pr_resp.json()
        pr_html_url = pr_data["html_url"]
        pr_number = pr_data["number"]

        # 7. Auto-Merge Pull Request
        print(f"[+] Auto-merging Pull Request #{pr_number}...")
        merge_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/merge"
        merge_payload = {
            "commit_title": f"Auto-Merge: Security Fix in {file_path}",
            "commit_message": "Merged automatically by VulnGuard-AI Bot.",
            "merge_method": "squash"
        }
        merge_resp = await client.put(merge_url, headers=headers, json=merge_payload)
        if merge_resp.status_code not in (200, 204):
            print(f"[!] Warning: Failed to auto-merge PR: {merge_resp.text}")
            # We don't raise an exception here so the user still gets the PR link if merge fails due to branch protection contexts.

        return pr_html_url
