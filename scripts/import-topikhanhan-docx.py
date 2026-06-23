#!/usr/bin/env python3
"""Parse data/topikhanhan-extract.txt → merge into data/hanja-bank.json (pack topik100-frequent)."""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "data" / "topikhanhan.docx"
EXTRACT = ROOT / "data" / "topikhanhan-extract.txt"
BANK = ROOT / "data" / "hanja-bank.json"

STT_RE = re.compile(r"^\d{1,3}$")
CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")
KO_RE = re.compile(r"[가-힣]")


def extract_docx_to_txt():
    if not DOCX.exists():
        return
    with zipfile.ZipFile(DOCX) as z:
        xml = z.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paras = []
    for para in root.findall(".//w:p", ns):
        texts = [t.text or "" for t in para.findall(".//w:t", ns)]
        line = "".join(texts).strip()
        if line:
            paras.append(line)
    EXTRACT.write_text("\n".join(paras), encoding="utf-8")


def slugify_ko(ko: str) -> str:
    base = re.sub(r"\([^)]*\)", "", ko)
    base = re.sub(r"[^a-z0-9가-힣]+", "-", base.lower()).strip("-")
    return base[:32] or "word"


def normalize_ko(raw: str, *, loanword: bool = False) -> tuple[str, list[dict]]:
    raw = raw.strip()
    suffix_match = re.search(r"\(([^)]+)\)", raw)
    suffix = suffix_match.group(1).strip() if suffix_match else None
    base = re.sub(r"\s*\([^)]*\)\s*", "", raw).strip() or raw

    compounds = [{"ko": base, "vi": ""}]
    if loanword:
        return base, compounds

    if suffix:
        if suffix == "하다":
            compounds.append({"ko": f"{base}하다", "vi": ""})
        elif "/" in suffix:
            for part in (p.strip() for p in suffix.split("/")):
                if part == "하다":
                    compounds.append({"ko": f"{base}하다", "vi": ""})
                elif part == "되다":
                    compounds.append({"ko": f"{base}되다", "vi": ""})
                elif part.endswith("하다") and part != "하다":
                    stem = part[:-2]
                    compounds.append({"ko": f"{base}{stem}하다", "vi": ""})
        elif suffix.endswith("하다") and suffix != "하다":
            stem = suffix[:-2]
            compounds.append({"ko": f"{base}{stem}하다", "vi": ""})
    elif not base.endswith("하다") and not base.endswith("되다"):
        compounds.append({"ko": f"{base}하다", "vi": ""})

    return base, compounds


def is_header_line(line: str) -> bool:
    if STT_RE.match(line):
        return False
    headers = {
        "stt",
        "từ vựng",
        "chữ hán",
        "nghĩa hán việt",
        "nghĩa tiếng việt",
    }
    low = line.lower()
    if low in headers:
        return True
    if line.startswith("Nhóm ") or "Những từ này" in line or "Đây là những" in line:
        return True
    return False


def parse_topik100(lines: list[str]) -> list[dict]:
    entries = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not STT_RE.match(line):
            i += 1
            continue
        stt = int(line)
        if stt < 1 or stt > 100:
            i += 1
            continue
        if i + 2 >= len(lines):
            break

        ko_raw = lines[i + 1].strip()
        third = lines[i + 2].strip()

        if third.startswith("(") and "ngoại lai" in third.lower():
            hanja = ""
            han_viet = third
            meaning_vi = lines[i + 3].strip() if i + 3 < len(lines) else ""
            is_loanword = True
            i += 4
        elif CJK_RE.search(third):
            hanja = third
            han_viet = lines[i + 3].strip() if i + 3 < len(lines) else ""
            meaning_vi = lines[i + 4].strip() if i + 4 < len(lines) else ""
            is_loanword = False
            i += 5
        else:
            i += 1
            continue

        if not ko_raw or not meaning_vi or not KO_RE.search(ko_raw):
            continue

        meaning_ko, compounds = normalize_ko(ko_raw, loanword=is_loanword)
        for c in compounds:
            if c["ko"] == meaning_ko or c["ko"].startswith(meaning_ko):
                c["vi"] = meaning_vi

        topic_group = "action" if stt <= 60 else "concept"
        char_display = hanja if hanja else "·"

        entries.append(
            {
                "stt": stt,
                "id": f"topik100-{stt:03d}-{slugify_ko(meaning_ko)}",
                "char": char_display,
                "reading": meaning_ko,
                "meaningKo": meaning_ko,
                "meaningVi": meaning_vi,
                "hanViet": han_viet if han_viet and not han_viet.startswith("(") else "",
                "topics": ["topik100", "read-listen", topic_group],
                "compounds": [c for c in compounds if c.get("ko")],
                "source": "topikhanhan.docx",
                "verified": "suggested",
                "loanword": is_loanword,
            }
        )

    entries.sort(key=lambda x: x["stt"])
    return entries


def load_existing_bank() -> dict:
    if not BANK.exists():
        return {"meta": {"version": 2}, "packs": [], "characters": []}
    return json.loads(BANK.read_text(encoding="utf-8"))


def merge_bank(existing: dict, topik_entries: list[dict]) -> dict:
    old_chars = [c for c in existing.get("characters", []) if not c.get("id", "").startswith("topik100-")]
    old_packs = [
        p
        for p in existing.get("packs", [])
        if p.get("packId") not in ("advanced-academic", "kiip-hanja", "topik100-frequent")
    ]

    topik_chars = []
    for e in topik_entries:
        item = {k: v for k, v in e.items() if k not in ("stt", "loanword")}
        if e.get("loanword"):
            item["topics"] = list(item.get("topics") or []) + ["loanword"]
        topik_chars.append(item)

    topik_pack = {
        "packId": "topik100-frequent",
        "titleVi": "100 từ Hán Hàn hay gặp TOPIK (Đọc · Nghe)",
        "access": "free",
        "charIds": [c["id"] for c in topik_chars],
    }

    characters = old_chars + topik_chars
    packs = [topik_pack] + old_packs

    return {
        "meta": {
            "version": 3,
            "title": "Hán Hàn TOPIK — 100 từ + gốc âm",
            "updated": "2026-05-25",
            "source": "topikhanhan.docx + Báo cáo Hình thái học",
            "characterCount": len(characters),
            "topik100Count": len(topik_chars),
        },
        "packs": packs,
        "characters": characters,
    }


def main():
    extract_docx_to_txt()
    if not EXTRACT.exists():
        raise SystemExit(f"Missing extract: {EXTRACT}")

    lines = EXTRACT.read_text(encoding="utf-8").splitlines()
    entries = parse_topik100(lines)
    if len(entries) < 90:
        raise SystemExit(f"Expected ~100 entries, parsed {len(entries)}")

    bank = merge_bank(load_existing_bank(), entries)
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} TOPIK100 entries; total {bank['meta']['characterCount']} characters")


if __name__ == "__main__":
    main()
