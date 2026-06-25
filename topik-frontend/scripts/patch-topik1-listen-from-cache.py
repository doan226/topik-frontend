"""Apply cached listen-paper OCR options to TOPIK I banks (64/83/91)."""
from __future__ import annotations

import importlib.util
import json
import os
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

IMAGE_Q = {15, 16}


def patch_ky(ky: str, ki_folder: str) -> None:
    from pathlib import Path

    src = Path(_cfg.DOWNLOADS_BASE) / ki_folder
    eid = _cfg.exam_id(ky)
    papers = _parse.find_file(src, "*Listening*Test*.pdf")
    transcript = _parse.find_file(src, "*Transcript*.pdf", "*transcript*.txt")
    if not papers:
        print(f"Ky {ky}: missing listen paper")
        return

    listen_content = _parse.parse_listening_content(papers, allow_ocr=False)
    tx_map: dict[int, list[str]] = {}
    tx_opts: dict[int, list[str]] = {}
    if transcript:
        cache = transcript.parent / f"raw_{transcript.stem}_ocr.txt"
        if cache.is_file():
            tx_text = cache.read_text(encoding="utf-8", errors="replace")
            tx_map = _parse.parse_transcript_text(tx_text)
            tx_opts = _parse.parse_listen_options_from_text(tx_text)
        else:
            tx_text = _parse.pdf_text(transcript, allow_ocr=True)
            tx_map = _parse.parse_transcript_text(tx_text)
            tx_opts = _parse.parse_listen_options_from_text(tx_text)

    for q, opts in tx_opts.items():
        if q in IMAGE_Q:
            continue
        cur = listen_content.get(q, {}).get("options") or []
        if len(cur) < 4 and len(opts) >= 4:
            listen_content.setdefault(q, {})["options"] = opts
        elif len(opts) >= 4 and len(cur) < len(opts):
            listen_content.setdefault(q, {})["options"] = opts

    read_source = _parse.find_file(
        src,
        "*Reading*Test*.pdf",
        "*Reading-Test*.pdf",
    )
    read_content: dict[int, dict] = {}
    if read_source:
        read_content = _parse.parse_reading_content(read_source, allow_ocr=False)
        if sum(1 for v in read_content.values() if len(v.get("options", [])) >= 4) < 30:
            read_content = _parse.parse_reading_content(read_source, allow_ocr=True)

    path = os.path.join(DATA, f"{eid}-bank.json")
    rows = json.load(open(path, encoding="utf-8"))
    for row in rows:
        if row.get("section") != "listening":
            continue
        qno = int(row.get("questionNo", 0))
        cj = dict(row.get("content_json") or {})
        cj["passage"] = _cfg.LISTEN_PROMPTS.get(qno, cj.get("passage", ""))
        lc = listen_content.get(qno, {})
        if len(lc.get("options") or []) >= 4 and qno not in IMAGE_Q:
            cj["options"] = lc["options"]
        if qno in tx_map:
            cj["transcript"] = [{"lineMs": 0, "lineText": t} for t in tx_map[qno]]
        img = os.path.join(FRONTEND, "public", "topik_images", f"{eid}-listen-q{qno}.png")
        if qno in IMAGE_Q and os.path.isfile(img):
            cj["image_url"] = f"/topik_images/{eid}-listen-q{qno}.png"
            cj["options"] = []
        row["content_json"] = cj

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
        cj["question"] = _cfg.READING_INSTRUCTIONS.get(
            qno, rc.get("question") or cj.get("question", "")
        )
        if len(rc.get("options") or []) >= 4:
            cj["options"] = rc["options"]
        row["content_json"] = cj

    for out in (path, os.path.join(PUBLIC, f"{eid}-bank.json")):
        with open(out, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
            f.write("\n")

    opts = sum(
        1
        for r in rows
        if r.get("section") == "listening"
        and len((r.get("content_json") or {}).get("options") or []) >= 4
    )
    tx = sum(
        1
        for r in rows
        if r.get("section") == "listening"
        and any(t.get("lineText", "").strip() for t in (r.get("content_json") or {}).get("transcript", []))
    )
    print(f"Ky {ky}: listen opts4={opts}/28 tx={tx}/30", end="")
    ro = sum(
        1
        for r in rows
        if r.get("section") == "reading"
        and len((r.get("content_json") or {}).get("options") or []) >= 4
    )
    print(f" read={ro}/40")


def main() -> None:
    kys = [a for a in sys.argv[1:] if a.isdigit()] or ["64", "83", "91"]
    exam_map = dict(_cfg.EXAMS)
    for ky in kys:
        patch_ky(ky, exam_map[ky])


if __name__ == "__main__":
    main()
