import io
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from pypdf import PdfReader, PdfWriter
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT_DIR = Path(__file__).resolve().parent

DEFAULT_TEMPLATE_PATH = str(ROOT_DIR / "AVEN_CERTIFICATE.pdf")
DEFAULT_VERIFY_BASE_URL = "https://www.aven.com/verify"

DEFAULT_CERT_SETTINGS = {
    "date_mode": "generation_date",
    "VERIFY_BASE_URL": DEFAULT_VERIFY_BASE_URL,
    "cleanup": {
        "hide_left_logo_line": False,
        "left_logo_line_boxes": [],
    },
    "name": {
        "x": 100,
        "y": 475,
        "font_name": "IBM_Plex_Regular",
        "font_size": 36,
        "color_hex": "#3A3A3A",
        "align": "left",
    },
    "workshop": {
        "x": 100,
        "y": 350,
        "font_name": "IBM_Plex_Regular",
        "font_size": 26.8,
        "color_hex": "#3A3A3A",
        "align": "left",
    },
    "date": {
        "x": 100,
        "y": 557,
        "font_name": "IBM_Plex_Regular",
        "font_size": 17.5,
        "color_hex": "#6F6F6F",
        "format": "%d %b %Y",
        "align": "left",
    },
    "verify_text": {
        "x": 840,
        "y": 132,
        "font_name": "IBM_Plex_Regular",
        "font_size": 11,
        "color_hex": "#1A73E8",
        "align": "center",
    },
}

def register_fonts():
    font_path = ROOT_DIR / "assets/fonts/IBMPlexSans-Regular.ttf"
    if font_path.exists():
        pdfmetrics.registerFont(TTFont("IBM_Plex_Regular", str(font_path)))

# Register on module import
register_fonts()


def _draw_field(
    drawing_canvas: canvas.Canvas,
    value: str,
    field_settings: dict[str, Any],
    url: str | None = None,
) -> None:
    font_name = field_settings["font_name"]
    font_size = float(field_settings["font_size"])
    max_width = float(field_settings.get("max_width", 0))
    line_spacing = 1.2
    
    # Pre-process value for explicit splits
    input_lines = [value]
    if ": " in value:
        input_lines = value.split(": ", 1)
        input_lines[0] = input_lines[0] + ":"

    final_lines = []
    for part in input_lines:
        if max_width > 0 and drawing_canvas.stringWidth(part, font_name, font_size) > max_width:
            words = part.split()
            current_line = []
            for word in words:
                test_line = " ".join(current_line + [word])
                if drawing_canvas.stringWidth(test_line, font_name, font_size) <= max_width:
                    current_line.append(word)
                else:
                    if current_line:
                        final_lines.append(" ".join(current_line))
                        current_line = [word]
                    else:
                        final_lines.append(word)
                        current_line = []
            if current_line:
                final_lines.append(" ".join(current_line))
        else:
            final_lines.append(part)

    drawing_canvas.setFillColor(HexColor(field_settings["color_hex"]))
    drawing_canvas.setFont(font_name, font_size)
    align = str(field_settings.get("align", "center")).lower()
    x = float(field_settings["x"])
    y = float(field_settings["y"])
    
    for i, line in enumerate(final_lines):
        line_y = y - (i * font_size * line_spacing)
        
        if align == "left":
            drawing_canvas.drawString(x, line_y, line)
        elif align == "right":
            drawing_canvas.drawRightString(x, line_y, line)
        else:
            drawing_canvas.drawCentredString(x, line_y, line)
            
        if url and i == 0:
            text_width = drawing_canvas.stringWidth(line, font_name, font_size)
            if align == "left":
                rect = (x, line_y - 2, x + text_width, line_y + font_size)
            elif align == "right":
                rect = (x - text_width, line_y - 2, x, line_y + font_size)
            else:
                rect = (x - text_width / 2, line_y - 2, x + text_width / 2, line_y + font_size)
            drawing_canvas.linkURL(url, rect, relative=0, thickness=0)


