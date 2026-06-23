"""Render answer pages from official PDF for OCR review."""
import sys
from pathlib import Path

import fitz

ANSWER_PAGES = {
    11: 35, 12: 36, 13: 37, 14: 41, 16: 47, 18: 52, 19: 60, 21: 64,
}


def find_pdf() -> Path:
    downloads = Path(r"c:\Users\01666\Downloads")
    for p in downloads.glob("*.pdf"):
        if p.stat().st_size == 9036282:
            return p
    raise FileNotFoundError("PDF not found")


def main():
    pdf = find_pdf()
    out = Path(r"c:\topik-frontend\data\pdf-answer-pages")
    out.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(str(pdf))
    for page_no, exam in ANSWER_PAGES.items():
        page = doc[page_no - 1]
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        pix.save(str(out / f"answer-exam{exam}-p{page_no}.png"))
        text = page.get_text()
        (out / f"answer-exam{exam}.txt").write_text(text, encoding="utf-8")
        print(f"exam {exam} page {page_no}: {len(text)} chars")
    doc.close()


if __name__ == "__main__":
    main()
