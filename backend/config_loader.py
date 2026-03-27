"""
Config Loader — Read vulnguard.yaml from a fetched repo root.
Mirrors CodeRabbit's .coderabbit.yaml per-repo configuration.

Example vulnguard.yaml:
  review:
    auto_approve_on_clean: true
    confidence_threshold: 40
    ignore_paths:
      - "tests/**"
      - "docs/**"
    language_hints:
      - "This is a Django REST framework project"
  notifications:
    telegram: true
    summary_comment: true
    inline_comments: true
    post_on_clean: false
  tools:
    semgrep: true
    bandit: true
    pip_audit: true
    npm_audit: true
    govulncheck: true
    bundler_audit: true
"""

import fnmatch
import os
from dataclasses import dataclass, field


@dataclass
class ReviewConfig:
    auto_approve_on_clean: bool = False
    confidence_threshold: int = 35
    ignore_paths: list[str] = field(default_factory=list)
    language_hints: list[str] = field(default_factory=list)
    review_draft_prs: bool = False


@dataclass
class NotificationConfig:
    telegram: bool = True
    summary_comment: bool = True
    inline_comments: bool = True
    post_on_clean: bool = True


@dataclass
class ToolsConfig:
    semgrep: bool = True
    bandit: bool = True
    pip_audit: bool = True
    npm_audit: bool = True
    govulncheck: bool = True
    bundler_audit: bool = True


@dataclass
class VulnGuardConfig:
    review: ReviewConfig = field(default_factory=ReviewConfig)
    notifications: NotificationConfig = field(default_factory=NotificationConfig)
    tools: ToolsConfig = field(default_factory=ToolsConfig)

    def should_ignore(self, file_path: str) -> bool:
        """Return True if the file matches an ignore_paths pattern."""
        for pattern in self.review.ignore_paths:
            if fnmatch.fnmatch(file_path, pattern):
                return True
        return False

    def language_context(self) -> str:
        """Return a string of language hints for the AI prompt."""
        if not self.review.language_hints:
            return ""
        return "Repository context: " + "; ".join(self.review.language_hints)


DEFAULT_CONFIG = VulnGuardConfig()


def load_config(repo_path: str) -> VulnGuardConfig:
    """
    Load vulnguard.yaml from the repo root.
    Falls back to defaults if file doesn't exist or is malformed.
    """
    config_path = os.path.join(repo_path, "vulnguard.yaml")
    if not os.path.exists(config_path):
        # Also try .vulnguard.yaml (hidden file variant)
        alt = os.path.join(repo_path, ".vulnguard.yaml")
        if not os.path.exists(alt):
            return DEFAULT_CONFIG
        config_path = alt

    try:
        import yaml  # PyYAML — add to requirements.txt
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        review_data = data.get("review", {})
        notif_data = data.get("notifications", {})
        tools_data = data.get("tools", {})

        return VulnGuardConfig(
            review=ReviewConfig(
                auto_approve_on_clean=review_data.get("auto_approve_on_clean", False),
                confidence_threshold=int(review_data.get("confidence_threshold", 35)),
                ignore_paths=review_data.get("ignore_paths", []),
                language_hints=review_data.get("language_hints", []),
                review_draft_prs=review_data.get("review_draft_prs", False),
            ),
            notifications=NotificationConfig(
                telegram=notif_data.get("telegram", True),
                summary_comment=notif_data.get("summary_comment", True),
                inline_comments=notif_data.get("inline_comments", True),
                post_on_clean=notif_data.get("post_on_clean", True),
            ),
            tools=ToolsConfig(
                semgrep=tools_data.get("semgrep", True),
                bandit=tools_data.get("bandit", True),
                pip_audit=tools_data.get("pip_audit", True),
                npm_audit=tools_data.get("npm_audit", True),
                govulncheck=tools_data.get("govulncheck", True),
                bundler_audit=tools_data.get("bundler_audit", True),
            ),
        )
    except Exception as e:
        print(f"[config] Failed to load vulnguard.yaml: {e} — using defaults")
        return DEFAULT_CONFIG
