"""
merge-reading-bank.py — Merge 50 câu Đọc từ data/sources/topik2-<ky>-reading.txt
vào bank JSON, giữ nguyên toàn bộ câu Nghe.

Chạy:
    python scripts/merge-reading-bank.py [ky]
Mặc định ky=60.
"""
import json
import os
import re
import sys

EXAM = sys.argv[1] if len(sys.argv) > 1 else "60"
EXAM_ID = f"topik2-{EXAM}"

FRONTEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(FRONTEND, "data")
PUB_DATA = os.path.join(FRONTEND, "public", "data")
PUB_IMG = os.path.join(FRONTEND, "public", "topik_images")
SOURCES = os.path.join(DATA_DIR, "sources")
READING_TXT = os.path.join(SOURCES, f"{EXAM_ID}-reading.txt")
BANK_PATH = os.path.join(DATA_DIR, f"{EXAM_ID}-bank.json")
PUB_BANK = os.path.join(PUB_DATA, f"{EXAM_ID}-bank.json")


def parse_reading_txt(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        raw = f.read()

    lines = raw.splitlines()
    section = None
    blocks: dict[str, dict] = {}
    cur_key = None
    field = None

    def new_block():
        return {"Q": "", "options": [], "ANS": "", "IMG": "", "P": []}

    for ln in lines:
        s = ln.strip()
        if s == "## READING":
            section = "reading"
            cur_key = None
            field = None
            continue
        if s == "## LISTENING":
            section = "listening"
            cur_key = None
            field = None
            continue
        if section != "reading":
            continue

        m = re.match(r"^\[([0-9]+)\]\s*$", s)
        if m:
            cur_key = m.group(1)
            field = None
            blocks[cur_key] = new_block()
            continue

        if cur_key is None:
            continue

        mo = re.match(r"^([1-4])\)\s*(.*)$", s)
        if s.startswith("Q:"):
            field = None
            blocks[cur_key]["Q"] = s[2:].strip()
            continue
        if s.startswith("ANS:"):
            field = None
            blocks[cur_key]["ANS"] = s[4:].strip()
            continue
        if s.startswith("IMG:"):
            field = None
            blocks[cur_key]["IMG"] = s[4:].strip()
            continue
        if s.startswith("P:"):
            field = "P"
            rest = s[2:].strip()
            if rest:
                blocks[cur_key]["P"].append(rest)
            continue
        if mo:
            field = None
            blocks[cur_key]["options"].append(mo.group(2).strip())
            continue
        if field == "P" and s:
            blocks[cur_key]["P"].append(s)

    return blocks


def normalize_passage(text: str) -> str:
    text = re.sub(r"<\s*보\s*\n\s*기\s*>", "<보기>", text, flags=re.IGNORECASE)
    text = text.replace("󰡔", "《").replace("󰡕", "》")
    return text.strip()


def build_reading_rows(blocks: dict, exam_id: str | None = None) -> list:
    eid = exam_id or EXAM_ID
    rows = []
    for n in range(1, 51):
        key = str(n)
        b = blocks.get(key)
        if not b:
            raise SystemExit(f"Thieu cau reading [{key}] trong {READING_TXT}")

        content = {
            "passage": normalize_passage("\n".join(b["P"])),
            "question": b["Q"],
            "options": b["options"],
        }
        if b["IMG"]:
            img_path = os.path.join(PUB_IMG, b["IMG"])
            if not os.path.isfile(img_path):
                raise SystemExit(f"Khong tim thay anh: {img_path}")
            content["image_url"] = f"/topik_images/{b['IMG']}"

        rows.append({
            "examId": eid,
            "section": "reading",
            "questionNo": key,
            "tier": "free",
            "correct_ans": b["ANS"],
            "content_json": content,
        })
    return rows


def main():
    if not os.path.isfile(READING_TXT):
        raise SystemExit(f"Khong tim thay {READING_TXT}")

    listening: list = []
    if os.path.isfile(BANK_PATH):
        with open(BANK_PATH, encoding="utf-8") as f:
            bank = json.load(f)
        listening = [r for r in bank if r.get("section") == "listening"]
    elif not os.path.isfile(BANK_PATH):
        print(f"[merge] Tao bank moi (chi doc): {BANK_PATH}")

    if not listening:
        print(f"[merge] Khong co cau nghe — ghi bank chi doc")

    blocks = parse_reading_txt(READING_TXT)
    reading = build_reading_rows(blocks, EXAM_ID)
    merged = listening + reading

    os.makedirs(PUB_DATA, exist_ok=True)
    for path in (BANK_PATH, PUB_BANK):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"[merge] Listening={len(listening)} Reading={len(reading)} -> {BANK_PATH}")


if __name__ == "__main__":
    main()
