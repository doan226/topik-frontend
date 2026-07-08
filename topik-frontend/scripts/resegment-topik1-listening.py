"""
resegment-topik1-listening.py — Tách lại audio nghe TOPIK I khớp đúng từng câu.

Cách làm: dùng nhận dạng giọng nói (faster-whisper, tiếng Hàn) lấy timestamp, rồi
bắt mốc đọc SỐ THỨ TỰ câu "1번".."30번" trong audio — đây là mốc neo chính xác để
gán mỗi câu vào đúng đoạn audio (thay cho cách đoán theo khoảng lặng kém chính xác).

  - Câu 1–24: mỗi câu một đoạn, bắt đầu ngay tại lúc đọc "N번".
  - Câu 25–26, 27–28, 29–30: mỗi cặp DÙNG CHUNG một đoạn (gồm cả bài nghe đọc
    TRƯỚC "25번"/"27번"/"29번"), vì ba nhóm cuối của TOPIK I nghe chung một bài.

Khoảng lặng (silencedetect) chỉ dùng để cắt gọn phần im lặng chờ trả lời ở cuối đoạn.
Sau đó cập nhật audio_url + exam_offset_ms trong bank JSON (data/ + public/data/).

Yêu cầu: pip install faster-whisper ; có file audio gốc trong TOPIK1_EXAMS_DIR.
Cache ASR lưu ở scripts/_asr_cache/ (chạy lại không cần ASR lại). Đặt model qua
biến môi trường TOPIK1_ASR_MODEL (mặc định "small").

Chạy từ topik-frontend (TẮT dev server trước để không khoá file audio):
    python scripts/resegment-topik1-listening.py            # tất cả 10 đề
    python scripts/resegment-topik1-listening.py 60 91      # chỉ vài đề

Chỉ cập nhật transcript (KHÔNG cắt lại audio, giữ nguyên offset cũ — nhanh, an toàn,
không cần tắt dev server):
    python scripts/resegment-topik1-listening.py --transcript-only
    python scripts/resegment-topik1-listening.py --transcript-only 91
"""
from __future__ import annotations

import glob
import importlib.util
import json
import os
import re
import subprocess
import sys
import time

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(FRONTEND, "data")
PUB_AUDIO = os.path.join(FRONTEND, "public", "audio")
PUB_DATA = os.path.join(FRONTEND, "public", "data")

_spec = importlib.util.spec_from_file_location(
    "topik1_exam_config", os.path.join(SCRIPT_DIR, "topik1_exam_config.py")
)
_cfg = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_cfg)

EXAMS = dict(_cfg.EXAMS)
DOWNLOADS_BASE = _cfg.DOWNLOADS_BASE
exam_id = _cfg.exam_id

# Câu cuối cùng "đứng riêng" — sau câu này là 3 nhóm nghe chung (25-26, 27-28, 29-30).
LAST_SINGLE_Q = 24
GROUPED_PAIRS = [(25, 26), (27, 28), (29, 30)]

GAP_MIN_SEC = 12.0   # ngưỡng nhận diện khoảng lặng trả lời (gap thật ~18-26s)
LEAD_SEC = 0.30      # giữ lại chút trước khi nội dung câu sau bắt đầu
TAIL_SEC = 1.20      # giữ lại chút sau khi nội dung câu kết thúc


def find_source_audio(ky: str) -> str:
    folder = os.path.join(DOWNLOADS_BASE, EXAMS[ky])
    mp3 = [f for f in glob.glob(os.path.join(folder, "*.mp3")) if "listening" in f.lower()]
    if not mp3:
        mp3 = glob.glob(os.path.join(folder, "*.mp3"))
    if not mp3:
        raise FileNotFoundError(f"Không tìm thấy MP3 nghe trong {folder}")
    return mp3[0]


def probe_duration_ms(path: str) -> int:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", path]
    for attempt in range(20):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            return int(float(r.stdout.strip()) * 1000)
        time.sleep(min(0.5 + attempt * 0.3, 3.0))
    raise RuntimeError(f"ffprobe lỗi: {path}")


