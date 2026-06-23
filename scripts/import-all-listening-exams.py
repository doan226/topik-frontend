"""
import-all-listening-exams.py — Import phần Nghe cho các kỳ TOPIK II (giống kỳ 60).

Nguồn: c:\\Users\\mrdoa\\Downloads\\TOPIK_II_Exams\\Ki*_*/

Mỗi kỳ:
  - Cắt MP3 full → 35 đoạn + ghép full
  - Nạp topik2-<ky>-listen-bank.json (50 câu + đáp án)
  - Copy / crop ảnh nghe q1–3
  - Merge với 50 câu Đọc đã có trong data/sources

Chạy từ topik-frontend:
    python scripts/import-all-listening-exams.py
    python scripts/import-all-listening-exams.py 35 91
    python scripts/import-all-listening-exams.py --include-60
"""
from __future__ import annotations

import importlib.util
import json
import os
import re
import shutil
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(FRONTEND, "data")
PUB_AUDIO = os.path.join(FRONTEND, "public", "audio")
PUB_DATA = os.path.join(FRONTEND, "public", "data")
PUB_IMG = os.path.join(FRONTEND, "public", "topik_images")
SOURCES = os.path.join(DATA_DIR, "sources")

DOWNLOADS_BASE = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)

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

SEG_LABELS = [str(i) for i in range(1, 21)] + [
    f"{i}_{i + 1}" for i in range(21, 51, 2)
]

_merge_spec = importlib.util.spec_from_file_location(
    "merge_reading_bank",
    os.path.join(SCRIPT_DIR, "merge-reading-bank.py"),
)
_merge = importlib.util.module_from_spec(_merge_spec)
_merge_spec.loader.exec_module(_merge)
parse_reading_txt = _merge.parse_reading_txt
build_reading_rows = _merge.build_reading_rows


def audio_label_for_q(n: int) -> str:
    if n <= 20:
        return str(n)
    base = 21 + 2 * ((n - 21) // 2)
    return f"{base}_{base + 1}"


def find_ki_dir(ki_folder: str) -> str:
    path = os.path.join(DOWNLOADS_BASE, ki_folder)
    if not os.path.isdir(path):
        raise FileNotFoundError(f"Không tìm thấy thư mục: {path}")
    return path


def find_audio_file(src: str) -> str:
    for f in os.listdir(src):
        if f.lower().endswith(".mp3") and "listening" in f.lower():
            return os.path.join(src, f)
    for f in os.listdir(src):
        if f.lower().endswith(".mp3"):
            return os.path.join(src, f)
    raise FileNotFoundError(f"Không tìm thấy MP3 nghe trong {src}")


def prepare_decodable_mp3(src_mp3: str, ky: str) -> str:
    """Mot so file MP3 tai ve bi loi frame — ffmpeg re-encode truoc khi pydub cat."""
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration,size",
            "-of",
            "default=noprint_wrappers=1",
            src_mp3,
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    duration = 1.0
    size = os.path.getsize(src_mp3)
    for line in probe.stdout.splitlines():
        if line.startswith("duration="):
            duration = max(float(line.split("=", 1)[1]), 1.0)
        if line.startswith("size="):
            size = int(line.split("=", 1)[1])

    # Bitrate qua thap hoac file nho bat thuong -> re-encode (tranh pydub treo)
    kbps = (size * 8) / duration / 1000
    if kbps < 18:
        print(f"  [audio] Bitrate thap ({kbps:.0f} kbps) — re-encode ky {ky}...")
        fixed = os.path.join(PUB_AUDIO, f"_tmp-topik2-{ky}-fixed.mp3")
        if not os.path.isfile(fixed):
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-v",
                    "error",
                    "-i",
                    src_mp3,
                    "-acodec",
                    "libmp3lame",
                    "-q:a",
                    "2",
                    fixed,
                ],
                check=True,
            )
        return fixed
    return src_mp3


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
    min_silence_ms: int = 6000,
    min_chunk_ms: int = 10000,
) -> list[tuple[int, int]]:
    """Tuong tu pydub split_on_silence — tra ve (start,end) ms tung doan."""
    regions: list[tuple[int, int]] = []
    cursor = start_ms
    for s, e in silences:
        if e <= start_ms:
            continue
        if s < cursor:
            s = cursor
        if (e - s) >= min_silence_ms:
            if s > cursor and (s - cursor) >= min_chunk_ms:
                regions.append((cursor, s + 1000))
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
    exam_id = f"topik2-{ky}"
    src_mp3 = find_audio_file(src)
    print(f"  [audio] Doc {os.path.basename(src_mp3)} ...")
    decodable = prepare_decodable_mp3(src_mp3, ky)

    silences = detect_silences_ms(decodable)
    total_ms = probe_duration_ms(decodable)
    start_q1 = 0
    for i, (_s, e) in enumerate(silences):
        if (e - _s) >= 7000:
            start_q1 = silences[i - 1][1] if i > 0 else e
            break
    print(f"  [audio] Cat intro tai {start_q1 / 1000:.1f}s")

    bounds = chunk_bounds_from_silences(silences, total_ms, start_q1)
    print(f"  [audio] Tach duoc {len(bounds)} doan (can 35)")
    if len(bounds) < 35:
        raise RuntimeError(f"Chi tach duoc {len(bounds)}/35 doan — kiem tra MP3 ky {ky}")

    durations: dict[str, int] = {}
    for idx, (a, b) in enumerate(bounds[:35]):
        label = SEG_LABELS[idx]
        out = os.path.join(PUB_AUDIO, f"{exam_id}-listen-q{label}.mp3")
        durations[label] = ffmpeg_export_segment(decodable, a, b, out)
    print(f"  [audio] Da luu {len(durations)} file segment")
    return durations


