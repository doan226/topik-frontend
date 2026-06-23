"""Extract Q53 chart images — crop using divider line before Q54."""
import sys
from pathlib import Path

import fitz

PAGE_MAP = {1: 35, 2: 36, 3: 37, 4: 41, 5: 47, 6: 52, 8: 60, 10: 64}


def find_pdf() -> Path:
    downloads = Path(r"c:\Users\01666\Downloads")
    for p in downloads.glob("*.pdf"):
        if p.stat().st_size == 9036282:
            return p
    raise FileNotFoundError("PDF not found")


def find_q53_clip(page: fitz.Page, page_no: int) -> fitz.Rect:
    y_top = 155.0
    y_bottom = page.rect.height * 0.48

    dividers = []
    for img in page.get_images(full=True):
        xref = img[0]
        for r in page.get_image_rects(xref):
            if r.width < 20 and r.height > 60:
                dividers.append(r.y0)

    if dividers:
        y_bottom = min(dividers) - 8
    elif page_no == 10:
        y_bottom = 415

    margin_x = 30
    return fitz.Rect(
        page.rect.x0 + margin_x,
        y_top,
        page.rect.x1 - margin_x,
        y_bottom,
    )


def extract(pdf_path: Path, out_dir: Path):
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf_path))
    matrix = fitz.Matrix(2.2, 2.2)

    for page_no, exam in PAGE_MAP.items():
        page = doc[page_no - 1]
        clip = find_q53_clip(page, page_no)
        pix = page.get_pixmap(matrix=matrix, clip=clip, alpha=False)
        out = out_dir / f"topik{exam}_53.png"
        pix.save(str(out))
        print(f"exam {exam}: y {clip.y0:.0f}-{clip.y1:.0f} -> {out.name} ({pix.width}x{pix.height})")

    doc.close()


if __name__ == "__main__":
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else find_pdf()
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(r"c:\topik-frontend\public\topik_images")
    extract(pdf, out)
