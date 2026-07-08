import os, sys
import fitz

BASE = os.path.join(os.path.expanduser("~"), "Downloads", "TOPIK_I_Exams")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_paper_png")
os.makedirs(OUT, exist_ok=True)

# args: folder filename tag [dpi] [halves]
folder = sys.argv[1]
fname = sys.argv[2]
tag = sys.argv[3]
dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 200
halves = (len(sys.argv) > 5 and sys.argv[5] == "halves")

doc = fitz.open(os.path.join(BASE, folder, fname))
mat = fitz.Matrix(dpi / 72, dpi / 72)
print("pages:", len(doc))
for i in range(len(doc)):
    page = doc[i]
    if halves:
        rect = page.rect
        midy = rect.y0 + rect.height / 2
        top = fitz.Rect(rect.x0, rect.y0, rect.x1, midy + rect.height * 0.03)
        bot = fitz.Rect(rect.x0, midy - rect.height * 0.03, rect.x1, rect.y1)
        for name, clip in (("a", top), ("b", bot)):
            page.get_pixmap(matrix=mat, clip=clip).save(os.path.join(OUT, f"{tag}_p{i+1}{name}.png"))
    else:
        page.get_pixmap(matrix=mat).save(os.path.join(OUT, f"{tag}_p{i+1}.png"))
print("done", tag)
