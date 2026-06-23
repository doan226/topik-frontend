"""
fix-reading-96.py — Sửa câu Q/options rỗng trong đề Đọc kỳ 96.

Nguồn: FILEREAD/fulltxtdoc hoặc Ki96/topik2-96-reading.txt
OCR bổ sung: Windows OCR (scripts/win-ocr-image.ps1) trên PDF scan khi cần.
"""
from __future__ import annotations

import importlib.util
import os
import re
import subprocess
import sys
import tempfile

import fitz

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)
KI_FOLDER = "Ki96_2025"
KI_NUM = 96

ANSWERS = [
    4, 1, 1, 4, 2, 4, 1, 1, 3, 2, 4, 4, 2, 3, 1, 1, 3, 1, 4, 2,
    2, 3, 2, 1, 3, 3, 4, 4, 2, 4, 3, 3, 1, 2, 3, 4, 3, 1, 1, 3,
    2, 3, 1, 2, 4, 2, 2, 3, 4, 4,
]

INSTRUCTIONS = {
    range(1, 3): "( )에 들어갈 가장 알맞은 것을 고르십시오.",
    range(3, 5): "다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오.",
    range(5, 9): "다음은 무엇에 대한 글인지 고르십시오.",
    range(9, 13): "다음 글 또는 그래프의 내용과 같은 것을 고르십시오.",
    range(13, 16): "다음을 순서에 맞게 배열한 것을 고르십시오.",
    range(16, 19): "다음 글을 읽고 빈칸에 들어갈 가장 알맞은 것을 고르십시오.",
    range(19, 25): "다음 글을 읽고 물음에 답하십시오.",
    range(25, 28): "다음 신문 기사의 제목을 가장 잘 설명한 것을 고르십시오.",
    range(28, 32): "다음 글을 읽고 빈칸에 들어갈 내용으로 가장 알맞은 것을 고르십시오.",
    range(32, 35): "다음 글을 읽고 내용이 같은 것을 고르십시오.",
    range(35, 39): "다음 글의 주제로 가장 알맞은 것을 고르십시오.",
    range(39, 42): "다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오.",
    range(42, 51): "다음 글을 읽고 물음에 답하십시오.",
}


def standard_instruction(qn: int) -> str:
    for r, text in INSTRUCTIONS.items():
        if qn in r:
            return text
    return "다음을 읽고 물음에 답하십시오."


_OCR_READER = None


def get_ocr_reader():
    global _OCR_READER
    if _OCR_READER is None:
        import easyocr

        _OCR_READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return _OCR_READER


def ocr_page(pdf_path: str, page_idx: int) -> str:
    import io

    import numpy as np
    from PIL import Image

    doc = fitz.open(pdf_path)
    page = doc[page_idx]
    pix = page.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72))
    tmp = os.path.join(tempfile.gettempdir(), f"ki96-read-p{page_idx}.png")
    pix.save(tmp)
    img = Image.open(io.BytesIO(pix.tobytes("png")))
    reader = get_ocr_reader()
    lines = reader.readtext(np.array(img), detail=0, paragraph=True)
    return "\n".join(lines)


def find_reading_pdf() -> str:
    ki_path = os.path.join(DOWNLOADS, KI_FOLDER)
    for fname in os.listdir(ki_path):
        fl = fname.lower()
        if fl.endswith(".pdf") and "reading" in fl and "test" in fl and "answers" not in fl:
            return os.path.join(ki_path, fname)
    raise FileNotFoundError("Reading test PDF not found")


