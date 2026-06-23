"""
patch-listening-options.py — Gán options Nghe còn thiếu từ OCR/transcript đã xác minh.

Chạy:
    python scripts/patch-listening-options.py 64 91 96 102
"""
from __future__ import annotations

import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
PUBLIC = os.path.join(ROOT, "public", "data")

LISTEN_PATCHES: dict[str, dict[str, list[str]]] = {
    "64": {
        "7": [
            "공사을 하면 깨끗해지겠어요",
            "공사는 내일부터 시작한대요",
            "공사를 해서 시끄러울 거예요",
            "공사가 빨리 끝나면 좋겠어요",
        ],
        "10": [
            "검사 예약을 한다",
            "진료 시간을 확인한다",
            "옷을 갈아입으러 간다",
            "탈의실 위치를 물어보다",
        ],
        "27": [
            "남성 육아의 필요성을 일깨우기 위해",
            "남성 육아를 위한 제도를 설명하기 위해",
            "남성 육아의 문제점에 대해 지적하기 위해",
            "남성 육아에 대한 인식 변화를 말하기 위해",
        ],
        "30": [
            "이 서비스는 무료로 이용이 가능하다",
            "이 서비스는 아직 이용자가 많지 않다",
            "이 서비스는 책에 대한 해설도 제공한다",
            "이 서비스는 동영상 기능을 추가할 예정이다",
        ],
        "40": [
            "각국의 법이 달라 문화재의 영구적 환수가 어렵다",
            "1970년대부터 문화재 환수가 활발해지기 시작했다",
            "문화재 환수는 주로 기증하는 방식으로 이루어진다",
            "문화재 환수와 관련된 국제 협약은 존재하지 않는다",
        ],
    },
    "91": {
        "5": [
            "그럼 거기로 다시 가 볼까요?",
            "아직 한 곳밖에 안 가 봤는데요",
            "그럼 이 소파를 사는 게 어때요?",
            "집 근처에 있는 소파 가게에서 살게요",
        ],
    },
    "96": {
        "5": [
            "그럼 일요일로 예약할게",
            "아직 약속을 하지도 않았어",
            "이미 도자기 수업을 시작했어",
            "우선 오후 두 시에 만나기로 했어",
        ],
        "6": [
            "아니야 그건 내가 준비할게",
            "그러네. 얼른 마시고 들어가자",
            "아니야 전시장이 멀지는 않아",
            "그러네. 먼저 음료수부터 사자",
        ],
        "8": [
            "너무 짧게 줄인 것 같아요",
            "수선을 잘해 주셔서 감사해요",
            "혹시 모양이 많이 이상해질까요?",
            "이 바지로 한 치수 큰 거 없어요?",
        ],
        "33": [
            "정신 건강을 위협하는 환경",
            "뇌 성장과 발달의 결정적 시기",
            "불편한 피부 자극에 대한 신경학적 설명",
            "축각 방어 증상을 완화하기 위한 치료법",
        ],
        "43": [
            "소금을 생산하는 과정",
            "소금을 관리하는 방법",
            "소금이 지닌 경제적 가치",
            "소금이 건강에 미치는 영향",
        ],
    },
    "102": {
        "6": [
            "그럼 관심이 없는 거네요",
            "아르바이트 경험이 다양해요",
            "그럼 사무실에 한번 가 보세요",
            "좋은 곳을 구했다니 다행이에요",
        ],
        "33": [
            "탑평리 석탑이 국보로 지정된 이유",
            "탑평리 석탑이 훼손된 역사적 배경",
            "탑평리 석탑을 복원하는 과정",
            "탑평리 석탑을 발굴한 시기",
        ],
        "43": [
            "반구대 암각화에 표현된 내용",
            "반구대 암각화를 보존한 방식",
            "반구대 암각화를 제작한 연대",
            "반구대 암각화가 발견된 과정",
        ],
    },
}


def patch_bank(ky: str) -> int:
    patches = LISTEN_PATCHES.get(ky, {})
    if not patches:
        return 0
    path = os.path.join(DATA, f"topik2-{ky}-bank.json")
    rows = json.load(open(path, encoding="utf-8"))
    fixed = 0
    for row in rows:
        if row.get("section") != "listening":
            continue
        qno = str(row.get("questionNo", ""))
        if qno not in patches:
            continue
        opts = patches[qno]
        cj = row.setdefault("content_json", {})
        cur = cj.get("options") or ["", "", "", ""]
        if all(str(o).strip() for o in cur):
            continue
        cj["options"] = opts
        fixed += 1
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
        f.write("\n")
    pub = os.path.join(PUBLIC, f"topik2-{ky}-bank.json")
    if os.path.isfile(pub):
        with open(pub, "w", encoding="utf-8") as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
            f.write("\n")
    print(f"Ki{ky}: patched {fixed} listening questions")
    return fixed


def main() -> None:
    keys = sys.argv[1:] if len(sys.argv) > 1 else list(LISTEN_PATCHES)
    total = sum(patch_bank(ky) for ky in keys)
    print(f"Total patched: {total}")


if __name__ == "__main__":
    main()
