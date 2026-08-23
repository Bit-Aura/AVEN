import re
import html
from html.parser import HTMLParser
from datetime import datetime, timezone
from typing import Optional, Any

class _HTMLTextExtractor(HTMLParser):
    """
    Robust, zero-dependency HTML to plain-text converter.
    Preserves paragraph spacing, list items, and line breaks while stripping tags.
    """
    def __init__(self):
        super().__init__()
        self._pieces = []
        self._block_tags = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "header", "footer"}
        self._list_item_tags = {"li"}
        self._break_tags = {"br", "hr"}

    def handle_starttag(self, tag, attrs):
        tag_lower = tag.lower()
        if tag_lower in self._block_tags:
            self._pieces.append("\n\n")
        elif tag_lower in self._list_item_tags:
            self._pieces.append("\n• ")
        elif tag_lower in self._break_tags:
            self._pieces.append("\n")

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower in self._block_tags:
            self._pieces.append("\n\n")

    def handle_data(self, data):
        self._pieces.append(data)

    def get_text(self) -> str:
        raw_text = "".join(self._pieces)
        # Decode HTML entities (e.g. &nbsp;, &amp;, &#39;)
        decoded = html.unescape(raw_text)
        # Strip zero-width spaces and formatting control chars
        decoded = re.sub(r"[\u200b\u200c\u200d\ufeff\u200e\u200f]", "", decoded)
        
        # Normalize multiple spaces per line, keep newlines
        lines = []
        for line in decoded.splitlines():
            cleaned_line = re.sub(r"[ \t]+", " ", line).strip()
            lines.append(cleaned_line)
            
        # Collapse multiple empty lines to max 2 newlines (paragraph boundary)
        collapsed = "\n".join(lines)
        collapsed = re.sub(r"\n{3,}", "\n\n", collapsed)
        return collapsed.strip()


def clean_html(raw_html: Optional[str]) -> Optional[str]:
    """
    Converts raw HTML job descriptions into human-readable plain text.
    Handles HTML entities, list items, and paragraph boundaries without external dependencies.
    """
    if not raw_html or not isinstance(raw_html, str):
        return None

    # First decode any escaped HTML entities like &lt;p&gt;
    unescaped_input = html.unescape(raw_html)

    # Check if string contains HTML tags
    if "<" in unescaped_input and ">" in unescaped_input:
        parser = _HTMLTextExtractor()
        try:
            parser.feed(unescaped_input)
            parser.close()
            text = parser.get_text()
            return text if text else None
        except Exception:
            # Fallback regex strip if HTML parser hits an unexpected parsing issue
            stripped = re.sub(r"<[^>]+>", " ", unescaped_input)
            cleaned = re.sub(r"\s+", " ", stripped).strip()
            return cleaned if cleaned else None
    else:
        # Plain text cleanup
        cleaned = re.sub(r"\s+", " ", unescaped_input).strip()
        return cleaned if cleaned else None


def detect_job_type(
    title: str,
    description: Optional[str] = None,
    explicit_type: Optional[str] = None
) -> Optional[str]:
    """
    Conservatively classifies employment type.
    Returns: 'internship', 'full_time', 'part_time', 'contract', 'temporary', or 'unknown'.
    Prioritizes title context over general description text.
    """
    # 1. Check explicit type metadata if already supplied by source
    if explicit_type:
        exp_clean = explicit_type.strip().lower().replace("-", "_").replace(" ", "_")
        if "intern" in exp_clean or "co_op" in exp_clean or "apprentice" in exp_clean:
            return "internship"
        if "full_time" in exp_clean or "permanent" in exp_clean or "regular" in exp_clean:
            return "full_time"
        if "part_time" in exp_clean:
            return "part_time"
        if "contract" in exp_clean or "freelance" in exp_clean:
            return "contract"
        if "temp" in exp_clean:
            return "temporary"

    title_lower = (title or "").lower()

    # 2. Check title boundaries for clear indicators
    # Internship / Co-op
    if re.search(r"\b(intern|internship|co-op|coop|apprentice|apprenticeship|summer student)\b", title_lower):
        return "internship"

    # Contract / Temporary
    if re.search(r"\b(contract|contractor|freelance|consultant|temporary|temp)\b", title_lower):
        return "contract"

    # Part-Time
    if re.search(r"\b(part[-\s]?time)\b", title_lower):
        return "part_time"

    # Full-Time in title
    if re.search(r"\b(full[-\s]?time|permanent)\b", title_lower):
        return "full_time"

    # 3. Optional conservative check in description snippet (first 300 characters)
    if description:
        desc_start = description[:300].lower()
        if re.search(r"\b(internship position|summer intern|fall intern|spring intern)\b", desc_start):
            return "internship"
        if re.search(r"\b(contract position|temporary contract|contractor role)\b", desc_start):
            return "contract"
        if re.search(r"\b(part-time position|part-time role)\b", desc_start):
            return "part_time"

    return "unknown"


def normalize_location(location_raw: Any) -> Optional[str]:
    """
    Normalizes location representation into a clean string.
    Supports dictionary objects (e.g. {'name': 'San Francisco, CA'}) or raw strings.
    """
    if not location_raw:
        return None

    if isinstance(location_raw, dict):
        # Greenhouse commonly returns {"name": "Location Name"}
        loc_str = location_raw.get("name") or location_raw.get("location")
        if loc_str and isinstance(loc_str, str):
            cleaned = loc_str.strip()
            return cleaned if cleaned else None
        return None

    if isinstance(location_raw, str):
        cleaned = re.sub(r"\s+", " ", location_raw).strip()
        return cleaned if cleaned else None

    return str(location_raw).strip() or None


def normalize_date(date_raw: Any) -> Optional[str]:
    """
    Normalizes timestamp into standard ISO-8601 UTC string format (YYYY-MM-DDTHH:MM:SSZ).
    Supports datetime objects, ISO-8601 strings, and Unix epoch timestamps (seconds or milliseconds).
    """
    if date_raw is None or date_raw == "":
        return None

    if isinstance(date_raw, datetime):
        if date_raw.tzinfo is None:
            return date_raw.replace(tzinfo=timezone.utc).isoformat()
        return date_raw.astimezone(timezone.utc).isoformat()

    if isinstance(date_raw, (int, float)):
        try:
            # If timestamp in milliseconds (e.g. > 1e11), divide by 1000
            ts = date_raw / 1000.0 if date_raw > 1e11 else float(date_raw)
            # Modern timestamp guard (between year 2000 and 2100)
            if ts < 946684800 or ts > 4102444800:
                return None
            dt = datetime.fromtimestamp(ts, tz=timezone.utc)
            return dt.isoformat()
        except (ValueError, OSError, OverflowError):
            return None

    if isinstance(date_raw, str):
        cleaned = date_raw.strip()
        if not cleaned:
            return None
        # Try numeric string timestamp (e.g. "1711403416463")
        if cleaned.isdigit():
            try:
                num = int(cleaned)
                ts = num / 1000.0 if num > 1e11 else float(num)
                if ts < 946684800 or ts > 4102444800:
                    return None
                dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                return dt.isoformat()
            except (ValueError, OSError, OverflowError):
                return None
        # Try parsing common ISO-8601 formats
        try:
            # Replaces Z with +00:00 for standard fromisoformat in Python <3.11 compatibility
            iso_str = cleaned.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc).isoformat()
        except (ValueError, TypeError):
            # If standard ISO parse fails, return None to avoid invalid date strings
            return None

    return None