def draw_rounded_image(canvas_obj, image_path: str, x: float, y: float, size: float):
    canvas_obj.saveState()
    path = canvas_obj.beginPath()
    path.circle(x + size / 2.0, y + size / 2.0, size / 2.0)
    canvas_obj.clipPath(path, stroke=0, fill=0)
    
    # Fill with white to cover any old graphics underneath the circular area
    canvas_obj.setFillColor(HexColor("#FFFFFF"))
    canvas_obj.circle(x + size / 2.0, y + size / 2.0, size / 2.0, stroke=0, fill=1)
    
    # Draw the new logo
    canvas_obj.drawImage(image_path, x, y, width=size, height=size, preserveAspectRatio=True, mask='auto')
    canvas_obj.restoreState()

def _build_overlay(page_width: float, page_height: float, values: dict[str, str], settings: dict[str, Any]) -> io.BytesIO:
    overlay_stream = io.BytesIO()
    overlay_canvas = canvas.Canvas(overlay_stream, pagesize=(page_width, page_height))
    
    # Optional cleanup (e.g., hiding old lines/logos if we knew exactly where they were)
    cleanup_settings = settings.get("cleanup", {})
    if cleanup_settings.get("hide_left_logo_line"):
        # We assume background is white or #F5F5F5
        overlay_canvas.setFillColor(HexColor("#F5F5F5"))
        overlay_canvas.setStrokeColor(HexColor("#F5F5F5"))
        overlay_canvas.rect(61, 504, 3, 188, stroke=0, fill=1)
        
    logo_path = r"d:\projects\AVEN\apps\web\public\Logo.png"
    if Path(logo_path).exists():
        # EXACT POSITION 1: Top-Left old logo (xref 18)
        # Wipe out both the old large logo and the "TENSORIK" text next to it
        overlay_canvas.setFillColor(HexColor("#FFFFFF"))
        overlay_canvas.setStrokeColor(HexColor("#FFFFFF"))
        # Cover x=20 to 380, to wipe out logo and text completely
        overlay_canvas.rect(20, 555.0, 360, 190, stroke=0, fill=1)
        
        # Draw new logo small, very small
        draw_rounded_image(overlay_canvas, logo_path, 80, 680, 60)
        
        # Write "AVEN" next to the left logo
        overlay_canvas.setFont("IBM_Plex_Regular", 36)
        overlay_canvas.setFillColor(HexColor("#000000"))
        # Logo is at x=80, width=60, right edge is 140. 
        overlay_canvas.drawString(160, 695, "AVEN")
        
        # EXACT POSITION 2: Right-side ribbon logo
        # Cover the old logo in the ribbon
        overlay_canvas.setFillColor(HexColor("#E3E5EB")) 
        overlay_canvas.setStrokeColor(HexColor("#E3E5EB"))
        overlay_canvas.circle(830.5, 458.0, 80, stroke=0, fill=1)
        
        # Cover "WORKSHOP CERTIFICATE" in the ribbon
        overlay_canvas.rect(760, 595, 140, 65, stroke=0, fill=1)
        
        # Cover "Tensorik Technologies... confirmed..." in the ribbon
        overlay_canvas.rect(660, 80, 360, 50, stroke=0, fill=1)
        
        # Draw new logo EXACTLY fitting the circle stencil
        # Size = 160 (radius 80). Center is 830.5, 458.0.
        draw_rounded_image(overlay_canvas, logo_path, 830.5 - 80, 458.0 - 80, 160)

    # -------------------------------------------------------------
    # WIPE OUT OLD TEXTS (White background)
    # -------------------------------------------------------------
    overlay_canvas.setFillColor(HexColor("#FFFFFF"))
    overlay_canvas.setStrokeColor(HexColor("#FFFFFF"))
    
    # Cover "an Workshop authorized by..."
    overlay_canvas.rect(95, 260, 500, 35, stroke=0, fill=1)
    
    # Cover bottom footer "Issued by..."
    overlay_canvas.rect(40, 15, 1000, 50, stroke=0, fill=1)
    
    # Cover signature image and text
    overlay_canvas.rect(90, 80, 250, 110, stroke=0, fill=1)
    
    # -------------------------------------------------------------
    # DRAW NEW DYNAMIC TEXTS
    # -------------------------------------------------------------
    overlay_canvas.setFillColor(HexColor("#555555"))
    
    # "a Course authorized by AVEN"
    overlay_canvas.setFont("IBM_Plex_Regular", 16)
    overlay_canvas.drawString(101, 275, "a Course authorized by AVEN")
    
    # Bottom footer text
    footer_text1 = "Issued by AVEN as recognition of successful course participation and topic completion. This certificate acknowledges learning engagement"
    footer_text2 = "and practical exposure but does not replace formal academic credentials or institutional certification."
    overlay_canvas.setFont("IBM_Plex_Regular", 10)
    overlay_canvas.drawCentredString(535, 42, footer_text1)
    overlay_canvas.drawCentredString(535, 28, footer_text2)
    
    # Ribbon text (WORKSHOP CERTIFICATE -> COURSE CERTIFICATE)
    overlay_canvas.setFillColor(HexColor("#333333"))
    overlay_canvas.setFont("IBM_Plex_Regular", 18)
    overlay_canvas.drawCentredString(830, 635, "COURSE")
    overlay_canvas.drawCentredString(830, 610, "CERTIFICATE")
    
    # Ribbon bottom text
    ribbon_bottom1 = "AVEN has confirmed the identity of this"
    ribbon_bottom2 = "participant and their successful completion of the course."
    overlay_canvas.setFont("IBM_Plex_Regular", 10)
    overlay_canvas.drawCentredString(830, 110, ribbon_bottom1)
    overlay_canvas.drawCentredString(830, 96, ribbon_bottom2)
    
    # Signature
    overlay_canvas.setFillColor(HexColor("#2C3E50")) # Ink color
    # The signature itself
    overlay_canvas.setFont("Times-Italic", 28)
    overlay_canvas.drawString(101, 160, "P R Surya")
    
    # Signature labels
    overlay_canvas.setFont("IBM_Plex_Regular", 10)
    overlay_canvas.setFillColor(HexColor("#777777"))
    overlay_canvas.drawString(101, 130, "SURYA P R")
    overlay_canvas.drawString(101, 115, "MANAGING DIRECTOR")
    overlay_canvas.drawString(101, 100, "AVEN")

    _draw_field(overlay_canvas, values["name"], settings["name"])
    _draw_field(overlay_canvas, values["workshop"], settings["workshop"])
    _draw_field(overlay_canvas, values["date"], settings["date"])
    _draw_field(overlay_canvas, values["verify_url"], settings["verify_text"], url=values["verify_url"])
    overlay_canvas.save()
    overlay_stream.seek(0)
    return overlay_stream


def generate_certificate(full_name: str, course_name: str, profile_id: str) -> bytes:
    template_path = DEFAULT_TEMPLATE_PATH
    settings = DEFAULT_CERT_SETTINGS
    
    template = Path(template_path)
    if not template.exists():
        raise FileNotFoundError(f"Template file not found: {template_path}")

    date_value = datetime.now().strftime(settings["date"].get("format", "%d %b %Y"))

    short_id = str(profile_id)[:6].zfill(6)
    verify_url = f"{settings['VERIFY_BASE_URL'].rstrip('/')}/{short_id}"

    values = {
        "name": full_name or "Learner",
        "workshop": course_name or "AVEN Course",
        "date": date_value,
        "verify_url": verify_url,
    }

    reader = PdfReader(template_path)
    page = reader.pages[0]
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)

    overlay_stream = _build_overlay(width, height, values, settings)
    overlay_page = PdfReader(overlay_stream).pages[0]
    page.merge_page(overlay_page)

    writer = PdfWriter()
    writer.add_page(page)

    output_stream = io.BytesIO()
    writer.write(output_stream)
    output_stream.seek(0)
    return output_stream.getvalue()
