# -*- coding: utf-8 -*-
import json, sys
rows = json.load(open(sys.argv[1], encoding="utf-8"))
def show(sec, no):
    r = next(x for x in rows if x["section"] == sec and x["questionNo"] == no)
    c = r["content_json"]
    print(f'--- {sec} q{no} ans={r["correct_ans"]} tier={r["tier"]}')
    print("  prompt :", c.get("prompt", "")[:70])
    print("  passage:", c.get("passage", "")[:110])
    print("  image  :", c.get("image_url"))
    print("  options:", c.get("options"))
    if "transcript" in c:
        t = c["transcript"]
        print("  trans n=", len(t), "first:", t[:2])
for s, n in [("listening","1"),("listening","4"),("listening","21"),("listening","22"),
             ("reading","1"),("reading","9"),("reading","19"),("reading","21")]:
    show(s, n)
