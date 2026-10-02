const assert=require('node:assert/strict');const {PHCore:c,PH_COMMANDS:commands,PH_TEMPLATES:templates}=require('./load-core');
const p=steps=>({steps,settings:{preview:true,comments:true,params:'',transcript:false}});
assert(commands.length>=100,`Only ${commands.length} commands`);
for(const t of templates){const r=c.compile(p(t.steps.map(s=>c.makeNode(s.def,s.values,s.out,s.children))));assert.equal(r.errors.length,0,t.title+': '+JSON.stringify(r.errors));assert(r.code.startsWith('#requires -Version 5.1'));}
const missing=c.compile(p([c.makeNode('csvout')]));assert(missing.errors.some(e=>e.text.includes('vorher nicht erzeugt')));
const loop=c.makeNode('foreach',{input:'Dateien',item:'Datei'},undefined,[{def:'copy',values:{LiteralPath:{expr:'$Datei.FullName'},Destination:'C:\\Backup'},children:[]}]);
const good=c.compile(p([c.makeNode('files'),loop]));assert.equal(good.errors.length,0);assert(good.code.includes('foreach ($Datei in $Dateien)'));assert(good.code.includes('-LiteralPath ($Datei.FullName)'));
const quoted=c.compile(p([c.makeNode('write',{Value:"O'Brien $(not-a-command)"})]));assert(quoted.code.includes("'O''Brien $(not-a-command)'"));assert(quoted.code.includes('ShouldProcess'));
assert(c.compile(p([c.makeNode('write',{Value:'bad\ninput'})])).errors.length);
assert(c.compile(p([c.makeNode('files',{File:true,Directory:true})])).errors.length);
assert(c.compile(p([c.makeNode('port',{Port:65536})])).errors.length);
assert(c.compile(p([c.makeNode('lines',{lines:'0, 4'})])).errors.length);
assert.equal(c.compile(p([c.makeNode('lines',{lines:'4, 9'})])).errors.length,0);
assert.equal(c.search('alte dateien löschen',templates)[0].item.id,'old-files');
assert(c.search('benuzter',commands).some(r=>r.item.id==='users'));
assert.equal(c.search('Get-ChildItem',commands)[0].item.id,'files');
assert(c.search('NTFS Berechtigungen',commands).some(r=>r.item.id==='grant'));
assert(c.search('Benutzer CSV',templates).some(r=>r.item.id==='csv-users'));
const regex=c.compile(p([c.makeNode('regex',{group:'1'})]));assert(regex.code.includes('$PHMatch.Groups[1]'));assert(regex.code.includes("-Encoding 'UTF8'"));
assert.throws(()=>c.validateProject({format:'powerhelp-project',version:2,steps:[{def:'constructor',values:{}}]}));
const roundTrip=c.validateProject(JSON.parse(JSON.stringify({format:'powerhelp-project',version:2,title:'Test',settings:{preview:true},steps:[loop,c.makeNode('files')]})));assert.equal(roundTrip.steps.length,2);
for(const d of commands.filter(d=>d.mutates)){const r=c.compile(p([c.makeNode(d.id)]));assert(r.code.includes('$PSCmdlet.ShouldProcess'),d.id+' has no guard');}
console.log(`PASS: ${commands.length} Bausteine, ${templates.length} Abläufe, Suche, Abhängigkeiten, Eingaben und Vorschau-Schutz.`);
