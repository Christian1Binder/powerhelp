#!/usr/bin/env python3
"""Pack exported factual command metadata into the offline JavaScript catalog."""
import json, sys
from pathlib import Path
source=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
common=set('Verbose Debug ErrorAction WarningAction InformationAction ErrorVariable WarningVariable InformationVariable OutVariable OutBuffer PipelineVariable WhatIf Confirm'.split())
strings=[]; indexes={}
def intern(value):
    if value not in indexes: indexes[value]=len(strings);strings.append(value)
    return indexes[value]
records=[]
for c in source['commands']:
    params=[p for p in c['parameters'] if p['name'] not in common]
    positions={p['name']:i for i,p in enumerate(params)}
    records.append([intern(c['name']),intern(c['module']),[intern(x) for x in c['outputTypes']],[[intern(p['name']),intern(p['type']),[intern(x) for x in p.get('aliases',[])],[intern(x) for x in p.get('validateSet',[])]] for p in params],[[intern(s['name']),int(s['default']),[[positions[p['name']],int(p['mandatory'])+2*int(p['pipeline'])+4*int(p['byProperty'])] for p in s['parameters'] if p['name'] in positions]] for s in c['sets']]])
js='/* Factual Get-Command metadata. Regenerate using tools/pack_catalog.py. */\nconst PH_BUILTIN_CATALOG = (()=>{\nconst s='+json.dumps(strings,separators=(',',':'))+';\nconst records='+json.dumps(records,separators=(',',':'))+';\nreturn {format:"powerhelp-catalog",version:1,powershell:'+json.dumps(source['powershell'])+',origin:"Windows PowerShell 5.1 on Windows Server 2025; available Windows modules",commands:records.map(c=>({name:s[c[0]],module:s[c[1]],outputTypes:c[2].map(i=>s[i]),parameters:c[3].map(p=>({name:s[p[0]],type:s[p[1]],aliases:p[2].map(i=>s[i]),validateSet:p[3].map(i=>s[i])})),sets:c[4].map(t=>({name:s[t[0]],default:!!t[1],parameters:t[2].map(p=>({name:s[c[3][p[0]][0]],mandatory:!!(p[1]&1),pipeline:!!(p[1]&2),byProperty:!!(p[1]&4)}))}))}))};\n})();\n'
Path(sys.argv[2] if len(sys.argv)>2 else 'src/builtin.js').write_text(js,encoding='utf-8')
print(len(records),'commands;',len(js),'bytes packed')