def detect_silences_ms(path: str) -> list[tuple[int, int]]:
    res = subprocess.run(
        ["ffmpeg", "-i", path, "-af", "silencedetect=noise=-35dB:d=1.2", "-f", "null", "-"],
        capture_output=True, text=True,
    )
    silences: list[tuple[int, int]] = []
    start: float | None = None
    for line in res.stderr.splitlines():
        if "silence_start:" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end:" in line and start is not None:
            end = float(line.split("silence_end:")[1].split("|")[0].strip().split()[0])
            silences.append((int(start * 1000), int(end * 1000)))
            start = None
    return silences


ASR_MODEL = os.environ.get("TOPIK1_ASR_MODEL", "small")
ASR_CACHE = os.path.join(SCRIPT_DIR, "_asr_cache")
_MODEL = None


CHUNK_TARGET_MS = 280_000  # độ dài mỗi đoạn ASR ~4.7 phút (cắt tại khoảng lặng)


def _get_model():
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        # cpu_threads cấu hình qua env (mặc định 4). Đặt TOPIK1_ASR_THREADS=1 nếu ctranslate2
        # bị deadlock luồng (OpenMP) trên Windows -> chạy đơn luồng, chậm nhưng ổn định.
        threads = int(os.environ.get("TOPIK1_ASR_THREADS", "4"))
        _MODEL = WhisperModel(ASR_MODEL, device="cpu", compute_type="int8",
                              cpu_threads=threads, num_workers=1)
    return _MODEL


