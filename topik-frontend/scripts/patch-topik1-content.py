"""Apply vision-transcribed passage/question/options to TOPIK I bank JSON.

Reads scripts/_content/topik1-{ky}-content.json and overwrites the
content_json.passage / content_json.question / content_json.options
fields of the matching bank rows. Answer keys (correct_ans) are NOT
touched here - those are handled by patch-topik1-answers.py.

Listening picture-choice questions (options == []) are skipped so the
existing image options stay intact.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
FRONT = os.path.dirname(HERE)
CONTENT_DIR = os.path.join(HERE, "_content")
BANK_DIRS = [
    os.path.join(FRONT, "data"),
    os.path.join(FRONT, "public", "data"),
]


def load_content(ky: str) -> dict:
    path = os.path.join(CONTENT_DIR, f"topik1-{ky}-content.json")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def patch_one(path: str, content: dict) -> tuple[int, int]:
    with open(path, encoding="utf-8") as f:
        rows = json.load(f)
    listen = content.get("listening", {})
    read = content.get("reading", {})
    nl = nr = 0
    for row in rows:
        sec = row.get("section")
        qno = str(row.get("questionNo"))
        cj = row.get("content_json") or {}
        if sec == "listening" and qno in listen:
            opts = listen[qno].get("options") or []
            if opts:
                cj["options"] = opts
                if "passage" in listen[qno]:
                    cj["passage"] = listen[qno]["passage"]
                nl += 1
        elif sec == "reading" and qno in read:
            item = read[qno]
            if "passage" in item:
                cj["passage"] = item["passage"]
            if "question" in item:
                cj["question"] = item["question"]
            opts = item.get("options") or []
            if opts:
                cj["options"] = opts
            row["content_json"] = cj
            nr += 1
        row["content_json"] = cj
    with open(path, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    return nl, nr


def main(kys: list[str]) -> None:
    for ky in kys:
        content = load_content(ky)
        for d in BANK_DIRS:
            path = os.path.join(d, f"topik1-{ky}-bank.json")
            if not os.path.exists(path):
                print(f"  skip (missing): {path}")
                continue
            nl, nr = patch_one(path, content)
            print(f"  patched {os.path.relpath(path, FRONT)}: listening={nl} reading={nr}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        # default: every content file present
        args = [
            os.path.basename(f)[len("topik1-"):-len("-content.json")]
            for f in os.listdir(CONTENT_DIR)
            if f.startswith("topik1-") and f.endswith("-content.json")
        ]
    print(f"Patching content for: {', '.join(args)}")
    main(args)
