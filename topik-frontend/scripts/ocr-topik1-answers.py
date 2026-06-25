"""
ocr-topik1-answers.py — OCR đáp án scan → patch bank TOPIK I.

Chạy:
    python scripts/ocr-topik1-answers.py 47 64 83 91
    python scripts/ocr-topik1-answers.py 64 --use-cache
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)
DATA = os.path.join(FRONTEND, "data")
PUBLIC = os.path.join(FRONTEND, "public", "data")

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

_ver_spec = importlib.util.spec_from_file_location(
    "topik1_verified_answers", os.path.join(SCRIPT_DIR, "topik1_verified_answers.py")
)
_ver = importlib.util.module_from_spec(_ver_spec)
_ver_spec.loader.exec_module(_ver)

EXAMS = dict(_cfg.EXAMS)
DOWNLOADS = _cfg.DOWNLOADS_BASE


def _valid_ans(value: object) -> bool:
    return bool(re.fullmatch(r"[1-4]", str(value or "").strip()))


def patch_bank(ky: str, listen: dict[int, str], read: dict[int, str]) -> tuple[int, int]:
    eid = _cfg.exam_id(ky)
    path = os.path.join(DATA, f"{eid}-bank.json")
    rows = json.load(open(path, encoding="utf-8"))
    lf = rf = 0
    for row in rows:
        section = row.get("section", "listening")
        qno = int(row.get("questionNo", 0))
        cur = str(row.get("correct_ans") or "").strip()
        if section == "listening" and qno in listen:
            ans = listen[qno]
            if not _valid_ans(cur):
                row["correct_ans"] = ans
                lf += 1
        elif section == "reading" and qno in read:
            ans = read[qno]
            if not _valid_ans(cur):
                row["correct_ans"] = ans
                rf += 1
    for out in (path, os.path.join(PUBLIC, f"{eid}-bank.json")):
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return lf, rf


def ocr_answers_for_ky(ky: str, use_cache: bool) -> tuple[dict[int, str], dict[int, str]]:
    from pathlib import Path

    folder = EXAMS.get(ky)
    if not folder:
        raise SystemExit(f"Ky không hỗ trợ: {ky}")
    src = Path(DOWNLOADS) / folder
    listen_pdf = _parse.find_file(src, "*Listening*Answer*.pdf")
    read_pdf = _parse.find_file(src, "*Reading*Answer*.pdf")
    combined = _parse.find_file(src, "*Answer*.pdf", "*answer*.pdf")

    listen: dict[int, str] = {}
    read: dict[int, str] = {}

    if listen_pdf and read_pdf:
        for label, pdf in (("listen", listen_pdf), ("read", read_pdf)):
            cache = src / f"raw_{label}_answers_ocr.txt"
            print(f"  [{label}] {pdf.name}")
            if use_cache and cache.is_file() and cache.stat().st_size > 80:
                text = cache.read_text(encoding="utf-8")
                print(f"    cache {cache.name}")
            else:
                text = _parse._ocr_pdf(pdf)
                cache.write_text(text, encoding="utf-8")
                print(f"    OCR -> {cache.name} ({len(text)} chars)")
            la, ra = _parse._parse_answers_from_text(text, pdf)
            if label == "listen":
                listen = la
            else:
                read = ra
    elif combined:
        cache = src / "raw_answers_ocr.txt"
        print(f"  [combined] {combined.name}")
        if use_cache and cache.is_file() and cache.stat().st_size > 80:
            text = cache.read_text(encoding="utf-8")
            print(f"    cache {cache.name}")
        else:
            text = _parse._ocr_pdf(combined)
            cache.write_text(text, encoding="utf-8")
            print(f"    OCR -> {cache.name} ({len(text)} chars)")
        listen, read = _parse._parse_answers_from_text(text, combined)
    else:
        raise FileNotFoundError(f"Ky {ky}: không tìm thấy answer PDF trong {src}")

    return listen, read


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    use_cache = "--use-cache" in sys.argv
    kys = args or ["47", "64", "83", "91"]

    for ky in kys:
        print(f"\n[ocr-topik1-ans] Ky {ky}")
        listen, read = ocr_answers_for_ky(ky, use_cache)
        listen, read = _ver.merge_answers(ky, listen, read)
        print(f"  Parsed listen={len(listen)}/30 read={len(read)}/40")
        lf, rf = patch_bank(ky, listen, read)
        print(f"  Patched listen={lf} read={rf}")


if __name__ == "__main__":
    main()
