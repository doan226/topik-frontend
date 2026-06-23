"""
ocr-listening-answers.py — OCR PDF đáp án Nghe (scan) → patch bank JSON.

Chạy:
    python scripts/ocr-listening-answers.py 96
    python scripts/ocr-listening-answers.py 96 --use-cache
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image

DOWNLOADS = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)
FRONTEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(FRONTEND, "data")
PUBLIC = os.path.join(FRONTEND, "public", "data")

FOLDERS = {
    "64": "Ki64_2020",
    "83": "Ki83_2022",
    "91": "Ki91_2023",
    "96": "Ki96_2025",
    "102": "Ki102_2025",
}

CIRCLE_CHARS = "①②③④➀➁➂➃"
CIRCLE_MAP = {c: str(i) for i, c in enumerate("①②③④➀➁➂➃", 1)}

# Nguồn: 96th official answer sheet (듣기) — xác minh từ đáp án công bố
VERIFIED_LISTENING_ANSWERS: dict[str, list[int]] = {
    "96": [
        1, 2, 2, 3, 1, 2, 4, 3, 4, 2, 4, 2, 3, 2, 4, 4, 3, 1, 4, 1,
        4, 2, 4, 2, 1, 1, 2, 3, 1, 2, 4, 3, 3, 1, 1, 4, 3, 2, 4, 3,
        3, 2, 1, 4, 4, 3, 3, 3, 4, 1,
    ],
}

_READER = None


def get_reader():
    global _READER
    if _READER is None:
        import easyocr

        _READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return _READER


def find_listen_answers_pdf(ki_path: str) -> str:
    for fname in os.listdir(ki_path):
        fl = fname.lower()
        if fl.endswith(".pdf") and "listening" in fl and "answer" in fl:
            return os.path.join(ki_path, fname)
    raise FileNotFoundError(f"Listening answers PDF not found in {ki_path}")


def ocr_pdf(pdf_path: str) -> str:
    doc = fitz.open(pdf_path)
    reader = get_reader()
    parts: list[str] = []
    for i in range(len(doc)):
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(250 / 72, 250 / 72))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        lines = reader.readtext(np.array(img), detail=0, paragraph=False)
        parts.append(f"=== PAGE {i + 1} ===")
        parts.extend(str(ln).strip() for ln in lines if str(ln).strip())
        parts.append("")
        print(f"  OCR page {i + 1}/{len(doc)} ({len(lines)} lines)")
    return "\n".join(parts)


def circle_to_num(ch: str) -> int | None:
    ch = ch.strip()
    if ch in CIRCLE_MAP:
        return int(CIRCLE_MAP[ch])
    m = re.match(r"^[1-4]$", ch)
    return int(m.group()) if m else None


def parse_answers_from_ocr(text: str) -> dict[int, int]:
    """Trích {câu: đáp_án} từ OCR answer sheet."""
    answers: dict[int, int] = {}

    # Dạng "1① 2② 3② ..." trong một dòng
    blob = " ".join(
        ln.strip()
        for ln in text.splitlines()
        if ln.strip() and not ln.startswith("===")
    )
    for m in re.finditer(r"(\d{1,2})\s*[" + CIRCLE_CHARS + r"]", blob):
        q, ch = int(m.group(1)), m.group(2)
        if 1 <= q <= 50 and ch in CIRCLE_MAP:
            answers[q] = int(CIRCLE_MAP[ch])

    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.startswith("===")]

    # Bảng 3 cột: 번호 / 정답 / 배점 — lặp (q, ans, 2)
    if len(answers) < 45:
        nums: list[int] = []
        for ln in lines:
            if re.fullmatch(r"\d{1,2}", ln):
                nums.append(int(ln))
            elif ln in CIRCLE_MAP:
                nums.append(int(CIRCLE_MAP[ln]))
            elif re.fullmatch(r"[1-4]", ln):
                nums.append(int(ln))
        i = 0
        while i + 2 < len(nums):
            q, a, pts = nums[i], nums[i + 1], nums[i + 2]
            if 1 <= q <= 50 and 1 <= a <= 4 and pts in (2, 3, 4, 5, 10) and q not in answers:
                answers[q] = a
                i += 3
            elif 1 <= q <= 50 and 1 <= a <= 4 and q not in answers:
                answers[q] = a
                i += 2
            else:
                i += 1

    return dict(sorted(answers.items()))


def patch_bank(ky: str, answers: dict[int, int]) -> int:
    path = os.path.join(DATA, f"topik2-{ky}-bank.json")
    rows = json.load(open(path, encoding="utf-8"))
    fixed = 0
    for row in rows:
        if row.get("section") != "listening":
            continue
        qno = int(row.get("questionNo", 0))
        if qno not in answers:
            continue
        ans = str(answers[qno])
        if row.get("correct_ans") != ans:
            row["correct_ans"] = ans
            fixed += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")
    pub = os.path.join(PUBLIC, f"topik2-{ky}-bank.json")
    if os.path.isfile(pub):
        with open(pub, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return fixed


def patch_topik_txt(ky: str, answers: dict[int, int]) -> None:
    folder = FOLDERS.get(ky)
    if not folder:
        return
    path = os.path.join(DOWNLOADS, folder, f"topik2-{ky}.txt")
    if not os.path.isfile(path):
        return
    content = open(path, encoding="utf-8").read()
    blocks = re.split(r"(?=\[\d+\])", content)
    out: list[str] = []
    for block in blocks:
        if not block.strip():
            continue
        m = re.match(r"\[(\d+)\]", block.strip())
        if not m:
            out.append(block)
            continue
        qno = int(m.group(1))
        if qno in answers:
            block = re.sub(r"^ANS:\s*\?\s*$", f"ANS: {answers[qno]}", block, flags=re.M)
        out.append(block)
    text = "".join(out).rstrip() + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    use_cache = "--use-cache" in sys.argv
    for ky in args or ["96"]:
        folder = FOLDERS.get(ky)
        if not folder:
            print(f"Skip unknown ky {ky}")
            continue
        ki_path = os.path.join(DOWNLOADS, folder)
        pdf = find_listen_answers_pdf(ki_path)
        cache = os.path.join(ki_path, "raw_listening_answers_ocr.txt")
        print(f"[ocr-ans] Ky {ky} — {os.path.basename(pdf)}")
        if use_cache and os.path.isfile(cache) and os.path.getsize(cache) > 100:
            text = open(cache, encoding="utf-8").read()
            print(f"  Using cache {cache}")
        else:
            text = ocr_pdf(pdf)
            with open(cache, "w", encoding="utf-8") as f:
                f.write(text)
            print(f"  Wrote {cache}")
        answers = parse_answers_from_ocr(text)
        if len(answers) < 45 and ky in VERIFIED_LISTENING_ANSWERS:
            print(f"  OCR chỉ có {len(answers)} câu — dùng đáp án đã xác minh")
            answers = {i + 1: a for i, a in enumerate(VERIFIED_LISTENING_ANSWERS[ky])}
        print(f"  Parsed {len(answers)}/50 answers")
        n = patch_bank(ky, answers)
        patch_topik_txt(ky, answers)
        print(f"  Patched {n} listening rows in bank")


if __name__ == "__main__":
    main()
