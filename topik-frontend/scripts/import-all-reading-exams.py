"""
import-all-reading-exams.py — Copy txt + PNG từ TOPIK_II_Exams, fix IMG kỳ 96,
merge bank JSON cho 12 kỳ đọc.

Chạy từ topik-frontend:
    python scripts/import-all-reading-exams.py
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_merge_spec = importlib.util.spec_from_file_location(
    "merge_reading_bank",
    os.path.join(SCRIPT_DIR, "merge-reading-bank.py"),
)
_merge = importlib.util.module_from_spec(_merge_spec)
_merge_spec.loader.exec_module(_merge)

DATA_DIR = _merge.DATA_DIR
PUB_DATA = _merge.PUB_DATA
PUB_IMG = _merge.PUB_IMG
SOURCES = _merge.SOURCES
build_reading_rows = _merge.build_reading_rows
parse_reading_txt = _merge.parse_reading_txt

DOWNLOADS_BASE = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)


def resolve_reading_txt_src(ky: str, ki_folder: str) -> str:
    """Ưu tiên FILEREAD OCR đã xử lý, tránh fulltxtdoc placeholder."""
    exam_id = f"topik2-{ky}"
    candidates = [
        os.path.join(DOWNLOADS_BASE, "FILEREAD", "fulltxtdoc", f"{exam_id}-reading.txt"),
        os.path.join(DOWNLOADS_BASE, "FILEREAD", ki_folder, f"{exam_id}-reading.txt"),
        os.path.join(DOWNLOADS_BASE, ki_folder, f"{exam_id}-reading.txt"),
        os.path.join(DOWNLOADS_BASE, "fulltxtdoc", f"{exam_id}-reading.txt"),
    ]
    for path in candidates:
        if not os.path.isfile(path):
            continue
        sample = open(path, encoding="utf-8").read(4000)
        if "ảnh quét" in sample or "Xem ảnh hoặc PDF" in sample:
            continue
        return path
    for path in candidates:
        if os.path.isfile(path):
            return path
    raise FileNotFoundError(f"Không tìm thấy reading txt cho kỳ {ky}")

EXAMS: list[tuple[str, str]] = [
    ("35", "Ki35_2014"),
    ("36", "Ki36_2015"),
    ("37", "Ki37_2015"),
    ("41", "Ki41_2016"),
    ("47", "Ki47_2017"),
    ("52", "Ki52_2018"),
    ("60", "Ki60_2019"),
    ("64", "Ki64_2020"),
    ("83", "Ki83_2022"),
    ("91", "Ki91_2023"),
    ("96", "Ki96_2025"),
    ("102", "Ki102_2025"),
]


def img_name(ky: str, qn: int) -> str | None:
    prefix = f"topik2-{ky}-read"
    if 5 <= qn <= 10:
        return f"{prefix}-q{qn}.png"
    if qn in (19, 20):
        return f"{prefix}-passage-19-20.png"
    if qn in (21, 22):
        return f"{prefix}-passage-21-22.png"
    if qn in (23, 24):
        return f"{prefix}-passage-23-24.png"
    if qn in (42, 43):
        return f"{prefix}-passage-42-43.png"
    if qn in (44, 45):
        return f"{prefix}-passage-44-45.png"
    if qn in (46, 47):
        return f"{prefix}-passage-46-47.png"
    if qn in (48, 49, 50):
        return f"{prefix}-passage-48-50.png"
    return None


def inject_img_lines(content: str, ky: str) -> tuple[str, int]:
    """Thêm dòng IMG: sau ANS: nếu câu cần ảnh mà chưa có."""
    lines = content.splitlines()
    out: list[str] = []
    cur_q: int | None = None
    block_has_img = False
    added = 0

    for i, ln in enumerate(lines):
        stripped = ln.strip()
        m = re.match(r"^\[(\d+)\]\s*$", stripped)
        if m:
            cur_q = int(m.group(1))
            block_has_img = False
        elif stripped.startswith("IMG:"):
            block_has_img = True

        out.append(ln)

        if stripped.startswith("ANS:") and cur_q is not None and not block_has_img:
            has_img_ahead = False
            for j in range(i + 1, len(lines)):
                ns = lines[j].strip()
                if re.match(r"^\[\d+\]\s*$", ns):
                    break
                if ns.startswith("IMG:"):
                    has_img_ahead = True
                    break
            name = img_name(ky, cur_q)
            if name and not has_img_ahead:
                out.append(f"IMG: {name}")
                block_has_img = True
                added += 1

    return "\n".join(out) + ("\n" if content.endswith("\n") else ""), added


def copy_exam_assets(ky: str, ki_folder: str) -> None:
    exam_id = f"topik2-{ky}"
    src_txt = resolve_reading_txt_src(ky, ki_folder)
    src_img = os.path.join(DOWNLOADS_BASE, ki_folder, "reading_images")
    dst_txt = os.path.join(SOURCES, f"{exam_id}-reading.txt")

    print(f"  [{ky}] nguon doc: {src_txt}")

    raw = open(src_txt, encoding="utf-8").read()
    fixed, added = inject_img_lines(raw, ky)
    os.makedirs(SOURCES, exist_ok=True)
    with open(dst_txt, "w", encoding="utf-8") as f:
        f.write(fixed)
    if added:
        print(f"  [{ky}] them {added} dong IMG vao txt")

    os.makedirs(PUB_IMG, exist_ok=True)
    if os.path.isdir(src_img):
        for fn in os.listdir(src_img):
            if fn.lower().endswith(".png"):
                shutil.copy2(os.path.join(src_img, fn), os.path.join(PUB_IMG, fn))
    else:
        print(f"  [{ky}] canh bao: khong co {src_img} — bo qua copy anh doc")


def merge_exam(ky: str) -> None:
    exam_id = f"topik2-{ky}"
    reading_txt = os.path.join(SOURCES, f"{exam_id}-reading.txt")
    bank_path = os.path.join(DATA_DIR, f"{exam_id}-bank.json")
    pub_bank = os.path.join(PUB_DATA, f"{exam_id}-bank.json")

    blocks = parse_reading_txt(reading_txt)
    reading = build_reading_rows(blocks, exam_id)

    listening: list = []
    if os.path.isfile(bank_path):
        with open(bank_path, encoding="utf-8") as f:
            bank = json.load(f)
        listening = [r for r in bank if r.get("section") == "listening"]

    merged = listening + reading
    os.makedirs(PUB_DATA, exist_ok=True)
    for path in (bank_path, pub_bank):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"  [{ky}] merge OK listening={len(listening)} reading={len(reading)}")


def parse_args() -> list[str]:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        return args
    return [ky for ky, _ in EXAMS]


def main() -> None:
    kys = parse_args()
    exam_map = dict(EXAMS)
    print(f"[import] Bat dau import {len(kys)} ky doc...")
    for ky in kys:
        if ky not in exam_map:
            raise SystemExit(f"Ky khong ho tro: {ky}")
        ki = exam_map[ky]
        print(f"[import] Ky {ky}...")
        copy_exam_assets(ky, ki)
        merge_exam(ky)
    print("[import] Hoan tat.")


if __name__ == "__main__":
    main()
