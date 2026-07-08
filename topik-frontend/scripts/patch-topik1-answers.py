"""
patch-topik1-answers.py — Ghi đè correct_ans (Nghe 1-30 + Đọc 1-40) cho 10 kỳ
TOPIK I từ topik1_verified_answers.py (nguồn chuẩn đọc từ PDF đáp án chính thức).

Chạy từ topik-frontend:
    python scripts/patch-topik1-answers.py
"""
from __future__ import annotations

import importlib.util
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND = os.path.dirname(SCRIPT_DIR)

_spec = importlib.util.spec_from_file_location(
    "va", os.path.join(SCRIPT_DIR, "topik1_verified_answers.py")
)
va = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(va)

KYS = ["35", "36", "37", "41", "47", "52", "60", "64", "83", "91"]
BANK_DIRS = [
    os.path.join(FRONTEND, "data"),
    os.path.join(FRONTEND, "public", "data"),
]


def patch_one(path: str, ky: str) -> tuple[int, int]:
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    lmap = va.listen_map(ky)
    rmap = va.read_map(ky)
    nl = nr = 0
    for row in rows:
        sec = row.get("section")
        try:
            qno = int(row.get("questionNo"))
        except (TypeError, ValueError):
            continue
        if sec == "listening" and qno in lmap:
            if str(row.get("correct_ans", "")) != lmap[qno]:
                nl += 1
            row["correct_ans"] = lmap[qno]
        elif sec == "reading" and qno in rmap:
            if str(row.get("correct_ans", "")) != rmap[qno]:
                nr += 1
            row["correct_ans"] = rmap[qno]
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    return nl, nr


def main() -> None:
    for ky in KYS:
        eid = f"topik1-{ky}"
        for d in BANK_DIRS:
            path = os.path.join(d, f"{eid}-bank.json")
            if not os.path.isfile(path):
                continue
            nl, nr = patch_one(path, ky)
            rel = os.path.relpath(path, FRONTEND)
            print(f"  {rel}: listen changed={nl}, reading changed={nr}")
    print("Hoan tat patch dap an.")


if __name__ == "__main__":
    main()
