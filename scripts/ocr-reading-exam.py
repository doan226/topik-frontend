"""
ocr-reading-exam.py — OCR toàn bộ PDF Đọc (scan) → raw_reading_ocr.txt

Chạy:
    python scripts/ocr-reading-exam.py 96
    python scripts/ocr-reading-exam.py 96 --use-cache
"""
from __future__ import annotations

import io
import os
import sys

import fitz
import numpy as np
from PIL import Image

DOWNLOADS = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)

FOLDERS = {
    "64": "Ki64_2020",
    "83": "Ki83_2022",
    "91": "Ki91_2023",
    "96": "Ki96_2025",
    "102": "Ki102_2025",
}

_READER = None


def get_reader():
    global _READER
    if _READER is None:
        import easyocr

        _READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return _READER


def find_reading_pdf(ki_path: str) -> str:
    for fname in os.listdir(ki_path):
        fl = fname.lower()
        if fl.endswith(".pdf") and "reading" in fl and "test" in fl and "answer" not in fl:
            return os.path.join(ki_path, fname)
    raise FileNotFoundError(f"Reading PDF not found in {ki_path}")


def ocr_pdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    reader = get_reader()
    parts: list[str] = []
    for i in range(len(doc)):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        lines = reader.readtext(np.array(img), detail=0, paragraph=True)
        parts.append(f"=== PAGE {i + 1} ===")
        parts.extend(lines)
        parts.append("")
        print(f"  OCR page {i + 1}/{len(doc)}")
    return "\n".join(parts)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    use_cache = "--use-cache" in sys.argv
    for ky in args or ["96"]:
        folder = FOLDERS[ky]
        ki_path = os.path.join(DOWNLOADS, folder)
        pdf = find_reading_pdf(ki_path)
        cache = os.path.join(ki_path, "raw_reading_ocr.txt")
        print(f"[ocr-read] Ky {ky} — {os.path.basename(pdf)}")
        if use_cache and os.path.isfile(cache) and os.path.getsize(cache) > 500:
            print(f"  Cache: {cache}")
            continue
        text = ocr_pdf(pdf)
        with open(cache, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  Wrote {cache} ({len(text)} chars)")


if __name__ == "__main__":
    main()