def _chunk_bounds(silences: list[tuple[int, int]], total_ms: int) -> list[tuple[int, int]]:
    """Chia [0,total] thành các đoạn ~CHUNK_TARGET_MS, cắt tại GIỮA một khoảng lặng để
    không cắt ngang lời nói."""
    bounds: list[tuple[int, int]] = []
    start = 0
    while start < total_ms:
        target = start + CHUNK_TARGET_MS
        if target >= total_ms:
            bounds.append((start, total_ms))
            break
        cut = next((((s + e) // 2) for (s, e) in silences if s >= target), total_ms)
        cut = min(cut, total_ms)
        if cut <= start:
            cut = min(target, total_ms)
        bounds.append((start, cut))
        start = cut
    return bounds


def asr_words(src: str, ky: str, silences: list[tuple[int, int]], total_ms: int) -> list[tuple[float, str]]:
    """ASR audio gốc (tiếng Hàn) -> [(start_sec, word)] theo TỪNG ĐOẠN ngắn cắt tại khoảng
    lặng. Gọi transcribe ngắn => tránh treo/deadlock trên file dài. Cache JSON để chạy lại nhanh."""
    os.makedirs(ASR_CACHE, exist_ok=True)
    cache = os.path.join(ASR_CACHE, f"topik1-{ky}-{ASR_MODEL}.json")
    if os.path.isfile(cache):
        with open(cache, encoding="utf-8") as f:
            return [tuple(x) for x in json.load(f)]

    model = _get_model()
    bounds = _chunk_bounds(silences, total_ms)
    words: list[list] = []
    for ci, (a, b) in enumerate(bounds):
        tmp = os.path.join(ASR_CACHE, f"_chunk-{ky}-{ci}.wav")
        # tách đoạn ra wav 16k mono (whisper xử lý nhanh, giải mã nhẹ)
        _run_with_retry(
            ["ffmpeg", "-y", "-v", "error", "-ss", f"{a/1000:.3f}", "-i", src,
             "-t", f"{(b-a)/1000:.3f}", "-ac", "1", "-ar", "16000", tmp],
            f"chunk {ci}",
        )
        t0 = time.time()
        # Chống treo: temperature=0 + repetition_penalty + no_repeat_ngram_size chặn lặp n-gram.
        segments, _info = model.transcribe(
            tmp, language="ko", word_timestamps=True, vad_filter=True,
            condition_on_previous_text=False, temperature=0, beam_size=5,
            compression_ratio_threshold=2.4, log_prob_threshold=-1.0,
            repetition_penalty=1.15, no_repeat_ngram_size=3,
        )
        off = a / 1000.0
        cnt = 0
        for seg in segments:
            for w in (seg.words or []):
                words.append([round(w.start + off, 2), w.word.strip()])
                cnt += 1
        try:
            os.remove(tmp)
        except OSError:
            pass
        print(f"  [asr] đoạn {ci+1}/{len(bounds)} ({a/1000:.0f}-{b/1000:.0f}s): "
              f"{cnt} từ, {time.time()-t0:.0f}s", flush=True)

    with open(cache, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)
    return [tuple(x) for x in words]


def extract_markers(words: list[tuple[float, str]]) -> dict[int, float]:
    """Tìm mốc đọc số thứ tự câu "1번".."30번" theo thứ tự tăng dần (đơn điệu theo thời gian).

    - Bỏ "정답은 N번입니다" (đáp án <보기>) vì token kết thúc "입니다"; bỏ "1번부터"/"30번까지는".
    - Bỏ số lạc trong hội thoại (vd "삼 번 버스", hay "9번" lẻ) nhờ ràng buộc đơn điệu.
    - KHÔNG kẹt khi một mốc bị nghe nhầm/thiếu: nếu gặp số LỚN hơn số đang cần thì coi
      số đang cần là thiếu và bỏ qua (sẽ được lấp lại bằng gióng transcript sau).
    """
    cands: list[tuple[float, int]] = []
    for st, w in words:
        m = re.match(r"^(\d{1,2})번[\.,!?]*$", w)
        if m:
            n = int(m.group(1))
            if 1 <= n <= 30:
                cands.append((st, n))

    markers: dict[int, float] = {}
    last_t = -1.0
    i = 0
    for target in range(1, 31):
        j = i
        while j < len(cands):
            ct, cn = cands[j]
            if ct <= last_t:
                j += 1
                continue
            if cn == target:
                markers[target] = ct
                last_t = ct
                i = j + 1
                break
            if cn > target:
                break  # mốc 'target' bị thiếu -> lấp sau
            j += 1  # cn < target: số lạc nhỏ trong hội thoại -> bỏ
    return markers


def _norm_ko(s: str) -> str:
    return re.sub(r"[^가-힣]", "", s)


def load_bank_transcripts(ky: str) -> dict[int, str]:
    """{question_no: chuỗi hangul nội dung hội thoại} từ bank (bỏ nhãn 남자:/여자:)."""
    eid = exam_id(ky)
    path = os.path.join(PUB_DATA, f"{eid}-bank.json")
    if not os.path.isfile(path):
        path = os.path.join(DATA_DIR, f"{eid}-bank.json")
    if not os.path.isfile(path):
        return {}
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    out: dict[int, str] = {}
    for row in rows:
        if row.get("section") != "listening":
            continue
        q = int(row.get("questionNo", 0))
        lines = (row.get("content_json") or {}).get("transcript") or []
        buf = []
        for ln in lines:
            txt = str(ln.get("lineText", ""))
            if ":" in txt:
                txt = txt.split(":", 1)[1]
            buf.append(_norm_ko(txt))
        out[q] = "".join(buf)
    return out


def fill_missing_markers(
    markers: dict[int, float], words: list[tuple[float, str]],
    transcripts: dict[int, str], silences: list[tuple[int, int]],
) -> tuple[dict[int, float], set[int]]:
    """Lấp các mốc câu mà ASR bỏ sót: gióng transcript (đã biết) với chuỗi chữ ASR để
    tìm vị trí câu, rồi snap về cuối khoảng lặng trước đó (đầu lời câu).
    Trả về (markers, tập câu đã lấp) — câu lấp kém tin cậy nên sẽ được hiệu chỉnh thêm."""
    import difflib

    filled: set[int] = set()

    # Chuỗi chữ hangul của toàn bộ ASR + thời điểm bắt đầu mỗi chữ.
    chars: list[str] = []
    times: list[float] = []
    for st, w in words:
        for ch in _norm_ko(w):
            chars.append(ch)
            times.append(st)
    asr = "".join(chars)

    def match_by_transcript(n: int, lo_t: float, hi_t: float):
        query = (transcripts.get(n) or "")[:18]
        if len(query) < 4:
            return None, 0.0
        idx0 = next((i for i, t in enumerate(times) if t >= lo_t), 0)
        idx1 = next((i for i, t in enumerate(times) if t >= hi_t), len(chars))
        win = len(query)
        ratios = [
            (difflib.SequenceMatcher(None, asr[i:i + win], query).ratio(), i)
            for i in range(idx0, max(idx0, idx1 - win) + 1)
        ]
        if not ratios:
            return None, 0.0
        best_ratio = max(r for r, _ in ratios)
        # câu/lời thoại ngắn dễ khớp nhầm -> đòi độ khớp cao hơn.
        if best_ratio < (0.8 if len(query) < 8 else 0.5):
            return None, best_ratio
        # Bài nghe đọc 2 lần -> chọn lần khớp SỚM NHẤT (đủ tốt), tránh trúng lần lặp.
        thr = max(0.72, best_ratio - 0.12)
        best_i = min((i for r, i in ratios if r >= thr), default=-1)
        if best_i < 0:
            return None, best_ratio
        t_match = times[best_i] * 1000
        # snap về cuối khoảng lặng gần nhất ngay TRƯỚC vị trí khớp (không lùi quá 3.5s).
        prior = [e for (s, e) in silences if t_match - 3500 <= e <= t_match + 300]
        cut = (max(prior) / 1000) if prior else (times[best_i] - 0.8)
        return max(lo_t, cut), best_ratio

    def fallback_by_gap(lo_t: float, hi_t: float):
        """Mốc dự phòng: cuối khoảng lặng trả lời (>=8s) ĐẦU TIÊN sau mốc đã biết trước đó."""
        lo_ms, hi_ms = lo_t * 1000, hi_t * 1000
        gaps = [(s, e) for (s, e) in silences if s > lo_ms + 1000 and e < hi_ms and (e - s) >= 8000]
        if gaps:
            gaps.sort()
            return gaps[0][1] / 1000.0
        return None

    for n in range(1, 31):
        if n in markers:
            continue
        lo_t = max([markers[k] for k in markers if k < n], default=0.0)
        hi_t = min([markers[k] for k in markers if k > n], default=times[-1] if times else 0.0)
        filled.add(n)
        t, ratio = match_by_transcript(n, lo_t, hi_t)
        if t is not None:
            markers[n] = t
            print(f"  [fill] câu {n}: gióng transcript -> {t:.1f}s (ratio={ratio:.2f})")
            continue
        t = fallback_by_gap(lo_t, hi_t)
        if t is not None:
            markers[n] = t
            print(f"  [fill] câu {n}: theo khoảng lặng -> {t:.1f}s (transcript ratio={ratio:.2f})")
        else:
            markers[n] = max(lo_t, (lo_t + hi_t) / 2)
            print(f"  [fill] câu {n}: ƯỚC LƯỢNG giữa -> {markers[n]:.1f}s (kém tin cậy)")
    return markers, filled


def _largest_silence(silences: list[tuple[int, int]], a_ms: int, b_ms: int | None) -> tuple[int, int] | None:
    """Khoảng lặng dài nhất BẮT ĐẦU trong (a_ms, b_ms) — chính là khoảng trả lời cuối câu.
    Kẹp đuôi về b_ms vì khoảng lặng thường kéo dài tới ngay trước mốc câu kế tiếp."""
    cand: list[tuple[int, int]] = []
    for s, e in silences:
        if s < a_ms:
            continue
        if b_ms is not None and s >= b_ms:
            continue
        cand.append((s, min(e, b_ms) if b_ms is not None else e))
    return max(cand, key=lambda x: x[1] - x[0]) if cand else None


def compute_segments(
    markers: dict[int, float], silences: list[tuple[int, int]], total_ms: int,
    filled: set[int] | None = None,
) -> dict[int, tuple[int, int]]:
    """Tách đoạn theo mốc ASR. Mỗi câu 1–24 bắt đầu ngay tại lúc đọc "N번".
    Nhóm 25–26 / 27–28 / 29–30 dùng chung đoạn (gồm cả bài nghe đọc TRƯỚC "25번")."""
    missing = [q for q in range(1, 31) if q not in markers]
    if missing:
        raise RuntimeError(f"Thiếu mốc ASR cho câu: {missing} (chỉ thấy {sorted(markers)})")
    filled = filled or set()
    lead = int(LEAD_SEC * 1000)
    tail = int(TAIL_SEC * 1000)
    m = {q: int(round(markers[q] * 1000)) for q in markers}
    seg: dict[int, tuple[int, int]] = {}

    # Câu 1..24: bắt đầu tại "N번", kết thúc ở khoảng lặng trả lời lớn nhất trước câu kế.
    for q in range(1, LAST_SINGLE_Q + 1):
        # Snap về đầu lời "N번" = cuối khoảng lặng NGAY TRƯỚC mốc (trong 6s). Vì timing mốc
        # ASR đôi khi trễ vài giây -> nếu không snap sẽ bắt đầu clip vào GIỮA câu.
        base = m[q]
        pre = [e for (s, e) in silences if m[q] - 6000 <= e <= m[q] + 200 and (e - s) >= 800]
        if pre:
            base = max(pre)
        start = max(0, base - lead)
        # Mốc LẤP kém chính xác: nếu ngay sau nó (<=4s) là khoảng lặng trả lời dài (>=12s)
        # thì mốc bị đặt nhầm TRƯỚC khoảng lặng của câu trước -> nội dung thật ở SAU nó.
        if q in filled:
            g_imm = next((e for (s, e) in sorted(silences)
                          if m[q] <= s <= m[q] + 4000 and (e - s) >= 12000), None)
            if g_imm is not None:
                start = max(0, g_imm - lead)
        g = _largest_silence(silences, start + lead, m[q + 1])
        end = (g[0] + tail) if g else (m[q + 1] - lead)
        seg[q] = (start, min(end, total_ms))

    # Khoảng lặng trả lời quanh các câu mốc của vùng nghe chung.
    g24 = _largest_silence(silences, m[24], m[25])  # gap sau câu 24 (trước bài nghe 25-26)
    g26 = _largest_silence(silences, m[26], m[27])  # gap sau câu 26
    g28 = _largest_silence(silences, m[28], m[29])  # gap sau câu 28
    g30 = _largest_silence(silences, m[30], None)   # gap sau câu 30 (trước lời kết)

    def group(prev_gap, end_gap, lead_q, after_q):
        start = (prev_gap[1] - lead) if prev_gap else max(0, m[lead_q] - lead)
        if end_gap:
            end = end_gap[0] + tail
        else:
            end = m[after_q] if after_q in m else total_ms
        return (max(0, start), min(end, total_ms))

    seg[25] = seg[26] = group(g24, g26, 25, 27)
    seg[27] = seg[28] = group(g26, g28, 27, 29)
    seg[29] = seg[30] = group(g28, g30, 29, None)
    return seg


_SENT_END = (".", "?", "!", "。", "？", "！", "…")
_LINE_GAP_SEC = 1.8  # khoảng nghỉ lớn (ranh giới câu/lượt nói) -> ngắt dòng transcript


def _trim_to_first_read(seg_words: list[tuple[float, str]]) -> list[tuple[float, str]]:
    """Nếu đoạn phát NỘI DUNG hai lần, chỉ giữ lần đọc đầu: phát hiện khi vài chữ đầu
    lặp lại ở nửa sau của đoạn -> cắt tại đó. Bảo thủ để tránh cắt nhầm câu không lặp."""
    if len(seg_words) < 10:
        return seg_words
    head = _norm_ko("".join(w for _, w in seg_words[:4]))
    if len(head) < 6:
        return seg_words
    n = len(seg_words)
    for i in range(max(4, (2 * n) // 5), n - 3):
        chunk = _norm_ko("".join(w for _, w in seg_words[i:i + 4]))
        if chunk.startswith(head):
            return seg_words[:i]
    return seg_words


def build_transcript_lines(
    words: list[tuple[float, str]], start_ms: int, end_ms: int, grouped: bool = False,
) -> list[dict]:
    """Sinh transcript [{lineMs, lineText}] từ các từ ASR nằm trong [start_ms, end_ms].

    - lineMs tính TƯƠNG ĐỐI so với đầu clip (start_ms) — khớp cách frontend đọc
      (player cộng exam_offset_ms khi phát full). lineMs tăng dần & phân biệt để
      hasExplicitTimings() trả true (dùng mốc thật, không ước lượng theo độ dài).
    - Ngắt dòng theo dấu kết câu hoặc khoảng nghỉ > _LINE_GAP_SEC.
    - grouped=True: cắt bỏ lượt đọc lại ("다시 들으십시오") của bài nghe chung 25-30.
    """
    seg = [(st, w) for (st, w) in words
           if start_ms <= round(st * 1000) < end_ms and w.strip()
           and not re.match(r"^\d{1,2}번[.,!?]*$", w.strip())]
    if not seg:
        return []
    if grouped:
        lo_sec = (start_ms + 4000) / 1000.0
        cut = next((i for i, (st, w) in enumerate(seg)
                    if st >= lo_sec and "들으십시오" in w), None)
        if cut is not None and cut >= 3:
            if cut > 0 and seg[cut - 1][1].strip().startswith("다시"):
                cut -= 1  # bỏ luôn "다시" đứng trước "들으십시오"
            seg = seg[:cut]
    seg = _trim_to_first_read(seg)

    lines: list[tuple[float, str]] = []
    cur: list[str] = []
    cur_start: float | None = None
    prev_st: float | None = None
    for st, w in seg:
        if cur and prev_st is not None and (st - prev_st) > _LINE_GAP_SEC:
            lines.append((cur_start, " ".join(cur)))
            cur, cur_start = [], None
        if not cur:
            cur_start = st
        cur.append(w)
        prev_st = st
        if w.endswith(_SENT_END):
            lines.append((cur_start, " ".join(cur)))
            cur, cur_start = [], None
    if cur:
        lines.append((cur_start, " ".join(cur)))

    out: list[dict] = []
    last_ms = -1
    for cs, text in lines:
        text = text.strip()
        if not text:
            continue
        if "들으십시오" in text:  # lời dẫn "다시 들으십시오" (nghe lại) -> không phải hội thoại
            continue
        if _norm_ko(text) == "다시":  # "다시" lẻ còn sót của lời dẫn nghe lại
            continue
        ms = max(0, int(round((cs or 0) * 1000)) - start_ms)
        if ms <= last_ms:
            ms = last_ms + 1
        last_ms = ms
        out.append({"lineMs": ms, "lineText": text})
    return out


def build_all_transcripts(
    words: list[tuple[float, str]], seg: dict[int, tuple[int, int]],
) -> dict[int, list[dict]]:
    """Transcript cho từng câu từ đoạn audio tương ứng. Cặp nghe chung (25-26...)
    dùng cùng clip -> cùng transcript."""
    out: dict[int, list[dict]] = {}
    for q in range(1, LAST_SINGLE_Q + 1):
        a, b = seg[q]
        out[q] = build_transcript_lines(words, a, b, grouped=False)
    for qa, qb in GROUPED_PAIRS:
        a, b = seg[qa]
        lines = build_transcript_lines(words, a, b, grouped=True)
        out[qa] = lines
        out[qb] = lines
    return out


def _run_with_retry(cmd: list[str], desc: str, tries: int = 20) -> None:
    """Windows Defender hay khoá file mp3 (đang ghi/đè) để quét -> ffmpeg báo EINVAL.
    Thử lại nhiều lần với backoff."""
    last = ""
    for attempt in range(tries):
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode == 0:
            return
        last = r.stderr
        time.sleep(min(0.5 + attempt * 0.3, 3.0))
    raise RuntimeError(f"ffmpeg lỗi sau {tries} lần thử: {desc}\n{last}")


def _replace_with_retry(tmp: str, dst: str, tries: int = 20) -> None:
    for attempt in range(tries):
        try:
            os.replace(tmp, dst)
            return
        except OSError:
            time.sleep(min(0.5 + attempt * 0.3, 3.0))
    raise RuntimeError(f"Không thể thay thế file (đang bị khoá?): {dst}")


def ffmpeg_export(src: str, start_ms: int, end_ms: int, out: str) -> int:
    dur_ms = max(end_ms - start_ms, 1)
    # Ghi ra file tạm tên mới (tránh đè file cũ đang bị quét) rồi đổi tên.
    tmp = out + ".tmp.mp3"
    cmd = ["ffmpeg", "-y", "-v", "error", "-ss", f"{start_ms / 1000:.3f}", "-i", src,
           "-t", f"{dur_ms / 1000:.3f}", "-acodec", "libmp3lame", "-q:a", "2", tmp]
    _run_with_retry(cmd, os.path.basename(out))
    _replace_with_retry(tmp, out)
    return dur_ms


def export_audio(ky: str, src: str, seg: dict[int, tuple[int, int]]) -> dict[int, int]:
    """Xuất mp3 từng câu (nhóm chung dùng cùng nội dung) + full nối từ các đoạn riêng biệt.
    Trả về offset_ms (vị trí trong file full) cho từng câu."""
    eid = exam_id(ky)
    os.makedirs(PUB_AUDIO, exist_ok=True)

    # Thứ tự đoạn riêng biệt để nối full: 1..24 + leader của 3 nhóm.
    distinct_qs = list(range(1, LAST_SINGLE_Q + 1)) + [p[0] for p in GROUPED_PAIRS]
    offset_of: dict[int, int] = {}
    full_parts: list[str] = []
    cum = 0
    for q in distinct_qs:
        a, b = seg[q]
        out = os.path.join(PUB_AUDIO, f"{eid}-listen-q{q}.mp3")
        ffmpeg_export(src, a, b, out)
        offset_of[q] = cum
        cum += probe_duration_ms(out)  # offset theo thời lượng THỰC của clip
        full_parts.append(out)

    # Câu chẵn của mỗi nhóm: dùng chung file + offset của câu lẻ.
    for qa, qb in GROUPED_PAIRS:
        offset_of[qb] = offset_of[qa]
        src_clip = os.path.join(PUB_AUDIO, f"{eid}-listen-q{qa}.mp3")
        dst_clip = os.path.join(PUB_AUDIO, f"{eid}-listen-q{qb}.mp3")
        with open(src_clip, "rb") as fr:
            data = fr.read()
        tmp = dst_clip + ".tmp.mp3"
        with open(tmp, "wb") as fw:
            fw.write(data)
        _replace_with_retry(tmp, dst_clip)

    # Nối full bằng ffmpeg concat + re-encode để metadata thời lượng CHÍNH XÁC
    # (ghép byte MP3 thô làm sai duration -> tua ở chế độ "nghe full" bị lệch).
    list_path = os.path.join(PUB_AUDIO, f"_concat-{eid}.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for p in full_parts:
            f.write(f"file '{p.replace(os.sep, '/')}'\n")
    full_out = os.path.join(PUB_AUDIO, f"{eid}-listen-full.mp3")
    full_tmp = full_out + ".tmp.mp3"
    _run_with_retry(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list_path,
         "-acodec", "libmp3lame", "-q:a", "2", full_tmp],
        os.path.basename(full_out),
    )
    _replace_with_retry(full_tmp, full_out)
    os.remove(list_path)
    return offset_of


def patch_bank(
    ky: str, offset_of: dict[int, int],
    transcripts: dict[int, list[dict]] | None = None,
) -> None:
    eid = exam_id(ky)
    transcripts = transcripts or {}
    for path in (
        os.path.join(DATA_DIR, f"{eid}-bank.json"),
        os.path.join(PUB_DATA, f"{eid}-bank.json"),
    ):
        if not os.path.isfile(path):
            print(f"  [bank] BỎ QUA (không có): {path}")
            continue
        with open(path, encoding="utf-8") as f:
            rows = json.load(f)
        for row in rows:
            if row.get("section") != "listening":
                continue
            q = int(row.get("questionNo", 0))
            cj = row.setdefault("content_json", {})
            leader = q
            for qa, qb in GROUPED_PAIRS:
                if q == qb:
                    leader = qa
            cj["audio_url"] = f"/audio/{eid}-listen-q{leader}.mp3"
            cj["exam_offset_ms"] = offset_of.get(q, 0)
            tr = transcripts.get(q)
            if tr:
                cj["transcript"] = tr
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f"  [bank] cập nhật {os.path.basename(os.path.dirname(path))}/{eid}-bank.json")


def offsets_from_bank(ky: str) -> dict[int, int]:
    """Đọc exam_offset_ms hiện có trong bank (dùng cho chế độ chỉ cập nhật transcript,
    không cắt lại audio)."""
    eid = exam_id(ky)
    path = os.path.join(PUB_DATA, f"{eid}-bank.json")
    if not os.path.isfile(path):
        path = os.path.join(DATA_DIR, f"{eid}-bank.json")
    offset_of: dict[int, int] = {}
    if not os.path.isfile(path):
        return offset_of
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    for row in rows:
        if row.get("section") != "listening":
            continue
        q = int(row.get("questionNo", 0))
        cj = row.get("content_json") or {}
        offset_of[q] = int(cj.get("exam_offset_ms", 0) or 0)
    return offset_of


def resegment(ky: str, transcript_only: bool = False) -> None:
    print(f"\n[resegment] === Kỳ {ky}{' (chỉ transcript)' if transcript_only else ''} ===")
    src = find_source_audio(ky)
    print(f"  [src] {os.path.basename(src)}")
    total = probe_duration_ms(src)
    sils = detect_silences_ms(src)
    words = asr_words(src, ky, sils, total)
    markers = extract_markers(words)
    filled: set[int] = set()
    if len(markers) < 30:
        miss = [q for q in range(1, 31) if q not in markers]
        print(f"  [asr] {len(words)} từ, mốc câu: {len(markers)}/30 (thiếu {miss}) -> lấp bằng transcript")
        markers, filled = fill_missing_markers(markers, words, load_bank_transcripts(ky), sils)
    else:
        print(f"  [asr] {len(words)} từ, mốc câu: 30/30")
    seg = compute_segments(markers, sils, total, filled)
    if transcript_only:
        offset_of = offsets_from_bank(ky)  # giữ nguyên audio + offset cũ
    else:
        offset_of = export_audio(ky, src, seg)
    transcripts = build_all_transcripts(words, seg)
    # log độ dài đoạn + số dòng transcript để kiểm chứng
    durs = {q: (b - a) / 1000 for q, (a, b) in seg.items()}
    line = " ".join(f"{q}:{durs[q]:.0f}s" for q in sorted(durs))
    print(f"  [seg] {line}")
    nlines = sum(1 for v in transcripts.values() if v)
    print(f"  [transcript] {nlines}/30 câu có transcript ASR")
    patch_bank(ky, offset_of, transcripts)


def main() -> None:
    args = sys.argv[1:]
    transcript_only = "--transcript-only" in args
    kys = [a for a in args if not a.startswith("--")] or list(EXAMS.keys())
    for ky in kys:
        if ky not in EXAMS:
            raise SystemExit(f"Kỳ không hỗ trợ: {ky}")
        resegment(ky, transcript_only=transcript_only)
    print("\n[resegment] Hoàn tất.")


if __name__ == "__main__":
    main()