def write_full_audio(ky: str) -> None:
    exam_id = f"topik2-{ky}"
    chunks: list[bytes] = []
    for label in SEG_LABELS:
        p = os.path.join(PUB_AUDIO, f"{exam_id}-listen-q{label}.mp3")
        if os.path.isfile(p):
            with open(p, "rb") as f:
                chunks.append(f.read())
    if chunks:
        out = os.path.join(PUB_AUDIO, f"{exam_id}-listen-full.mp3")
        with open(out, "wb") as f:
            f.write(b"".join(chunks))
        print(f"  [audio] Ghep full ({len(chunks)} doan)")


def load_listen_bank(ky: str, src: str) -> list:
    exam_id = f"topik2-{ky}"
    path = os.path.join(src, f"{exam_id}-listen-bank.json")
    if not os.path.isfile(path):
        alt = os.path.join(DOWNLOADS_BASE, "DATALISTEN", f"{exam_id}.json")
        if os.path.isfile(alt):
            path = alt
        else:
            raise FileNotFoundError(f"Không tìm thấy listen-bank: {path}")
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    listening = [r for r in rows if r.get("section") == "listening"]
    if len(listening) != 50:
        raise RuntimeError(f"Kỳ {ky}: listen-bank có {len(listening)} câu (cần 50)")
    return listening


def apply_offsets(listening: list, ky: str, durations: dict[str, int]) -> list:
    exam_id = f"topik2-{ky}"
    offset_of: dict[str, int] = {}
    cum = 0
    for label in SEG_LABELS:
        offset_of[label] = cum
        cum += durations.get(label, 0)

    out = []
    for row in listening:
        n = int(str(row.get("questionNo", "0")))
        label = audio_label_for_q(n)
        content = dict(row.get("content_json") or {})
        content["exam_offset_ms"] = offset_of.get(label, 0)
        content["audio_url"] = f"/audio/{exam_id}-listen-q{label}.mp3"
        out.append({
            **row,
            "examId": exam_id,
            "section": "listening",
            "questionNo": str(n),
            "tier": row.get("tier") or "free",
            "correct_ans": str(row.get("correct_ans") or ""),
            "content_json": content,
        })
    out.sort(key=lambda r: int(r["questionNo"]))
    return out


