"""
crop-topik1-listen-images.py — Cắt ảnh câu Nghe 15–16 (chọn hình).

TOPIK I: câu 1–4 là trắc nghiệm chữ; câu 15–16 mới có 4 hình.

Chạy:
  python scripts/crop-topik1-listen-images.py <ky> "<thu_muc_Ki>"
"""
from __future__ import annotations

import glob
import os
import re
import sys

import fitz

EXAM = sys.argv[1] if len(sys.argv) > 1 else "60"
SRC = sys.argv[2] if len(sys.argv) > 2 else None
if not SRC or not os.path.isdir(SRC):
    raise SystemExit(f"Khong thay thu muc: {SRC}")

FRONTEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(FRONTEND, "public", "topik_images")
os.makedirs(OUT_DIR, exist_ok=True)
EXAM_ID = f"topik1-{EXAM}"
DPI = 300
PAD = 6


def find_pdf() -> str:
    pats = [
        "*Listening*Test*.pdf",
        "*Listening-Test*.pdf",
        "*Papers*.pdf",
        "*papers*.pdf",
        "*.pdf",
    ]
    for p in pats:
        hits = glob.glob(os.path.join(SRC, p))
        if hits:
            return hits[0]
    raise SystemExit("Khong thay PDF nghe.")


def page_images(page) -> list[fitz.Rect]:
    out: list[fitz.Rect] = []
    try:
        for im in page.get_image_info():
            out.append(fitz.Rect(im["bbox"]))
    except Exception:
        pass
    return sorted(out, key=lambda r: r.y0)


def union(rects: list[fitz.Rect | None]) -> fitz.Rect | None:
    rects = [r for r in rects if r]
    if not rects:
        return None
    r = fitz.Rect(rects[0])
    for x in rects[1:]:
        r |= x
    return r


def label_rect(page, n: int) -> fitz.Rect | None:
    cands = []
    for w in page.get_text("words"):
        txt = w[4].strip()
        if re.fullmatch(rf"{n}[.\uFF0E]?", txt):
            r = fitz.Rect(w[:4])
            if r.x0 < page.rect.width * 0.35:
                cands.append(r)
    cands.sort(key=lambda r: r.y0)
    return cands[0] if cands else None


def save_crop(page, rect: fitz.Rect | None, name: str) -> bool:
    if not rect:
        return False
    rect = fitz.Rect(rect.x0 - PAD, rect.y0 - PAD, rect.x1 + PAD, rect.y1 + PAD) & page.rect
    if rect.is_empty or rect.width < 20:
        return False
    pix = page.get_pixmap(clip=rect, dpi=DPI)
    pix.save(os.path.join(OUT_DIR, name))
    print(f"  [crop] {name} ({rect.width:.0f}x{rect.height:.0f}pt)")
    return True


def find_q15_page(doc: fitz.Document) -> int | None:
    for i in range(len(doc)):
        t = doc[i].get_text()
        if "15" in t and ("그림" in t or "15～16" in t or "15~16" in t):
            if "알맞은" in t or "그림" in t:
                return i
    for i in range(len(doc)):
        t = doc[i].get_text()
        if re.search(r"15\s*[.\uFF0E]", t) and "16" in t:
            if len(page_images(doc[i])) >= 4:
                return i
    scored = [(len(page_images(doc[i])), i) for i in range(min(12, len(doc)))]
    scored.sort(reverse=True)
    for n, i in scored:
        if n >= 6:
            return i
    # PDF scan 1 ảnh/trang — thường q15-16 ở trang 4–5 (index 3–4)
    for i in (3, 4, 2, 5, 6):
        if i < len(doc) and page_images(doc[i]):
            return i
    return None


def crop_scan_pages(doc: fitz.Document, p_idx: int) -> tuple[bool, bool]:
    """Mỗi trang 1 ảnh full: q15 trang p_idx, q16 trang p_idx+1."""
    ok15 = ok16 = False
    if p_idx < len(doc):
        ok15 = save_crop(doc[p_idx], crop_ratio(doc[p_idx], 0.06, 0.94), f"{EXAM_ID}-listen-q15.png")
    if p_idx + 1 < len(doc):
        ok16 = save_crop(
            doc[p_idx + 1], crop_ratio(doc[p_idx + 1], 0.06, 0.94), f"{EXAM_ID}-listen-q16.png"
        )
    return ok15, ok16


def crop_ratio(page, y0_frac: float, y1_frac: float) -> fitz.Rect:
    w, h = page.rect.width, page.rect.height
    return fitz.Rect(0, h * y0_frac, w, h * y1_frac)


def crop_on_page(page, n: int, next_y: float | None = None) -> fitz.Rect | None:
    lr = label_rect(page, n)
    imgs = page_images(page)
    if lr and len(imgs) >= 4:
        below = [r for r in imgs if r.y0 >= lr.y0 - 4]
        if next_y is not None:
            below = [r for r in below if r.y0 < next_y]
        if below:
            return union([lr] + below[:10])
    if len(imgs) >= 8:
        mid = page.rect.height * 0.5
        if n == 15:
            region = [r for r in imgs if r.y0 < mid]
        else:
            region = [r for r in imgs if r.y0 >= mid]
        return union(region[:10])
    if len(imgs) == 1:
        h = page.rect.height
        if n == 15:
            return crop_ratio(page, 0.12, 0.52)
        return crop_ratio(page, 0.52, 0.92)
    return None


def main() -> None:
    pdf = find_pdf()
    print(f"[pdf] {os.path.basename(pdf)}")
    doc = fitz.open(pdf)
    p_idx = find_q15_page(doc)
    if p_idx is None:
        print("[crop] Khong tim thay trang cau 15-16 — bo qua")
        return
    print(f"[page] cau 15-16 o trang {p_idx + 1}")
    page = doc[p_idx]
    l16 = label_rect(page, 16)
    q15 = crop_on_page(page, 15, l16.y0 if l16 else None)
    q16 = crop_on_page(page, 16)
    ok15 = save_crop(page, q15, f"{EXAM_ID}-listen-q15.png")
    ok16 = save_crop(page, q16, f"{EXAM_ID}-listen-q16.png")
    if not (ok15 and ok16) and p_idx + 1 < len(doc):
        page2 = doc[p_idx + 1]
        if not ok15:
            ok15 = save_crop(page2, crop_on_page(page2, 15), f"{EXAM_ID}-listen-q15.png")
        if not ok16:
            ok16 = save_crop(page2, crop_on_page(page2, 16), f"{EXAM_ID}-listen-q16.png")
    if not (ok15 and ok16) and len(page_images(page)) <= 2:
        ok15, ok16 = crop_scan_pages(doc, p_idx)
    print(f"[crop] done q15={ok15} q16={ok16}")


if __name__ == "__main__":
    main()
