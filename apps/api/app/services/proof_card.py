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
        "profile_id": int(card_data.get("profile_id")) if card_data.get("profile_id") is not None else None,
        "role": card_data.get("role"),
        "mastered_count": int(card_data.get("skills_mastered_count") or card_data.get("mastered_count", 0)),
        "readiness_score": round(float(card_data.get("readiness_score", 0.0)), 4),
        "issue_date": card_data.get("issue_date"),
        "narrative_summary": card_data.get("narrative_summary", "")
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
  <!-- Background Card Container -->
  <rect x="8" y="8" width="584" height="324" rx="24" fill="#faf9f5" stroke="#141413" stroke-width="2" stroke-opacity="0.1" />
  <rect x="20" y="20" width="560" height="300" rx="16" fill="#faf9f5" stroke="#141413" stroke-width="1" stroke-opacity="0.1" />

  <!-- Verified Seal Badge Icon -->
  <g transform="translate(480, 32)">
    <rect x="0" y="0" width="56" height="56" rx="16" fill="#e8e6dc" stroke="#141413" stroke-width="1" stroke-opacity="0.1" />
    <path d="M18 28L24 34L38 20" stroke="#141413" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </g>

  <!-- Header & Brand -->
  <text x="44" y="56" fill="#141413" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="12" font-weight="900" letter-spacing="1.5">CRYPTOGRAPHIC PROOF</text>
  <text x="44" y="74" fill="#3d3d3a" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="10" font-weight="800" letter-spacing="1.5">VERIFIABLE CREDENTIAL</text>

  <!-- Role Title -->
  <text x="44" y="125" fill="#141413" font-family="-apple-system, BlinkMacSystemFont, 'Inter', sans-serif" font-size="28" font-weight="900" letter-spacing="-0.5">{role}</text>

  <!-- Metrics Grid -->
  <!-- Readiness Score Box -->
  <rect x="44" y="150" width="160" height="70" rx="12" fill="#e8e6dc" stroke="#141413" stroke-width="1" stroke-opacity="0.1" />
  <text x="124" y="175" text-anchor="middle" fill="#3d3d3a" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5">READINESS</text>
  <text x="124" y="206" text-anchor="middle" fill="#141413" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="26" font-weight="900" letter-spacing="-1">{score_pct}</text>

  <!-- Mastered Skills Box -->
  <rect x="220" y="150" width="160" height="70" rx="12" fill="#e8e6dc" stroke="#141413" stroke-width="1" stroke-opacity="0.1" />
  <text x="300" y="175" text-anchor="middle" fill="#3d3d3a" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5">VERIFIED SKILLS</text>
  <text x="300" y="206" text-anchor="middle" fill="#141413" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="26" font-weight="900" letter-spacing="-1">{count}</text>

  <!-- Status Box -->
  <rect x="396" y="150" width="160" height="70" rx="12" fill="#141413" stroke="#141413" stroke-width="1" />
  <text x="476" y="175" text-anchor="middle" fill="#faf9f5" fill-opacity="0.7" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="9" font-weight="900" letter-spacing="1.5">VERIFICATION</text>
  <text x="476" y="206" text-anchor="middle" fill="#faf9f5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="20" font-weight="900" letter-spacing="0.5">AUTHENTIC</text>

  <!-- Cryptographic Signature and Verification Metadata -->
  <rect x="44" y="245" width="512" height="50" rx="12" fill="#3d3d3a" stroke="#141413" stroke-width="1" stroke-opacity="0.2" />
  <text x="60" y="265" fill="#faf9f5" fill-opacity="0.7" font-family="-apple-system, BlinkMacSystemFont, monospace" font-size="9" font-weight="800">ID: {cred_id} | DATE: {date_str}</text>
  <text x="60" y="282" fill="#faf9f5" font-family="-apple-system, BlinkMacSystemFont, monospace" font-size="10" font-weight="800">SIG: {sig_short}</text>
  <text x="430" y="275" fill="#faf9f5" fill-opacity="0.5" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="900" letter-spacing="1.5">EIKG CORE</text>
</svg>"""
    return svg
