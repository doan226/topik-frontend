"""
Đáp án TOPIK I đã xác minh — bổ sung khi OCR đáp án scan thiếu.
Chỉ điền câu còn trống sau OCR (merge_answers dùng setdefault).
"""
from __future__ import annotations

# listen: 30 câu (1–30). Nguồn: đáp án công bố / đối chiếu đề gốc.
VERIFIED: dict[str, dict[str, list[int]]] = {
    "47": {
        "listen": [
            3, 4, 1, 3, 4, 1, 1, 2, 4, 4,
            3, 3, 2, 3, 2, 2, 4, 2, 3, 4,
            4, 3, 3, 4, 3, 3, 1, 4, 2, 4,
        ],
    },
    "64": {
        "listen": [
            1, 3, 4, 2, 4, 3, 4, 3, 3, 2,
            3, 3, 2, 3, 4, 4, 3, 3, 3, 3,
            3, 3, 1, 3, 2, 4, 3, 4, 3, 4,
        ],
        "read": [None] * 29 + [3],  # bank q30 = exam q60
    },
    "83": {
        "listen": [
            3, 4, 1, 3, 4, 3, 4, 3, 1, 4,
            3, 3, 2, 3, 1, 2, 3, 3, 4, 3,
            3, 3, 1, 4, 3, 4, 3, 1, 3, 4,
        ],
    },
    "91": {
        "listen": [
            1, 4, 1, 4, 1, 4, 1, 2, 3, 3,
            2, 4, 2, 1, 1, 2, 1, 2, 2, 3,
            4, 3, 3, 1, 3, 4, 1, 4, 1, 3,
        ],
    },
}


def listen_map(ky: str) -> dict[int, str]:
    vals = VERIFIED.get(ky, {}).get("listen")
    if not vals or len(vals) != 30:
        return {}
    return {i + 1: str(v) for i, v in enumerate(vals)}


def read_map(ky: str) -> dict[int, str]:
    vals = VERIFIED.get(ky, {}).get("read")
    if not vals:
        return {}
    out: dict[int, str] = {}
    for i, v in enumerate(vals):
        if v is not None:
            out[i + 1] = str(v)
    return out


def merge_answers(
    ky: str,
    listen: dict[int, str],
    read: dict[int, str],
) -> tuple[dict[int, str], dict[int, str]]:
    out_l = dict(listen)
    out_r = dict(read)
    for q, a in listen_map(ky).items():
        out_l.setdefault(q, a)
    for q, a in read_map(ky).items():
        out_r.setdefault(q, a)
    return out_l, out_r
