"""
polish-topik1-exams.py — Hoàn thiện bank TOPIK I: prompt, options, transcript, ảnh q15-16.

Chạy:
    python scripts/polish-topik1-exams.py
    python scripts/polish-topik1-exams.py 60 91
"""
from __future__ import annotations

import importlib.util
import json
import os
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)
DATA = os.path.join(FRONTEND, "data")
PUBLIC_DATA = os.path.join(FRONTEND, "public", "data")
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
LISTEN_PROMPTS = _cfg.LISTEN_PROMPTS
READING_INSTRUCTIONS = _cfg.READING_INSTRUCTIONS
IMAGE_QUESTIONS = {15, 16}


def polish_ky(ky: str, ki_folder: str) -> None:
    from pathlib import Path

    print(f"\n[polish-topik1] Ky {ky}")
    src = Path(_cfg.DOWNLOADS_BASE) / ki_folder
    eid = _cfg.exam_id(ky)
    bank_path = os.path.join(DATA, f"{eid}-bank.json")
    rows = json.load(open(bank_path, encoding="utf-8"))

    papers = _parse.find_file(
        src,
        "*Listening*Test*.pdf",
        "*Listening-Test*.pdf",
        "*Papers*.pdf",
        "*papers*.pdf",
    )
    combined = _parse.find_file(src, "*Papers*.pdf", "*papers*.pdf")
    transcript = _parse.find_file(src, "*Transcript*.pdf", "*transcript*.txt")

    listen_content: dict[int, dict] = {}
    tx_map: dict[int, list[str]] = {}
    if papers:
        listen_content = _parse.parse_listening_content(papers, allow_ocr=False)
        if sum(1 for v in listen_content.values() if v.get("options")) < 20:
            listen_content = _parse.parse_listening_content(papers, allow_ocr=True)
    if combined and sum(1 for v in listen_content.values() if v.get("options")) < 20:
        merged = _parse.parse_listening_content(combined, allow_ocr=False)
        for q, data in merged.items():
            if data.get("options") and not listen_content.get(q, {}).get("options"):
                listen_content[q] = data
    if transcript:
        tx_text = (
            _parse.pdf_text(transcript, allow_ocr=True)
            if str(transcript).lower().endswith(".pdf")
            else Path(transcript).read_text(encoding="utf-8", errors="replace")
        )
        tx_map = _parse.parse_transcript_text(tx_text)
        tx_opts = _parse.parse_listen_options_from_text(tx_text)
        for q, opts in tx_opts.items():
            if q in IMAGE_QUESTIONS:
                continue
            cur = listen_content.get(q, {}).get("options") or []
            if len(cur) < 4:
                listen_content.setdefault(q, {})["options"] = opts

    crop = os.path.join(SCRIPT_DIR, "crop-topik1-listen-images.py")
    if os.path.isfile(crop):
        subprocess.run([sys.executable, crop, ky, str(src)], cwd=FRONTEND, check=False)

    for row in rows:
        if row.get("section") != "listening":
            continue
        qno = int(row.get("questionNo", 0))
        cj = dict(row.get("content_json") or {})

        cj["passage"] = LISTEN_PROMPTS.get(qno, cj.get("passage", ""))

        lc = listen_content.get(qno, {})
        if lc.get("options") and qno not in IMAGE_QUESTIONS:
            cj["options"] = lc["options"]

        if qno in IMAGE_QUESTIONS:
            img = os.path.join(PUB_IMG, f"{eid}-listen-q{qno}.png")
            if os.path.isfile(img):
                cj["image_url"] = f"/topik_images/{eid}-listen-q{qno}.png"
                cj["options"] = []

        if qno in tx_map:
            cj["transcript"] = [{"lineMs": 0, "lineText": t} for t in tx_map[qno]]

        row["content_json"] = cj

    read_source = _parse.find_file(
        src,
        "*Reading*Test*.pdf",
        "*Reading-Test*.pdf",
        "*Papers*.pdf",
        "*papers*.pdf",
    )
    if read_source:
        read_content = _parse.parse_reading_content(read_source, allow_ocr=False)
        need_read_ocr = sum(
            1 for v in read_content.values() if len(v.get("options", [])) >= 4
        ) < 37 or any(
            len(read_content.get(q, {}).get("options") or []) < 4 for q in (1, 2, 3)
        )
        if need_read_ocr:
            ocr_read = _parse.parse_reading_content(read_source, allow_ocr=True)
            for q, data in ocr_read.items():
                if len(data.get("options") or []) >= 4 or (
                    q in (1, 2, 3) and data.get("passage")
                ):
                    read_content[q] = data
        for row in rows:
            if row.get("section") != "reading":
                continue
            qno = int(row.get("questionNo", 0))
            rc = read_content.get(qno, {})
            if not rc:
                continue
            cj = dict(row.get("content_json") or {})
            if rc.get("passage"):
                cj["passage"] = rc["passage"]
            cj["question"] = READING_INSTRUCTIONS.get(
                qno, rc.get("question") or cj.get("question", "")
            )
            if len(rc.get("options") or []) >= 4:
                cj["options"] = rc["options"]
            row["content_json"] = cj

    for path in (bank_path, os.path.join(PUBLIC_DATA, f"{eid}-bank.json")):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
            f.write("\n")

    la = sum(1 for r in rows if r.get("section") == "listening" and (r.get("content_json") or {}).get("options"))
    imgs = sum(
        1
        for r in rows
        if r.get("section") == "listening"
        and int(r.get("questionNo", 0)) in IMAGE_QUESTIONS
        and (r.get("content_json") or {}).get("image_url")
    )
    tx = sum(
        1
        for r in rows
        if r.get("section") == "listening"
        and any(t.get("lineText", "").strip() for t in (r.get("content_json") or {}).get("transcript", []))
    )
    print(f"  [ok] options~={la} img15-16={imgs}/2 tx={tx}/30")
    ra = sum(
        1
        for r in rows
        if r.get("section") == "reading"
        and len((r.get("content_json") or {}).get("options") or []) >= 4
    )
    print(f"  [ok] reading opts4={ra}/40")


def main() -> None:
    kys = [a for a in sys.argv[1:] if a.isdigit()]
    exam_map = dict(EXAMS)
    targets = kys or [ky for ky, _ in EXAMS]
    for ky in targets:
        if ky not in exam_map:
            raise SystemExit(f"Ky khong ho tro: {ky}")
        polish_ky(ky, exam_map[ky])
    print("\n[polish-topik1] Hoan tat.")


if __name__ == "__main__":
    main()
