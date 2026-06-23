"""
build-exam.py — Dựng 1 kỳ TOPIK II (Nghe + Đọc) thành bank JSON từ file topik2-<ky>.txt.

Chạy:
    python scripts/build-exam.py <ky> "<duong_dan_thu_muc_Ki>"
Ví dụ:
    python scripts/build-exam.py 60 "C:/Users/mrdoa/Downloads/TOPIK_II_Exams/Ki60_2019"

Sinh ra:
    data/topik2-<ky>-bank.json
    public/data/topik2-<ky>-bank.json
    public/audio/topik2-<ky>-listen-q*.mp3 (+ full)
    public/topik_images/<copy cac IMG>
"""
import os
import re
import sys
import json
import shutil
from pydub import AudioSegment
from pydub.silence import split_on_silence, detect_silence

EXAM = sys.argv[1] if len(sys.argv) > 1 else "60"
SRC = sys.argv[2] if len(sys.argv) > 2 else None
if not SRC or not os.path.isdir(SRC):
    raise SystemExit(f"Khong tim thay thu muc nguon: {SRC}")

FRONTEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(FRONTEND, "data")
PUB_AUDIO = os.path.join(FRONTEND, "public", "audio")
PUB_DATA = os.path.join(FRONTEND, "public", "data")
PUB_IMG = os.path.join(FRONTEND, "public", "topik_images")
for d in (DATA_DIR, PUB_AUDIO, PUB_DATA, PUB_IMG):
    os.makedirs(d, exist_ok=True)

EXAM_ID = f"topik2-{EXAM}"
TXT_PATH = os.path.join(SRC, f"{EXAM_ID}.txt")
if not os.path.isfile(TXT_PATH):
    raise SystemExit(f"Khong tim thay {TXT_PATH}")

SEG_LABELS = [str(i) for i in range(1, 21)] + [f"{i}_{i+1}" for i in range(21, 51, 2)]  # 35


