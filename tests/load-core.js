const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const context=vm.createContext({});
const source=['catalog.js','core.js'].map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n');
vm.runInContext(source+'\nglobalThis.api={PHCore,PH_COMMANDS,PH_TEMPLATES,PH_BY_ID};',context);
module.exports=context.api;
