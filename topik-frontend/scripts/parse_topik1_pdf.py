"""
parse_topik1_pdf.py — Trích xuất đáp án, câu hỏi, transcript từ PDF TOPIK I.
"""
from __future__ import annotations

import re
from pathlib import Path

import fitz

CIRCLE_TO_NUM = {
    "①": "1",
    "②": "2",
    "③": "3",
    "④": "4",
    "➀": "1",
    "➁": "2",
    "➂": "3",
    "➃": "4",
    "❶": "1",
    "❷": "2",
    "❸": "3",
    "❹": "4",
}

SCORES = {"2", "3", "4", "5", "10", "30", "50"}
OPTION_LINE = re.compile(r"^[①②③④➀➁➂➃❶❷❸❹]\s*(.+)$")
OPTION_GLUE = re.compile(r"^[①②③④➀➁➂➃❶❷❸❹](.+)$")
QUESTION_MARKER = re.compile(r"^(\d{1,2})\.\s*(.*)$", re.MULTILINE)
SCORE_LINE = re.compile(r"^\(\s*\d+\s*점\s*\)$")
SPEAKER_LINE = re.compile(r"^(남자|여자|가|나)\s*[:：]")
NOISE_LINE = re.compile(
    r"(TOPIK|Test|Proficiency|한국어능력시험|고르십시오|물음에\s*답하십시오|※|\[\s*\d+\s*[～~\-]|ZLEeo|LEeo)",
    re.IGNORECASE,
)

_OCR_READER = None


def _get_ocr_reader():
    global _OCR_READER
    if _OCR_READER is None:
        import easyocr

        _OCR_READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return _OCR_READER


def _ocr_pdf(path: str | Path, *, dpi: int = 200) -> str:
    import io

    import numpy as np
    from PIL import Image

    doc = fitz.open(str(path))
    reader = _get_ocr_reader()
    parts: list[str] = []
    total = len(doc)
    for i in range(total):
        print(f"    [ocr] page {i + 1}/{total}", flush=True)
        page = doc[i]
        pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        lines = reader.readtext(np.array(img), detail=0, paragraph=False)
        parts.extend(str(ln).strip() for ln in lines if str(ln).strip())
    return "\n".join(parts)


def _ocr_cache_path(path: Path) -> Path:
    return path.parent / f"raw_{path.stem}_ocr.txt"


def pdf_text(path: str | Path, *, allow_ocr: bool = True) -> str:
    path = Path(path)
    doc = fitz.open(str(path))
    text = "\n".join(page.get_text() for page in doc)
    if len(text.strip()) < 80:
        cache = _ocr_cache_path(path)
        if cache.is_file():
            return cache.read_text(encoding="utf-8", errors="replace")
        if allow_ocr:
            ocr = _ocr_pdf(path)
            cache.write_text(ocr, encoding="utf-8")
            return ocr
    return text


def _parse_answer_block(text: str, q_min: int, q_max: int) -> dict[int, str]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    answers: dict[int, str] = {}
    i = 0
    while i < len(lines):
        if re.fullmatch(r"\d{1,2}", lines[i]):
            q = int(lines[i])
            if q_min <= q <= q_max:
                for j in range(i + 1, min(i + 5, len(lines))):
                    tok = lines[j]
                    if tok in CIRCLE_TO_NUM:
                        answers[q] = CIRCLE_TO_NUM[tok]
                        break
                    if re.fullmatch(r"[1-4]", tok):
                        answers[q] = tok
                        break
                    if tok in SCORES:
                        continue
                    if re.fullmatch(r"\d{1,2}", tok):
                        break
        i += 1

    if len(answers) >= (q_max - q_min + 1) * 0.75:
        return answers

    # OCR bảng 2–3 cột: dãy số xen kẽ (câu, đáp án, điểm)
    nums: list[int] = []
    for ln in lines:
        if re.search(r"[가-힣]{2,}", ln) and not re.search(r"\d", ln):
            continue
        for tok in re.findall(r"\d{1,2}", ln):
            nums.append(int(tok))
    j = 0
    while j < len(nums) - 1:
        q, a = nums[j], nums[j + 1]
        if q_min <= q <= q_max and 1 <= a <= 4 and q not in answers:
            answers[q] = str(a)
            j += 2
            if j < len(nums) and nums[j] in {2, 3, 4, 5, 10, 30, 50}:
                j += 1
        else:
            j += 1

    # Dạng inline "1② 2③" trong OCR
    blob = " ".join(lines)
    for m in re.finditer(
        r"(\d{1,2})\s*[" + "".join(CIRCLE_TO_NUM.keys()) + r"]", blob
    ):
        q = int(m.group(1))
        ch = m.group(2)
        if q_min <= q <= q_max and ch in CIRCLE_TO_NUM:
            answers[q] = CIRCLE_TO_NUM[ch]

    if len(answers) < (q_max - q_min + 1) * 0.5:
        answers.update(_parse_ocr_triplet_scan(text, q_min, q_max, answers))

    return answers


