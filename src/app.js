/* Browser UI. All text derived from projects is inserted with textContent. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const dom=(tag,attrs={},text)=>{const el=document.createElement(tag);for(const [k,v]of Object.entries(attrs)){if(k==='class')el.className=v;else if(k==='type')el.type=v;else el.setAttribute(k,v);}if(text!==undefined)el.textContent=text;return el;};
const initialHtml='<!doctype html>\n'+document.documentElement.outerHTML;
let project={format:'powerhelp-project',version:2,title:'Dateibestand dokumentieren',settings:{preview:true,comments:true,params:'',transcript:false,logPath:'C:\\Daten\\PowerHelp.log'},steps:PH_TEMPLATES.find(t=>t.id==='file-report').steps.map(s=>PHCore.makeNode(s.def,s.values,s.out,s.children))};
let moduleName='Alle', searchTimer;
let tab='commands',category='Alle',query='',limit=30,insertUid=null,selectedUid=null,openIds=new Set(),dragUid=null;
let lastResult,saveTimer,toastTimer,worker=null,regexRows=[],undoStack=[],redoStack=[];
try{const raw=localStorage.getItem('powerhelp-v2');if(raw)project=PHCore.validateProject(JSON.parse(raw));}catch{$('autosave').textContent='Gespeichertes Projekt nicht geladen';}
const snapshot=()=>JSON.stringify(project);
function checkpoint(){undoStack.push(snapshot());if(undoStack.length>40)undoStack.shift();redoStack=[];}
function changed(){renderPreview();clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem('powerhelp-v2',snapshot());$('autosave').textContent='Lokal gespeichert';}catch{$('autosave').textContent='Speicherung gesperrt · Projekt exportieren';}},200);}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function findNode(uid,nodes=project.steps){for(const n of nodes){if(n.uid===uid)return n;const inner=findNode(uid,n.children||[]);if(inner)return inner;}return null;}
function findList(uid,nodes=project.steps){if(nodes.some(n=>n.uid===uid))return nodes;for(const n of nodes){const found=findList(uid,n.children||[]);if(found)return found;}return null;}
function targetList(){const n=insertUid?findNode(insertUid):null;if(n&&PH_BY_ID[n.def].container)return n.children;insertUid=null;return project.steps;}
function uniqueOutput(out){const names=PHCore.allNodes(project.steps).map(n=>n.out.toLowerCase());let result=out,i=2;while(result&&names.includes(result.toLowerCase()))result=out+(i++);return result;}
function addCommand(id,values={}){checkpoint();const d=PH_BY_ID[id];const n=PHCore.makeNode(id,values,uniqueOutput(d.out||''));
 const available=PHCore.allNodes(project.steps).filter(s=>s.out).map(s=>s.out);
 if(insertUid){const parent=findNode(insertUid);if(parent?.def==='foreach')available.push(parent.values.item);}
 if(available.length)for(const f of d.fields)if((d.uses||[]).includes(f.key)&&!Object.hasOwn(values,f.key))n.values[f.key]=available.at(-1);
 targetList().push(n);selectedUid=n.uid;openIds.add(n.uid);renderSteps();changed();toast('Baustein hinzugefügt');}
function applyTemplate(t,replace){if(replace&&project.steps.length&&!confirm('Diesen Ablauf als neues Projekt laden? Das aktuelle Projekt vorher speichern, wenn du es behalten möchtest.'))return;checkpoint();const nodes=t.steps.map(s=>PHCore.makeNode(s.def,s.values,s.out,s.children));if(replace){project.steps=nodes;project.title=t.title;insertUid=null;openIds.clear();}else targetList().push(...nodes);selectedUid=nodes[0]?.uid;openIds.add(selectedUid);renderAll();changed();toast(replace?'Ablauf geladen':'Ablauf angehängt');}
function renderLibrary(){
 const root=$('results');root.replaceChildren();const items=tab==='commands'?PH_COMMANDS:tab==='ise'?PHCatalog.entries.filter(d=>moduleName==='Alle'||d.module===moduleName):PH_TEMPLATES;
 const matches=PHCore.search(query,items,tab==='commands'?category:'Alle');
 $('resultcount').textContent=`${matches.length} ${tab==='commands'?'Bausteine':tab==='ise'?'Befehle':'Abläufe'}${query?' für „'+query+'“':''}`;
 for(const {item:d}of matches.slice(0,limit)){
  const card=dom('article',{class:'result'});card.append(dom('h3',{},d.title));if(d.command)card.append(dom('code',{},d.command));card.append(dom('p',{},d.description));
  const buttons=dom('div',{class:'buttons'});
  if(tab!=='templates'){const add=dom('button',{class:'primary'},'Hinzufügen');add.onclick=()=>addCommand(d.id);buttons.append(add);if(d.mutates||d.kind==='ise'&&PHCatalog.inferEffect(d.command)!=='Nur lesen')buttons.append(dom('span',{class:'badge change'},'Änderung'));if(d.module)buttons.append(dom('span',{class:'badge module'},d.module));}
  else{const load=dom('button',{class:'primary'},'Als neues Projekt');load.onclick=()=>applyTemplate(d,true);const append=dom('button',{},'Anhängen');append.onclick=()=>applyTemplate(d,false);buttons.append(load,append);}
  card.append(buttons);root.append(card);
 }
 if(matches.length>limit){const more=dom('button',{},'Weitere Ergebnisse anzeigen');more.onclick=()=>{limit+=30;renderLibrary();};root.append(more);}
 if(!matches.length){root.append(dom('div',{class:'empty'},'Keine Treffer. Versuche einen kürzeren Begriff oder eine andere Kategorie.'));}
 if(query&&tab!=='templates'){const found=PHCore.search(query,PH_TEMPLATES);if(found.length){const b=dom('button',{},`${found.length} passende fertige Abläufe anzeigen`);b.onclick=()=>setTab('templates');root.prepend(b);}}
 $('commandsTab').setAttribute('aria-selected',String(tab==='commands'));$('templatesTab').setAttribute('aria-selected',String(tab==='templates'));$('category').hidden=tab==='ise';$('category').disabled=tab==='templates';$('iseTab').setAttribute('aria-selected',String(tab==='ise'));$('moduleFilter').hidden=tab!=='ise';
}
function setTab(value){tab=value;limit=30;renderLibrary();}
function refreshModules(){const select=$('moduleSelect');select.replaceChildren(dom('option',{value:'Alle'},'Alle Module'));for(const m of [...new Set(PHCatalog.entries.map(d=>d.module))].sort())select.append(dom('option',{value:m},m));moduleName='Alle';}
function renderSteps(){
 const root=$('steps');root.replaceChildren();
 function draw(nodes,prefix=''){
  const list=dom('div');nodes.forEach((n,index)=>{
   const d=PH_BY_ID[n.def],number=prefix+(index+1),details=dom('details',{class:'step'+(n.uid===selectedUid?' selected':''),id:n.uid});details.open=openIds.has(n.uid);
   details.addEventListener('toggle',()=>{if(details.open)openIds.add(n.uid);else openIds.delete(n.uid);});
   const summary=dom('summary');summary.append(dom('span',{class:'stepnum'},number));const label=dom('span',{class:'steplabel'});label.append(dom('strong',{},d.title),dom('code',{},d.command+(n.out?' → $'+n.out:'')));summary.append(label);
   const actions=dom('span',{class:'step-actions'});
   const action=(text,description,handler,disabled=false)=>{const b=dom('button',{type:'button','aria-label':description},text);b.disabled=disabled;b.onclick=e=>{e.preventDefault();e.stopPropagation();handler();};actions.append(b);};
   action('↑',d.title+' nach oben',()=>{checkpoint();[nodes[index-1],nodes[index]]=[nodes[index],nodes[index-1]];renderSteps();changed();},index===0);
   action('↓',d.title+' nach unten',()=>{checkpoint();[nodes[index],nodes[index+1]]=[nodes[index+1],nodes[index]];renderSteps();changed();},index===nodes.length-1);
   action('⧉',d.title+' duplizieren',()=>{checkpoint();const copy=PHCore.makeNode(n.def,n.values,uniqueOutput(n.out),n.children);nodes.splice(index+1,0,copy);openIds.add(copy.uid);renderSteps();changed();});
   action('×',d.title+' entfernen',()=>{checkpoint();nodes.splice(index,1);if(insertUid===n.uid)insertUid=null;renderSteps();changed();});
   summary.append(actions);details.append(summary);summary.draggable=true;summary.addEventListener('dragstart',e=>{dragUid=n.uid;e.dataTransfer.setData('text/plain',n.uid);});
   summary.addEventListener('dragover',e=>{if(dragUid&&findList(dragUid)===nodes){e.preventDefault();details.classList.add('dragover');}});summary.addEventListener('dragleave',()=>details.classList.remove('dragover'));
   summary.addEventListener('drop',e=>{e.preventDefault();details.classList.remove('dragover');if(!dragUid||dragUid===n.uid||findList(dragUid)!==nodes)return;checkpoint();const from=nodes.findIndex(s=>s.uid===dragUid),to=nodes.findIndex(s=>s.uid===n.uid);const [moved]=nodes.splice(from,1);nodes.splice(to,0,moved);dragUid=null;renderSteps();changed();});
   const body=dom('div',{class:'step-body'});body.append(dom('p',{class:'description'},d.description));const fields=dom('div',{class:'fields'});
   if(d.kind==='ise')drawIseFields(n,d,body,fields);else for(const f of d.fields)fields.append(drawField(n,d,f));body.append(fields);
   if(d.out){const field=dom('div',{class:'field outfield'}),id=n.uid+'-out';field.append(dom('label',{class:'fieldlabel',for:id},d.kind==='ise'?'Ausgabevariable (optional, ohne $)':'Ausgabevariable (ohne $)'));const input=dom('input',{id,type:'text'});input.value=n.out;input.addEventListener('focus',checkpoint,{once:true});input.oninput=()=>{n.out=input.value;changed();};field.append(input);body.append(field);}
   if(d.container){const tools=dom('div',{class:'block-tools'}),b=dom('button',{},'In diesen Block einfügen');b.onclick=()=>{insertUid=n.uid;selectedUid=n.uid;openIds.add(n.uid);renderSteps();$('search').focus();};tools.append(b);body.append(tools);const children=dom('div',{class:'children'});if(n.children.length)children.append(draw(n.children,number+'.'));else children.append(dom('div',{class:'empty'},'Hier erscheinen die Schritte innerhalb dieses Blocks.'));body.append(children);}
   const issue=dom('div',{id:n.uid+'-error',class:'step-error'});issue.hidden=true;body.append(issue);details.append(body);list.append(details);
  });return list;
 }
 if(project.steps.length)root.append(draw(project.steps));else{const empty=dom('div',{class:'empty'});empty.append(dom('h3',{},'Dein nächstes Skript beginnt hier'),dom('p',{},'Suche links nach einer Aufgabe, füge Bausteine hinzu oder lade einen fertigen Ablauf.'));const b=dom('button',{class:'primary'},'Fertige Abläufe anzeigen');b.onclick=()=>setTab('templates');empty.append(b);root.append(empty);}
 renderSuggestions();
 const target=$('insertTarget');target.hidden=!insertUid;target.replaceChildren();if(insertUid){const n=findNode(insertUid);target.append(dom('span',{},'Einfügen in: '+(n?PH_BY_ID[n.def].title:'Hauptablauf')));const b=dom('button',{},'Im Hauptablauf einfügen');b.onclick=()=>{insertUid=null;renderSteps();};target.append(b);}
}
function drawField(n,d,f){
 const root=dom('div',{class:'field'+(f.type==='expr'?' wide':'')}),id=n.uid+'-'+f.key;
 if(f.type==='bool'&&!PHCore.isExpr(n.values[f.key])){const label=dom('label',{class:'check',for:id}),input=dom('input',{id,type:'checkbox'});input.checked=!!n.values[f.key];input.onchange=()=>{checkpoint();n.values[f.key]=input.checked;changed();};label.append(input,document.createTextNode(f.label));root.append(label);if(d.kind==='ise'){const toggle=dom('button',{type:'button','aria-label':f.label+' als Ausdruck'},'fx');toggle.onclick=()=>{checkpoint();n.values[f.key]={expr:n.values[f.key]?'$true':'$false'};renderSteps();changed();};root.append(toggle);}return root;}
 const heading=dom('div',{class:'fieldlabel'});heading.append(dom('label',{for:id},f.label+(f.optional?' (optional)':'')));
 const expression=PHCore.isExpr(n.values[f.key]);
 if((['text','list','number'].includes(f.type)||(d.kind==='ise'&&['enum','bool'].includes(f.type)))&&!(d.kind==='regex'&&['pattern','group'].includes(f.key))&&d.kind!=='tasknew'&&!f.key.startsWith('_')){
  const toggle=dom('button',{type:'button',class:expression?'active':'','aria-label':f.label+' als '+(expression?'Text':'Ausdruck')},'fx');toggle.onclick=()=>{checkpoint();n.values[f.key]=expression?n.values[f.key].expr:{expr:PHCore.valueText(n.values[f.key])};openIds.add(n.uid);renderSteps();changed();};heading.append(toggle);
 }
 root.append(heading);let input;
 if(f.type==='enum'&&!expression){input=dom('select',{id});if(f.optional)input.append(dom('option',{value:''},'Nicht verwenden'));for(const option of f.options)input.append(dom('option',{value:option},option==='TAB'?'Tabulator':option));input.value=n.values[f.key];}
 else if(f.type==='expr'){input=dom('textarea',{id,spellcheck:'false'});input.value=n.values[f.key];}
 else{input=dom('input',{id,type:f.type==='number'&&!expression?'number':'text',autocomplete:'off'});input.value=PHCore.valueText(n.values[f.key]);if(f.type==='number'&&!expression){input.min=f.min??0;input.max=f.max??1000000;}}
 input.addEventListener('focus',()=>{if(!input.dataset.tracked){checkpoint();input.dataset.tracked='1';}});input.addEventListener('blur',()=>delete input.dataset.tracked);
 const update=()=>{n.values[f.key]=expression?{expr:input.value}:f.type==='number'?(input.value===''?'':Number(input.value)):input.value;changed();};input.addEventListener(f.type==='enum'?'change':'input',update);root.append(input);
 if(d.kind==='ise'){const p=d.metadata.parameters.find(p=>p.name===f.key),sp=PHCatalog.setOf(n,d)?.parameters.find(p=>p.name===f.key);if(p)root.append(dom('span',{class:'helptext'},p.type+(/\[\]$/.test(p.type)?' · Liste mit Komma; einzelne Werte mit Komma über fx zitieren':'')+(sp?.mandatory?' · Pflichtparameter':'')+(sp?.pipeline?' · Pipeline nach Wert':'')+(sp?.byProperty?' · Pipeline nach Eigenschaft':'')));}
 const note=f.type==='expr'||expression?'PowerShell-Ausdruck · eigene Syntax':f.type==='var'?'Vorher erzeugte Variable, ohne $':f.type==='list'?'Einzelne Namen mit Komma trennen':d.kind==='regex'&&f.key==='group'?'Name einer Capture-Gruppe oder 0 für den gesamten Treffer':null;
 if(note)root.append(dom('span',{class:'helptext'},note));return root;
}
function renderPreview(){
 lastResult=PHCore.compile(project);$('code').textContent=lastResult.code;$('stepCount').textContent=lastResult.count+' Schritte';$('modeBadge').textContent=project.settings.preview?'Vorschau-Modus':'Echtbetrieb';$('modeBadge').className='mode'+(project.settings.preview?' on':'');$('exportScript').disabled=!!lastResult.errors.length||!lastResult.count;$('copyCode').disabled=!!lastResult.errors.length||!lastResult.count;
 $('issuesSummary').textContent='Ablaufprüfung · '+lastResult.errors.length+' Fehler · '+lastResult.warnings.length+' Hinweise';
 const issues=$('issues');issues.replaceChildren();if(!lastResult.errors.length)issues.append(dom('p',{class:'checkok'},'Pflichtfelder und bekannte Abhängigkeiten erfüllt.'));
 for(const e of [...lastResult.errors.map(e=>({...e,error:true})),...lastResult.warnings]){const div=dom('div',{class:'issue'+(e.error?' error':'')});if(e.uid){const b=dom('button',{},e.text);b.onclick=()=>{openIds.add(e.uid);const el=$(e.uid);if(el){el.open=true;el.scrollIntoView({behavior:'smooth',block:'center'});}};div.append(b);}else div.textContent=e.text;issues.append(div);}
 for(const n of PHCore.allNodes(project.steps)){const target=$(n.uid+'-error');if(target){const errors=lastResult.errors.filter(e=>e.uid===n.uid);target.hidden=!errors.length;target.textContent=errors.map(e=>e.text).join(' ');}}
 const vars=$('variables');vars.replaceChildren();for(const name of new Set(PHCore.allNodes(project.steps).filter(n=>n.out).map(n=>n.out))){const b=dom('button',{},'$'+name);b.onclick=()=>copy('$'+name);vars.append(b);}
}
function renderAll(){ $('projectTitle').value=project.title;renderLibrary();renderSteps();renderPreview(); }
function download(filename,content,type='text/plain;charset=utf-8'){const url=URL.createObjectURL(new Blob([content],{type}));const a=dom('a',{href:url,download:filename});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('Kopiert');}catch{const ta=dom('textarea');ta.value=text;document.body.append(ta);ta.select();try{if(!document.execCommand('copy'))throw Error();toast('Kopiert');}catch{toast('Kopieren gesperrt. Code markieren oder als Datei exportieren.');}ta.remove();}}
function filename(){return (PHCore.normalize(project.title).replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').slice(0,80)||'Mein-Skript');}
$('search').oninput=()=>{query=$('search').value;limit=30;clearTimeout(searchTimer);searchTimer=setTimeout(renderLibrary,120);};$('category').append(dom('option',{value:'Alle'},'Alle Kategorien'));for(const c of PH_CATEGORIES)$('category').append(dom('option',{value:c},c));$('category').onchange=()=>{category=$('category').value;limit=30;renderLibrary();};
$('iseTab').onclick=()=>setTab('ise');$('moduleSelect').onchange=()=>{moduleName=$('moduleSelect').value;limit=30;renderLibrary();};
$('commandsTab').onclick=()=>setTab('commands');$('templatesTab').onclick=()=>setTab('templates');for(const b of document.querySelectorAll('[data-search]'))b.onclick=()=>{query=b.dataset.search;$('search').value=query;category='Alle';$('category').value='Alle';tab='templates';limit=30;renderLibrary();if(!PHCore.search(query,PH_TEMPLATES).length)setTab('commands');};
$('projectTitle').oninput=()=>{project.title=$('projectTitle').value;changed();};$('newProject').onclick=()=>{if(project.steps.length&&!confirm('Neues leeres Projekt starten? Das aktuelle Projekt vorher speichern, wenn du es behalten möchtest.'))return;checkpoint();project.steps=[];project.title='Mein Skript';insertUid=null;openIds.clear();renderAll();changed();};
$('saveProject').onclick=()=>download(filename()+'.powerhelp.json',JSON.stringify(project,null,2),'application/json');$('importProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async()=>{const f=$('projectFile').files[0];if(!f)return;try{if(f.size>16*1024*1024)throw Error('Projektdatei ist zu groß (maximal 16 MB).');const imported=PHCore.validateProject(JSON.parse(await f.text()));checkpoint();project=imported;refreshModules();insertUid=null;openIds.clear();renderAll();changed();toast('Projekt geladen');}catch(e){toast('Projekt nicht geladen: '+e.message);}finally{$('projectFile').value='';}};
$('exportScript').onclick=()=>{const r=PHCore.compile(project);if(r.errors.length||!r.count)return;download(filename()+'.ps1','\uFEFF'+r.code.replace(/\r?\n/g,'\r\n'));};$('copyCode').onclick=()=>copy(lastResult.code);$('collapseAll').onclick=()=>{openIds.clear();renderSteps();};
function syncSettings(){ $('previewMode').checked=project.settings.preview;$('commentsMode').checked=project.settings.comments;$('scriptParams').value=project.settings.params;$('transcriptMode').checked=project.settings.transcript;$('logPath').value=project.settings.logPath;}
$('settingsOpen').onclick=()=>{syncSettings();$('settingsDialog').showModal();};$('helpOpen').onclick=()=>$('helpDialog').showModal();$('regexOpen').onclick=()=>$('regexDialog').showModal();
for(const [id,key]of [['previewMode','preview'],['commentsMode','comments'],['transcriptMode','transcript']])$(id).onchange=()=>{checkpoint();project.settings[key]=$(id).checked;changed();};for(const [id,key]of [['scriptParams','params'],['logPath','logPath']])$(id).oninput=()=>{project.settings[key]=$(id).value;changed();};
for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
const undo=dom('button',{id:'undoAction',title:'Letzte Änderung rückgängig'},'Rückgängig'),redo=dom('button',{id:'redoAction',title:'Änderung wiederholen'},'Wiederholen');$('collapseAll').before(undo,redo);
undo.onclick=()=>{if(!undoStack.length){toast('Keine Änderung zum Rückgängigmachen');return;}redoStack.push(snapshot());project=JSON.parse(undoStack.pop());PHCatalog.install(project.catalog||PH_BUILTIN_CATALOG);refreshModules();insertUid=null;renderAll();changed();};redo.onclick=()=>{if(!redoStack.length)return;undoStack.push(snapshot());project=JSON.parse(redoStack.pop());PHCatalog.install(project.catalog||PH_BUILTIN_CATALOG);refreshModules();insertUid=null;renderAll();changed();};
const offline=dom('button',{id:'offlineDownload'},'HTML herunterladen');offline.onclick=()=>download('PowerHelp-Offline.html',initialHtml,'text/html;charset=utf-8');$('helpOpen').before(offline);
document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();$('saveProject').click();}if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();$('search').focus();}});
const examples={customer:{pattern:'(?m)^Kundennummer:\\s*(?<wert>\\S+)',group:'wert'},email:{pattern:'(?<wert>[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})',group:'wert'},ip:{pattern:'(?<wert>\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b)',group:'wert'},date:{pattern:'(?<wert>\\b\\d{2}\\.\\d{2}\\.\\d{4}\\b)',group:'wert'},number:{pattern:'(?m)^ID:\\s*(?<wert>\\d+)',group:'wert'}};
$('regexExample').onchange=()=>{const e=examples[$('regexExample').value];$('regexPattern').value=e.pattern;$('regexGroup').value=e.group;};
$('regexFile').onchange=async()=>{const f=$('regexFile').files[0];if(!f)return;try{if(f.size>400000)throw Error('Die Vorschau akzeptiert Dateien bis 400 KB.');const text=new TextDecoder($('regexEncoding').value).decode(await f.arrayBuffer());if(text.length>100000)throw Error('Text ist zu lang (maximal 100.000 Zeichen).');$('regexText').value=text;toast('Text lokal eingelesen');}catch(e){toast(e.message);}};
const workerSource=String.raw`onmessage = event => { try { let {pattern,text,group}=event.data;let flags='g';const leading=pattern.match(/^\(\?([ims]+)\)/);if(leading){flags+=leading[1];pattern=pattern.slice(leading[0].length);}flags=[...new Set(flags)].join('');const regex=new RegExp(pattern,flags),rows=[];let match;while((match=regex.exec(text))!==null && rows.length<1000){const value=/^\d+$/.test(group)?match[Number(group)]:match.groups?.[group];if(value!==undefined)rows.push({position:match.index,value});if(match[0]==='')regex.lastIndex++;}postMessage({rows,capped:rows.length===1000});}catch(e){postMessage({error:e.message});} };`;
$('testRegex').onclick=()=>{
 if(worker)worker.terminate();regexRows=[];$('regexResults').replaceChildren();const text=$('regexText').value,pattern=$('regexPattern').value,group=$('regexGroup').value.trim()||'0';if(text.length>100000){$('regexStatus').textContent='Text ist zu lang (maximal 100.000 Zeichen).';return;}
 const url=URL.createObjectURL(new Blob([workerSource],{type:'text/javascript'}));try{worker=new Worker(url);}catch(e){URL.revokeObjectURL(url);$('regexStatus').textContent='Regex-Vorschau ist in diesem Browser nicht verfügbar: '+e.message;return;}URL.revokeObjectURL(url);$('regexStatus').textContent='Suche läuft …';const current=worker;
 const timeout=setTimeout(()=>{current.terminate();if(worker===current){worker=null;$('regexStatus').textContent='Abgebrochen: Der Regex-Ausdruck brauchte zu lange. Ein engeres Muster verwenden.';}},1200);
 current.onmessage=e=>{clearTimeout(timeout);current.terminate();if(worker!==current)return;worker=null;if(e.data.error){$('regexStatus').textContent='Browser-Regex: '+e.data.error;return;}regexRows=e.data.rows;$('regexStatus').textContent=regexRows.length+' Treffer'+(e.data.capped?' (Vorschau begrenzt)':'')+'. Vorschauwerte bitte mit .NET-Verhalten abgleichen.';
  const table=dom('table'),head=dom('tr');head.append(dom('th',{},'Position'),dom('th',{},'Wert'));table.append(head);for(const r of regexRows){const tr=dom('tr');tr.append(dom('td',{},String(r.position)),dom('td',{},r.value));table.append(tr);}$('regexResults').append(table);
 };current.onerror=()=>{clearTimeout(timeout);current.terminate();worker=null;$('regexStatus').textContent='Regex-Vorschau konnte nicht ausgeführt werden.';};current.postMessage({text,pattern,group});
};
$('addRegex').onclick=()=>{addCommand('regex',{pattern:$('regexPattern').value,group:$('regexGroup').value.trim()||'0',encoding:$('regexEncoding').value==='windows-1252'?'Default':$('regexEncoding').value==='utf-16le'?'Unicode':'UTF8'});$('regexDialog').close();};
$('exportRegexCsv').onclick=()=>{if(!regexRows.length){toast('Zuerst Treffer anzeigen');return;}const cell=v=>'"'+String(v).replace(/"/g,'""')+'"';download('Regex-Vorschau.csv','\uFEFFPosition;Wert\r\n'+regexRows.map(r=>cell(r.position)+';'+cell(r.value)).join('\r\n'),'text/csv;charset=utf-8');};
function drawIseFields(n,d,body,fields){
 const set=PHCatalog.setOf(n,d),allowed=set?.parameters||[],enabled=new Set();try{const a=JSON.parse(n.values._enabled||'[]');if(Array.isArray(a))for(const k of a)if(typeof k==='string')enabled.add(k);}catch{}
 const setField=drawField(n,d,d.fields.find(f=>f.key==='_set'));
 setField.querySelector('select').onchange=e=>{checkpoint();n.values._set=e.target.value;const names=new Set(PHCatalog.setOf(n,d).parameters.map(p=>p.name));for(const f of d.fields)if(!f.key.startsWith('_')&&!names.has(f.key))n.values[f.key]=f.type==='bool'?false:'';n.values._enabled=JSON.stringify([...enabled].filter(k=>names.has(k)));renderSteps();changed();};fields.append(setField);
 fields.append(drawField(n,d,d.fields.find(f=>f.key==='_effect')));
 if(allowed.some(p=>p.pipeline||p.byProperty))fields.append(drawField(n,d,d.fields.find(f=>f.key==='_input')));
 else if(n.values._input){n.values._input='';}
 const inputField=fields.lastChild;
 if(inputField?.querySelector('input')&&allowed.some(p=>p.pipeline||p.byProperty)){
  const select=dom('select',{'aria-label':'Vorhandene Eingabevariable'});select.append(dom('option',{value:''},'Vorhandene Variable wählen …'));
  const scope=targetList(),index=scope.findIndex(s=>s.uid===n.uid),available=scope.slice(0,index<0?scope.length:index).filter(s=>s.out).map(s=>s.out);
  const parent=insertUid?findNode(insertUid):null;if(parent?.def==='foreach')available.push(parent.values.item);
  for(const name of [...new Set(available)])select.append(dom('option',{value:name},'$'+name));
  select.onchange=()=>{checkpoint();n.values._input=select.value;renderSteps();changed();};inputField.append(select);
 }
 for(const sp of allowed){const f=d.fields.find(f=>f.key===sp.name);if(f&&(sp.mandatory||enabled.has(f.key)||PHCatalog.active(n.values[f.key])))fields.append(drawField(n,d,{...f,optional:!sp.mandatory}));}
 const more=dom('details',{class:'parameter-picker'});more.open=openIds.has(n.uid+'-params');more.ontoggle=()=>{if(more.open)openIds.add(n.uid+'-params');else openIds.delete(n.uid+'-params');};more.append(dom('summary',{},'Weitere Parameter ('+allowed.filter(p=>!p.mandatory).length+')'));
 for(const sp of allowed.filter(p=>!p.mandatory)){
  const f=d.fields.find(f=>f.key===sp.name);if(!f)continue;const label=dom('label',{class:'check'}),toggle=dom('input',{type:'checkbox'});toggle.checked=enabled.has(f.key)||PHCatalog.active(n.values[f.key]);
  toggle.onchange=()=>{checkpoint();openIds.add(n.uid+'-params');if(toggle.checked){enabled.add(f.key);if(f.type==='bool')n.values[f.key]=true;}else{enabled.delete(f.key);n.values[f.key]=f.type==='bool'?false:'';}n.values._enabled=JSON.stringify([...enabled]);renderSteps();changed();};label.append(toggle,document.createTextNode('-'+f.key));more.append(label);
 }
 body.append(dom('p',{class:'metadata-note'},'Deklarierte Ausgabe: '+(d.metadata.outputTypes.join(', ')||'nicht angegeben')+'. Nur Parameter dieses Satzes werden verwendet. Komplexe Werte mit fx eingeben; beispielsweise { $_.Length -gt 1MB } für einen ScriptBlock. Die tatsächliche Pipelinebindung wird erst von PowerShell geprüft.'));
 fields.append(more);
}
function renderSuggestions(){
 const root=$('nextSteps');root.replaceChildren();const list=targetList(),suggestions=PHCatalog.suggestions(list);
 if(!suggestions.length){root.hidden=true;return;}root.hidden=false;root.append(dom('h2',{},'Passende nächste Schritte'));
 const buttons=dom('div',{class:'suggestions'});for(const s of suggestions){const d=PH_BY_ID[s.id],b=dom('button',{title:s.reason},d.title);b.onclick=()=>{const source=list.at(-1),values={};if(s.pipeline&&source?.out)values._input=source.out;addCommand(s.id,values);};buttons.append(b);}root.append(buttons,dom('small',{},'Offline-Vorschläge anhand des letzten Schritts. Werte und Ziel der Aufgabe prüfen.'));
}
const PH_CATALOG_EXPORTER=/*__EXPORTER__*/;
$('catalogOpen').onclick=()=>{$('catalogInfo').textContent=PHCatalog.entries.length+' Befehle aus '+new Set(PHCatalog.entries.map(d=>d.module)).size+' Modulen. '+(project.catalog?'Server-Katalog ergänzt.':'Eingebauter Katalog aktiv.');$('catalogDialog').showModal();};
$('downloadCatalogExporter').onclick=()=>download('Export-PowerHelpCatalog.ps1','\uFEFF'+PH_CATALOG_EXPORTER.replace(/\r?\n/g,'\r\n'));
$('importCatalog').onclick=()=>$('catalogFile').click();
$('catalogFile').onchange=async()=>{const file=$('catalogFile').files[0];if(!file)return;try{
 if(file.size>8*1024*1024)throw Error('Maximal 8 MB pro Katalog.');const catalog=PHCatalog.validate(JSON.parse(await file.text()));
 const ids=new Set([...PH_BUILTIN_CATALOG.commands,...catalog.commands].map(c=>'ise:'+c.module+'/'+c.name));if(PHCore.allNodes(project.steps).some(n=>n.def.startsWith('ise:')&&!ids.has(n.def)))throw Error('Im Projekt verwendete importierte Befehle fehlen in diesem Katalog.');
 checkpoint();project.catalog=catalog;PHCatalog.install(catalog);refreshModules();setTab('ise');renderSteps();changed();$('catalogDialog').close();toast('Server-Katalog importiert');
 }catch(e){toast('Katalog nicht geladen: '+e.message);}finally{$('catalogFile').value='';}};
$('resetCatalog').onclick=()=>{const ids=new Set(PH_BUILTIN_CATALOG.commands.map(c=>'ise:'+c.module+'/'+c.name));if(PHCore.allNodes(project.steps).some(n=>n.def.startsWith('ise:')&&!ids.has(n.def))){toast('Zuerst die nur im importierten Katalog vorhandenen Schritte entfernen.');return;}checkpoint();delete project.catalog;PHCatalog.install(PH_BUILTIN_CATALOG);refreshModules();renderAll();changed();$('catalogDialog').close();};
refreshModules();
renderAll();
})();
