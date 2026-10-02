const fs=require('node:fs');const {PHCore:c,PH_COMMANDS:commands,PH_TEMPLATES:templates}=require('./load-core');
const cases=[];
for(const d of commands){const n=c.makeNode(d.id);const before=[];for(const key of d.uses||[])before.push(c.makeNode('variable',{value:'@()'},n.values[key]));if(d.container)n.children=[c.makeNode('message')];cases.push({name:d.id,code:c.compile({steps:[...before,n],settings:{preview:true,comments:true}}).code,command:d.kind?null:d.command,parameters:d.kind?[]:d.fields.filter(f=>f.key!==d.inputField).map(f=>f.key)});}
for(const t of templates)cases.push({name:t.id,code:c.compile({steps:t.steps.map(s=>c.makeNode(s.def,s.values,s.out,s.children)),settings:{preview:true,comments:true}}).code});
fs.writeFileSync(process.argv[2]||'cases.json',JSON.stringify(cases,null,2),'utf8');
console.log(`Generated ${cases.length} parser test cases`);
