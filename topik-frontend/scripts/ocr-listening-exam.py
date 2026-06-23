"""
ocr-listening-exam.py — OCR PDF Nghe (scan) → topik2-{ky}.txt + listen-bank.json.

Dùng easyocr (ko+en) + parse_questions_from_text từ build_topik_txt.py.
Transcript + correct_ans giữ từ DATALISTEN / listen-bank hiện có.

Chạy từ topik-frontend:
    python scripts/ocr-listening-exam.py 64 83 91 96 102
"""
from __future__ import annotations

import importlib.util
import io
import json
import os
import re
import sys

import fitz
import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DOWNLOADS = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)

EXAM_FOLDERS: dict[str, str] = {
    "64": "Ki64_2020",
    "83": "Ki83_2022",
    "91": "Ki91_2023",
    "96": "Ki96_2025",
    "102": "Ki102_2025",
}

LISTEN_PROMPTS: dict[int, str] = {
    **{n: "다음을 듣고 알맞은 그림을 고르십시오." for n in range(1, 4)},
    **{n: "다음 대화를 잘 듣고 이어질 수 있는 말을 고르십시오." for n in range(4, 9)},
    **{
        n: "다음 대화를 잘 듣고 여자가 이어서 할 행동으로 알맞은 것을 고르십시오."
        for n in range(9, 13)
    },
    **{n: "다음을 듣고 내용과 일치하는 것을 고르십시오." for n in range(13, 16)},
    **{n: "다음을 듣고 남자의 중심 생각을 고르십시오." for n in range(16, 19)},
}

_READER = None


def get_reader():
    global _READER
    if _READER is None:
        import easyocr

        print("[ocr] Khoi tao easyocr (lan dau co the mat vai phut)...")
        _READER = easyocr.Reader(["ko", "en"], gpu=False, verbose=False)
    return _READER


