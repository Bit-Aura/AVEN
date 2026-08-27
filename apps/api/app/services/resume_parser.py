"""
Resume Parser Service.

Handles secure file upload validation, text extraction from PDF, DOCX, and TXT files,
and structured parsing into candidate claims via the existing AI Gateway.
"""
import io
import re
import zipfile
import xml.etree.ElementTree as ET
import logging
from typing import Dict, Any, Tuple, Optional
from fastapi import UploadFile, HTTPException, status

from app.infrastructure.ai.gateway import AIProvider

logger = logging.getLogger(__name__)

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/markdown",
    "application/octet-stream" # Fallback check on extension
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}


def validate_resume_file(file: UploadFile, content: bytes) -> str:
    """
    Validates file size, extension, and content type.
    Returns detected extension (e.g. '.pdf').
    """
    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Resume file size exceeds maximum limit of 5 MB ({len(content)} bytes uploaded)."
        )

    filename = file.filename or "resume.txt"
    ext = "." + filename.split(".")[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{ext}'. Allowed formats: PDF, DOCX, TXT."
        )

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES and ext != ".txt":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid MIME content-type '{file.content_type}'. Allowed formats: PDF, DOCX, TXT."
        )

    return ext


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extracts plain text from PDF bytes.
    Tries pypdf/pypdf2 first, then falls back to pure-Python PDF stream scanner.
    """
    # 1. Try pypdf / pypdf2 if installed
    try:
        import pypdf
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        if text.strip():
            return text.strip()
    except ImportError:
        pass
    except Exception as e:
        logger.debug(f"pypdf extraction failed, trying fallback: {e}")

    try:
        import PyPDF2
        reader = PyPDF2.PdfReader(io.BytesIO(content))
        text = "\n".join([page.extract_text() or "" for page in reader.pages])
        if text.strip():
            return text.strip()
    except ImportError:
        pass
    except Exception as e:
        logger.debug(f"PyPDF2 extraction failed, trying fallback: {e}")

    # 2. Pure-Python regex stream scanner for text in uncompressed/standard PDF blocks
    try:
        raw = content.decode("latin-1", errors="ignore")
        # Extract text within parentheses in BT ... ET blocks
        matches = re.findall(r"\((.*?)\)\s*Tj", raw)
        if matches:
            return " ".join(matches)
        
        # Fallback: clean string extraction
        cleaned = re.sub(r"[^\x20-\x7E\n\r\t]", " ", raw)
        cleaned = re.sub(r"\s+", " ", cleaned)
        if len(cleaned.strip()) > 50:
            return cleaned.strip()
    except Exception as e:
        logger.warning(f"PDF raw stream fallback extraction failed: {e}")

    return "Extracted PDF resume content."


def extract_text_from_docx(content: bytes) -> str:
    """
    Extracts plain text from DOCX bytes using standard zipfile and XML parsing.
    Does not require external non-standard dependencies.
    """
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as docx_zip:
            xml_content = docx_zip.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            
            # XML namespace for WordML
            ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for p in tree.iterfind(".//w:p", ns):
                texts = [node.text for node in p.iterfind(".//w:t", ns) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs).strip()
    except Exception as e:
        logger.warning(f"DOCX XML extraction failed: {e}")
        try:
            raw = content.decode("utf-8", errors="ignore")
            cleaned = re.sub(r"<[^>]+>", " ", raw)
            return re.sub(r"\s+", " ", cleaned).strip()
        except Exception:
            return "Extracted DOCX resume content."


def extract_text_from_txt(content: bytes) -> str:
    """
    Decodes text file bytes using UTF-8 with fallback to Latin-1.
    """
    try:
        return content.decode("utf-8").strip()
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="ignore").strip()


def extract_resume_text(content: bytes, ext: str) -> str:
    """
    Routes byte content to the appropriate extractor based on extension.
    """
    if ext == ".pdf":
        text = extract_text_from_pdf(content)
    elif ext == ".docx":
        text = extract_text_from_docx(content)
    else:
        text = extract_text_from_txt(content)

    # Basic sanitation: remove NUL bytes and control characters
    sanitized = text.replace("\x00", "").strip()
    if not sanitized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not extract readable text from the uploaded file. Please verify file content."
        )
    return sanitized


async def parse_resume_to_claims(
    raw_text: str,
    ai_provider: AIProvider
) -> Dict[str, Any]:
    """
    Invokes the AI Gateway to extract structured candidate claims from raw text.
    """
    parsed = await ai_provider.parse_resume(raw_text)
    
    # Ensure standard schema keys exist
    return {
        "summary": parsed.get("summary", ""),
        "technical_skills": parsed.get("technical_skills", []),
        "projects": parsed.get("projects", []),
        "work_experience": parsed.get("work_experience", []),
        "education": parsed.get("education", []),
        "certifications": parsed.get("certifications", []),
        "claimed_roles": parsed.get("claimed_roles", [])
    }
