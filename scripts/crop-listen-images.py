"""
crop-listen-images.py — Cắt 3 ảnh câu Nghe 1-3 (câu hình) từ đề Nghe PDF.

Quy tac (file nghe cac ky giong nhau):
  - Trang co de muc "[1~3] 다음을 듣고 알맞은 그림" chua cau 1 (tren) + cau 2 (duoi)
  - Trang ke tiep chua cau 3 (tren cung, truoc de muc [4~8])
  - Chi giu so cau + 4 hinh; bo de muc & footer; tu trim vien trang (union bbox).

Chay:
  python scripts/crop-listen-images.py <ky> "<thu_muc_Ki>"
Vi du:
  python scripts/crop-listen-images.py 60 "C:/Users/mrdoa/Downloads/TOPIK_II_Exams/Ki60_2019"
"""
import os
import re
import sys
import glob
import fitz  # PyMuPDF

EXAM = sys.argv[1] if len(sys.argv) > 1 else "60"
SRC = sys.argv[2] if len(sys.argv) > 2 else None
if not SRC or not os.path.isdir(SRC):
    raise SystemExit(f"Khong thay thu muc: {SRC}")

FRONTEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(FRONTEND, "public", "topik_images")
os.makedirs(OUT_DIR, exist_ok=True)
EXAM_ID = f"topik2-{EXAM}"
DPI = 300
PAD = 4  # diem padding quanh noi dung


def find_pdf():
    pats = ["*Listening-Test-Paper*.pdf", "*istening*.pdf", "*.pdf"]
    for p in pats:
        hits = glob.glob(os.path.join(SRC, p))
        if hits:
            return hits[0]
    raise SystemExit("Khong thay PDF nghe.")


def search_first_page(doc, *texts):
    """Tra ve (page_index, rect) cho text dau tien tim thay."""
    for i in range(len(doc)):
        for t in texts:
            rs = doc[i].search_for(t)
            if rs:
                return i, rs[0]
    return None, None


def scan_pages_with_images(doc, min_images=4):
    """Tim trang co nhieu anh nhat (PDF scan khong co text layer)."""
    scored = []
    for i in range(min(6, len(doc))):
        imgs = page_images(doc[i])
        if len(imgs) >= min_images:
            scored.append((len(imgs), i))
    scored.sort(reverse=True)
    return scored


def crop_fullpage_listen(doc, p12_idx: int):
    """PDF scan 1 anh/trang — cat theo ty le (q1/q2 tren trang p12, q3 trang sau)."""
    p12 = doc[p12_idx]
    p3 = doc[p12_idx + 1] if p12_idx + 1 < len(doc) else p12
    w, h = p12.rect.width, p12.rect.height
    q1 = fitz.Rect(0, h * 0.10, w, h * 0.46)
    q2 = fitz.Rect(0, h * 0.46, w, h * 0.90)
    w3, h3 = p3.rect.width, p3.rect.height
    q3 = fitz.Rect(0, h3 * 0.08, w3, h3 * 0.52)
    save_crop(p12, q1, f"{EXAM_ID}-listen-q1.png")
    save_crop(p12, q2, f"{EXAM_ID}-listen-q2.png")
    save_crop(p3, q3, f"{EXAM_ID}-listen-q3.png")
    print("[done] fullpage scan crop")


def crop_scan_listen(doc, p12_idx: int):
    """Cat q1-2 tu trang nhieu anh, q3 tu trang ke tiep (fallback scan)."""
    p12 = doc[p12_idx]
    if len(page_images(p12)) <= 2:
        print(f"[scan] 1 anh/trang — dung crop ty le")
        crop_fullpage_listen(doc, p12_idx)
        return
    p3 = doc[p12_idx + 1] if p12_idx + 1 < len(doc) else p12
    imgs12 = page_images(p12)
    if len(imgs12) < 8:
        raise SystemExit(f"Khong du anh tren trang {p12_idx+1}: {len(imgs12)}")
    mid_y = p12.rect.height * 0.48
    q1_imgs = [r for r in imgs12 if r.y0 < mid_y]
    q2_imgs = [r for r in imgs12 if r.y0 >= mid_y]
    q1 = union(q1_imgs)
    q2 = union(q2_imgs)
    imgs3 = page_images(p3)
    q3_imgs = sorted(imgs3, key=lambda r: r.y0)[:8]
    q3 = union(q3_imgs)
    if not (q1 and q2 and q3):
        raise SystemExit(f"Scan crop fail: q1={q1} q2={q2} q3={q3}")
    save_crop(p12, q1, f"{EXAM_ID}-listen-q1.png")
    save_crop(p12, q2, f"{EXAM_ID}-listen-q2.png")
    save_crop(p3, q3, f"{EXAM_ID}-listen-q3.png")
    print("[done] scan fallback")


