#!/usr/bin/env python3
"""Import 23 expansion writing sets from user's HTML + answer HTML into FE/BE banks."""

from __future__ import annotations

import json
import re
from html import unescape
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    raise SystemExit("pip install beautifulsoup4")

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
EXAM_HTML = Path(
    r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams\FileWritting\TOPIK_II_23_Bo_De_Hoan_Chinh_51_54.html"
)
ANS_HTML = Path(
    r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams\FileWritting\TOPIK_II_23_Bo_De_Dap_An_Chuan_51_54.html"
)
TXT_ALL = Path(
    r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams\FileWritting\TOPIK_II_Tat_Ca_Bo_De_Luyen_Tap.txt"
)

OUT_JS = ROOT / "src" / "expansionQuestionBank.js"
OUT_JSON_FE = ROOT / "data" / "writing-question-bank.json"
OUT_JSON_BE = REPO / "topik-backend" / "topikai" / "src" / "main" / "resources" / "question-bank.json"

Q53_GENERIC_ANSWER = (
    "조사 기관에 따르면 해당 현상은 최근 급격한 변화를 겪고 있는 것으로 나타났다. "
    "그래프를 살보면 수치가 2010년 기준 최저치를 기록한 이후 매년 꾸준히 증가 추세를 보였다. "
    "특히 특정 요인의 등장으로 인해 성장이 가속화되었는데, 이는 대중의 인식 변화와 밀접한 관련이 있는 것으로 해석된다. "
    "이와 같은 추세가 지속된다면 향후 몇 년간 해당 분야의 규모는 더욱 확대될 것으로 전망된다. "
    "따라서 이러한 흐름에 발맞추어 다각적인 인프라 구축과 정책적 지원이 동반되어야 할 것이다."
)

IMG_PAGE_BY_SET = {
    1: 37,
    2: 38,
    3: 39,
    4: 40,
    5: 42,
    6: 43,
    7: 44,
    8: 46,
    9: 47,
    10: 48,
    11: 49,
    12: 50,
    13: 52,
    14: 54,
    15: 55,
    16: 56,
    17: 57,
    18: 58,
    19: 59,
    20: 60,
    21: 61,
    22: 62,
    23: 63,
}


def clean_text(s: str) -> str:
    s = unescape(s or "")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def first_answer_variant(raw: str) -> str:
    raw = clean_text(raw)
    if not raw:
        return ""
    return raw.split(" / ")[0].strip()


def textbox_to_prompt(textbox) -> str:
    parts: list[str] = []
    blank_idx = 0
    markers = ["( ㉠ )", "( ㉡ )"]
    for p in textbox.find_all("p"):
        line = ""
        for child in p.children:
            if getattr(child, "name", None) == "span" and "blank" in (child.get("class") or []):
                if blank_idx < len(markers):
                    line += markers[blank_idx]
                    blank_idx += 1
            elif isinstance(child, str):
                line += child
            else:
                line += child.get_text()
        line = clean_text(line)
        if line:
            parts.append(line)
    return "\n".join(parts)


def parse_q53_from_txt() -> dict[int, str]:
    text = TXT_ALL.read_text(encoding="utf-8")
    result: dict[int, str] = {}
    blocks = re.split(r"={10,}\s*\n\s*✅ KẾT THÚC BỘ ĐỀ", text)
    for i, block in enumerate(blocks[:23], start=1):
        m = re.search(
            r"【 CÂU 53 】.*?-\n(  다음을 참고하여[^\n]+)\n\n(  📊[^\n]+(?:\n\n  ┌[\s\S]*?└[^\n]+\n)?(?:\n  ※[^\n]+)?)",
            block,
            re.DOTALL,
        )
        if not m:
            continue
        inst = clean_text(m.group(1))
        body = m.group(2)
        body = re.sub(r"┌[─]+┐[\s\S]*?└[─]+┘", "", body)
        body = re.sub(r"─{10,}[\s\S]*", "", body)
        lines = [clean_text(l) for l in body.splitlines() if clean_text(l)]
        chart_lines = "\n".join(lines)
        result[i] = f"{inst}\n\n{chart_lines}".strip()
    return result


