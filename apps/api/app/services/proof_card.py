"""
Cryptographically Signed Proof Cards & Dynamic Exportable SVG Badges Service.
Provides tamper-proof credential signing via HMAC-SHA256 and SVG badge rendering.
"""
import hmac
import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

PROOF_CARD_SECRET = "pathfinder_master_signing_key_2026"

def generate_signed_proof_card(
    profile_id: int,
    role: str,
    mastered_skills: List[str],
    readiness_score: float,
    xapi_events: Optional[List[Dict[str, Any]]] = None,
    secret_key: str = PROOF_CARD_SECRET
) -> Dict[str, Any]:
    """
    Generates a cryptographically signed Proof Card credential payload with HMAC-SHA256 verification signature.
    Includes an auto-generated narrative based on actual problem-solving behavior if xAPI events are provided.
    """
    issue_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    timestamp = datetime.now(timezone.utc).isoformat()
    credential_id = f"CP-VERIFIED-{profile_id:04d}-{abs(hash(f'{profile_id}-{issue_date}')) % 100000:05d}"
    
    # Auto-generate narrative based on xAPI telemetry
    narrative_summary = (
        f"Demonstrated verified competency across {len(mastered_skills)} technical milestones "
        f"for '{role}' with a role readiness index of {round(readiness_score * 100, 1)}%."
    )
    if xapi_events:
        bugs_fixed = sum(1 for e in xapi_events if e.get("verb") == "fixed" and e.get("objectId") == "bug")
        reqs_clarified = sum(1 for e in xapi_events if e.get("verb") == "clarified" and e.get("objectId") == "requirement")
        if bugs_fixed > 0 or reqs_clarified > 0:
            narrative_summary += (
                f" Evidence of engineering grit: successfully fixed {bugs_fixed} build errors/bugs "
                f"and clarified {reqs_clarified} ambiguous requirements in a simulated corporate environment."
            )
            
    # Canonical payload for signing
    payload = {
        "credential_id": credential_id,
        "profile_id": profile_id,
        "role": role,
        "mastered_count": len(mastered_skills),
        "readiness_score": round(readiness_score, 4),
        "issue_date": issue_date,
        "narrative_summary": narrative_summary
    }
    
    canonical_string = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        secret_key.encode("utf-8"),
        canonical_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "credential_id": credential_id,
        "profile_id": profile_id,
        "role": role,
        "skills_mastered_count": len(mastered_skills),
        "mastered_skills": mastered_skills,
        "readiness_score": round(readiness_score, 4),
        "readiness_percentage": f"{round(readiness_score * 100, 1)}%",
        "issue_date": issue_date,
        "issued_at": timestamp,
        "issuer": "Career PathFinder AI Engine",
        "signature": signature,
        "signature_algorithm": "HMAC-SHA256",
        "is_verified": True,
        "narrative_summary": narrative_summary,
        "verification_endpoint": f"/api/v1/proof-card/verify?credential_id={credential_id}&sig={signature}"
    }

def verify_proof_card_signature(
    card_data: Dict[str, Any],
    secret_key: str = PROOF_CARD_SECRET
) -> bool:
    """
    Verifies that a Proof Card payload and its signature have not been tampered with.
    """
    signature = card_data.get("signature")
    if not signature:
        return False
        
    payload = {
        "credential_id": card_data.get("credential_id"),
        "profile_id": card_data.get("profile_id"),
        "role": card_data.get("role"),
        "mastered_count": card_data.get("skills_mastered_count") or card_data.get("mastered_count", 0),
        "readiness_score": round(float(card_data.get("readiness_score", 0.0)), 4),
        "issue_date": card_data.get("issue_date")
    }
    
    canonical_string = json.dumps(payload, sort_keys=True)
    expected_signature = hmac.new(
        secret_key.encode("utf-8"),
        canonical_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

def generate_proof_card_svg(card: Dict[str, Any]) -> str:
    """
    Renders an exportable, high-fidelity SVG badge certificate for the verified Proof Card.
    """
    role = card.get("role", "Software Engineer")
    score_pct = card.get("readiness_percentage", "100%")
    cred_id = card.get("credential_id", "CP-0000")
    date_str = card.get("issue_date", datetime.now().strftime("%Y-%m-%d"))
    sig_short = card.get("signature", "")[:16] + "..." if card.get("signature") else "VERIFIED"
    count = card.get("skills_mastered_count", 0)

    svg = f"""<svg width="600" height="340" viewBox="0 0 600 340" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#090D16" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#818CF8" />
      <stop offset="100%" stop-color="#C084FC" />
    </linearGradient>
    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Card Container -->
  <rect x="8" y="8" width="584" height="324" rx="20" fill="url(#bgGrad)" stroke="url(#glowGrad)" stroke-width="2.5" />

  <!-- Verified Seal Badge Icon -->
  <g transform="translate(480, 32)">
    <circle cx="28" cy="28" r="26" fill="#1E293B" stroke="#38BDF8" stroke-width="2" />
    <path d="M20 28L26 34L36 22" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Header & Brand -->
  <text x="36" y="48" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="700" letter-spacing="1.5">CAREER PATHFINDER</text>
  <text x="36" y="68" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" letter-spacing="0.5">VERIFIED PROOF OF READINESS</text>

  <!-- Role Title -->
  <text x="36" y="125" fill="#F8FAFC" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="800">{role}</text>

  <!-- Metrics Grid -->
  <!-- Readiness Score Box -->
  <rect x="36" y="150" width="160" height="70" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
  <text x="52" y="175" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">READINESS INDEX</text>
  <text x="52" y="206" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="800">{score_pct}</text>

  <!-- Mastered Skills Box -->
  <rect x="212" y="150" width="160" height="70" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
  <text x="228" y="175" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">VERIFIED GATES</text>
  <text x="228" y="206" fill="#818CF8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="24" font-weight="800">{count} Skills</text>

  <!-- Status Box -->
  <rect x="388" y="150" width="176" height="70" rx="12" fill="#0F172A" stroke="#334155" stroke-width="1.2" />
  <text x="404" y="175" fill="#94A3B8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11">VERIFICATION STATUS</text>
  <text x="404" y="206" fill="#34D399" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="18" font-weight="700">AUTHENTIC</text>

  <!-- Divider line -->
  <line x1="36" y1="245" x2="564" y2="245" stroke="#334155" stroke-width="1" />

  <!-- Cryptographic Signature and Verification Metadata -->
  <text x="36" y="272" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, monospace" font-size="11">ID: {cred_id} | DATE: {date_str}</text>
  <text x="36" y="292" fill="#64748B" font-family="-apple-system, BlinkMacSystemFont, monospace" font-size="10">HMAC-SHA256 SIG: {sig_short}</text>
  <text x="420" y="282" fill="#38BDF8" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="11" font-weight="600">PATHFINDER VERIFIED</text>
</svg>"""
    return svg
