/* Real Get-Command metadata, offline registry and deterministic composition rules. */
const PHCatalog = (()=>{
 const entries=[];let currentData;
 const common=new Set(['Verbose','Debug','ErrorAction','WarningAction','InformationAction','ErrorVariable','WarningVariable','InformationVariable','OutVariable','OutBuffer','PipelineVariable','WhatIf','Confirm']);
 const effects=/^(Set|New|Add|Remove|Clear|Enable|Disable|Start|Stop|Restart|Suspend|Resume|Reset|Rename|Move|Copy|Export|Out|Register|Unregister|Install|Uninstall|Update|Repair|Restore|Save|Publish|Unpublish|Mount|Dismount|Initialize|Format|Resize|Optimize|Import|Invoke|Enter|Exit|Connect|Disconnect|Complete|Protect|Unprotect|Grant|Revoke|Block|Unblock|Undo)-/;
 const modules={ 'Microsoft.PowerShell.Management':'Dateien & Ordner','Microsoft.PowerShell.Utility':'CSV & Daten','Microsoft.PowerShell.Security':'Berechtigungen & Freigaben','Microsoft.PowerShell.LocalAccounts':'Benutzer & Gruppen',NetTCPIP:'Netzwerk',NetAdapter:'Netzwerk',DnsClient:'Netzwerk',NetSecurity:'Netzwerk',SmbShare:'Berechtigungen & Freigaben',ScheduledTasks:'Aufgabenplanung',ActiveDirectory:'Active Directory',Storage:'Datenträger',PrintManagement:'Drucker',CimCmdlets:'System & Ereignisse',DISM:'Windows-Wartung',Defender:'Sicherheit',Appx:'Windows-Wartung',BitsTransfer:'Dateien & Ordner'};
 const verbs={Copy:'kopieren sichern',Move:'verschieben',Rename:'umbenennen',Resolve:'auflösen ermitteln',Out:'ausgeben speichern',Get:'abfragen lesen anzeigen suchen',Set:'setzen ändern konfigurieren',New:'neu erstellen anlegen',Add:'hinzufügen',Remove:'entfernen löschen',Clear:'leeren bereinigen',Enable:'aktivieren einschalten',Disable:'deaktivieren ausschalten',Start:'starten',Stop:'stoppen beenden',Restart:'neu starten',Test:'prüfen testen',Export:'exportieren speichern',Import:'importieren einlesen',ConvertTo:'umwandeln exportieren',ConvertFrom:'umwandeln einlesen',Format:'formatieren anzeigen',Select:'auswählen filtern',Sort:'sortieren',Measure:'messen zählen',Compare:'vergleichen',Register:'registrieren anlegen'};
 const nouns={Item:'datei dateien ordner verzeichnis registry',Content:'text datei inhalt zeilen',ChildItem:'dateien ordner suchen verzeichnis',Process:'prozess programme',Service:'dienst dienste',LocalUser:'benutzer konto lokal',LocalGroup:'gruppe lokal',LocalGroupMember:'gruppenmitglied benutzer gruppe',NetIPAddress:'ip adresse netzwerk',NetFirewallRule:'firewall regeln',ScheduledTask:'aufgabe zeitplan',WinEvent:'ereignis protokoll fehler',Volume:'laufwerk datenträger speicher',Disk:'festplatte datenträger',Partition:'partition',Printer:'drucker',SmbShare:'freigabe smb ordner',Acl:'berechtigungen ntfs rechte',ADUser:'domäne benutzer konto',ADGroup:'domäne gruppe',ADComputer:'domäne rechner computer',String:'text regex suchen',Csv:'csv tabelle excel',Json:'json daten',CimInstance:'hardware system inventar wmi'};
 const typeOf=p=>p.type==='System.Management.Automation.SwitchParameter'?'bool':p.validateSet?.length?'enum':'text';
 const active=v=>v!==''&&v!==undefined&&v!==null&&v!==false;
 function validate(data){
  if(!data||data.format!=='powerhelp-catalog'||data.version!==1||!Array.isArray(data.commands)||data.commands.length>6000)throw Error('Kein unterstützter Katalog (maximal 6000 Befehle).');
  if(!/^5\.1(?:\.|$)/.test(String(data.powershell)))throw Error('Der Katalog muss aus Windows PowerShell 5.1 stammen.');
  const clean=JSON.parse(JSON.stringify(data)),seen=new Set();
  for(const c of clean.commands){
   if(!/^[A-Za-z][A-Za-z0-9]*-[A-Za-z][A-Za-z0-9]*$/.test(c.name)||! /^[A-Za-z0-9_.-]{1,150}$/.test(c.module)||!Array.isArray(c.parameters)||c.parameters.length>200||!Array.isArray(c.sets)||!c.sets.length||c.sets.length>100)throw Error('Ungültige Befehlsdefinition.');
   const id=c.module+'/'+c.name;if(seen.has(id))throw Error('Doppelter Befehl: '+c.name);seen.add(id);
   const names=new Set();
   for(const p of c.parameters){if(!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(p.name)||names.has(p.name)||typeof p.type!=='string'||p.type.length>500)throw Error('Ungültiger Parameter.');names.add(p.name);p.validateSet=Array.isArray(p.validateSet)?p.validateSet.map(String):[];if(p.validateSet.length>1000||p.validateSet.some(x=>x.length>1000))throw Error('Ungültige Auswahlwerte.');p.aliases=Array.isArray(p.aliases)?p.aliases.map(String):[];}
   const setNames=new Set();for(const s of c.sets){if(typeof s.name!=='string'||s.name.length>200||setNames.has(s.name)||!Array.isArray(s.parameters))throw Error('Ungültiger Parametersatz.');setNames.add(s.name);for(const p of s.parameters)if(!names.has(p.name)&&!common.has(p.name))throw Error('Unbekannter Parameter im Satz.');}
   c.outputTypes=Array.isArray(c.outputTypes)?c.outputTypes.map(String):[];
  }
  return clean;
 }
 function install(data){
  const clean=validate(data);
  const combined=new Map(PH_BUILTIN_CATALOG.commands.map(c=>[c.module+'/'+c.name,c]));
  for(const c of clean.commands)combined.set(c.module+'/'+c.name,c);
  for(const d of entries)delete PH_BY_ID[d.id];entries.length=0;
  for(const c of combined.values()){
   const parts=c.name.split('-'),set=c.sets.find(s=>s.default)||c.sets[0],kind=modules[c.module]||'Weitere Windows-Module';
   const fields=[F('_enabled','Aktivierte Parameter','text','[]',{optional:true}),F('_set','Parametersatz','enum',set.name,{options:c.sets.map(s=>s.name)}),F('_input','Eingabe aus Variable','var','',{optional:true}),F('_effect','Wirkung','enum','Änderung / unbekannt',{options:['Nur lesen','Änderung / unbekannt']}),...c.parameters.filter(p=>!common.has(p.name)).map(p=>F(p.name,p.name,typeOf(p),typeOf(p)==='bool'?false:'',{optional:true,allowEmpty:true,options:p.validateSet}))];
   const d={id:'ise:'+c.module+'/'+c.name,title:c.name,command:c.name,module:c.module,category:kind,description:(verbs[parts[0]]||'Befehl')+' · '+(nouns[parts[1]]||parts[1])+'. Modul: '+c.module+'.',keywords:(verbs[parts[0]]||'')+' '+(nouns[parts[1]]||'')+' '+c.parameters.map(p=>p.name+' '+p.aliases.join(' ')).join(' '),kind:'ise',fields,out:'Ergebnis',metadata:c};
   entries.push(d);PH_BY_ID[d.id]=d;
  }
  currentData=clean;return clean;
 }
 function setOf(n,d){return d.metadata.sets.find(s=>s.name===n.values._set);}
 function expression(p,v,q){
  if(v&&typeof v==='object')return '('+v.expr.trim()+')';
  if(p.type==='System.Boolean')return String(v).toLowerCase()==='true'?'$true':'$false';
  if(/System\.(?:S?Byte|U?Int(?:16|32|64)|Single|Double|Decimal)(?:\[\])?$/.test(p.type))return String(v).trim().split(',').map(x=>x.trim()).join(', ');
  if(/\[\]$/.test(p.type))return String(v).split(',').map(x=>q(x.trim())).join(', ');
  return q(v);
 }
 function emit(n,d,q){
  const set=setOf(n,d),allowed=new Set((set?.parameters||[]).map(p=>p.name)),args=[];
  for(const p of d.metadata.parameters){const v=n.values[p.name];if(!allowed.has(p.name)||!active(v))continue;if(p.type==='System.Management.Automation.SwitchParameter')args.push('-'+p.name+(v&&typeof v==='object'?':('+v.expr.trim()+')':''));else args.push('-'+p.name+' '+expression(p,v,q));}
  let body=(n.values._input?'$'+n.values._input.replace(/^\$/,'')+' | ':'')+d.module+'\\'+d.command+(args.length?' '+args.join(' '):'');
  if(n.out)body='$'+n.out.replace(/^\$/,'')+' = '+body;
  return body;
 }
 function issues(n,d,scope){
  const errors=[],warnings=[],set=setOf(n,d),label=d.command;
  if(!set){errors.push('Ungültiger Parametersatz.');return {errors,warnings};}
  const allowed=new Set(set.parameters.map(p=>p.name));
  for(const p of d.metadata.parameters){const v=n.values[p.name],isExpr=v&&typeof v==='object';if(active(v)&&!allowed.has(p.name))errors.push(label+': -'+p.name+' gehört nicht zum gewählten Parametersatz.');if(!active(v)||isExpr)continue;
   if(p.type==='System.Boolean'&&!/^(true|false)$/i.test(String(v)))errors.push(label+': -'+p.name+' erwartet True oder False.');
   if(/System\.(?:S?Byte|U?Int(?:16|32|64)|Single|Double|Decimal)(?:\[\])?$/.test(p.type)&&!/^[-+]?\d+(?:\.\d+)?(?:\s*,\s*[-+]?\d+(?:\.\d+)?)*$/.test(String(v)))errors.push(label+': -'+p.name+' erwartet eine Zahl bzw. Zahlenliste.');
   if(/ScriptBlock|Hashtable|IDictionary|SecureString|PSCredential|CimInstance|PSObject|Object\[\]|System.Type|PSSession|PSModuleInfo|PSDriveInfo|PSVariable|Automation.Job|System.IO.Stream|X509Certificate/.test(p.type))errors.push(label+': -'+p.name+' erwartet '+p.type+'. Den fx-Ausdruck für diesen komplexen Wert verwenden.');
  }
  try{const enabled=JSON.parse(n.values._enabled||'[]');if(!Array.isArray(enabled)||enabled.length>200||enabled.some(k=>typeof k!=='string'||!d.metadata.parameters.some(p=>p.name===k)))errors.push(label+': Ungültige Parameteraktivierung.');}catch{errors.push(label+': Ungültige Parameteraktivierung.');}
  const pipeline=n.values._input;
  if(pipeline){if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(pipeline))errors.push(label+': Ungültige Eingabevariable.');else if(![...scope].some(x=>x.toLowerCase()===pipeline.toLowerCase()))errors.push(label+': $'+pipeline+' wird vorher nicht erzeugt.');if(!set.parameters.some(p=>p.pipeline||p.byProperty))errors.push(label+': Dieser Parametersatz akzeptiert keine Pipelineeingabe.');warnings.push(label+': Pipelinebindung hängt vom tatsächlichen Objekttyp und dessen Eigenschaften ab.');}
  for(const p of set.parameters)if(p.mandatory&&!active(n.values[p.name])&&!(pipeline&&(p.pipeline||p.byProperty)))errors.push(label+': Pflichtparameter -'+p.name+' fehlt.');
  if(n.values._effect!=='Nur lesen')warnings.push(label+': Als Änderung oder unbekannte Wirkung gekennzeichnet; im Vorschau-Modus wird dieser Schritt übersprungen.');
  return {errors,warnings};
 }
 function defaults(n,d){const set=setOf(n,d);return set?.parameters||[];}
 const hints={files:['where','select','foreach','sort','regex'],read:['replace','split','jsonin','write'],regex:['select','sort','csvout','foreach'],lines:['select','csvout'],csvin:['where','select','foreach','csvout'],where:['select','sort','foreach','csvout'],select:['csvout','jsonout','table'],sort:['select','csvout','table'],users:['where','select','csvout','foreach'],groups:['select','foreach'],services:['where','select','foreach'],events:['where','select','csvout'],jsonin:['select','where','foreach'],foreach:['message']};
 function suggestions(nodes){
  const n=nodes.at(-1);if(!n)return ['files','csvin','regex','users'].map(id=>({id,reason:'Startpunkt für eine typische Aufgabe.'}));
  const d=PH_BY_ID[n.def];let ids=hints[n.def]||[];
  if(n.out&&!ids.length)ids=['select','where','foreach','csvout'];
  const result=ids.filter(id=>PH_BY_ID[id]).map(id=>({id,reason:n.out?'Verarbeitet $'+n.out+' als nächsten Schritt.':'Passender weiterer Arbeitsschritt.'}));
  if(d?.kind==='ise'&&n.out){
   const outputs=d.metadata.outputTypes.filter(x=>!['System.Object','System.Void'].includes(x));
   const matches=entries.filter(e=>e.id!==n.def&&e.metadata.sets.some(s=>s.parameters.some(p=>p.pipeline&&e.metadata.parameters.some(ep=>ep.name===p.name&&outputs.includes(ep.type))))).slice(0,4);
   for(const e of matches)result.push({id:e.id,reason:'Deklarierter Ausgabetyp passt zu einem Pipelineparameter. Bindung prüfen.',pipeline:true});
  }
  return result;
 }
 function inferEffect(command){return effects.test(command)?'Änderung / unbekannt':'Nur lesen';}
 return {entries,current:()=>currentData,validate,install,setOf,emit,issues,defaults,suggestions,inferEffect,active};
})();

PHCatalog.install(PH_BUILTIN_CATALOG);
