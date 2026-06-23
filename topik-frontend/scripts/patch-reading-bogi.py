"""
patch-reading-bogi.py — Sửa câu <보기> (q39–41) thiếu ㉣ / sai Q trong file reading txt.

Chạy:
    python scripts/patch-reading-bogi.py 83
"""
from __future__ import annotations

import os
import re
import sys

DOWNLOADS = os.environ.get(
    "TOPIK_EXAMS_DIR", r"c:\Users\mrdoa\Downloads\TOPIK_II_Exams"
)

BOGI_Q = "다음 글에서 <보기>의 문장이 들어가기에 가장 알맞은 곳을 고르십시오."

PATCHES: dict[str, dict[int, dict]] = {
    "83": {
        39: {
            "passage_end": " ( ㉣ )",
            "bogi": "이 책은 크게 두 부분으로 구성되어 있는데 먼저 옛 다리들과 그에 얽힌 이야기를 다룬다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        40: {
            "passage_end": " ( ㉣ )",
            "bogi": "장 신경계는 주로 장 내의 근육 운동과 소화액을 조절하여 소회를 촉진하는 일을 한다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        41: {
            "passage_end": " ( ㉣ )",
            "bogi": "이처럼 정밀하면서도 실제와 같은 그림은 외부인이 궁궐에 침입할 목적 으로 사용할 수 있다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
    },
    "102": {
        39: {
            "passage_end": " ( ㉣ )",
            "bogi": "사회적으로도 이들을 위한 재교육의 장이 충분히 마련되어 있지 않다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        40: {
            "passage_end": " ( ㉣ )",
            "bogi": "이에 따라 전국적으로 동일한 시간 체계를 공유하게 되었다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        41: {
            "passage_end": " ( ㉣ )",
            "bogi": "오히려 사대부가 조선의 변화를 주도한 능력주의 원칙의 신봉자들이었음을 역사적 자료를 통해 증명한다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
    },
    "64": {
        39: {
            "passage_end": " ( ㉣ )",
            "bogi": "그래서 백성들이 구하기 힘든 매우 귀하고 값비싼 재료로 만들어졌다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        40: {
            "passage_end": " ( ㉣ )",
            "bogi": "그들은 못생기고 혐오감을 준다는 이유만으로 외면당한 동물들을 대중에게 알리는 활동을 한다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        41: {
            "passage_end": " ( ㉣ )",
            "bogi": "일곱 편의 단편에는 오해와 잘못으로 떨어진 사람들에 대한 이야기가 담겨 있다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        46: {
            "passage_end": "",
            "bogi": "",
            "q": "( )에 들어갈 내용으로 가장 알맞은 것을 고르십시오.",
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
    },
    "91": {
        39: {
            "passage_end": " ( ㉣ )",
            "bogi": "그런데 심판이 아무리 위치 선정을 잘해도 필연적으로 선수의 몸에 가려서 볼 수 없는 사각지대가 생긴다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        40: {
            "passage_end": " ( ㉣ )",
            "bogi": "그 증거로 지중해 전역에서 발견되고 있는 소금 퇴적층을 들 수 있다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        41: {
            "passage_end": " ( ㉣ )",
            "bogi": "이런 상소문들을 저자는 왕을 향한 깨우침의 죽비 소리로 비유하고 있다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
    },
    "96": {
        39: {
            "passage_end": " ( ㉣ )",
            "bogi": "섬유질이 마르는 과정에서 자연스레 틀의 자국이 남았는데, 이를 위터 마크라고 불렀다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        40: {
            "passage_replace": (
                "40. 콘크리트를 만들기 위해서는 모래나 자갈 같은 골재가 필요하다. ( ㉠ ) "
                "천연 모래와 자갈이 풍부한 바다에서는 질 좋은 골재를 쉽게 얻을 수 있다. ( ㉡ ) "
                "그러다 보니 과다한 골재 채취로 바닷속 지형이 바뀌는 경우가 많다. ( ㉢ ) "
                "이에 채취량을 제한하고 해당 구역의 복구를 의무화하는 등의 규제를 엄격히 시행하여 "
                "해양 생태계를 보호하려는 노력이 이어지고 있다. ( ㉣ )"
            ),
            "bogi": "해양 생물이 서식하던 바닷속 모래 언덕이나 골짜기가 파괴되는 것이다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
        41: {
            "passage_replace": (
                "41. 수많은 독자의 사랑을 받아 온 소설 『이상한 편의점』이 해외에서도 호평받고 있다. ( ㉠ ) "
                "이 책은 우연한 기회로 한 편의점에서 일하게 된 노숙자 상철과 편의점을 찾은 손님들의 일화를 담고 있다. ( ㉡ ) "
                "이 책이 한국을 넘어 해외 독자들의 마음까지 울리는 이유가 바로 이 따뜻함에 있다. ( ㉢ ) "
                "지친 삶에 응원이 필요한 모든 이에게 이 책을 권한다. ( ㉣ )"
            ),
            "bogi": "상철은 저마다의 사연을 안고 편의점을 찾은 손님들에게 따스한 위로를 건넨다.",
            "q": BOGI_Q,
            "options": ["㉠", "㉡", "㉢", "㉣"],
        },
    },
}


def fix_block(block: list[str], spec: dict) -> list[str]:
    fields = {"P": [], "Q": "", "options": ["", "", "", ""], "ANS": "", "IMG": ""}
    mode = None
    for ln in block:
        s = ln.strip()
        if s.startswith("P:"):
            mode = "P"
            rest = s[2:].strip()
            if rest:
                fields["P"].append(rest)
            continue
        if s.startswith("Q:"):
            mode = None
            fields["Q"] = s[2:].strip()
            continue
        if s.startswith("ANS:"):
            mode = None
            fields["ANS"] = s[4:].strip()
            continue
        if s.startswith("IMG:"):
            mode = None
            fields["IMG"] = s[4:].strip()
            continue
        if s == "<보기>":
            mode = "BOGI"
            continue
        m = re.match(r"^([1-4])\)\s*(.*)$", s)
        if m:
            mode = None
            fields["options"][int(m.group(1)) - 1] = m.group(2).strip()
            continue
        if mode == "P":
            fields["P"].append(ln.rstrip())
        elif mode == "BOGI":
            fields.setdefault("_bogi", []).append(ln.rstrip())

    if fields["P"]:
        if spec.get("passage_replace"):
            fields["P"] = [spec["passage_replace"]]
        else:
            p0 = fields["P"][0]
            if spec.get("passage_end"):
                if p0.rstrip().endswith("("):
                    fields["P"][0] = p0.rstrip()[:-1].rstrip() + spec["passage_end"]
                elif not p0.rstrip().endswith("㉣ )"):
                    fields["P"][0] = p0.rstrip() + spec["passage_end"]

    out = [block[0], "P:"]
    out.extend(fields["P"])
    if spec.get("bogi"):
        out.append("<보기>")
        out.append(spec["bogi"])
    out.append(f"Q: {spec['q']}")
    for i, opt in enumerate(spec["options"], 1):
        out.append(f"{i}) {opt}")
    out.append(f"ANS: {fields['ANS']}")
    if fields["IMG"]:
        out.append(f"IMG: {fields['IMG']}")
    out.append("")
    return out


def patch_file(path: str, ky: str) -> int:
    specs = PATCHES[ky]
    content = open(path, encoding="utf-8").read()
    lines = content.splitlines()
    starts = [i for i, ln in enumerate(lines) if re.match(r"^\[\d+\]\s*$", ln.strip())]
    out: list[str] = []
    if starts:
        out.extend(lines[: starts[0]])
        if out and out[-1]:
            out.append("")
    fixed = 0
    for idx, start in enumerate(starts):
        end = starts[idx + 1] if idx + 1 < len(starts) else len(lines)
        block = lines[start:end]
        qn = int(re.match(r"^\[(\d+)\]", block[0].strip()).group(1))
        if qn in specs:
            block = fix_block(block, specs[qn])
            fixed += 1
        out.extend(block)
    text = "\n".join(out).rstrip() + "\n"
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return fixed


def main() -> None:
    keys = sys.argv[1:] if len(sys.argv) > 1 else list(PATCHES)
    folder_map = {
        "64": "Ki64_2020",
        "83": "Ki83_2022",
        "91": "Ki91_2023",
        "96": "Ki96_2025",
        "102": "Ki102_2025",
    }
    for ky in keys:
        if ky not in PATCHES:
            continue
        paths = [
            os.path.join(DOWNLOADS, "FILEREAD", "fulltxtdoc", f"topik2-{ky}-reading.txt"),
            os.path.join(DOWNLOADS, folder_map.get(ky, f"Ki{ky}"), f"topik2-{ky}-reading.txt"),
        ]
        for p in paths:
            if os.path.isfile(p):
                n = patch_file(p, ky)
                print(f"Patched {n} blocks in {p}")


if __name__ == "__main__":
    main()
