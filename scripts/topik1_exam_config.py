"""
Shared config for TOPIK I import pipeline (30 nghe + 40 đọc).
"""
from __future__ import annotations

import os

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
]

FREE_TIERS = {"60", "91"}

LISTEN_COUNT = 30
READ_COUNT = 40
SEG_LABELS = [str(i) for i in range(1, LISTEN_COUNT + 1)]

DOWNLOADS_BASE = os.environ.get(
    "TOPIK1_EXAMS_DIR",
    os.path.join(os.path.expanduser("~"), "Downloads", "TOPIK_I_Exams"),
)

LISTEN_PROMPTS: dict[int, str] = {
    **{n: "다음을 듣고 <보기>와 같이 물음에 맞는 대답을 고르십시오." for n in range(1, 5)},
    **{n: "다음을 듣고 <보기>와 같이 이어지는 말을 고르십시오." for n in range(5, 7)},
    **{n: "여기는 어디입니까? <보기>와 같이 알맞은 것을 고르십시오." for n in range(7, 11)},
    **{n: "다음은 무엇에 대해 말하고 있습니까? <보기>와 같이 알맞은 것을 고르십시오." for n in range(11, 15)},
    **{n: "다음 대화를 듣고 알맞은 그림을 고르십시오." for n in range(15, 17)},
    **{n: "다음을 듣고 <보기>와 같이 대화 내용과 같은 것을 고르십시오." for n in range(17, 22)},
    **{n: "다음을 듣고 여자의 중심 생각을 고르십시오." for n in range(22, 25)},
    **{n: "다음을 듣고 물음에 답하십시오." for n in range(25, 31)},
}

READING_INSTRUCTIONS: dict[int, str] = {
    **{n: "( )에 들어갈 가장 알맞은 것을 고르십시오." for n in range(1, 15)},
    **{n: "다음을 읽고 알맞은 것을 고르십시오." for n in range(15, 19)},
    **{n: "다음을 읽고 중심 내용을 고르십시오." for n in range(19, 23)},
    **{n: "다음을 읽고 내용과 같은 것을 고르십시오." for n in range(23, 27)},
    **{n: "다음을 읽고 내용과 다른 것을 고르십시오." for n in range(27, 31)},
    **{n: "다음을 읽고 순서에 맞게 배열한 것을 고르십시오." for n in range(31, 35)},
    **{n: "다음을 읽고 ( )에 들어갈 말로 알맞은 것을 고르십시오." for n in range(35, 41)},
}


def exam_id(ky: str) -> str:
    return f"topik1-{ky}"


def tier_for(ky: str) -> str:
    return "free" if ky in FREE_TIERS else "paid"