def search_on_page(page, *texts, bottom_most=False):
    found = []
    for t in texts:
        found += page.search_for(t)
    if not found:
        return None
    if bottom_most:
        return max(found, key=lambda r: r.y0)
    return min(found, key=lambda r: r.y0)


def label_rect(page, n):
    """bbox cua nhan so cau 'n.' o le trai."""
    cands = []
    for w in page.get_text("words"):
        txt = w[4].strip()
        if re.fullmatch(rf"{n}[.\uFF0E]?", txt):
            r = fitz.Rect(w[:4])
            if r.x0 < page.rect.width * 0.28 and r.y0 < page.rect.height * 0.92:
                cands.append(r)
    cands.sort(key=lambda r: r.y0)
    return cands[0] if cands else None


def page_images(page):
    out = []
    try:
        for im in page.get_image_info():
            out.append(fitz.Rect(im["bbox"]))
    except Exception:
        pass
    return sorted(out, key=lambda r: r.y0)


def union(rects):
    rects = [r for r in rects if r]
    if not rects:
        return None
    r = fitz.Rect(rects[0])
    for x in rects[1:]:
        r |= x
    return r


def save_crop(page, rect, name):
    rect = fitz.Rect(rect.x0 - PAD, rect.y0 - PAD, rect.x1 + PAD, rect.y1 + PAD)
    rect &= page.rect
    pix = page.get_pixmap(clip=rect, dpi=DPI)
    out = os.path.join(OUT_DIR, name)
    pix.save(out)
    print(f"  [save] {name}  ({rect.width:.0f}x{rect.height:.0f}pt)")


def main():
    pdf = find_pdf()
    print(f"[pdf] {pdf}")
    doc = fitz.open(pdf)

    p12_idx, instr = search_first_page(doc, "다음을 듣고 알맞은 그림", "알맞은 그림")
    if p12_idx is None:
        scored = scan_pages_with_images(doc, min_images=2)
        if scored:
            p12_idx = scored[0][1]
            print(f"[scan] fallback — trang {p12_idx + 1} ({scored[0][0]} anh)")
            crop_scan_listen(doc, p12_idx)
            return
        # PDF scan hoàn toàn không có text: dùng trang 2 (index 1)
        p12_idx = 1 if len(doc) > 2 else 0
        print(f"[scan] fallback cứng — trang {p12_idx + 1}")
        crop_scan_listen(doc, p12_idx)
        return
    print(f"[page] cau 1-2 o trang index {p12_idx} (in: {p12_idx+1})")
    p12 = doc[p12_idx]
    p3 = doc[p12_idx + 1]

    l1 = label_rect(p12, 1)
    l2 = label_rect(p12, 2)
    if not (l1 and l2):
        print(f"[scan] thieu nhan so cau (l1={l1} l2={l2}), dung crop anh")
        crop_scan_listen(doc, p12_idx)
        return
    print(f"[bound] l1.y={l1.y0:.0f} l2.y={l2.y0:.0f}")

    imgs12 = page_images(p12)
    q1_imgs = [r for r in imgs12 if l1.y0 - 5 <= r.y0 < l2.y0 - 5]
    q2_imgs = [r for r in imgs12 if r.y0 >= l2.y0 - 5]
    q1 = union([l1] + q1_imgs)
    q2 = union([l2] + q2_imgs)

    l3 = label_rect(p3, 3)
    nxt = search_on_page(p3, "다음 대화를 잘 듣고", "이어질 수 있는 말")
    if not (l3 and nxt):
        print(f"[scan] thieu moc cau 3 (l3={l3} nxt={nxt}), dung crop anh trang {p12_idx+2}")
        crop_scan_listen(doc, p12_idx)
        return
    print(f"[bound] l3.y={l3.y0:.0f} next[4~8].y={nxt.y0:.0f}")
    imgs3 = page_images(p3)
    q3_imgs = [r for r in imgs3 if l3.y0 - 5 <= r.y0 < nxt.y0]
    q3 = union([l3] + q3_imgs)

    if not (q1 and q2 and q3):
        raise SystemExit(f"Khong dung duoc vung: q1={q1} q2={q2} q3={q3}")

    save_crop(p12, q1, f"{EXAM_ID}-listen-q1.png")
    save_crop(p12, q2, f"{EXAM_ID}-listen-q2.png")
    save_crop(p3, q3, f"{EXAM_ID}-listen-q3.png")
    print("[done]")


if __name__ == "__main__":
    main()
