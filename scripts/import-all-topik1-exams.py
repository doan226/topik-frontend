"""
import-all-topik1-exams.py — Import 10 đề TOPIK I (30 nghe + 40 đọc).

Chạy từ topik-frontend:
    python scripts/import-all-topik1-exams.py
    python scripts/import-all-topik1-exams.py 60 91
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(FRONTEND, "data")
PUB_AUDIO = os.path.join(FRONTEND, "public", "audio")
PUB_DATA = os.path.join(FRONTEND, "public", "data")
PUB_IMG = os.path.join(FRONTEND, "public", "topik_images")

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

EXAMS = _cfg.EXAMS
SEG_LABELS = _cfg.SEG_LABELS
LISTEN_COUNT = _cfg.LISTEN_COUNT
READ_COUNT = _cfg.READ_COUNT
DOWNLOADS_BASE = _cfg.DOWNLOADS_BASE
LISTEN_PROMPTS = _cfg.LISTEN_PROMPTS
READING_INSTRUCTIONS = _cfg.READING_INSTRUCTIONS
exam_id = _cfg.exam_id
tier_for = _cfg.tier_for


def find_ki_dir(ki_folder: str) -> str:
    path = os.path.join(DOWNLOADS_BASE, ki_folder)
    if not os.path.isdir(path):
        raise FileNotFoundError(f"Không tìm thấy: {path}")
    return path


def find_audio_file(src: str) -> str:
    from pathlib import Path

    folder = Path(src)
    for f in folder.iterdir():
        if f.suffix.lower() == ".mp3" and "listening" in f.name.lower():
            return str(f)
    for f in folder.iterdir():
        if f.suffix.lower() == ".mp3":
            return str(f)
    raise FileNotFoundError(f"Không tìm thấy MP3 trong {src}")


def detect_silences_ms(path: str) -> list[tuple[int, int]]:
    result = subprocess.run(
        [
            "ffmpeg",
            "-i",
            path,
            "-af",
            "silencedetect=noise=-40dB:d=2",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
        text=True,
    )
    silences: list[tuple[int, int]] = []
    start: float | None = None
    for line in result.stderr.splitlines():
        if "silence_start:" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and start is not None:
            end = float(line.split("silence_end:")[1].split()[0])
            silences.append((int(start * 1000), int(end * 1000)))
            start = None
    return silences


def probe_duration_ms(path: str) -> int:
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(float(probe.stdout.strip()) * 1000)


def chunk_bounds_from_silences(
    silences: list[tuple[int, int]],
    total_ms: int,
    start_ms: int,
    min_silence_ms: int = 5000,
    min_chunk_ms: int = 8000,
) -> list[tuple[int, int]]:
    regions: list[tuple[int, int]] = []
    cursor = start_ms
    for s, e in silences:
        if e <= start_ms:
            continue
        if s < cursor:
            s = cursor
        if (e - s) >= min_silence_ms:
            if s > cursor and (s - cursor) >= min_chunk_ms:
                regions.append((cursor, s + 800))
            cursor = e
    if total_ms - cursor >= min_chunk_ms:
        regions.append((cursor, total_ms))
    return regions


def ffmpeg_export_segment(input_path: str, start_ms: int, end_ms: int, output_path: str) -> int:
    duration_ms = max(end_ms - start_ms, 1)
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-ss",
            f"{start_ms / 1000:.3f}",
            "-i",
            input_path,
            "-t",
            f"{duration_ms / 1000:.3f}",
            "-acodec",
            "libmp3lame",
            "-q:a",
            "2",
            output_path,
        ],
        check=True,
    )
    return duration_ms


def split_audio(ky: str, src: str) -> dict[str, int]:
    eid = exam_id(ky)
    src_mp3 = find_audio_file(src)
    print(f"  [audio] {os.path.basename(src_mp3)}")
    silences = detect_silences_ms(src_mp3)
    total_ms = probe_duration_ms(src_mp3)
    start_q1 = 0
    for i, (_s, e) in enumerate(silences):
        if (e - _s) >= 7000:
            start_q1 = silences[i - 1][1] if i > 0 else e
            break
    bounds = chunk_bounds_from_silences(silences, total_ms, start_q1)
    print(f"  [audio] {len(bounds)} doan (can {LISTEN_COUNT})")
    if len(bounds) < LISTEN_COUNT:
        # fallback: equal split
        usable = total_ms - start_q1
        step = usable // LISTEN_COUNT
        bounds = [(start_q1 + i * step, start_q1 + (i + 1) * step) for i in range(LISTEN_COUNT)]
        bounds[-1] = (bounds[-1][0], total_ms)
        print(f"  [audio] fallback chia deu {LISTEN_COUNT} doan")
    durations: dict[str, int] = {}
    os.makedirs(PUB_AUDIO, exist_ok=True)
    for idx, label in enumerate(SEG_LABELS):
        if idx >= len(bounds):
            break
        a, b = bounds[idx]
        out = os.path.join(PUB_AUDIO, f"{eid}-listen-q{label}.mp3")
        durations[label] = ffmpeg_export_segment(src_mp3, a, b, out)
    # full audio
    chunks = []
    for label in SEG_LABELS:
        p = os.path.join(PUB_AUDIO, f"{eid}-listen-q{label}.mp3")
        if os.path.isfile(p):
            with open(p, "rb") as f:
                chunks.append(f.read())
    if chunks:
        with open(os.path.join(PUB_AUDIO, f"{eid}-listen-full.mp3"), "wb") as f:
            f.write(b"".join(chunks))
    return durations


def build_listening_rows(
    ky: str,
    listen_ans: dict[int, str],
    listen_content: dict[int, dict],
    transcript: dict[int, list[str]],
    durations: dict[str, int],
) -> list[dict]:
    eid = exam_id(ky)
    tier = tier_for(ky)
    offset_of: dict[str, int] = {}
    cum = 0
    for label in SEG_LABELS:
        offset_of[label] = cum
        cum += durations.get(label, 0)
    rows = []
    for n in range(1, LISTEN_COUNT + 1):
        label = str(n)
        content_data = listen_content.get(n, {})
        opts = content_data.get("options") or []
        tx = transcript.get(n, [])
        content = {
            "passage": LISTEN_PROMPTS.get(n, "다음을 듣고 알맞은 것을 고르십시오."),
            "audio_url": f"/audio/{eid}-listen-q{label}.mp3",
            "transcript": [{"lineMs": 0, "lineText": t} for t in tx],
            "options": opts,
            "exam_offset_ms": offset_of.get(label, 0),
        }
        img_path = os.path.join(PUB_IMG, f"{eid}-listen-q{n}.png")
        if os.path.isfile(img_path):
            content["image_url"] = f"/topik_images/{eid}-listen-q{n}.png"
        rows.append(
            {
                "examId": eid,
                "section": "listening",
                "questionNo": label,
                "tier": tier,
                "correct_ans": listen_ans.get(n, ""),
                "content_json": content,
            }
        )
    return rows


def build_reading_rows(ky: str, read_ans: dict[int, str], read_content: dict[int, dict]) -> list[dict]:
    eid = exam_id(ky)
    tier = tier_for(ky)
    rows = []
    for n in range(1, READ_COUNT + 1):
        data = read_content.get(n, {})
        passage = data.get("passage") or f"{n}. "
        question = data.get("question") or READING_INSTRUCTIONS.get(n, "다음을 읽고 알맞은 것을 고르십시오.")
        opts = data.get("options") or []
        rows.append(
            {
                "examId": eid,
                "section": "reading",
                "questionNo": str(n),
                "tier": tier,
                "correct_ans": read_ans.get(n, ""),
                "content_json": {
                    "passage": passage,
                    "question": question,
                    "options": opts,
                },
            }
        )
    return rows


def write_bank(ky: str, listening: list, reading: list) -> None:
    eid = exam_id(ky)
    merged = listening + reading
    os.makedirs(PUB_DATA, exist_ok=True)
    for path in (
        os.path.join(DATA_DIR, f"{eid}-bank.json"),
        os.path.join(PUB_DATA, f"{eid}-bank.json"),
    ):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
    la = sum(1 for r in listening if r.get("correct_ans"))
    ra = sum(1 for r in reading if r.get("correct_ans"))
    print(f"  [bank] L={len(listening)}({la} ans) R={len(reading)}({ra} ans) -> {eid}-bank.json")


def load_existing_bank(ky: str) -> tuple[list[dict], list[dict]]:
    eid = exam_id(ky)
    path = os.path.join(DATA_DIR, f"{eid}-bank.json")
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Thiếu bank hiện có: {path}")
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    listening = [r for r in rows if r.get("section") == "listening"]
    reading = [r for r in rows if r.get("section") == "reading"]
    return listening, reading


def apply_audio_to_listening(
    listening: list[dict], ky: str, durations: dict[str, int]
) -> list[dict]:
    eid = exam_id(ky)
    offset_of: dict[str, int] = {}
    cum = 0
    for label in SEG_LABELS:
        offset_of[label] = cum
        cum += durations.get(label, 0)
    out = []
    for row in listening:
        label = str(row.get("questionNo", ""))
        cj = dict(row.get("content_json") or {})
        cj["audio_url"] = f"/audio/{eid}-listen-q{label}.mp3"
        cj["exam_offset_ms"] = offset_of.get(label, 0)
        out.append({**row, "content_json": cj})
    return out


def merge_listen_content(
    listening: list[dict],
    ky: str,
    listen_content: dict[int, dict],
    tx_map: dict[int, list[str]],
) -> list[dict]:
    out = []
    for row in listening:
        qno = int(row.get("questionNo", 0))
        cj = dict(row.get("content_json") or {})
        cj["passage"] = LISTEN_PROMPTS.get(qno, cj.get("passage", ""))
        lc = listen_content.get(qno, {})
        if lc.get("options") and qno not in (15, 16):
            cj["options"] = lc["options"]
        if qno in tx_map:
            cj["transcript"] = [{"lineMs": 0, "lineText": t} for t in tx_map[qno]]
        img = os.path.join(PUB_IMG, f"{exam_id(ky)}-listen-q{qno}.png")
        if qno in (15, 16) and os.path.isfile(img):
            cj["image_url"] = f"/topik_images/{exam_id(ky)}-listen-q{qno}.png"
            cj["options"] = []
        out.append({**row, "content_json": cj})
    return out


def import_ky(
    ky: str,
    ki_folder: str,
    *,
    audio_only: bool = False,
    content_only: bool = False,
    no_ocr: bool = False,
) -> None:
    from pathlib import Path

    print(f"\n[import-topik1] === Ky {ky} ===")
    src = Path(find_ki_dir(ki_folder))
    if audio_only:
        listening, reading = load_existing_bank(ky)
        durations = split_audio(ky, str(src))
        listening = apply_audio_to_listening(listening, ky, durations)
        write_bank(ky, listening, reading)
        return
    papers = _parse.find_file(
        src,
        "*Listening*Test*.pdf",
        "*Listening-Test*.pdf",
        "*Papers*.pdf",
        "*papers*.pdf",
    )
    reading_paper = _parse.find_file(
        src,
        "*Reading*Test*.pdf",
        "*Reading-Test*.pdf",
    )
    transcript = _parse.find_file(src, "*Transcript*.pdf", "*transcript*.txt")
    if content_only:
        listening, reading = load_existing_bank(ky)
        ocr_kw = {"allow_ocr": not no_ocr}
        listen_content = _parse.parse_listening_content(papers, **ocr_kw) if papers else {}
        combined = _parse.find_file(src, "*Papers*.pdf", "*papers*.pdf")
        if combined and sum(1 for v in listen_content.values() if v.get("options")) < 20:
            for q, data in _parse.parse_listening_content(combined, **ocr_kw).items():
                if data.get("options"):
                    listen_content[q] = data
        tx_map = _parse.parse_transcript(transcript, **ocr_kw) if transcript else {}
        if transcript:
            tx_opts = _parse.parse_listen_options_from_transcript(transcript, **ocr_kw)
            for q, opts in tx_opts.items():
                if q in (15, 16):
                    continue
                cur = listen_content.get(q, {}).get("options") or []
                if len(cur) < 4:
                    listen_content.setdefault(q, {})["options"] = opts
        listening = merge_listen_content(listening, ky, listen_content, tx_map)
        print(
            f"  [content] opts={sum(1 for r in listening if (r.get('content_json') or {}).get('options'))} "
            f"tx={sum(1 for r in listening if any(t.get('lineText') for t in (r.get('content_json') or {}).get('transcript', [])))}"
        )
        write_bank(ky, listening, reading)
        return
    answers = _parse.find_file(src, "*Answer*.pdf", "*answer*.pdf")
    listen_answers = _parse.find_file(src, "*Listening*Answer*.pdf")
    read_answers = _parse.find_file(src, "*Reading*Answer*.pdf")
    transcript = _parse.find_file(src, "*Transcript*.pdf", "*transcript*.txt")
    if not papers or (not answers and not (listen_answers and read_answers)):
        raise FileNotFoundError(f"Ky {ky}: thieu papers/answers PDF trong {src}")

    ocr_kw = {"allow_ocr": not no_ocr}
    if listen_answers and read_answers:
        listen_ans, _ = _parse.parse_answers_pdf(listen_answers, **ocr_kw)
        _, read_ans = _parse.parse_answers_pdf(read_answers, **ocr_kw)
    else:
        listen_ans, read_ans = _parse.parse_answers_pdf(answers, **ocr_kw)

    listen_content = _parse.parse_listening_content(papers, **ocr_kw)
    read_source = reading_paper or papers
    read_content = _parse.parse_reading_content(read_source, **ocr_kw)
    tx_map = _parse.parse_transcript(transcript, **ocr_kw) if transcript else {}
    if transcript:
        tx_opts = _parse.parse_listen_options_from_transcript(transcript, **ocr_kw)
        for q, opts in tx_opts.items():
            if q in (15, 16):
                continue
            cur = listen_content.get(q, {}).get("options") or []
            if len(cur) < 4:
                listen_content.setdefault(q, {})["options"] = opts

    print(f"  [parse] listen ans={len(listen_ans)} content={len(listen_content)} tx={len(tx_map)}")
    print(f"  [parse] read ans={len(read_ans)} content={len(read_content)}")

    durations = split_audio(ky, str(src))

    # optional image crop q1-4
    crop = os.path.join(SCRIPT_DIR, "crop-topik1-listen-images.py")
    if os.path.isfile(crop):
        subprocess.run([sys.executable, crop, ky, str(src)], cwd=FRONTEND, check=False)

    listening = build_listening_rows(ky, listen_ans, listen_content, tx_map, durations)
    reading = build_reading_rows(ky, read_ans, read_content)
    write_bank(ky, listening, reading)


def parse_args() -> tuple[list[str], bool, bool, bool]:
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    kys = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not kys:
        kys = [ky for ky, _ in EXAMS]
    return kys, "--audio-only" in flags, "--content-only" in flags, "--no-ocr" in flags


def main() -> None:
    kys, audio_only, content_only, no_ocr = parse_args()
    exam_map = dict(EXAMS)
    for ky in kys:
        if ky not in exam_map:
            raise SystemExit(f"Ky không hỗ trợ: {ky}")
        import_ky(
            ky,
            exam_map[ky],
            audio_only=audio_only,
            content_only=content_only,
            no_ocr=no_ocr,
        )
    print("\n[import-topik1] Hoan tat.")


if __name__ == "__main__":
    main()
