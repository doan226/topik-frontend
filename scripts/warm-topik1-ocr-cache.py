"""Pre-OCR scan PDFs for TOPIK I (cache raw_*_ocr.txt)."""
from __future__ import annotations

import importlib.util
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location(
    "topik1_exam_config", os.path.join(SCRIPT_DIR, "topik1_exam_config.py")
)
_cfg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cfg)

_parse_spec = importlib.util.spec_from_file_location(
    "parse_topik1_pdf", os.path.join(SCRIPT_DIR, "parse_topik1_pdf.py")
)
_parse = importlib.util.module_from_spec(_parse_spec)
_parse_spec.loader.exec_module(_parse)

SCAN_EXAMS = {"64", "83", "91"}


def warm_ky(ky: str, ki_folder: str, *, only_kind: str = "") -> None:
    from pathlib import Path

    src = Path(_cfg.DOWNLOADS_BASE) / ki_folder
    patterns = (
        "*Listening*Test*.pdf",
        "*Listening-Transcript*.pdf",
        "*Reading*Test*.pdf",
    )
    kind_map = {
        "listen": ("*Listening*Test*.pdf",),
        "transcript": ("*Listening-Transcript*.pdf",),
        "reading": ("*Reading*Test*.pdf",),
    }
    pats = kind_map.get(only_kind, patterns)
    print(f"\n[warm-ocr] Ky {ky}" + (f" ({only_kind})" if only_kind else ""))
    for pat in pats:
        hit = _parse.find_file(src, pat)
        if not hit:
            continue
        cache = hit.parent / f"raw_{hit.stem}_ocr.txt"
        if cache.is_file():
            print(f"  [skip] {hit.name}")
            continue
        print(f"  [ocr] {hit.name} ...")
        text = _parse.pdf_text(hit, allow_ocr=True)
        print(f"  [done] {len(text)} chars -> {cache.name}")


def main() -> None:
    only_kind = ""
    kys: list[str] = []
    for arg in sys.argv[1:]:
        if arg.startswith("--only="):
            only_kind = arg.split("=", 1)[1]
        elif arg.isdigit():
            kys.append(arg)
    if not kys:
        kys = sorted(SCAN_EXAMS)
    exam_map = dict(_cfg.EXAMS)
    for ky in kys:
        if ky not in exam_map:
            raise SystemExit(f"Ky khong ho tro: {ky}")
        warm_ky(ky, exam_map[ky], only_kind=only_kind)
    print("\n[warm-ocr] Hoan tat.")


if __name__ == "__main__":
    main()
