"""
AI Engine — LLM-powered vulnerability analysis using NVIDIA via OpenRouter.

Two-pass validation pipeline:
  Pass 1 — Analysis: LLM triages the finding, assigns confidence 0-100.
  Pass 2 — Skeptic:  A second prompt challenges Pass 1's conclusion.
                     If it drops confidence by ≥ 25 points the finding is
                     marked uncertain and may be filtered downstream.
"""

import asyncio
import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
# Using a reliable free model — deepseek-r1 is consistently available on OpenRouter
MODEL_NAME = os.getenv("OPENROUTER_MODEL", "stepfun/step-3.5-flash:free")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
_OPENROUTER_HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://github.com/vulnguard-ai",
    "X-Title": "VulnGuard AI",
}


ANALYSIS_PROMPT = """You are a senior application-security engineer performing a precise triage of a static-analysis finding.

**Vulnerability Type:** {issue}
**File:** {file}
**Line:** {line}
**Code Snippet (the flagged line is marked with >>>):**
```
{code_snippet}
```

**Weakness context (NVD / CWE):**
{nvd_context}

**Your task — think carefully before answering:**

1. Read the FULL code snippet, not just the flagged line.
2. Look for mitigating controls already present (input validation, parameterised queries, output encoding, authentication guards, etc.).
3. Determine whether this is a genuine, exploitable vulnerability in real production code, a false positive (test/mock data, properly sanitised input, unreachable code path, or a known-safe pattern misidentified by the scanner), or uncertain.
4. Assign a confidence score from 0–100 reflecting how certain you are that this is a TRUE POSITIVE exploitable in a real attack:
   - 90–100: Definitive exploit path visible in the snippet.
   - 70–89:  Strong indicators but full call chain not visible.
   - 40–69:  Plausible finding but significant context is missing.
   - 0–39:   Likely false positive or test artifact.
5. Set `is_false_positive` to true if confidence < 35 OR you can clearly see a mitigating control.

Return ONLY valid JSON (no markdown fences):
{{
  "is_false_positive": <boolean>,
  "confidence_score": <integer 0-100>,
  "exploitability": "one of: Critical | High | Medium | Low | None",
  "mitigations_present": "Describe any existing sanitisation / guards you found in the snippet, or 'None detected'",
  "explanation": "Precise explanation referencing the specific lines involved. State the most applicable **OWASP Top 10** category (e.g., **A03:2021-Injection**). Reference the CWE/CVE from the context. Use **bold** for key terms.",
  "attack_simulation": {{
    "payload": "A concrete, specific payload (e.g., `' OR 1=1 --`). If not applicable, write 'N/A — not directly exploitable'.",
    "description": "Step-by-step attack scenario tied to the actual code, not a generic description."
  }},
  "secure_fix": {{
    "description": "Precise remediation tied to the lines shown. Reference the specific function or pattern to replace.",
    "code": "The corrected code snippet with the vulnerability fixed. Must be syntactically valid."
  }}
}}
"""

# ── Pass 2: Skeptic prompt ─────────────────────────────────────────────────────
# Challenges the Pass 1 conclusion to catch AI overconfidence.
# Only runs when Pass 1 confidence >= 50 (no value challenging already-uncertain findings).

SKEPTIC_PROMPT = """You are a senior security engineer doing a peer review of a colleague's vulnerability report.

**Original finding:**
- File: {file}, Line: {line}
- Issue: {issue}
- Code:
```
{code_snippet}
```

**Your colleague's assessment:**
- Confidence: {confidence}/100
- Exploitability: {exploitability}
- Mitigations found: {mitigations}
- Explanation: {explanation}

**Your job:** Be a rigorous skeptic. Look for reasons this might NOT be a real vulnerability:
1. Is the flagged code actually reachable from untrusted input, or is it internal/hardcoded?
2. Are there sanitisation, validation, or encoding steps visible in the snippet that your colleague missed?
3. Is this test/fixture/mock code that happens to look insecure but is never executed in production?
4. Is the static tool pattern-matching on a safe API that resembles a dangerous one (e.g. a parameterised query that looks like string interpolation)?
5. Does the exploit scenario require conditions that are unrealistic in this codebase?

Return ONLY valid JSON (no markdown):
{{
  "agree_with_finding": <boolean>,
  "skeptic_confidence": <integer 0-100>,
  "strongest_objection": "The single strongest argument that this is NOT a real vulnerability, or 'No objection — confirmed true positive' if you agree.",
  "final_verdict": "one of: confirmed | uncertain | likely_false_positive"
}}
"""


async def _call_openrouter(prompt: str, retries: int = 3) -> str:
    """Send a prompt to OpenRouter (NVIDIA model) and return the raw text response."""
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
            # Strip markdown code fences if present
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
                await asyncio.sleep(2 ** attempt)  # 1s, 2s backoff
    raise last_exc


async def call_openrouter_general(prompt: str, retries: int = 3) -> str:
    """Call OpenRouter for general (non-JSON) tasks like PR summaries and explanations."""
    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
    }
    last_exc: Exception = RuntimeError("No attempts made")
    for attempt in range(retries):
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(OPENROUTER_API_URL, json=payload, headers=_OPENROUTER_HEADERS)
                resp.raise_for_status()
                text = resp.json()["choices"][0]["message"]["content"].strip()
            # Strip markdown code fences if present
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


