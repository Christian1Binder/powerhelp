#!/usr/bin/env python3
"""Build the offline deliverable with Python's standard library; no dependencies."""
from pathlib import Path
import json
root = Path(__file__).resolve().parent
shell = (root / 'src/shell.html').read_text(encoding='utf-8')
css = (root / 'src/style.css').read_text(encoding='utf-8')
js = '\n'.join((root / ('src/' + name)).read_text(encoding='utf-8') for name in ['catalog.js','builtin.js','ise.js','core.js','app.js'])
js = js.replace('/*__EXPORTER__*/', json.dumps((root / 'tools/Export-PowerHelpCatalog.ps1').read_text(encoding='utf-8'), ensure_ascii=True))
if '</script' in js.lower():
    raise SystemExit('Inline script contains an HTML closing tag')
(root / 'index.html').write_text(shell.replace('/*__STYLE__*/', css).replace('/*__SCRIPT__*/', js), encoding='utf-8')
print('Built index.html: self-contained HTML/CSS/JS')