def parse_exam_sections(soup: BeautifulSoup) -> dict[int, dict]:
    sections: dict[int, dict] = {}
    for sec in soup.select("section.exam"):
        sid = sec.get("id", "")
        m = re.match(r"s-(\d+)", sid)
        if not m:
            continue
        n = int(m.group(1))
        q51 = sec.select_one(".q51b .textbox")
        q52 = sec.select_one(".q52b .textbox")
        q53_inst = sec.select_one(".q53b .inst")
        q53_img = sec.select_one(".q53b img")
        q54_inst = sec.select_one(".q54b .inst")
        topic_kr = sec.select_one(".q54b .topic-kr")
        topic_qs = sec.select_one(".q54b .topic-qs")

        bullets = []
        if topic_qs:
            for li in topic_qs.find_all("li"):
                t = clean_text(li.get_text())
                t = re.sub(r"^\(\d+\)\s*", "", t)
                if t:
                    bullets.append(f"∙ {t}")

        topic = clean_text(topic_kr.get_text() if topic_kr else "")
        topic = re.sub(r"^📝\s*", "", topic)

        q54_prompt = clean_text(q54_inst.get_text() if q54_inst else "")
        if topic:
            q54_prompt += f"\n\n{topic}"
        if bullets:
            q54_prompt += "\n" + "\n".join(bullets)

        img_name = ""
        if q53_img and q53_img.get("src"):
            img_name = Path(q53_img["src"]).name

        sections[n] = {
            "q51_prompt": textbox_to_prompt(q51) if q51 else "",
            "q52_prompt": textbox_to_prompt(q52) if q52 else "",
            "q53_inst": clean_text(q53_inst.get_text() if q53_inst else ""),
            "q53_img": img_name,
            "q54_prompt": q54_prompt.strip(),
        }
    return sections


def parse_answer_sections(soup: BeautifulSoup) -> dict[int, dict]:
    sections: dict[int, dict] = {}
    for sec in soup.select("section.exam-ans"):
        sid = sec.get("id", "")
        m = re.match(r"s-(\d+)", sid)
        if not m:
            continue
        n = int(m.group(1))

        def cards(block_sel: str) -> tuple[str, str]:
            block = sec.select_one(block_sel)
            if not block:
                return "", ""
            texts = [first_answer_variant(t.get_text()) for t in block.select(".card-txt")]
            a1 = texts[0] if len(texts) > 0 else ""
            a2 = texts[1] if len(texts) > 1 else ""
            return a1, a2

        a51_1, a51_2 = cards(".b51")
        a52_1, a52_2 = cards(".b52")

        q53_block = sec.select_one(".b53 .essay-content-kr")
        q54_block = sec.select_one(".b54 .essay-content-kr")

        q53_ans = clean_text(q53_block.get_text() if q53_block else Q53_GENERIC_ANSWER)
        q54_ans = clean_text(q54_block.get_text() if q54_block else "")

        sections[n] = {
            "q51_answer": f"㉠ {a51_1}\n㉡ {a51_2}".strip() if a51_1 or a51_2 else "",
            "q52_answer": f"㉠ {a52_1}\n㉡ {a52_2}".strip() if a52_1 or a52_2 else "",
            "q53_answer": q53_ans,
            "q54_answer": q54_ans,
        }
    return sections


def make_question(set_num: int, qtype: int, prompt: str, answer: str, image_url: str | None) -> dict:
    return {
        "id": 900000 + set_num * 100 + qtype,
        "source": "expansion",
        "expansionSet": set_num,
        "topik": 0,
        "type": qtype,
        "timeLimit": 900 if qtype == 53 else 3000 if qtype == 54 else 150,
        "maxScore": 30 if qtype == 53 else 50 if qtype == 54 else 10,
        "prompt": prompt,
        "answer": answer,
        "imageUrl": image_url,
    }