def load_build_topik():
    spec = importlib.util.spec_from_file_location(
        "build_topik_txt", os.path.join(DOWNLOADS, "build_topik_txt.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def find_listening_pdf(ki_path: str) -> str:
    for fname in sorted(os.listdir(ki_path)):
        fl = fname.lower()
        if "writing" in fl:
            continue
        if fl.endswith(".pdf") and "listening" in fl and "test" in fl and "answers" not in fl:
            return os.path.join(ki_path, fname)
    raise FileNotFoundError(f"Khong tim thay listening PDF trong {ki_path}")


def ocr_pdf_pages(pdf_path: str, dpi: int = 200) -> str:
    reader = get_reader()
    doc = fitz.open(pdf_path)
    parts: list[str] = []
    for idx, page in enumerate(doc):
        print(f"    OCR trang {idx + 1}/{len(doc)}...")
        pix = page.get_pixmap(matrix=fitz.Matrix(dpi / 72, dpi / 72))
        img = Image.open(io.BytesIO(pix.tobytes("png")))
        lines = reader.readtext(np.array(img), detail=0, paragraph=True)
        parts.append(f"=== PAGE {idx + 1} ===\n" + "\n".join(lines))
    return "\n\n".join(parts)


def standard_prompt(qn: int) -> str:
    if qn in LISTEN_PROMPTS:
        return LISTEN_PROMPTS[qn]
    if 19 <= qn <= 21:
        return "남자의 중심 생각으로 맞는 것을 고르십시오."
    if 22 <= qn <= 24:
        return "들은 내용으로 맞는 것을 고르십시오."
    if qn == 25:
        return "남자는 무엇을 하고 있는지 고르십시오."
    if 26 <= qn <= 28:
        return "들은 내용으로 맞는 것을 고르십시오."
    if qn == 29:
        return "여자가 남자에게 말하는 의도를 고르십시오."
    if 30 <= qn <= 32:
        return "들은 내용으로 맞는 것을 고르십시오."
    if qn == 33:
        return "남자는 누구인지 고르십시오."
    if 34 <= qn <= 36:
        return "들은 내용으로 맞는 것을 고르십시오."
    if qn in (37, 38):
        return "남자의 생각으로 맞는 것을 고르십시오." if qn == 37 else "남자의 태도로 맞는 것을 고르십시오."
    if qn == 39:
        return "무엇에 대한 내용인지 맞는 것을 고르십시오."
    if 40 <= qn <= 50:
        return "들은 내용과 일치하는 것을 고르십시오."
    return "다음을 듣고 물음에 답하십시오."


def load_datalisten(ky: str) -> dict[int, dict]:
    path = os.path.join(DOWNLOADS, "DATALISTEN", f"topik2-{ky}.json")
    if not os.path.isfile(path):
        path = os.path.join(DOWNLOADS, EXAM_FOLDERS[ky], f"topik2-{ky}-listen-bank.json")
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    out: dict[int, dict] = {}
    for row in rows:
        qn = int(row["questionNo"])
        out[qn] = row
    return out


def load_frontend_listen_bank(ky: str) -> dict[int, dict]:
    """Fallback options từ bank frontend (git) khi OCR thiếu."""
    path = os.path.join(SCRIPT_DIR, "..", "data", f"topik2-{ky}-bank.json")
    if not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    out: dict[int, dict] = {}
    for row in rows:
        if row.get("section") == "listening":
            out[int(row["questionNo"])] = row
    return out


def _valid_options(opts: list) -> list[str]:
    clean = [str(o).strip() for o in (opts or []) if o and str(o).strip()]
    if len(clean) < 4:
        return []
    if any(o.startswith("[Lựa chọn") for o in clean):
        return []
    return clean[:4]


def _strip_listen_instruction(text: str) -> str:
    """Bỏ dòng đề bài OCR dính vào block lựa chọn (q27+)."""
    patterns = [
        r"^남자가 말하는 의도로 알맞은 것[을올]\s*고르십시오\.?\s*",
        r"^무엇에 대한 내용인지 알맞은 것[을올]\s*고르십시오\.?\s*",
        r"^남자가 누구인지 고르십시오\.?\s*",
        r"^여자가 누구인지 고르십시오\.?\s*",
        r"^들은 내용과 같은 것[을올]\s*고르십시오\.?\s*",
        r"^이 강연의 중심 내용으로 가장 알맞은 것[을올]\s*고르십시오\.?\s*",
        r"^참가자들이 얼굴 사진[을올]\s*기억한 이유로 맞는 것[을올]\s*고르십시오\.?\s*",
    ]
    for pat in patterns:
        text = re.sub(pat, "", text)
    return text.strip()


def split_four_options(text: str) -> list[str]:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if not text:
        return []

    text = _strip_listen_instruction(text)

    circled = re.findall(r"[①②③④㉠㉡㉢㉣➀➁➂➃]\s*([^①②③④㉠㉡㉢㉣➀➁➂➃]+)", text)
    if len(circled) >= 4:
        return [c.strip().rstrip(":").strip() for c in circled[:4]]

    numbered = re.findall(r"[1-4]\)\s*([^1-4\)]+?)(?=\s*[1-4]\)|$)", text)
    if len(numbered) >= 4:
        return [c.strip() for c in numbered[:4]]

    # 4 lựa chọn cách nhau bởi dấu hai chấm (q9–16 phổ biến)
    if text.count(":") >= 3:
        parts = [p.strip().rstrip(":").strip() for p in text.split(":") if p.strip()]
        if 2 <= len(parts) < 4:
            expanded: list[str] = []
            for p in parts:
                sub = re.split(
                    r"\s+(?=(?:새벽|남자|여자|지명|이 바퀴|이 사업|어업|정부|공부|다양|오래))",
                    p,
                )
                expanded.extend(s.strip() for s in sub if len(s.strip()) > 4)
            if len(expanded) >= 4:
                return expanded[:4]
        if len(parts) >= 4:
            return parts[:4]

    if "때문에" in text:
        because = [p.strip() for p in re.findall(r".+?때문에", text) if len(p.strip()) > 6]
        if len(because) >= 4:
            return because[:4]

    nm = re.findall(r"남자는[^:]{4,}?(?:다|다\.|한다|했다|한다:)", text)
    if len(nm) >= 4:
        return [p.strip().rstrip(":") for p in nm[:4]]

    # 1 dấu hai chấm + các câu (q4 kiểu "A: B. C D")
    if ":" in text:
        head, tail = text.split(":", 1)
        parts = [head.strip()]
        parts.extend(p.strip() for p in re.split(r"\.\s+", tail) if len(p.strip()) > 3)
        if len(parts) >= 4:
            return parts[:4]

    # Dấu hỏi / chấm
    for splitter in [r"\?\s+", r"\.\s+"]:
        parts = [p.strip() for p in re.split(splitter, text) if len(p.strip()) > 4]
        if len(parts) >= 4:
            return parts[:4]

    # Khoảng trắng rộng (q5 kiểu "A? B   C?   D")
    parts = [p.strip() for p in re.split(r"\s{2,}", text) if len(p.strip()) > 4]
    if len(parts) >= 4:
        return parts[:4]

    # Sau đuôi câu tiếng Hàn
    parts = re.split(r"(?<=[다요임])\s+(?=[가-힣])", text)
    parts = [p.strip().rstrip(":").strip() for p in parts if len(p.strip()) > 4]
    if len(parts) >= 4:
        return parts[:4]

    # Gộp tách theo : và . (q4 kiểu "A: B. C D")
    if len(parts) < 4:
        mixed = [p.strip() for p in re.split(r"[:.]\s+", text) if len(p.strip()) > 3]
        if len(mixed) >= 3:
            parts = mixed

    # Tách phần dài nhất thành 2 mệnh đề (khi OCR gộp 2 lựa chọn)
    while len(parts) > 0 and len(parts) < 4:
        idx = max(range(len(parts)), key=lambda i: len(parts[i]))
        chunk = parts[idx]
        sub = re.split(
            r"\s+(?=(?:재미|책|좀|그럼|맞아|정말|힘들|내일|한번|파란|비가|곧|제품|고객|나는|새로|공간|지퍼|기능|초기))",
            chunk,
            maxsplit=1,
        )
        if len(sub) == 2 and all(len(s.strip()) > 4 for s in sub):
            parts = parts[:idx] + [s.strip() for s in sub] + parts[idx + 1 :]
        else:
            break

    # Lựa chọn nối liền không dấu câu (q27, q33): tách theo ~려고 / cụm danh từ
    if len(parts) < 4:
        ryogo = [p.strip() for p in re.findall(r"[^\.]+?려고", text) if len(p.strip()) > 6]
        if len(ryogo) >= 4:
            return ryogo[:4]

    if len(parts) < 4:
        noun_chunks = re.findall(
            r"(?:기능에 따른 지퍼의 형태|지퍼[를이]?\s*활용한?\s*상품의 종류|초기의 지퍼가 가진 문제점|지퍼가 널리 쓰이게 된 과정|"
            r"공간 대여[^공간]*?려고)",
            text,
        )
        if len(noun_chunks) >= 4:
            return [c.strip() for c in noun_chunks[:4]]
        # q33 OCR lỗi "지피" "지퍼지"
        fuzzy = re.split(
            r"(?=기능에|지퍼|초기의|지퍼가)",
            text,
        )
        fuzzy = [p.strip() for p in fuzzy if len(p.strip()) > 5]
        if len(fuzzy) >= 4:
            return fuzzy[:4]

    if len(parts) < 4:
        people = re.findall(r"[가-힣][가-힣\s]+사람", text)
        if len(people) >= 4:
            return [p.strip() for p in people[:4]]

    if len(parts) < 4:
        brain = re.split(r"(?=뇌에|시간[을올]|생존|손상)", text)
        brain = [p.strip() for p in brain if len(p.strip()) > 5]
        if len(brain) >= 4:
            return brain[:4]

    if len(parts) >= 4:
        return parts[:4]

    return []


def _collect_block_from_lines(lines: list[str], start: int, qn: int) -> str:
    chunk_lines: list[str] = []
    for j in range(start + 1, len(lines)):
        nxt = lines[j].strip()
        if not nxt or nxt.startswith("==="):
            break
        if re.match(r"^\d{1,2}\.?$", nxt):
            break
        if re.match(r"^\[\d", nxt):
            break
        if re.match(r"^4소\.?", nxt) or re.match(r"^44\.", nxt):
            break
        if re.match(r"^TOPIK|^제\d+회", nxt):
            break
        if re.fullmatch(r"\d{1,2}", nxt) and int(nxt) != qn:
            break
        chunk_lines.append(nxt)
    return " ".join(chunk_lines).strip()


def extract_question_blocks(ocr_text: str) -> dict[int, str]:
    """Tách block text theo số câu 1–50 từ OCR thô."""
    blocks: dict[int, str] = {}
    lines = ocr_text.splitlines()

    for i, line in enumerate(lines):
        stripped = line.strip()
        stripped = re.sub(r"^4소\.?", "44.", stripped)
        if not stripped or stripped.startswith("==="):
            continue

        # [9~12] ... 9 opt1: opt2: ...
        m_inline = re.search(
            r"\[\d+[~～\-]\d+\].*?\b(\d{1,2})\s+(.+)$",
            stripped,
        )
        if m_inline:
            qn = int(m_inline.group(1))
            if 1 <= qn <= 50:
                chunk = m_inline.group(2).strip()
                if chunk and (qn not in blocks or len(chunk) > len(blocks[qn])):
                    blocks[qn] = chunk

        # Dòng "4" hoặc "10." đứng một mình
        m_num = re.match(r"^(\d{1,2})\.?$", stripped)
        if m_num:
            qn = int(m_num.group(1))
            if 1 <= qn <= 50:
                chunk = _collect_block_from_lines(lines, i, qn)
                if chunk and (qn not in blocks or len(chunk) > len(blocks.get(qn, ""))):
                    blocks[qn] = chunk
            continue

        # Dòng "4" / "29." / "29 text"
        m_start = re.match(r"^(\d{1,2})\.?\s+(.+)$", stripped)
        if m_start:
            qn = int(m_start.group(1))
            if 1 <= qn <= 50:
                chunk = m_start.group(2).strip()
                extra = _collect_block_from_lines(lines, i, qn)
                if extra:
                    chunk = (chunk + " " + extra).strip()
                if chunk and (qn not in blocks or len(chunk) > len(blocks.get(qn, ""))):
                    blocks[qn] = chunk

    # Fallback: flat text với "13."
    flat = re.sub(r"=== PAGE \d+ ===", " ", ocr_text)
    flat = re.sub(r"\s+", " ", flat)
    for m in re.finditer(r"(?:^|[\[\s])(\d{1,2})\.\s*([^\.]{8,}?)(?=(?:\s\d{1,2}\.|\s\[\d|$))", flat):
        qn = int(m.group(1))
        if 1 <= qn <= 50:
            chunk = m.group(2).strip()
            if chunk and (qn not in blocks or len(chunk) > len(blocks.get(qn, ""))):
                blocks[qn] = chunk

    return blocks


def parse_listening_ocr(ocr_text: str) -> dict[int, dict]:
    blocks = extract_question_blocks(ocr_text)
    out: dict[int, dict] = {}

    for qn, chunk in blocks.items():
        # Bỏ instruction dài ở đầu block (sau số câu)
        chunk = re.sub(
            r"^(다음|들은|여자|남자|이 ).*?(?=(?:[가-힣].{8,}))",
            "",
            chunk,
            count=1,
            flags=re.DOTALL,
        ).strip()

        options = split_four_options(chunk)
        passage = ""
        if not options:
            passage = chunk[:120]
        else:
            # Phần còn lại trước option đầu (nếu có)
            first = options[0]
            idx = chunk.find(first[: min(12, len(first))])
            if idx > 10:
                passage = chunk[:idx].strip()

        out[qn] = {
            "q_text": passage,
            "options": options,
        }

    return out


def clean_passage(text: str) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    if text.startswith("[Nghe"):
        return ""
    return text


def build_listen_bank(ky: str) -> None:
    folder = EXAM_FOLDERS[ky]
    ki_path = os.path.join(DOWNLOADS, folder)
    pdf = find_listening_pdf(ki_path)
    exam_id = f"topik2-{ky}"

    print(f"\n[ocr-listen] Ky {ky} — {os.path.basename(pdf)}")
    ocr_cache = os.path.join(ki_path, f"raw_listening_ocr.txt")
    use_cache = "--use-cache" in sys.argv or (
        os.path.isfile(ocr_cache) and os.path.getsize(ocr_cache) > 500
    )
    if use_cache and os.path.isfile(ocr_cache):
        print(f"  Dung cache OCR: {ocr_cache}")
        ocr_text = open(ocr_cache, encoding="utf-8").read()
    else:
        ocr_text = ocr_pdf_pages(pdf)
        with open(ocr_cache, "w", encoding="utf-8") as f:
            f.write(ocr_text)

    mod = load_build_topik()
    ocr_blocks = extract_question_blocks(ocr_text)
    parsed_ocr = parse_listening_ocr(ocr_text)
    parsed_pdf = mod.parse_questions_from_text(ocr_text, "listening", int(ky))
    print(f"  OCR blocks: {len(ocr_blocks)} | Parsed OCR: {len(parsed_ocr)} | build_topik: {len(parsed_pdf)} cau")

    existing = load_datalisten(ky)
    frontend_bank = load_frontend_listen_bank(ky)
    rows: list[dict] = []

    for qn in range(1, 51):
        prev = existing.get(qn, {})
        prev_cj = prev.get("content_json", {})
        pq = parsed_ocr.get(qn) or {}
        if not pq.get("options"):
            pdf_q = parsed_pdf.get(qn, {})
            if pdf_q.get("options"):
                pq = pdf_q

        raw_q = str(pq.get("q_text", "") or "")
        block_text = ocr_blocks.get(qn, "")
        options = [o.strip() for o in pq.get("options", []) if o and o.strip()]

        if qn >= 4 and len(options) < 4:
            for src in (block_text, raw_q):
                if not src:
                    continue
                fallback_opts = split_four_options(src)
                if len(fallback_opts) >= 4:
                    options = fallback_opts[:4]
                    raw_q = ""
                    break

        if qn <= 3:
            options = []
            passage = standard_prompt(qn)
        elif len(options) >= 4:
            passage = standard_prompt(qn)
        else:
            passage = clean_passage(raw_q) or standard_prompt(qn)

        if qn >= 4 and len(_valid_options(options)) < 4:
            for src in (
                _valid_options(prev_cj.get("options", [])),
                _valid_options(frontend_bank.get(qn, {}).get("content_json", {}).get("options", [])),
            ):
                if len(src) >= 4:
                    options = src
                    break

        while len(options) < 4 and qn >= 4:
            options.append("")
        options = options[:4]

        if qn >= 4 and not any(options):
            # fallback: giữ transcript-only, đánh dấu rõ
            options = prev_cj.get("options", [])
            if options and options[0].startswith("[Lựa chọn"):
                options = ["", "", "", ""]

        row = {
            "examId": exam_id,
            "section": "listening",
            "questionNo": str(qn),
            "tier": prev.get("tier", "free"),
            "correct_ans": str(prev.get("correct_ans", "")),
            "content_json": {
                "passage": passage,
                "audio_url": prev_cj.get("audio_url", f"/audio/{exam_id}-listen-q{qn}.mp3"),
                "transcript": prev_cj.get("transcript", []),
                "options": options if qn >= 4 else [],
                "exam_offset_ms": prev_cj.get("exam_offset_ms", 0),
            },
        }
        if qn <= 3:
            img = prev_cj.get("image_url") or f"/topik_images/{exam_id}-listen-q{qn}.png"
            row["content_json"]["image_url"] = img
        rows.append(row)

    out_bank = os.path.join(ki_path, f"{exam_id}-listen-bank.json")
    with open(out_bank, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"  Wrote {out_bank}")

    # unified txt (listening section)
    txt_lines = [f"# {exam_id}", "", "## LISTENING", ""]
    for row in rows:
        qn = int(row["questionNo"])
        cj = row["content_json"]
        txt_lines.append(f"[{qn}]")
        txt_lines.append(f"Q: {cj['passage']}")
        if qn <= 3:
            txt_lines.append(f"IMG: {exam_id}-listen-q{qn}.png")
        for i, opt in enumerate(cj.get("options") or [], 1):
            if opt:
                txt_lines.append(f"{i}) {opt}")
        txt_lines.append(f"ANS: {row['correct_ans']}")
        if cj.get("transcript"):
            txt_lines.append("T:")
            for line in cj["transcript"]:
                txt_lines.append(line.get("lineText", ""))
        txt_lines.append("")

    out_txt = os.path.join(ki_path, f"{exam_id}.txt")
    with open(out_txt, "w", encoding="utf-8") as f:
        f.write("\n".join(txt_lines))
    print(f"  Wrote {out_txt}")

    filled = sum(
        1
        for r in rows
        if int(r["questionNo"]) >= 4
        and any(o.strip() for o in r["content_json"].get("options", []))
    )
    print(f"  Ky {ky}: {filled}/47 cau co options OCR")


def main() -> None:
    kys = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not kys:
        kys = list(EXAM_FOLDERS.keys())
    for ky in kys:
        if ky not in EXAM_FOLDERS:
            raise SystemExit(f"Ky khong ho tro: {ky}")
        build_listen_bank(ky)
    print("\n[ocr-listen] Hoan tat.")


if __name__ == "__main__":
    main()
