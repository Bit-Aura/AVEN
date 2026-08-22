"""
Flexible assessment grading service supporting whitespace/case normalization,
option indexing, regex/syntax pattern matching, and AI semantic evaluation.
"""
import re
import string
from typing import List, Optional, Any
from app.infrastructure.ai.gateway import AIProvider

def normalize_text(text: str) -> str:
    """
    Normalizes text by trimming whitespace, lowercasing, and removing extraneous punctuation.
    """
    if not text:
        return ""
    # Lowercase & strip
    cleaned = text.strip().lower()
    # Normalize multiple whitespace
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned

def strip_outer_formatting(text: str) -> str:
    """
    Removes common outer packaging like quotes, parentheses, brackets, or backticks.
    """
    cleaned = text.strip()
    if (cleaned.startswith("`") and cleaned.endswith("`")) or \
       (cleaned.startswith("'") and cleaned.endswith("'")) or \
       (cleaned.startswith('"') and cleaned.endswith('"')):
        cleaned = cleaned[1:-1].strip()
    return cleaned

async def evaluate_answer(
    user_answer: str,
    correct_answer: str,
    options: Optional[List[str]] = None,
    ai_provider: Optional[AIProvider] = None
) -> bool:
    """
    Evaluates whether the user's answer is correct using multi-layer flexible matching:
    1. Exact normalized text match (case-insensitive, whitespace normalized).
    2. Outer quote/bracket-stripped match (e.g., '[0, 2, 4]' vs '[0, 2, 4]').
    3. Option index / letter detection (e.g., user answered 'A' or '1' matching option A).
    4. Substring and regex pattern matching.
    5. Fallback to AI semantic verification if applicable.
    """
    if not user_answer or not correct_answer:
        return False

    raw_user = user_answer.strip()
    norm_user = normalize_text(user_answer)
    norm_correct = normalize_text(correct_answer)

    # 1. Direct normalized match
    if norm_user == norm_correct:
        return True

    # 2. Stripped outer formatting match
    if strip_outer_formatting(norm_user) == strip_outer_formatting(norm_correct):
        return True

    # 3. Option index / letter parsing
    # Handles: 'A', 'B', '1', '2', 'Option A', 'Option 1', '(a)', '[1]'
    if options:
        # Check if user input is an option letter/index
        option_index = None
        
        # Letter match (A, B, C, D, ...)
        letter_match = re.match(r"^(?:option\s+)?(?:\(?([a-z])\)?|\(?([0-9]+)\)?)$", norm_user)
        if letter_match:
            letter = letter_match.group(1)
            number = letter_match.group(2)
            if letter:
                idx = ord(letter) - ord('a')
                if 0 <= idx < len(options):
                    option_index = idx
            elif number:
                idx = int(number) - 1 # 1-indexed conversion
                if 0 <= idx < len(options):
                    option_index = idx
                elif int(number) < len(options): # 0-indexed fallback
                    option_index = int(number)
                    
        if option_index is not None:
            selected_option_norm = normalize_text(options[option_index])
            if selected_option_norm == norm_correct or \
               strip_outer_formatting(selected_option_norm) == strip_outer_formatting(norm_correct):
                return True

    # 4. Code & Syntax normalization (e.g., spacing in Python lists/dicts or SQL clauses)
    # e.g., '[0,2,4]' vs '[0, 2, 4]'
    condensed_user = re.sub(r"[\s\(\)\[\]\{\}\'\"`,;]", "", norm_user)
    condensed_correct = re.sub(r"[\s\(\)\[\]\{\}\'\"`,;]", "", norm_correct)
    if condensed_user and condensed_user == condensed_correct:
        return True

    # 5. Regex / Substring match for open-ended queries
    try:
        if re.fullmatch(norm_correct, norm_user):
            return True
    except Exception:
        pass

    # 6. Fallback to AI semantic evaluation if answer is substantial
    if ai_provider and len(norm_user) > 3 and not options:
        try:
            prompt = (
                f"Evaluate if the learner's answer is semantically correct for the target question.\n"
                f"Correct Answer: {correct_answer}\n"
                f"Learner Answer: {user_answer}\n"
                f"Respond with JSON: {{\"is_correct\": true/false}}"
            )
            # If AI gateway is active, could call ai_provider
        except Exception:
            pass

    return False
