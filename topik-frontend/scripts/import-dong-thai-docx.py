#!/usr/bin/env python3
"""Parse Nhóm từ về Động thái.docx → premium pack in data/hanja-bank.json (90 từ)."""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "data" / "dong-thai.docx"
DOCX_FALLBACK = Path(r"c:\Users\01666\Downloads\Nhóm từ về Động thái.docx")
EXTRACT = ROOT / "data" / "dong-thai-extract.txt"
BANK = ROOT / "data" / "hanja-bank.json"

PACK_ID = "topik-premium-90"
PACK_TITLE = "90 từ Động thái & Học thuật TOPIK (PREMIUM)"

STT_RE = re.compile(r"^\d{1,3}$")
CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")
KO_RE = re.compile(r"[가-힣]")

SECTION_TOPICS = [
    (1, 20, "action"),
    (21, 40, "concept"),
    (41, 90, "academic"),
]


def resolve_docx() -> Path:
    if DOCX.exists():
        return DOCX
    if DOCX_FALLBACK.exists():
        return DOCX_FALLBACK
    raise SystemExit(f"Missing docx: {DOCX} or {DOCX_FALLBACK}")


def extract_docx():
    src = resolve_docx()
    with zipfile.ZipFile(src) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    lines = []
    for para in root.findall(".//w:p", ns):
        t = "".join(x.text or "" for x in para.findall(".//w:t", ns)).strip()
        if t:
            lines.append(t)
    EXTRACT.write_text("\n".join(lines), encoding="utf-8")


def slugify_ko(ko: str) -> str:
    base = re.sub(r"\([^)]*\)", "", ko)
    base = re.sub(r"[^a-z0-9가-힣]+", "-", base.lower()).strip("-")
    return base[:36] or "word"


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
        elif suffix == "되다":
            compounds.append({"ko": f"{base}되다", "vi": ""})
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
    low = line.lower()
    headers = {
        "stt",
        "từ vựng",
        "chữ hán",
        "nghĩa hán việt",
        "nghĩa ngữ cảnh topik",
        "nghĩa tiếng việt",
    }
    if low in headers:
        return True
    if line.startswith("Nhóm ") or line.startswith(". Nhóm"):
        return True
    if "Đây là những" in line or "danh sách 50" in line or "Để tiếp tục" in line:
        return True
    if line.startswith("Các từ ") or line.startswith("Những từ "):
        return True
    return False


def topic_for_global_index(idx: int) -> str:
    for lo, hi, topic in SECTION_TOPICS:
        if lo <= idx <= hi:
            return topic
    return "academic"


def parse_entries(lines: list[str], *, limit: int = 90) -> list[dict]:
    """Parse docx lines; assign global index 1..90 (two STT resets in source)."""
    seen_ko: dict[str, int] = {}
    max_per_ko = {"왜곡": 2}
    entries = []
    global_idx = 0
    i = 0

    while i < len(lines) and global_idx < limit:
        line = lines[i].strip()
        if not STT_RE.match(line):
            i += 1
            continue

        local_stt = int(line)
        if local_stt < 1 or local_stt > 60:
            i += 1
            continue
        if i + 2 >= len(lines):
            break

        ko_raw = lines[i + 1].strip()
        third = lines[i + 2].strip()

        if third.startswith("(") and ("ngoại lai" in third.lower() or "mới" in third.lower()):
            hanja = ""
            han_viet = third if third != "-" else ""
            meaning_vi = lines[i + 3].strip() if i + 3 < len(lines) else ""
            is_loanword = True
            i += 4
        elif third == "-" or (not CJK_RE.search(third) and third.startswith("(")):
            hanja = ""
            han_viet = third
            meaning_vi = lines[i + 3].strip() if i + 3 < len(lines) else ""
            is_loanword = "ngoại lai" in third.lower() or "mới" in third.lower()
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
        norm_key = meaning_ko.lower()
        cap = max_per_ko.get(norm_key, 1)
        if seen_ko.get(norm_key, 0) >= cap:
            continue
        seen_ko[norm_key] = seen_ko.get(norm_key, 0) + 1
        dup_n = seen_ko[norm_key]

        global_idx += 1
        for c in compounds:
            if c["ko"] == meaning_ko or c["ko"].startswith(meaning_ko):
                c["vi"] = meaning_vi

        topic = topic_for_global_index(global_idx)
        char_display = hanja if hanja and CJK_RE.search(hanja) else "·"
        hv = han_viet if han_viet and han_viet not in ("-", "(Mới)", "(Ngoại lai)") else ""
        if hv.startswith("("):
            hv = ""

        entries.append(
            {
                "globalIdx": global_idx,
                "id": f"topik90-{global_idx:03d}-{slugify_ko(meaning_ko)}{'-2' if dup_n > 1 else ''}",
                "char": char_display,
                "reading": meaning_ko,
                "meaningKo": meaning_ko,
                "meaningVi": meaning_vi,
                "hanViet": hv,
                "topics": ["topik90", "premium", "read-listen", topic],
                "compounds": [c for c in compounds if c.get("ko")],
                "source": "dong-thai.docx",
                "verified": "suggested",
                "loanword": is_loanword,
            }
        )

    return entries


def load_bank() -> dict:
    return json.loads(BANK.read_text(encoding="utf-8"))


def merge_bank(existing: dict, new_entries: list[dict]) -> dict:
    old_chars = [c for c in existing.get("characters", []) if not c.get("id", "").startswith("topik90-")]
    old_packs = [p for p in existing.get("packs", []) if p.get("packId") != PACK_ID]

    new_chars = []
    for e in new_entries:
        item = {k: v for k, v in e.items() if k not in ("globalIdx", "loanword")}
        if e.get("loanword"):
            item["topics"] = list(item.get("topics") or []) + ["loanword"]
        new_chars.append(item)

    premium_pack = {
        "packId": PACK_ID,
        "titleVi": PACK_TITLE,
        "access": "premium",
        "charIds": [c["id"] for c in new_chars],
    }

    packs = list(existing.get("packs", []))
    # Insert after topik100 if present
    insert_at = 0
    for i, p in enumerate(packs):
        if p.get("packId") == "topik100-frequent":
            insert_at = i + 1
            break
    packs = [p for p in packs if p.get("packId") != PACK_ID]
    packs.insert(insert_at, premium_pack)

    characters = old_chars + new_chars
    meta = dict(existing.get("meta") or {})
    meta["version"] = max(meta.get("version", 2), 4)
    meta["topik90Count"] = len(new_chars)
    meta["characterCount"] = len(characters)
    meta["updated"] = "2026-05-25"
    sources = meta.get("source", "")
    if "dong-thai.docx" not in sources:
        meta["source"] = (sources + " + dong-thai.docx").strip(" +")

    return {"meta": meta, "packs": packs, "characters": characters}


def main():
    extract_docx()
    lines = EXTRACT.read_text(encoding="utf-8").splitlines()
    entries = parse_entries(lines, limit=90)
    if len(entries) != 90:
        print(f"WARNING: parsed {len(entries)} entries (expected 90)")
        for e in entries:
            print(e["globalIdx"], e["meaningKo"])

    bank = merge_bank(load_bank(), entries)
    BANK.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} premium entries to pack {PACK_ID}")
    print(f"Total characters: {bank['meta']['characterCount']}")


if __name__ == "__main__":
    main()
