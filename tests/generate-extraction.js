const fs=require('node:fs');const {PHCore:c}=require('./load-core');
const cases=[];
for(const style of ['simple','detailed'])for(const folder of [false,true]){
 const steps=folder?[c.makeNode('regex',{folder:{expr:'$Folder'},filter:'*.txt',source:true})]:[c.makeNode('read',{LiteralPath:{expr:'$InputPath'}}),c.makeNode('regextext')];
 steps.push(c.makeNode('csvout',{LiteralPath:{expr:'$OutputPath'}}));c.connectMatching(steps);
 const result=c.compile({steps,settings:{style,preview:false,comments:false,params:'[string]$InputPath, [string]$Folder, [string]$OutputPath'}});
 if(result.errors.length)throw Error(JSON.stringify(result.errors));
 cases.push({name:style+(folder?'-folder':'-text'),folder,code:result.code});
}
fs.writeFileSync(process.argv[2]||'extraction.json',JSON.stringify(cases),'utf8');
