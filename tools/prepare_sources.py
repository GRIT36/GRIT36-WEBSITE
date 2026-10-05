"""Render referenced original lecture pages; requires pypdfium2 and pypdf.
Usage: python tools/prepare_sources.py /path/to/source-manifest.json
The manifest must have sources with key (S1...S6) and path.
The original files are only read; images preserve each complete page.
"""
from pathlib import Path
import json, sys
import pypdfium2 as pdfium
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
topics = sum([json.loads((ROOT/f'content/s{n}.json').read_text(encoding='utf-8')) for n in range(1,7)], [])
selected = {}
for t in topics:
    for s,p,title in t['slides']:
        selected.setdefault((s,p), title)
records = []
out = ROOT/'mba/assets/slides'
out.mkdir(parents=True, exist_ok=True)
for source in manifest['sources']:
    if source['key'] not in [f'S{n}' for n in range(1,7)]: continue
    s = int(source['key'][1:])
    doc = pdfium.PdfDocument(source['path'])
    reader = PdfReader(source['path'])
    for (sn,p),title in sorted(selected.items()):
        if sn != s: continue
        ident = f's{s}-{p:03d}'
        page = doc[p-1]
        pil = page.render(scale=2000/page.get_width()).to_pil().convert('RGB')
        width,height = pil.size
        pil.save(out/f'{ident}.webp', 'WEBP', quality=91, method=5)
        pil.thumbnail((520,520))
        pil.save(out/f'{ident}-thumb.webp', 'WEBP', quality=83, method=5)
        raw = reader.pages[p-1].extract_text() or ''
        raw = ''.join(c for c in raw if c in '\n\t' or ord(c)>=32)
        records.append(dict(id=ident,session=s,page=p,title=title,width=width,height=height,text=raw,source=Path(source['path']).name))
        page.close()
    doc.close()
    print(f'S{s}: {sum(r["session"]==s for r in records)} original pages rendered', flush=True)
(ROOT/'content/slides.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Total: {len(records)} complete original pages')