def load_build_topik():
    spec = importlib.util.spec_from_file_location(
        "build_topik_txt",
        os.path.join(DOWNLOADS, "build_topik_txt.py"),
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_ordering_options(tail_lines: list[str]) -> list[str]:
    """Trích 4 lựa chọn sắp xếp (가/나/다/라) từ phần đuôi passage."""
    flat = " ".join(ln.strip() for ln in tail_lines)
    flat = flat.replace("(      )", " ")
    options: list[str] = []
    pattern = re.compile(
        r"([가나다라])\s*[－\-]\s*"
        r"([가나다라])\s*[－\-]\s*"
        r"([가나다라])\s*[－\-]\s*"
        r"([가나다라])"
    )
    for m in pattern.finditer(flat):
        opt = "－".join(f"({g})" for g in m.groups())
        if opt not in options:
            options.append(opt)
    return options[:4]


def extract_statement_options(p_lines: list[str]) -> tuple[list[str], list[str]]:
    """Tách 4 câu khẳng định (q9–12) ở cuối passage."""
    candidates: list[str] = []
    for ln in reversed(p_lines):
        s = ln.strip()
        if not s or s.startswith("※") or re.match(r"^\[\d+", s):
            continue
        if re.match(r"^[가나다라]$", s):
            break
        if re.match(r"^\d+\.", s) and len(candidates) >= 4:
            break
        if len(s) > 8 and re.search(r"[다요한다임]\.?$", s):
            candidates.insert(0, s)
        if len(candidates) >= 4:
            break
    if len(candidates) >= 4:
        passage = [ln for ln in p_lines if ln.strip() not in candidates]
        return passage, candidates[:4]
    return p_lines, []


def split_passage_and_ordering(p_lines: list[str]) -> tuple[list[str], list[str]]:
    """Tách 4 câu 가/나/다/라 và phần options sắp xếp."""
    passage: list[str] = []
    tail: list[str] = []
    label_count = 0
    after_ra = False
    i = 0
    while i < len(p_lines):
        ln = p_lines[i]
        s = ln.strip()
        if re.match(r"^(\d+\.\s*)?(가|나|다|라)$", s):
            label_count += 1
            passage.append(ln)
            i += 1
            if i < len(p_lines) and not re.match(r"^(\d+\.\s*)?(가|나|다|라)$", p_lines[i].strip()):
                passage.append(p_lines[i])
                i += 1
            if label_count >= 4:
                after_ra = True
            continue
        if after_ra:
            tail.append(ln)
        else:
            passage.append(ln)
        i += 1
    return passage, tail


def smart_split_options(text: str, n: int = 4) -> list[str]:
    text = re.sub(r"\s+", " ", text).strip()
    markers = ["①", "②", "③", "④", "1)", "2)", "3)", "4)"]
    positions: list[tuple[int, str]] = []
    for m in markers:
        for match in re.finditer(re.escape(m), text):
            positions.append((match.start(), m))
    positions.sort()
    if len(positions) >= n:
        opts = []
        for i, (start, m) in enumerate(positions[:n]):
            end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
            chunk = text[start:end].strip()
            chunk = re.sub(r"^[①②③④1-4]\)?\s*", "", chunk)
            opts.append(chunk.strip())
        return opts

    # fallback numbered lines
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    opts = []
    for ln in lines:
        m = re.match(r"^([1-4])\)\s*(.*)", ln)
        if m:
            opts.append(m.group(2).strip())
    return opts[:4]


def parse_question_from_ocr(qn: int, ocr_text: str) -> tuple[str, str, list[str]]:
    """Parse passage, question, options từ OCR text cho 1 câu."""
    mod = load_build_topik()
    cleaned = mod.clean_korean_text(ocr_text) if hasattr(mod, "clean_korean_text") else ocr_text

    # Tìm block bắt đầu bằng số câu
    pattern = rf"\b{qn}\.\s*"
    m = re.search(pattern, cleaned)
    if not m:
        return "", standard_instruction(qn), []

    next_q = qn + 1
    end = len(cleaned)
    m2 = re.search(rf"\b{next_q}\.\s*", cleaned[m.end():])
    if m2:
        end = m.end() + m2.start()

    block = cleaned[m.start():end]
    opt_markers = ["①", "②", "③", "④", "1)", "2)", "3)", "4)"]
    first_opt = len(block)
    for marker in opt_markers:
        idx = block.find(marker)
        if idx != -1 and idx < first_opt:
            first_opt = idx

    if first_opt < len(block):
        passage_part = block[:first_opt].strip()
        options_part = block[first_opt:]
        options = smart_split_options(options_part)
        passage_part = re.sub(rf"^{qn}\.\s*", "", passage_part).strip()
        return passage_part, standard_instruction(qn), options

    return block.strip(), standard_instruction(qn), []


def fix_block(qn: int, block_lines: list[str], page_ocr: dict[int, str], force: bool = False) -> list[str]:
    fields = {"P": [], "Q": "", "options": [], "ANS": str(ANSWERS[qn - 1]), "IMG": ""}
    mode = None

    for ln in block_lines:
        s = ln.strip()
        if s.startswith("P:"):
            mode = "P"
            rest = s[2:].strip()
            if rest:
                fields["P"].append(rest)
            continue
        if s.startswith("Q:"):
            mode = None
            fields["Q"] = s[2:].strip()
            continue
        if s.startswith("ANS:"):
            mode = None
            fields["ANS"] = s[4:].strip()
            continue
        if s.startswith("IMG:"):
            mode = None
            fields["IMG"] = s[4:].strip()
            continue
        m = re.match(r"^([1-4])\)\s*(.*)$", s)
        if m:
            mode = None
            idx = int(m.group(1)) - 1
            while len(fields["options"]) <= idx:
                fields["options"].append("")
            fields["options"][idx] = m.group(2).strip()
            continue
        if mode == "P":
            fields["P"].append(ln.rstrip())

    needs_fix = force or (
        not fields["Q"]
        or len([o for o in fields["options"] if o.strip()]) < 4
    )
    if not needs_fix:
        return block_lines

    if 13 <= qn <= 15:
        passage_lines, tail = split_passage_and_ordering(fields["P"])
        opts = parse_ordering_options(tail)
        if len(opts) >= 4:
            fields["P"] = passage_lines
            fields["Q"] = standard_instruction(qn)
            fields["options"] = opts[:4]
        else:
            fields["Q"] = standard_instruction(qn)

    elif 1 <= qn <= 8:
        if not fields["Q"]:
            fields["Q"] = standard_instruction(qn)

    elif 9 <= qn <= 12:
        fields["Q"] = standard_instruction(qn)
        passage_lines, stmt_opts = extract_statement_options(fields["P"])
        if len(stmt_opts) >= 4:
            fields["P"] = passage_lines
            fields["options"] = stmt_opts
        else:
            ocr = page_ocr.get(6, "")
            _, _, opts = parse_question_from_ocr(qn, ocr)
            if len(opts) >= 4:
                fields["options"] = opts[:4]

    elif qn >= 16:
        fields["Q"] = standard_instruction(qn)
        # Map question to PDF page (approx Ki96 digital layout)
        page_map = {
            **{n: 9 for n in range(16, 19)},
            **{n: 10 for n in range(19, 21)},
            **{n: 11 for n in range(21, 23)},
            **{n: 12 for n in range(23, 25)},
            **{n: 13 for n in range(25, 28)},
            **{n: 14 for n in range(28, 32)},
            **{n: 15 for n in range(32, 35)},
            **{n: 16 for n in range(35, 39)},
            **{n: 17 for n in range(39, 42)},
            **{n: 21 for n in range(42, 44)},
            **{n: 22 for n in range(44, 46)},
            **{n: 23 for n in range(46, 48)},
            **{n: 24 for n in range(48, 51)},
        }
        pg = page_map.get(qn, 9)
        ocr = page_ocr.get(pg, "")
        p_text, q_text, opts = parse_question_from_ocr(qn, ocr)
        if p_text and not fields["P"]:
            fields["P"] = [p_text]
        if opts and len(opts) >= 4:
            fields["options"] = opts[:4]

    # Rebuild block
    out = [f"[{qn}]", "P:"]
    out.extend(fields["P"])
    out.append(f"Q: {fields['Q'] or standard_instruction(qn)}")
    for i, opt in enumerate(fields["options"][:4], 1):
        out.append(f"{i}) {opt}")
    while len([o for o in fields["options"] if o]) < 4:
        # pad if still short
        for i in range(1, 5):
            if i > len(fields["options"]):
                out.append(f"{i}) ")
        break
    out.append(f"ANS: {fields['ANS']}")
    if fields["IMG"]:
        out.append(f"IMG: {fields['IMG']}")
    elif qn in (5, 6, 7, 8, 9, 10) or qn >= 19:
        img_map = {
            5: f"topik2-96-read-q5.png",
            6: f"topik2-96-read-q6.png",
            7: f"topik2-96-read-q7.png",
            8: f"topik2-96-read-q8.png",
            9: f"topik2-96-read-q9.png",
            10: f"topik2-96-read-q10.png",
        }
        if qn in img_map:
            out.append(f"IMG: {img_map[qn]}")
        elif 19 <= qn <= 20:
            out.append("IMG: topik2-96-read-passage-19-20.png")
        elif 21 <= qn <= 22:
            out.append("IMG: topik2-96-read-passage-21-22.png")
        elif 23 <= qn <= 24:
            out.append("IMG: topik2-96-read-passage-23-24.png")
        elif 42 <= qn <= 43:
            out.append("IMG: topik2-96-read-passage-42-43.png")
        elif 44 <= qn <= 45:
            out.append("IMG: topik2-96-read-passage-44-45.png")
        elif 46 <= qn <= 47:
            out.append("IMG: topik2-96-read-passage-46-47.png")
        elif 48 <= qn <= 50:
            out.append("IMG: topik2-96-read-passage-48-50.png")
    out.append("")
    return out


def main() -> None:
    src_candidates = [
        os.path.join(DOWNLOADS, "FILEREAD", "fulltxtdoc", "topik2-96-reading.txt"),
        os.path.join(DOWNLOADS, KI_FOLDER, "topik2-96-reading.txt"),
    ]
    src = next(p for p in src_candidates if os.path.isfile(p))
    print(f"Input: {src}")

    pdf = find_reading_pdf()
    print(f"PDF: {pdf}")

    # OCR pages needed (0-indexed)
    pages_needed = list(range(6, 25))
    page_ocr: dict[int, str] = {}
    for pg in pages_needed:
        print(f"  OCR page {pg + 1}...")
        page_ocr[pg] = ocr_page(pdf, pg)

    force = "--force" in sys.argv
    content = open(src, encoding="utf-8").read()
    lines = content.splitlines()
    block_starts = [i for i, ln in enumerate(lines) if re.match(r"^\[\d+\]\s*$", ln.strip())]
    header = "\n".join(lines[: block_starts[0]]) if block_starts else ""

    out_lines: list[str] = []
    if header:
        out_lines.extend(header.splitlines())
        out_lines.append("")

    fixed = 0
    for idx, start in enumerate(block_starts):
        end = block_starts[idx + 1] if idx + 1 < len(block_starts) else len(lines)
        block = lines[start:end]
        qn = int(re.match(r"^\[(\d+)\]", block[0].strip()).group(1))
        new_block = fix_block(qn, block, page_ocr, force=force)
        if new_block != block:
            fixed += 1
        out_lines.extend(new_block)

    out_path = os.path.join(DOWNLOADS, KI_FOLDER, "topik2-96-reading.txt")
    fileread_path = os.path.join(DOWNLOADS, "FILEREAD", "fulltxtdoc", "topik2-96-reading.txt")
    text = "\n".join(out_lines).rstrip() + "\n"
    for path in (out_path, fileread_path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Wrote: {path}")

    print(f"Fixed {fixed} question blocks.")


if __name__ == "__main__":
    main()