def js_escape(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def main() -> None:
    exam_soup = BeautifulSoup(EXAM_HTML.read_text(encoding="utf-8"), "html.parser")
    ans_soup = BeautifulSoup(ANS_HTML.read_text(encoding="utf-8"), "html.parser")
    exams = parse_exam_sections(exam_soup)
    answers = parse_answer_sections(ans_soup)
    q53_txt = parse_q53_from_txt()

    questions: list[dict] = []
    for n in range(1, 24):
        ex = exams.get(n, {})
        an = answers.get(n, {})
        if not ex:
            print(f"WARN: missing exam section {n}")
            continue

        questions.append(
            make_question(n, 51, ex["q51_prompt"], an.get("q51_answer", ""), None)
        )
        questions.append(
            make_question(n, 52, ex["q52_prompt"], an.get("q52_answer", ""), None)
        )

        q53_prompt = q53_txt.get(n) or ex.get("q53_inst") or ""
        page = IMG_PAGE_BY_SET.get(n, 37 + n)
        image_url = f"/topik_images/expansion/q53_page_{page}.png"
        questions.append(
            make_question(
                n,
                53,
                q53_prompt,
                an.get("q53_answer", Q53_GENERIC_ANSWER),
                image_url,
            )
        )

        q54_ans = an.get("q54_answer", "")
        if q54_ans and not q54_ans.startswith("현대"):
            q54_ans = f"모범 답안:\n{q54_ans}"
        elif not q54_ans:
            q54_ans = "모범 답안: (참고 — AI 채점 기준은 제시문과 논리 구조를 따릅니다.)"

        questions.append(
            make_question(n, 54, ex["q54_prompt"], q54_ans, None)
        )

    # Fix duplicate Q52 set 22 — use set 6's Q52 is different; set 22 duplicates set 2
    # Replace set 22 Q52 prompt with a note if identical to set 2
    q52_by_set = {q["expansionSet"]: q for q in questions if q["type"] == 52}
    if (
        q52_by_set.get(2, {}).get("prompt")
        == q52_by_set.get(22, {}).get("prompt")
    ):
        print("NOTE: Set 22 Q52 duplicates set 2 (same source text).")

    # Write JS
    lines = [
        "/** Đề mở rộng 1–23 — import từ TOPIK_II_23_Bo_De_Hoan_Chinh + Đáp Án Chuẩn */",
        "const base = (set, type, prompt, answer, imageUrl = null) => ({",
        "  id: 900000 + set * 100 + type,",
        "  source: 'expansion',",
        "  expansionSet: set,",
        "  topik: 0,",
        "  type,",
        "  timeLimit: type === 53 ? 900 : type === 54 ? 3000 : 150,",
        "  maxScore: type === 53 ? 30 : type === 54 ? 50 : 10,",
        "  prompt,",
        "  answer,",
        "  imageUrl,",
        "});",
        "",
        "export const expansionQuestionBank = [",
    ]
    for q in questions:
        img = "null" if not q["imageUrl"] else js_escape(q["imageUrl"])
        lines.append(
            f"  base({q['expansionSet']}, {q['type']}, "
            f"{js_escape(q['prompt'])}, {js_escape(q['answer'])}, {img}),"
        )
    lines.append("];")
    lines.append("")
    OUT_JS.write_text("\n".join(lines), encoding="utf-8")
    print(f"Wrote {OUT_JS} ({len(questions)} questions)")

    # Update FE JSON
    bank = json.loads(OUT_JSON_FE.read_text(encoding="utf-8"))
    bank["expansion"] = questions
    bank["updated"] = "2026-07-07"
    bank["sourceNote"] = (
        bank.get("sourceNote", "")
        + " | expansion 1-23 imported from user HTML 2026-07-07"
    ).strip()
    OUT_JSON_FE.write_text(
        json.dumps(bank, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Updated {OUT_JSON_FE}")

    # Update BE JSON if structure matches
    if OUT_JSON_BE.exists():
        be = json.loads(OUT_JSON_BE.read_text(encoding="utf-8"))
        if isinstance(be, dict) and "expansion" in be:
            be["expansion"] = questions
            be["updated"] = "2026-07-07"
            OUT_JSON_BE.write_text(
                json.dumps(be, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            print(f"Updated {OUT_JSON_BE}")
        elif isinstance(be, list):
            # official-only list — append expansion
            combined = [x for x in be if x.get("source") != "expansion"] + questions
            OUT_JSON_BE.write_text(
                json.dumps(combined, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"Updated {OUT_JSON_BE} (list format)")

    # Create expansion image dir placeholder readme
    img_dir = ROOT / "public" / "topik_images" / "expansion"
    img_dir.mkdir(parents=True, exist_ok=True)
    readme = img_dir / "README.txt"
    readme.write_text(
        "Place Q53 chart PNGs here: q53_page_37.png … q53_page_63.png\n"
        "Copy from Cau53_Exam_Images when available.\n",
        encoding="utf-8",
    )
    print(f"Created {img_dir}")


if __name__ == "__main__":
    main()
