import sys
import fitz

path = sys.argv[1]
out_path = sys.argv[2] if len(sys.argv) > 2 else path.replace('.pdf', '-extract.txt')
doc = fitz.open(path)
with open(out_path, 'w', encoding='utf-8') as f:
    for i in range(doc.page_count):
        f.write(f'=== PAGE {i + 1} ===\n')
        f.write(doc[i].get_text())
        f.write('\n\n')
print(f'pages={doc.page_count} -> {out_path}')
