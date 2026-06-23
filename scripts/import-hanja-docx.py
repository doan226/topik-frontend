#!/usr/bin/env python3
"""Parse hanja-docx-extract.txt → data/hanja-bank.json"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXTRACT = ROOT / "data" / "hanja-docx-extract.txt"
OUT = ROOT / "data" / "hanja-bank.json"

HEADER_RE = re.compile(
    r"^([\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+)\s*\(([^)]+)\)\s*$"
)
COMPOUND_RE = re.compile(r"([가-힣a-zA-Z]+(?:하다)?)\(([^)]+)\)")


def slugify(char: str, reading: str, han_viet: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", han_viet.lower()).strip("-")[:24]
    if not base:
        base = reading or "hanja"
    return f"hanja-{base}-{char}"


def parse_compounds(raw: str):
    compounds = []
    for m in COMPOUND_RE.finditer(raw):
        ko, hanja = m.group(1), m.group(2)
        compounds.append({"ko": ko, "hanja": hanja, "vi": ""})
    return compounds


def parse_meanings(raw: str, compounds: list):
    vi_map = {}
    for part in raw.split(";"):
        part = part.strip()
        if ":" not in part:
            continue
        ko, vi = part.split(":", 1)
        vi_map[ko.strip()] = vi.strip()
    for c in compounds:
        if c["ko"] in vi_map:
            c["vi"] = vi_map[c["ko"]]
    primary_vi = ""
    if compounds and compounds[0]["vi"]:
        primary_vi = compounds[0]["vi"]
    elif vi_map:
        primary_vi = next(iter(vi_map.values()))
    return primary_vi


def parse_entries(lines: list[str]):
    entries = {}
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = HEADER_RE.match(line)
        if not m:
            i += 1
            continue
        if i + 4 >= len(lines):
            break
        char, han_viet = m.group(1), m.group(2).strip()
        sample_ko = lines[i + 1].strip()
        reading = lines[i + 2].strip()
        compounds_raw = lines[i + 3].strip()
        meanings_raw = lines[i + 4].strip()

        if not reading or not re.match(r"^[가-힣/]+$", reading):
            i += 1
            continue

        compounds = parse_compounds(compounds_raw)
        meaning_vi = parse_meanings(meanings_raw, compounds)
        if not meaning_vi:
            meaning_vi = han_viet.split("/")[0].strip()

        score = len(compounds) + (1 if meaning_vi else 0)
        prev = entries.get(char)
        if prev is None or score > prev["_score"]:
            entries[char] = {
                "_score": score,
                "char": char,
                "hanViet": han_viet,
                "reading": reading.split("/")[0],
                "readingsAlt": [r for r in reading.split("/") if r],
                "meaningVi": meaning_vi,
                "sampleKo": sample_ko,
                "compounds": compounds,
            }
        i += 5
    return entries


def assign_packs(char_ids: list[str]) -> list[dict]:
    n = len(char_ids)
    free_cut = min(40, max(20, n // 3))
    premium_cut = min(free_cut + 30, n)
    return [
        {
            "packId": "beginner-core",
            "titleVi": "Hán Hàn cơ bản (theo vần)",
            "access": "free",
            "charIds": char_ids[:free_cut],
        },
        {
            "packId": "topik-intermediate",
            "titleVi": "Hán Hàn trung cấp — 27 gốc âm nâng cao",
            "access": "premium",
            "charIds": char_ids[free_cut:premium_cut],
        },
        {
            "packId": "advanced-academic",
            "titleVi": "Hán Hàn học thuật",
            "access": "premium",
            "charIds": char_ids[premium_cut:],
        },
        {
            "packId": "kiip-hanja",
            "titleVi": "Hán Hàn KIIP (chuyên sâu)",
            "access": "pack:kiip-hanja",
            "charIds": char_ids[premium_cut:],
        },
    ]


def dedupe_by_korean_reading(characters: list[dict]) -> list[dict]:
    """Giữ một chữ Hán / âm Hán Hàn — bỏ đồng âm trùng reading."""
    by_reading: dict[str, list[dict]] = {}
    for c in characters:
        by_reading.setdefault(c["reading"], []).append(c)

    kept = []
    for group in by_reading.values():
        group.sort(key=lambda x: (-len(x.get("compounds") or []), x["char"]))
        winner = group[0]
        kept.append(winner)
    return sorted(kept, key=lambda x: (x["reading"], x["char"]))


def korean_only_compounds(characters: list[dict]) -> None:
    """Từ ghép chỉ giữ tiếng Hàn (Hangul) + nghĩa Việt — bỏ chuỗi Hán tự."""
    for c in characters:
        c["compounds"] = [
            {"ko": co["ko"], "vi": co.get("vi", "")}
            for co in (c.get("compounds") or [])
            if co.get("ko")
        ]


def build_characters(entries: dict) -> list[dict]:
    chars = []
    used_ids = set()
    for char, e in sorted(entries.items(), key=lambda x: x[1]["reading"]):
        cid = slugify(char, e["reading"], e["hanViet"])
        n = 2
        while cid in used_ids:
            cid = f"{cid}-{n}"
            n += 1
        used_ids.add(cid)

        topics = []
        if any(c["ko"].endswith("사") for c in e["compounds"]):
            topics.append("profession")
        if e["reading"] in ("교", "학"):
            topics.append("education")

        item = {
            "id": cid,
            "char": e["char"],
            "reading": e["reading"],
            "meaningKo": e["sampleKo"],
            "meaningVi": e["meaningVi"],
            "hanViet": e["hanViet"],
            "topics": topics or ["general"],
            "compounds": [c for c in e["compounds"] if c["vi"] or c["hanja"]],
            "source": "docx-bao-cao-hinh-thai-hoc",
            "verified": "suggested",
        }
        if len(e.get("readingsAlt", [])) > 1:
            item["readingsAlt"] = e["readingsAlt"]
        chars.append(item)
    return chars


def main():
    if not EXTRACT.exists():
        raise SystemExit(f"Missing extract file: {EXTRACT}")

    lines = EXTRACT.read_text(encoding="utf-8").splitlines()
    entries = parse_entries(lines)
    characters = build_characters(entries)
    characters = dedupe_by_korean_reading(characters)
    korean_only_compounds(characters)
    char_ids = [c["id"] for c in characters]
    packs = assign_packs(char_ids)

    bank = {
        "meta": {
            "version": 2,
            "title": "Hán Hàn — Báo cáo Hình thái học (1 chữ/âm)",
            "updated": "2026-05-25",
            "source": "Báo Cáo Nghiên Cứu Hình Thái Học Từ Vựng Hán Hàn.docx",
            "characterCount": len(characters),
        },
        "packs": packs,
        "characters": characters,
    }

    OUT.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(characters)} characters to {OUT}")


if __name__ == "__main__":
    main()