# Keep backward compatibility alias
call_gemini = call_openrouter_general


async def _skeptic_review(vuln: dict, pass1: dict) -> dict:
    """
    Pass 2 — Skeptic validation.
    Returns the Pass 1 dict, optionally with adjusted confidence and verdict.
    """
    try:
        prompt = SKEPTIC_PROMPT.format(
            file=vuln.get("file", "unknown"),
            line=vuln.get("line", 0),
            issue=vuln.get("issue", "Unknown"),
            code_snippet=vuln.get("code_snippet", "No code available"),
            confidence=pass1.get("confidence_score", 50),
            exploitability=pass1.get("exploitability", "Medium"),
            mitigations=pass1.get("mitigations_present", "None detected"),
            explanation=pass1.get("explanation", ""),
        )
        text = await _call_openrouter(prompt)
        skeptic = json.loads(text)

        skeptic_conf = int(skeptic.get("skeptic_confidence", pass1["confidence_score"]))
        verdict = skeptic.get("final_verdict", "confirmed")
        objection = skeptic.get("strongest_objection", "")

        # If the skeptic drops confidence by >= 25 points, update the result
        original_conf = pass1["confidence_score"]
        if skeptic_conf < original_conf - 25:
            pass1["confidence_score"] = skeptic_conf
            pass1["mitigations_present"] = (
                f"{pass1.get('mitigations_present', 'None detected')} | "
                f"Skeptic review: {objection}"
            )
            if verdict == "likely_false_positive":
                pass1["is_false_positive"] = True
            elif verdict == "uncertain":
                # Don't flip to FP, but lower confidence is already set
                pass
            print(f"     [SKEPTIC] {vuln.get('file')}:{vuln.get('line')} "
                  f"confidence {original_conf}→{skeptic_conf} ({verdict})")
        else:
            pass1["mitigations_present"] = (
                f"{pass1.get('mitigations_present', 'None detected')} | "
                f"Skeptic confirmed: {objection or 'No objection'}"
            )

    except Exception as e:
        print(f"[!] Skeptic review error (non-fatal): {e}")

    return pass1


async def analyze_vulnerability(vuln: dict, extra_context: str = "") -> dict:
    """
    Two-pass vulnerability analysis:
      Pass 1 — Triage: assigns confidence, exploitability, explanation, fix.
      Pass 2 — Skeptic: challenges the conclusion; may lower confidence or flip to FP.
    Falls back gracefully if the API is unavailable.
    """
    if not OPENROUTER_API_KEY:
        return _fallback_analysis(vuln)

    text = ""
    try:
        # ── Pass 1: Analysis ───────────────────────────────────────────────────
        prompt = ANALYSIS_PROMPT.format(
            issue=vuln.get("issue", "Unknown"),
            file=vuln.get("file", "unknown"),
            line=vuln.get("line", 0),
            code_snippet=vuln.get("code_snippet", "No code available"),
            nvd_context=vuln.get("cve", {}).get("nvd_context", "No NVD context available."),
        )
        text = await _call_openrouter(prompt)
        analysis = json.loads(text)

        result = {
            "is_false_positive": analysis.get("is_false_positive", False),
            "confidence_score": int(analysis.get("confidence_score", 50)),
            "exploitability": analysis.get("exploitability", "Medium"),
            "mitigations_present": analysis.get("mitigations_present", "None detected"),
            "explanation": analysis.get("explanation", "Analysis unavailable"),
            "attack_simulation": analysis.get("attack_simulation", {}),
            "secure_fix": analysis.get("secure_fix", {}),
        }

        # ── Pass 2: Skeptic review (only for confident findings) ───────────────
        # No point challenging something already rated < 50 — save API quota.
        if not result["is_false_positive"] and result["confidence_score"] >= 50:
            result = await _skeptic_review(vuln, result)

        return result

    except json.JSONDecodeError:
        return {
            "is_false_positive": False,
            "confidence_score": 40,
            "exploitability": "Medium",
            "mitigations_present": "Unknown — AI response could not be parsed",
            "explanation": text if text else "Analysis unavailable",
            "attack_simulation": {"payload": "N/A", "description": "Could not parse AI response"},
            "secure_fix": {"description": "Could not parse AI response", "code": ""},
        }
    except Exception as e:
        print(f"[!] AI Engine error: {e}")
        return _fallback_analysis(vuln)


def _fallback_analysis(vuln: dict) -> dict:
    """Provide a basic analysis when AI is unavailable."""
    issue = vuln.get("issue", "Security vulnerability")
    return {
        "is_false_positive": False,
        "confidence_score": 50,  # Neutral — no AI to validate
        "exploitability": "Medium",
        "mitigations_present": "Unknown — AI analysis unavailable",
        "explanation": f"A **{issue}** vulnerability was detected. This type of issue "
                       f"can lead to unauthorized access, data exposure, or system compromise. "
                       f"Please refer to the applicable **OWASP Top 10** category for more context.",
        "attack_simulation": {
            "payload": "Payload depends on vulnerability type — manual review required",
            "description": f"An attacker could exploit this {issue} vulnerability to "
                          f"compromise the application's security posture.",
        },
        "secure_fix": {
            "description": f"Review and remediate the {issue} issue by following "
                          f"OWASP secure coding guidelines.",
            "code": "# Refer to OWASP guidelines for secure implementation",
        },
    }