def audio_label_for_q(n: int) -> str:
    if n <= 20:
        return str(n)
    base = 21 + 2 * ((n - 21) // 2)
    return f"{base}_{base+1}"


# ----------------------------------------------------------------------------
# 1) TACH AUDIO (theo logic cat_de_91.py)
# ----------------------------------------------------------------------------
def find_audio_file() -> str:
    for f in os.listdir(SRC):
        if f.lower().endswith(".mp3") and "listening" in f.lower() and "audio" in f.lower():
            return os.path.join(SRC, f)
    for f in os.listdir(SRC):
        if f.lower().endswith(".mp3"):
            return os.path.join(SRC, f)
    raise SystemExit("Khong tim thay file mp3 nghe.")


def split_audio() -> dict:
    src_mp3 = find_audio_file()
    print(f"[audio] Doc {src_mp3} ...")
    full = AudioSegment.from_mp3(src_mp3)

    silences = detect_silence(full, min_silence_len=2000, silence_thresh=-40, seek_step=100)
    start_q1 = 0
    for i, (s, e) in enumerate(silences):
        if (e - s) >= 7000:
            start_q1 = silences[i - 1][1] if i > 0 else e
            break
    clean = full[start_q1:]
    print(f"[audio] Cat intro tai {start_q1/1000:.1f}s")

    chunks = split_on_silence(clean, min_silence_len=6000, silence_thresh=-40, keep_silence=1000, seek_step=100)
    valid = [c for c in chunks if len(c) >= 10000]
    print(f"[audio] Tach duoc {len(valid)} doan (can 35)")
    q_chunks = valid[:35]

    durations = {}
    for idx, chunk in enumerate(q_chunks):
        if idx >= len(SEG_LABELS):
            break
        label = SEG_LABELS[idx]
        out = os.path.join(PUB_AUDIO, f"{EXAM_ID}-listen-q{label}.mp3")
        chunk.export(out, format="mp3")
        durations[label] = len(chunk)
    print(f"[audio] Da luu {len(durations)} file segment")
    return durations


# ----------------------------------------------------------------------------
# 2) PARSE topik2-<ky>.txt
# ----------------------------------------------------------------------------
def parse_txt():
    with open(TXT_PATH, encoding="utf-8") as f:
        raw = f.read()

    lines = raw.splitlines()
    section = None  # 'listening' | 'reading'
    blocks = {"listening": {}, "reading": {}}   # key -> dict(fields)
    pair_tx = {}                                  # 'N_M' -> [transcript lines]

    cur_key = None
    cur_is_pair = False
    field = None  # 'T' or 'P' for multiline capture

    def new_block():
        return {"Q": "", "options": [], "ANS": "", "IMG": "", "P": [], "T": []}

    for ln in lines:
        s = ln.strip()
        if s == "## LISTENING":
            section = "listening"; cur_key = None; field = None; continue
        if s == "## READING":
            section = "reading"; cur_key = None; field = None; continue
        if section is None:
            continue

        m = re.match(r"^\[([0-9]+(?:_[0-9]+)?)\]\s*$", s)
        if m:
            cur_key = m.group(1)
            cur_is_pair = "_" in cur_key
            field = None
            if cur_is_pair and section == "listening":
                pair_tx[cur_key] = []
            else:
                blocks[section][cur_key] = new_block()
            continue

        if cur_key is None:
            continue

        # field markers
        mo = re.match(r"^([1-4])\)\s*(.*)$", s)
        if s.startswith("Q:"):
            field = None
            blocks[section][cur_key]["Q"] = s[2:].strip()
            continue
        if s.startswith("ANS:"):
            field = None
            blocks[section][cur_key]["ANS"] = s[4:].strip()
            continue
        if s.startswith("IMG:"):
            field = None
            blocks[section][cur_key]["IMG"] = s[4:].strip()
            continue
        if s.startswith("P:"):
            field = "P"
            rest = s[2:].strip()
            if rest:
                blocks[section][cur_key]["P"].append(rest)
            continue
        if s.startswith("T:"):
            field = "T"
            continue
        if mo and not cur_is_pair:
            field = None
            blocks[section][cur_key]["options"].append(mo.group(2).strip())
            continue

        # continuation lines
        if cur_is_pair and section == "listening":
            if s:
                pair_tx[cur_key].append(s)
            continue
        if field == "T":
            if s and s != "[transcript khong co]":
                blocks[section][cur_key]["T"].append(s)
            continue
        if field == "P":
            if s:
                blocks[section][cur_key]["P"].append(s)
            continue

    return blocks, pair_tx


# ----------------------------------------------------------------------------
# 3) DUNG BANK JSON
# ----------------------------------------------------------------------------
def copy_image(name: str) -> str:
    if not name:
        return ""
    src_img = os.path.join(SRC, name)
    if os.path.isfile(src_img):
        shutil.copyfile(src_img, os.path.join(PUB_IMG, name))
        return f"/topik_images/{name}"
    print(f"[warn] Khong thay anh {name}")
    return f"/topik_images/{name}"


def tx_lines(text_lines):
    return [{"lineMs": 0, "lineText": t} for t in text_lines if t.strip()]


def build(durations, blocks, pair_tx):
    # offsets theo SEG order
    offset_of = {}
    cum = 0
    for label in SEG_LABELS:
        offset_of[label] = cum
        cum += durations.get(label, 0)

    rows = []
    sort_order = 0

    # LISTENING 1..50
    L = blocks["listening"]
    for n in range(1, 51):
        b = L.get(str(n))
        if not b:
            continue
        label = audio_label_for_q(n)
        if "_" in label:
            transcript = tx_lines(pair_tx.get(label, []))
        else:
            transcript = tx_lines(b["T"])
        content = {
            "passage": b["Q"],
            "audio_url": f"/audio/{EXAM_ID}-listen-q{label}.mp3",
            "transcript": transcript,
            "options": b["options"],
            "exam_offset_ms": offset_of.get(label, 0),
        }
        if b["IMG"]:
            content["image_url"] = copy_image(b["IMG"])
        sort_order += 1
        rows.append({
            "examId": EXAM_ID,
            "section": "listening",
            "questionNo": str(n),
            "tier": "free",
            "correct_ans": b["ANS"],
            "content_json": content,
        })

    # READING 1..50
    R = blocks["reading"]
    for n in range(1, 51):
        b = R.get(str(n))
        if not b:
            continue
        content = {
            "passage": "\n".join(b["P"]).strip(),
            "question": b["Q"],
            "options": b["options"],
        }
        if b["IMG"]:
            content["image_url"] = copy_image(b["IMG"])
        sort_order += 1
        rows.append({
            "examId": EXAM_ID,
            "section": "reading",
            "questionNo": str(n),
            "tier": "free",
            "correct_ans": b["ANS"],
            "content_json": content,
        })

    return rows


def write_full_audio(durations):
    chunks = []
    for label in SEG_LABELS:
        p = os.path.join(PUB_AUDIO, f"{EXAM_ID}-listen-q{label}.mp3")
        if os.path.isfile(p):
            with open(p, "rb") as f:
                chunks.append(f.read())
    if chunks:
        with open(os.path.join(PUB_AUDIO, f"{EXAM_ID}-listen-full.mp3"), "wb") as f:
            f.write(b"".join(chunks))
        print(f"[audio] Ghep full tu {len(chunks)} doan")


def main():
    durations = split_audio()
    write_full_audio(durations)
    blocks, pair_tx = parse_txt()
    rows = build(durations, blocks, pair_tx)
    nL = sum(1 for r in rows if r["section"] == "listening")
    nR = sum(1 for r in rows if r["section"] == "reading")
    out = os.path.join(DATA_DIR, f"{EXAM_ID}-bank.json")
    pub = os.path.join(PUB_DATA, f"{EXAM_ID}-bank.json")
    for p in (out, pub):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"[bank] Listening={nL} Reading={nR} -> {out}")


if __name__ == "__main__":
    main()