def _parse_ocr_triplet_scan(
    text: str, q_min: int, q_max: int, existing: dict[int, str]
) -> dict[int, str]:
    """Bổ sung từ dãy (câu, đáp án, điểm) kiểu ocr-listening-answers."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    nums: list[int] = []
    for ln in lines:
        if re.fullmatch(r"\d{1,2}", ln):
            nums.append(int(ln))
        elif ln in CIRCLE_TO_NUM:
            nums.append(int(CIRCLE_TO_NUM[ln]))
        elif re.fullmatch(r"[1-4]", ln):
            nums.append(int(ln))
    extra: dict[int, str] = {}
    i = 0
    while i + 2 < len(nums):
        q, a, pts = nums[i], nums[i + 1], nums[i + 2]
        if (
            q_min <= q <= q_max
            and 1 <= a <= 4
            and pts in {2, 3, 4, 5, 10, 30, 50}
            and q not in existing
            and q not in extra
        ):
            extra[q] = str(a)
            i += 3
        elif q_min <= q <= q_max and 1 <= a <= 4 and q not in existing and q not in extra:
            extra[q] = str(a)
            i += 2
        else:
            i += 1
    return extra


def _extract_section(text: str, marker: str) -> str:
    if marker not in text:
        return ""
    rest = text.split(marker, 1)[1]
    m = re.search(r"영역:\s*\S+", rest)
    if m:
        rest = rest[: m.start()]
    return rest


def _normalize_section_text(text: str) -> str:
    text = re.sub(r"영역:\s*\n\s*듣기", "영역: 듣기", text)
    text = re.sub(r"영역:\s*\n\s*읽기", "영역: 읽기", text)
    return text


def _split_listen_read_sections(text: str) -> tuple[str, str]:
    text = _normalize_section_text(text)
    listen_part = _extract_section(text, "영역: 듣기")
    read_part = _extract_section(text, "영역: 읽기")
    if not read_part:
        m = re.search(r"영역:\s*(?:읽기|위기|리기)", text)
        if m:
            read_part = text[m.end() :]
    if not listen_part and "듣기" in text:
        m = re.search(r"영역:\s*듣기", text)
        if m:
            tail = text[m.end() :]
            end = re.search(r"영역:\s*(?:읽기|위기|리기)", tail)
            listen_part = tail[: end.start()] if end else tail
    return listen_part, read_part


def _parse_answers_from_text(
    text: str, path: Path | None = None
) -> tuple[dict[int, str], dict[int, str]]:
    name = (path.name.lower() if path else "")
    listen_only = "listening" in name and "reading" not in name
    read_only = "reading" in name and "listening" not in name

    listen_part, read_part = _split_listen_read_sections(text)

    if listen_only or (not listen_part and not read_part and not read_only):
        listen_part = listen_part or text
        read_part = ""
    if read_only:
        read_part = read_part or text
        listen_part = ""

    listen = _parse_answer_block(listen_part, 1, 30)
    read_exam = _parse_answer_block(read_part, 31, 70)
    if len(read_exam) < 20:
        read_old = _parse_answer_block(read_part, 1, 40)
        reading = read_old
    else:
        reading = {q - 30: ans for q, ans in read_exam.items() if 31 <= q <= 70}
    return listen, reading


def parse_answers_pdf(
    path: str | Path, *, allow_ocr: bool = True
) -> tuple[dict[int, str], dict[int, str]]:
    path = Path(path)
    text = pdf_text(path, allow_ocr=allow_ocr)
    return _parse_answers_from_text(text, path)


def _listening_text(full: str) -> str:
    for marker in ("TOPIKⅠ읽기", "읽기(31", "읽기 (31", "※ [31"):
        if marker in full:
            return full.split(marker, 1)[0]
    return full


def _reading_text(full: str) -> str:
    m = re.search(r"※\s*\[31", full)
    if m:
        return full[m.start() :]
    for marker in ("TOPIKⅠ읽기", "읽기(31", "읽기 (31"):
        if marker in full:
            return full.rsplit(marker, 1)[1]
    m = re.search(r"^31\.\s", full, re.MULTILINE)
    return full[m.start() :] if m else full


def _blocks_by_markers(text: str, q_min: int, q_max: int) -> dict[int, str]:
    """Split text into blocks keyed by question number."""
    matches = list(QUESTION_MARKER.finditer(text))
    blocks: dict[int, str] = {}
    for idx, m in enumerate(matches):
        q = int(m.group(1))
        if not (q_min <= q <= q_max):
            continue
        start = m.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        tail = m.group(2).strip()
        body = text[start:end]
        blocks[q] = f"{tail}\n{body}".strip() if tail else body
    return blocks


def _is_option_candidate(ln: str) -> bool:
    t = ln.strip()
    if not t:
        return False
    if SCORE_LINE.match(t):
        return False
    if re.fullmatch(r"\d{1,2}", t):
        return False
    if re.match(r"^\(?\s*\d+\s*점", t):
        return False
    if NOISE_LINE.search(t):
        return False
    if t.startswith("<") or t.startswith("※"):
        return False
    if SPEAKER_LINE.match(t):
        return False
    if not re.search(r"[가-힣]", t):
        return False
    if len(t) < 2 and not re.fullmatch(r"[가-힣]+", t):
        return False
    return True


def _extract_options_plain(block: str) -> list[str]:
    opts: list[str] = []
    for ln in block.splitlines():
        t = ln.strip()
        t = re.sub(r"^\d{1,2}\.", "", t).strip()
        if not _is_option_candidate(t):
            if opts and len(opts) < 4:
                opts = []
            continue
        opts.append(t)
        if len(opts) == 4:
            return opts
    return opts[:4] if len(opts) >= 4 else opts


def _extract_options(block: str) -> list[str]:
    opts: list[str] = []
    for ln in block.splitlines():
        t = ln.strip()
        t = re.sub(r"^\d{1,2}\.", "", t).strip()
        m = OPTION_LINE.match(t)
        if m:
            opts.append(m.group(1).strip())
            continue
        m2 = OPTION_GLUE.match(t)
        if m2:
            opts.append(m2.group(1).strip())
    if len(opts) >= 4:
        return opts[:4]
    # inline: "① foo ② bar" on one line
    inline = re.findall(r"[①②③④❶❷❸❹]\s*([^①②③④❶❷❸❹\n]+)", block)
    if len(inline) >= 4:
        return [x.strip() for x in inline[:4]]
    plain = _extract_options_plain(block)
    if len(plain) >= 4:
        return plain[:4]
    return opts


def parse_listening_content(
    papers_path: str | Path, *, allow_ocr: bool = True
) -> dict[int, dict]:
    text = _listening_text(pdf_text(papers_path, allow_ocr=allow_ocr))
    blocks = _transcript_blocks(text, 1, 30)
    out: dict[int, dict] = {}
    for q, block in blocks.items():
        lines = [
            ln.strip()
            for ln in block.splitlines()
            if ln.strip() and not SCORE_LINE.match(ln.strip())
        ]
        opts = _extract_options(block)
        extra = "\n".join(
            ln
            for ln in lines
            if not OPTION_LINE.match(ln) and not ln.startswith("※")
        )[:200]
        out[q] = {"options": opts, "extra": extra.strip()}
    return out


READING_Q_MARKER = re.compile(
    r"^(\d{1,2})\.\s*(?:\(\s*\d+\s*점\s*\))?\s*",
    re.MULTILINE,
)


def _normalize_ocr_digits(text: str) -> str:
    """Sửa nhầm lẫn OCR chữ O/l với số ở đầu dòng marker (vd '6O.' -> '60.')."""

    def fix(m: re.Match) -> str:
        token = m.group(1)
        token = token.replace("O", "0").replace("o", "0").replace("l", "1")
        return f"\n{token}{m.group(2)}"

    return re.sub(r"\n\s*([0-9OolI]{1,2})([.\uFF0E])", fix, text)


def _reading_blocks(text: str, q_min: int, q_max: int) -> dict[int, str]:
    text = _normalize_ocr_digits(text)
    # Marker chính: số có dấu chấm
    markers: list[tuple[int, int, int]] = []
    for m in READING_Q_MARKER.finditer(text):
        q = int(m.group(1))
        if q_min <= q <= q_max:
            markers.append((q, m.start(), m.end()))
    if len(markers) < (q_max - q_min + 1) * 0.35:
        return _blocks_by_markers(text, q_min, q_max)

    # Lọc tăng dần để tránh nhiễu
    mono: list[tuple[int, int, int]] = []
    last_q = q_min - 1
    for q, start, end in markers:
        if q > last_q:
            mono.append((q, start, end))
            last_q = q

    # Bù marker thiếu do OCR mất dấu chấm: tìm số trần ở vị trí phù hợp
    present = {q for q, _, _ in mono}
    bare = []
    for bm in re.finditer(r"^(\d{1,2})\.?\s*$", text, re.MULTILINE):
        bare.append((int(bm.group(1)), bm.start(), bm.end()))
    for q, start, end in bare:
        if q in present or not (q_min <= q <= q_max):
            continue
        prev = max((mm for mm in mono if mm[0] < q), default=None, key=lambda x: x[0])
        nxt = min((mm for mm in mono if mm[0] > q), default=None, key=lambda x: x[0])
        if prev and start <= prev[1]:
            continue
        if nxt and start >= nxt[1]:
            continue
        mono.append((q, start, end))
        present.add(q)
    mono.sort(key=lambda x: x[1])

    blocks: dict[int, str] = {}
    for idx, (q, start, end) in enumerate(mono):
        block_end = mono[idx + 1][1] if idx + 1 < len(mono) else len(text)
        blocks[q] = text[end:block_end]
    return blocks


def _parse_reading_block(block: str) -> dict:
    opts = _extract_options(block)
    stem: list[str] = []
    for ln in block.splitlines():
        t = ln.strip()
        if not t or SCORE_LINE.match(t) or t.startswith("※") or t.startswith("<보"):
            continue
        if OPTION_LINE.match(t) or OPTION_GLUE.match(t) or re.match(r"^[①②③④❶❷❸❹]", t):
            break
        if re.fullmatch(r"\d{1,2}", t):
            continue
        stem.append(t)
    passage = re.sub(r"\s+", "", "".join(stem))
    # Câu chèn câu vào vị trí: đáp án luôn là ㉠㉡㉢㉣
    is_insertion = bool(re.search(r"문장이?\s*들어[갈칼]\s*곳", block)) or bool(
        re.search(r"들어[갈칼]\s*곳으로", block)
    )
    if is_insertion and len(opts) < 4:
        opts = ["㉠", "㉡", "㉢", "㉣"]
    question = ""
    if is_insertion:
        question = "다음 문장이 들어갈 곳으로 가장 알맞은 것을 고르십시오."
    elif passage and "(" in passage:
        question = "( )에 들어갈 가장 알맞은 것을 고르십시오."
    elif passage:
        question = "다음을 읽고 알맞은 것을 고르십시오."
    return {"passage": passage, "question": question, "options": opts}


def pdf_text_pages(
    path: str | Path, page_indices: list[int], *, allow_ocr: bool = True
) -> str:
    doc = fitz.open(str(path))
    parts: list[str] = []
    for i in page_indices:
        if i < 0 or i >= len(doc):
            continue
        page = doc[i]
        text = page.get_text()
        if allow_ocr and len(text.strip()) < 40:
            import io

            import numpy as np
            from PIL import Image

            pix = page.get_pixmap(matrix=fitz.Matrix(300 / 72, 300 / 72))
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            reader = _get_ocr_reader()
            lines = reader.readtext(np.array(img), detail=0, paragraph=False)
            text = "\n".join(str(ln).strip() for ln in lines if str(ln).strip())
        parts.append(text)
    return "\n".join(parts)


def parse_reading_content(
    papers_path: str | Path, *, allow_ocr: bool = True
) -> dict[int, dict]:
    full = pdf_text(papers_path, allow_ocr=allow_ocr)
    text = _reading_text(full)
    blocks = _reading_blocks(text, 31, 70)
    out: dict[int, dict] = {}
    for exam_q, block in blocks.items():
        bank_q = exam_q - 30
        if not (1 <= bank_q <= 40):
            continue
        parsed = _parse_reading_block(block)
        if parsed.get("options") or parsed.get("passage"):
            out[bank_q] = parsed
    if allow_ocr and any(out.get(q, {}).get("options") is None or len(out.get(q, {}).get("options", [])) < 4 for q in (1, 2, 3)):
        doc = fitz.open(str(papers_path))
        early = pdf_text_pages(papers_path, list(range(min(12, len(doc)))), allow_ocr=True)
        for exam_q, block in _reading_blocks(_reading_text(early), 31, 70).items():
            bank_q = exam_q - 30
            if bank_q not in (1, 2, 3):
                continue
            parsed = _parse_reading_block(block)
            if len(parsed.get("options") or []) >= 4:
                out[bank_q] = parsed
    return out


def _transcript_lines(block: str) -> list[str]:
    lines: list[str] = []
    for ln in block.splitlines():
        t = ln.strip()
        if not t:
            continue
        if SCORE_LINE.match(t):
            continue
        if OPTION_LINE.match(t):
            continue
        if re.match(r"^[①②③④❶❷❸❹]", t):
            continue
        if re.fullmatch(r"\d{1,2}[.\uFF0E]?", t):
            continue
        if re.match(r"^\d{1,2}\.", t):
            continue
        if SPEAKER_LINE.match(t):
            lines.append(re.sub(r"\s*[:：]\s*", ": ", t))
        elif re.search(r"[:：]", t) and re.match(r"^(남자|여자|가|나)", t):
            lines.append(t)
    return lines


TRANSCRIPT_Q_MARKER = re.compile(
    r"^(\d{1,2})\.\s*(?:\(\s*\d+\s*점\s*\)|.+)?\s*$",
    re.MULTILINE,
)


_SCORE_AHEAD = re.compile(r"^\s*\(\s*\d+\s*점\s*\)")
_SPEAKER_AHEAD = re.compile(r"^\s*(남자|여자|남|여)\s*[:：]")


def _ocr_question_markers(text: str, q_min: int, q_max: int) -> list[tuple[int, int, int]]:
    """Tìm marker câu hỏi chịu lỗi OCR: số có/không có dấu chấm.

    Số trần (vd '2') chỉ tính là marker nếu dòng kế tiếp là '(N점)'.
    Trả về (q, start_offset, end_of_marker_offset).
    """
    lines = text.splitlines(keepends=True)
    offsets = []
    pos = 0
    for ln in lines:
        offsets.append(pos)
        pos += len(ln)
    markers: list[tuple[int, int, int]] = []
    for i, ln in enumerate(lines):
        t = ln.strip()
        m = re.fullmatch(r"(\d{1,2})\.", t)
        bare = re.fullmatch(r"(\d{1,2})", t)
        q = None
        if m:
            q = int(m.group(1))
        elif bare:
            nxt = ""
            for j in range(i + 1, min(i + 3, len(lines))):
                if lines[j].strip():
                    nxt = lines[j].strip()
                    break
            if _SCORE_AHEAD.match(nxt) or _SPEAKER_AHEAD.match(nxt):
                q = int(bare.group(1))
        if q is None or not (q_min <= q <= q_max):
            continue
        start = offsets[i]
        end = start + len(ln)
        markers.append((q, start, end))
    return markers


def _transcript_blocks(text: str, q_min: int, q_max: int) -> dict[int, str]:
    text = _normalize_ocr_digits(text)
    markers = _ocr_question_markers(text, q_min, q_max)
    # Lọc marker theo thứ tự tăng dần để tránh nhiễu OCR
    filtered: list[tuple[int, int, int]] = []
    last_q = q_min - 1
    for q, start, end in markers:
        if q >= last_q:
            filtered.append((q, start, end))
            last_q = q
    if len(filtered) < (q_max - q_min + 1) * 0.4:
        return _blocks_by_markers(text, q_min, q_max)
    blocks: dict[int, str] = {}
    for idx, (q, start, end) in enumerate(filtered):
        block_start = end
        block_end = filtered[idx + 1][1] if idx + 1 < len(filtered) else len(text)
        blocks[q] = text[block_start:block_end]
    return blocks


def parse_listen_options_from_text(text: str) -> dict[int, list[str]]:
    blocks = _transcript_blocks(text, 1, 30)
    out: dict[int, list[str]] = {}
    for q, block in blocks.items():
        opts = _extract_options(block)
        if len(opts) >= 4:
            out[q] = opts[:4]
    return out


SECTION_MARKER = re.compile(
    r"※?\s*\[(\d{1,2})\s*[～~\-]\s*(\d{1,2})\][^\n]*",
    re.MULTILINE,
)


def _paired_section_dialogues(text: str) -> dict[int, list[str]]:
    """Hội thoại chung cho cặp câu 25–26, 27–28, 29–30."""
    result: dict[int, list[str]] = {}
    for m in SECTION_MARKER.finditer(text):
        q_start, q_end = int(m.group(1)), int(m.group(2))
        section_start = m.end()
        qm = re.search(rf"^{q_start}\.", text[section_start:], re.MULTILINE)
        dialogue_text = (
            text[section_start : section_start + qm.start()]
            if qm
            else text[section_start : section_start + 1200]
        )
        dialogue = _transcript_lines(dialogue_text)
        if not dialogue:
            continue
        for q in range(q_start, q_end + 1):
            result[q] = list(dialogue)
    return result


def parse_transcript_text(text: str) -> dict[int, list[str]]:
    blocks = _transcript_blocks(text, 1, 30)
    paired = _paired_section_dialogues(text)
    out: dict[int, list[str]] = {}
    for q, block in blocks.items():
        lines = _transcript_lines(block)
        if lines:
            out[q] = lines
    for q, dialogue in paired.items():
        existing = out.get(q, [])
        has_speaker = any(
            SPEAKER_LINE.match(ln) or re.match(r"^(남자|여자|가|나)", ln) for ln in existing
        )
        if not has_speaker:
            out[q] = dialogue + existing
    return out


def parse_listen_options_from_transcript(
    pdf_or_txt_path: str | Path, *, allow_ocr: bool = True
) -> dict[int, list[str]]:
    path = Path(pdf_or_txt_path)
    if path.suffix.lower() == ".pdf":
        text = pdf_text(path, allow_ocr=allow_ocr)
    else:
        text = path.read_text(encoding="utf-8", errors="replace")
    return parse_listen_options_from_text(text)


def parse_transcript(
    pdf_or_txt_path: str | Path, *, allow_ocr: bool = True
) -> dict[int, list[str]]:
    path = Path(pdf_or_txt_path)
    if path.suffix.lower() == ".pdf":
        text = pdf_text(path, allow_ocr=allow_ocr)
    else:
        text = path.read_text(encoding="utf-8", errors="replace")
    return parse_transcript_text(text)


def find_file(folder: Path, *patterns: str) -> Path | None:
    for pat in patterns:
        hits = sorted(folder.glob(pat))
        if hits:
            return hits[0]
    return None