def copy_listen_images(ky: str, src: str, listening: list) -> None:
    exam_id = f"topik2-{ky}"
    needed: set[str] = set()
    for row in listening:
        url = (row.get("content_json") or {}).get("image_url", "")
        if url:
            needed.add(url.split("/")[-1])
    if not needed:
        needed = {f"{exam_id}-listen-q{i}.png" for i in (1, 2, 3)}

    os.makedirs(PUB_IMG, exist_ok=True)
    missing = []
    for name in sorted(needed):
        dst = os.path.join(PUB_IMG, name)
        src_img = os.path.join(src, name)
        if os.path.isfile(src_img):
            shutil.copy2(src_img, dst)
            print(f"  [img] Copy {name}")
        elif os.path.isfile(dst):
            print(f"  [img] Da co {name}")
        else:
            missing.append(name)

    if missing:
        print(f"  [img] Thieu {len(missing)} anh — thu crop tu PDF nghe...")
        crop = os.path.join(SCRIPT_DIR, "crop-listen-images.py")
        result = subprocess.run(
            [sys.executable, crop, ky, src],
            cwd=FRONTEND,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"  [warn] Crop anh that bai ky {ky} — bo qua (can crop thu cong sau)")
            if result.stdout:
                print(result.stdout.strip()[:300])
        else:
            for name in missing:
                if os.path.isfile(os.path.join(PUB_IMG, name)):
                    print(f"  [img] Crop OK {name}")


def load_reading_rows(ky: str) -> list:
    exam_id = f"topik2-{ky}"
    reading_txt = os.path.join(SOURCES, f"{exam_id}-reading.txt")
    bank_path = os.path.join(DATA_DIR, f"{exam_id}-bank.json")

    if os.path.isfile(reading_txt):
        blocks = parse_reading_txt(reading_txt)
        return build_reading_rows(blocks, exam_id)

    if os.path.isfile(bank_path):
        with open(bank_path, encoding="utf-8") as f:
            bank = json.load(f)
        reading = [r for r in bank if r.get("section") == "reading"]
        if len(reading) == 50:
            print(f"  [read] Giu {len(reading)} cau doc tu bank hien co")
            return reading

    raise FileNotFoundError(
        f"Kỳ {ky}: không có {reading_txt} — chạy import-all-reading-exams.py trước"
    )


def write_bank(ky: str, listening: list, reading: list) -> None:
    exam_id = f"topik2-{ky}"
    merged = listening + reading
    os.makedirs(PUB_DATA, exist_ok=True)
    for path in (
        os.path.join(DATA_DIR, f"{exam_id}-bank.json"),
        os.path.join(PUB_DATA, f"{exam_id}-bank.json"),
    ):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)
    ans = sum(1 for r in listening if r.get("correct_ans"))
    print(f"  [bank] L={len(listening)}({ans} dap an) R={len(reading)} -> topik2-{ky}-bank.json")


def import_ky(ky: str, ki_folder: str, *, skip_audio: bool = False) -> None:
    print(f"\n[import-listen] === Ky {ky} ===")
    src = find_ki_dir(ki_folder)
    durations: dict[str, int] = {}
    if skip_audio:
        print("  [audio] Bo qua cat MP3 (--bank-only)")
    else:
        durations = split_audio(ky, src)
        write_full_audio(ky)
    listening = load_listen_bank(ky, src)
    if durations:
        listening = apply_offsets(listening, ky, durations)
    copy_listen_images(ky, src, listening)
    reading = load_reading_rows(ky)
    write_bank(ky, listening, reading)


def parse_args() -> tuple[list[str], bool, bool]:
    include_60 = "--include-60" in sys.argv
    bank_only = "--bank-only" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        return args, include_60, bank_only
    kys = [ky for ky, _ in EXAMS if ky != "60" or include_60]
    return kys, include_60, bank_only


def main() -> None:
    kys, include_60, bank_only = parse_args()
    exam_map = dict(EXAMS)
    for ky in kys:
        if ky not in exam_map:
            raise SystemExit(f"Ky khong ho tro: {ky}")
        if ky == "60" and not include_60:
            continue
        import_ky(ky, exam_map[ky], skip_audio=bank_only)
    print("\n[import-listen] Hoan tat.")


if __name__ == "__main__":
    main()
