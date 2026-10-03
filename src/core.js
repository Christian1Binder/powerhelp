/* Pure search, validation and generation; no DOM or networking. */
const PHCore = (()=>{
 const q = s=>"'"+String(s).replace(/'/g,"''")+"'";
 const name = s=>String(s??'').replace(/^\$/,'');
 const validName = s=>/^[A-Za-z_][A-Za-z0-9_]*$/.test(name(s));
 const clone = o=>JSON.parse(JSON.stringify(o));
 let counter=0;
 function makeNode(id,values={},out,children=[]) {
  const d=PH_BY_ID[id]; if(!d) throw new Error('Unbekannter Baustein: '+id);
  return {uid:'s'+Date.now().toString(36)+(++counter),def:id,values:Object.fromEntries(d.fields.map(f=>[f.key,values[f.key]===undefined?clone(f.value):clone(values[f.key])])),out:out===undefined?(d.out||''):out,children:children.map(s=>makeNode(s.def,s.values,s.out,s.children))};
 }
 const isExpr = v=>v!==null&&typeof v==='object'&&typeof v.expr==='string';
 const valueText = v=>isExpr(v)?v.expr:String(v??'');
 function val(f,v){
  if(isExpr(v))return '('+v.expr.trim()+')';
  if(f.type==='expr')return String(v??'').trim();
  if(f.type==='var')return '$'+name(v);
  if(f.type==='number')return String(Number(v));
  if(f.type==='bool')return v?'$true':'$false';
  if(f.type==='list')return String(v).split(',').map(x=>x.trim()).filter(Boolean).map(q).join(', ');
  if(f.key==='Delimiter') return v==='TAB'?"\"`t\"":q(String(v).trim());
  return q(v);
 }
 function field(d,n,key) { const f=d.fields.find(f=>f.key===key);return val(f,n.values[key]); }
 const indent = (s,n=1)=>s.split('\n').map(l=>'    '.repeat(n)+l).join('\n');
 function command(n,d){
  const v=n.values, get=k=>field(d,n,k), out=n.out?'$'+name(n.out):'';
  let code;
  if(d.kind==='ise')return PHCatalog.emit(n,d,q);
  if(d.kind==='regex') code=`@(foreach ($PHDatei in Get-ChildItem -LiteralPath ${get('folder')} -Filter ${get('filter')} -File${v.recurse?' -Recurse':''} -ErrorAction Stop) {\n    $PHText = [string](Get-Content -LiteralPath $PHDatei.FullName -Raw -Encoding ${get('encoding')} -ErrorAction Stop)\n    foreach ($PHMatch in [regex]::Matches($PHText, ${get('pattern')})) {\n        $PHGruppe = $PHMatch.Groups[${/^\d+$/.test(v.group)?Number(v.group):q(v.group)}]\n        if ($PHGruppe.Success) {\n            [pscustomobject]@{ Datei = $PHDatei.FullName; Wert = $PHGruppe.Value; Position = $PHMatch.Index }\n        }\n    }\n})`;
  else if(d.kind==='lines') code=`@(foreach ($PHDatei in Get-ChildItem -LiteralPath ${get('folder')} -Filter ${get('filter')} -File -ErrorAction Stop) {\n    $PHZeilen = @(Get-Content -LiteralPath $PHDatei.FullName -Encoding ${get('encoding')} -ErrorAction Stop)\n    foreach ($PHNummer in @(${String(v.lines).split(',').map(x=>Number(x.trim())).join(', ')})) {\n        if ($PHNummer -le $PHZeilen.Count) {\n            [pscustomobject]@{ Datei = $PHDatei.FullName; Zeile = $PHNummer; Wert = $PHZeilen[$PHNummer - 1] }\n        }\n    }\n})`;
  else if(d.kind==='eventfilter') code=`Get-WinEvent -FilterHashtable @{ LogName = ${get('log')}; Level = ${v.level}; StartTime = (Get-Date).AddDays(-${get('days')}) } -ErrorAction Stop`;
  else if(d.kind==='remoting') code=`Invoke-Command -ComputerName ${get('ComputerName')} -ScriptBlock {\n${indent(v.ScriptBlock)}\n} -ErrorAction Stop`;
  else if(d.kind==='localpassword')return `$PHKennwort = Read-Host 'Neues Kennwort' -AsSecureString\nSet-LocalUser -Name ${get('Name')} -Password $PHKennwort -ErrorAction Stop`;
  else if(d.kind==='adpassword')return `$PHKennwort = Read-Host 'Neues Domänenkennwort' -AsSecureString\nSet-ADAccountPassword -Identity ${get('Identity')} -NewPassword $PHKennwort -Reset -ErrorAction Stop`;
  else if(d.kind==='adnewuser')return `$PHKennwort = Read-Host 'Kennwort für das neue Domänenkonto' -AsSecureString\nNew-ADUser -Name ${get('Name')} -SamAccountName ${get('SamAccountName')} -UserPrincipalName ${get('UserPrincipalName')} -Path ${get('Path')} -AccountPassword $PHKennwort -Enabled ${v.Enabled?'$true':'$false'} -ErrorAction Stop`;
  else if(d.kind==='where')code=`${get('input')} | Where-Object { ${get('condition')} }`;
  else if(d.kind==='replace')code=`${get('input')} -replace ${get('pattern')}, ${get('replacement')}`;
  else if(d.kind==='split')code=`${get('input')} -split ${get('pattern')}`;
  else if(d.kind==='variable')return `${out} = ${get('value')}`;
  else if(d.kind==='custom')return v.code;
  else if(d.kind==='newuser')return `$PHKennwort = Read-Host ${q('Kennwort für das neue Konto')} -AsSecureString\nNew-LocalUser -Name ${get('Name')} -FullName ${get('FullName')}${v.Description?' -Description '+get('Description'):''} -Password $PHKennwort${v.PasswordNeverExpires?' -PasswordNeverExpires':''} -ErrorAction Stop | Out-Null`;
  else if(d.kind==='robocopy')return `& robocopy.exe ${get('source')} ${get('target')} ${v.mirror?'/MIR':v.recurse?'/E':''} /COPY:DAT /DCOPY:DAT /R:${get('retries')} /W:${get('wait')}\nif ($LASTEXITCODE -ge 8) { throw "Robocopy fehlgeschlagen: Exitcode $LASTEXITCODE" }`;
  else if(d.kind==='aclgrant')return `$PHAcl = Get-Acl -LiteralPath ${get('path')} -ErrorAction Stop\n$PHRegel = New-Object System.Security.AccessControl.FileSystemAccessRule(${get('identity')}, ${get('rights')}, ${q(v.inherit?'ContainerInherit, ObjectInherit':'None')}, 'None', 'Allow')\n$PHAcl.AddAccessRule($PHRegel)\nSet-Acl -LiteralPath ${get('path')} -AclObject $PHAcl -ErrorAction Stop`;
  else if(d.kind==='tasknew')return `$PHAktion = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ${q('-NoProfile -File "'+String(v.script).replace(/"/g,'')+'"')}\n$PHTrigger = New-ScheduledTaskTrigger -Daily -At ${get('time')}\n$PHIdentitaet = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name\n$PHPrincipal = New-ScheduledTaskPrincipal -UserId $PHIdentitaet -LogonType Interactive -RunLevel Limited\nRegister-ScheduledTask -TaskName ${get('name')} -Action $PHAktion -Trigger $PHTrigger -Principal $PHPrincipal -ErrorAction Stop | Out-Null`;
  else {
   let args=[];
   for(const f of d.fields){
    if(f.key===d.inputField)continue;
    const value=v[f.key];
    if(f.optional && (value===''||value===undefined))continue;
    if(f.type==='bool'){ if(value)args.push('-'+f.key); }
    else args.push('-'+f.key+' '+val(f,value));
   }
   code=(d.inputField?get(d.inputField)+' | ':'')+d.command+(args.length?' '+args.join(' '):'')+' -ErrorAction Stop';
   if(d.id==='mkdir')code+=' | Out-Null';
  }
  return out?out+' = '+code:code;
 }
 function allNodes(steps){return steps.flatMap(n=>[n,...allNodes(n.children||[])]);}
 function compile(project){
  const errors=[],warnings=[],modules=new Set(), defined=new Set(['true','false','null','_','PSItem','PSCmdlet','WhatIfPreference','ErrorActionPreference','LASTEXITCODE','args','input','PSBoundParameters','PSScriptRoot','PSCommandPath']);
  const settings=project.settings||{};
  const parameters=String(settings.params||'').trim();
  for(const match of parameters.matchAll(/\$([A-Za-z_][\w]*)/g))defined.add(match[1]);
  const has= (set,v)=>[...set].some(x=>x.toLowerCase()===name(v).toLowerCase());
  function analyze(nodes,scope,conditional=false){
   for(const n of nodes){
    const d=Object.hasOwn(PH_BY_ID,n.def)?PH_BY_ID[n.def]:null; if(!d){errors.push({uid:n.uid,text:'Unbekannter Baustein.'});continue;}
    if(d.module&&d.module!=='Microsoft.PowerShell.Core')modules.add(d.module);
    if(d.kind==='ise'){const check=PHCatalog.issues(n,d,scope);for(const text of check.errors)errors.push({uid:n.uid,text});for(const text of check.warnings)warnings.push({uid:n.uid,text});}
    for(const f of d.fields){
     const v=n.values[f.key],txt=valueText(v);
     if(f.type!=='bool'&&!f.optional&&!f.allowEmpty&&!txt.trim())errors.push({uid:n.uid,text:`${d.title}: „${f.label}“ fehlt.`});
     if(!['expr'].includes(f.type)&&!isExpr(v)&&/[\r\n\u0000]/.test(txt))errors.push({uid:n.uid,text:`${d.title}: Zeilenumbrüche sind in „${f.label}“ nicht erlaubt. Für Code den Ausdruck-Modus verwenden.`});
     if(f.type==='var'&&(!f.optional||txt)&&!validName(v))errors.push({uid:n.uid,text:`${d.title}: Ungültiger Variablenname in „${f.label}“.`});
     if(f.type==='number'&&!isExpr(v)&&(!Number.isFinite(Number(v))||!Number.isInteger(Number(v))||Number(v)<(f.min??0)||Number(v)>(f.max??1000000)))errors.push({uid:n.uid,text:`${d.title}: „${f.label}“ liegt außerhalb des erlaubten Bereichs.`});
     if(f.type==='enum'&&(!f.optional||txt)&&!f.options.includes(v))errors.push({uid:n.uid,text:`${d.title}: Ungültige Auswahl für „${f.label}“.`});
     if(isExpr(v)||f.type==='expr'){
      for(const m of txt.matchAll(/\$([A-Za-z_][\w]*)(?=[^:\w]|$)/g))if(!has(scope,m[1])&&!/^(env|global|script|local)$/i.test(m[1]))warnings.push({uid:n.uid,text:`${d.title}: $${m[1]} ist hier nicht als Ausgabe oder Parameter bekannt. Prüfe den Ausdruck.`});
     }
    }
    for(const key of d.uses||[]) if(validName(n.values[key])&&!has(scope,n.values[key]))errors.push({uid:n.uid,text:`${d.title}: $${name(n.values[key])} wird vorher nicht erzeugt. Füge einen Quellschritt davor ein oder nutze eine vorhandene Variable.`});
    if(d.out && !(d.kind==='ise'&&!n.out) && !validName(n.out))errors.push({uid:n.uid,text:`${d.title}: Ein gültiger Ausgabename ist erforderlich.`});
    if(n.out&&/^PH/i.test(name(n.out)))errors.push({uid:n.uid,text:'Variablennamen mit PH am Anfang sind für interne Hilfsvariablen reserviert.'});
    if(['copy','move'].includes(d.id)&&!isExpr(n.values.LiteralPath)&&!isExpr(n.values.Destination)&&String(n.values.LiteralPath).toLowerCase()===String(n.values.Destination).toLowerCase())errors.push({uid:n.uid,text:`${d.title}: Quelle und Ziel sind identisch.`});
    if(d.id==='files'&&n.values.File&&n.values.Directory)errors.push({uid:n.uid,text:'Dateisuche: „Nur Dateien“ und „Nur Ordner“ schließen sich aus.'});
    if(d.kind==='lines'&&!/^\s*[1-9]\d{0,5}(?:\s*,\s*[1-9]\d{0,5})*\s*$/.test(n.values.lines))errors.push({uid:n.uid,text:'Zeilenextraktion: Positive Zeilennummern wie 4, 9 angeben.'});
    if(d.kind==='regex'&&!/^(?:0|[1-9]\d{0,3}|[A-Za-z_][A-Za-z0-9_]*)$/.test(n.values.group))errors.push({uid:n.uid,text:'Regex: Gruppe muss eine Zahl oder ein Gruppenname sein.'});
    if(d.kind==='tasknew'&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(n.values.time))errors.push({uid:n.uid,text:'Aufgabenplanung: Uhrzeit im Format HH:mm zwischen 00:00 und 23:59 angeben.'});
    if(d.kind==='tasknew'&&/["\r\n]/.test(n.values.script))errors.push({uid:n.uid,text:'Aufgabenplanung: Skriptpfad enthält ein ungültiges Zeichen.'});
    if(d.id==='regwrite'&&['DWord','QWord'].includes(n.values.PropertyType)&&!isExpr(n.values.Value)&&!/^\d+$/.test(n.values.Value))errors.push({uid:n.uid,text:'Registry: Für DWord/QWord einen nicht negativen ganzzahligen Wert angeben.'});
    if(d.risk)warnings.push({uid:n.uid,text:d.title+': '+d.risk});
    if(d.kind==='robocopy'&&n.values.mirror)warnings.push({uid:n.uid,text:'Robocopy /MIR entfernt zusätzliche Dateien im Ziel. Quell- und Zielpfad sorgfältig prüfen.'});
    if(d.kind==='custom')warnings.push({uid:n.uid,text:'Eigener Code: Syntax und Seiteneffekte lassen sich im Browser nicht vollständig prüfen. Die Einstellung „Wirkung“ bestimmt den Vorschau-Schutz.'});
    if(d.container){
     const inner=new Set(scope);
     if(d.kind==='foreach') {inner.add(name(n.values.item));if(/^PH/i.test(name(n.values.item)))errors.push({uid:n.uid,text:'Schleifenvariable darf nicht mit PH beginnen.'});}
     if(d.kind==='function'){
      if(!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(n.values.name))errors.push({uid:n.uid,text:'Ungültiger Funktionsname.'});
      for(const m of String(n.values.params).matchAll(/\$([A-Za-z_][\w]*)/g))inner.add(m[1]);
     }
     analyze(n.children||[],inner,true);
     if(!n.children?.length)warnings.push({uid:n.uid,text:d.title+': Der Block enthält noch keine Schritte.'});
    }
    if(n.out){if(has(scope,n.out))warnings.push({uid:n.uid,text:`$${name(n.out)} wird erneut zugewiesen und ersetzt das vorherige Ergebnis.`});scope.add(name(n.out));}
   }
  }
  const ordered=allNodes(project.steps||[]);
  for(let i=0;i<ordered.length;i++){
   const n=ordered[i];
   if(n.def==='addmember'&&!isExpr(n.values.Group)){
    const group=String(n.values.Group).toLowerCase();
    if(ordered.slice(i+1).some(l=>l.def==='newgroup'&&!isExpr(l.values.Name)&&String(l.values.Name).toLowerCase()===group))errors.push({uid:n.uid,text:'Gruppenmitgliedschaft: Die Gruppe wird erst später angelegt. Den Gruppen-Schritt davor verschieben.'});
   }
  }
  analyze(project.steps||[],defined);
  function emit(nodes){return nodes.map(n=>{
   const d=PH_BY_ID[n.def];if(!d)return '# Unbekannter Baustein';
   let body;
   if(d.container){
    const children=emit(n.children||[])||'# Hier Schritte hinzufügen';
    if(d.kind==='foreach')body=`foreach ($${name(n.values.item)} in $${name(n.values.input)}) {\n${indent(children)}\n}`;
    else if(d.kind==='if')body=`if (${n.values.condition}) {\n${indent(children)}\n}`;
    else if(d.kind==='try')body=`try {\n${indent(children)}\n} catch {\n    Write-Error $_\n    throw\n}`;
    else if(d.kind==='function')body=`function ${n.values.name} {\n    [CmdletBinding(SupportsShouldProcess = $true)]\n    param(${n.values.params||''})\n${indent(children)}\n}`;
   }else body=command(n,d);
   const mutates=(d.kind==='ise'&&n.values._effect!=='Nur lesen')||d.mutates||(['custom','remoting'].includes(d.kind)&&n.values.effect==='Änderung');
   if(mutates){
    const targetKey=['LiteralPath','Path','Name','Identity','source','path','name','Group','FilePath','DisplayName'].find(k=>n.values[k]!==undefined);
    const target=targetKey?field(d,n,targetKey):q(d.kind==='ise'?d.command:'Eigener Code');
    body=`if ($PSCmdlet.ShouldProcess([string](${target}), ${q(d.title)})) {\n${indent(body)}\n}`;
   }
   return (settings.comments!==false?'# '+d.title+'\n':'')+body;
  }).join('\n\n');}
  const header=['#requires -Version 5.1'];
  if(modules.size)header.push('#requires -Modules '+[...modules].map(q).join(', '));
  header.push('# Erstellt mit PowerHelp '+PH_VERSION+' · Windows PowerShell 5.1','[CmdletBinding(SupportsShouldProcess = $true)]','param('+parameters+')',"$ErrorActionPreference = 'Stop'");
  if(settings.preview)header.push('$WhatIfPreference = $true # Änderungen mit ShouldProcess werden übersprungen.');
  const body=emit(project.steps||[]);
  let code=header.join('\n')+'\n\n'+body+'\n';
  if(settings.transcript){code=header.join('\n')+'\n\n'+`Start-Transcript -LiteralPath ${q(settings.logPath||'C:\\Daten\\PowerHelp.log')} -Append -ErrorAction Stop\ntry {\n${indent(body)}\n} finally {\n    Stop-Transcript | Out-Null\n}\n`;warnings.push({uid:null,text:'Transkript: Der Protokollpfad muss erreichbar sein; das Protokoll wird auch im Vorschau-Modus geschrieben.'});}
  if(modules.has('Microsoft.PowerShell.LocalAccounts'))warnings.push({uid:null,text:'Lokale Konten: LocalAccounts ist auf Domänencontrollern und in 32-Bit-PowerShell auf einem 64-Bit-System nicht verfügbar.'});
  if(modules.has('ActiveDirectory'))warnings.push({uid:null,text:'Active Directory erfordert das bereits vorhandene AD-Modul und eine erreichbare Domäne. PowerHelp installiert nichts.'});
  if(allNodes(project.steps||[]).some(n=>PH_BY_ID[n.def]?.mutates)&&!settings.preview)warnings.push({uid:null,text:'Echtbetrieb: Dieses Skript enthält Änderungen. Vorschau-Modus aktivieren oder das gespeicherte Skript mit -WhatIf starten.'});
  return {code,errors,warnings:[...new Map(warnings.map(w=>[w.uid+'|'+w.text,w])).values()],modules:[...modules],count:allNodes(project.steps||[]).length};
 }
 function normalize(s){return String(s).toLowerCase().replace(/ä/g,'a').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
 const stop = new Set('ich möchte mochte will kann kannst bitte ein eine einen einem einer der die das den dem des und oder mit von im in am an auf fur für zum zu als alle alles skript powershell machen erstellen alte alten alter neue neuen'.split(' '));
 const synonyms={user:['benutzer','konto','konten'],benutzer:['user','konto','konten'],konten:['benutzer','konto','user'],gruppe:['gruppen','mitglied'],gruppen:['gruppe','members'],löschen:['entfernen','bereinigen','aufräumen'],loschen:['entfernen','bereinigen','aufraumen'],finden:['suchen','auflisten'],suchen:['finden','lesen'],lesen:['auslesen','einlesen'],extrahieren:['regex','auslesen','daten'],auslesen:['lesen','extrahieren'],sichern:['backup','kopieren','sicherung'],backup:['sichern','sicherung','robocopy'],berechtigung:['rechte','ntfs','zugriff'],berechtigungen:['rechte','ntfs','zugriff'],rechte:['berechtigung','ntfs','zugriff'],ordner:['verzeichnis','directory'],verzeichnis:['ordner','directory'],regex:['regular','ausdruck','extrahieren'],speicher:['ram','kapazität','platte'],dienst:['service','dienste'],dienste:['dienst','service'],freigabe:['smb','share'],datum:['date','zeit'],fehler:['error','ereignisse','exception'],zeitplan:['aufgabenplanung','task','scheduler']};
 function distance(a,b){if(Math.abs(a.length-b.length)>2)return 9;let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=next;}return prev[b.length];}
 const searchCache=new WeakMap();
 function search(query,items=PH_COMMANDS,category='Alle'){
  const normalized=normalize(query).trim(),tokens=normalized.split(/[^a-z0-9]+/).filter(t=>t.length>1&&!stop.has(t));
  return items.filter(d=>category==='Alle'||d.category===category).map(d=>{
   let cached=searchCache.get(d);if(!cached){const head=normalize(d.title+' '+(d.command||'')),corpus=normalize(head+' '+d.description+' '+(d.keywords||'')+' '+(d.category||'')+' '+(d.fields||[]).map(f=>f.label+' '+f.key).join(' '));cached={head,corpus,words:normalize(head+' '+(d.category||'')+' '+(d.kind==='ise'?'':d.keywords||'')).split(/[^a-z0-9]+/)};searchCache.set(d,cached);}const {head,corpus,words}=cached;
   let score=0,hits=0;
   if(normalized&&head.includes(normalized))score+=50;
   for(const t of tokens){const alternatives=[t,...(synonyms[t]||[]).map(normalize)];let weight=0;
    for(const term of alternatives){if(head.split(/[^a-z0-9]+/).some(w=>w===term||(term.length>=5&&w.includes(term))))weight=Math.max(weight,term===t?12:8);else if(term.length>=5?corpus.includes(term):corpus.split(/[^a-z0-9]+/).includes(term))weight=Math.max(weight,term===t?6:4);}
    if(!weight&&t.length>3&&words.some(w=>w.length>3&&distance(t,w)<=(t.length>=7?2:1)))weight=3;
    if(weight){hits++;score+=weight;}
   }
   return {item:d,score,hits};
  }).filter(r=>!tokens.length||r.hits>=Math.max(1,Math.ceil(tokens.length*.5))).sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title,'de'));
 }
 function validateProject(data){
  if(!data||data.format!=='powerhelp-project'||data.version!==2||!Array.isArray(data.steps))throw Error('Keine unterstützte PowerHelp-Projektdatei (Version 2).');
  let count=0;
  function check(nodes,depth=0){if(depth>12)throw Error('Zu viele verschachtelte Blöcke.');return nodes.map(n=>{if(++count>500)throw Error('Maximal 500 Schritte pro Projekt.');const d=Object.hasOwn(PH_BY_ID,n.def)?PH_BY_ID[n.def]:null;if(!d||typeof n.values!=='object'||n.values===null)throw Error('Ungültiger Baustein.');for(const f of d.fields){const v=n.values[f.key];if(v!==undefined && !(typeof v==='string'||typeof v==='boolean'||typeof v==='number'||isExpr(v)))throw Error('Ungültiger Feldwert.');if(valueText(v).length>200000)throw Error('Ein Feld ist zu groß.');}if(n.children!==undefined&&!Array.isArray(n.children))throw Error('Ungültiger Block.');return makeNode(n.def,n.values,typeof n.out==='string'?n.out:undefined,check(n.children||[],depth+1));});}
  const catalog=data.catalog?PHCatalog.validate(data.catalog):null;PHCatalog.install(catalog||PH_BUILTIN_CATALOG);
  const steps=check(data.steps);const s=data.settings||{};
  return {format:'powerhelp-project',version:2,...(catalog?{catalog}:{}),title:String(data.title||'Mein Skript').slice(0,150),steps,settings:{preview:s.preview!==false,comments:s.comments!==false,params:String(s.params||'').slice(0,10000),transcript:!!s.transcript,logPath:String(s.logPath||'C:\\Daten\\PowerHelp.log').slice(0,2000)}};
 }
 return {q,name,validName,clone,makeNode,allNodes,compile,search,normalize,isExpr,valueText,validateProject};
})();
