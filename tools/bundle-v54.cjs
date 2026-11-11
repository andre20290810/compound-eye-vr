'use strict';
// Keep offline HTML and readable source modules identical on LF/CRLF platforms.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),file=path.join(root,'index.html');
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
let html=read(file);
function replaceBetween(start,end,filename){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 if(a<0||b<0||html.indexOf(start,a+start.length)!==-1)throw Error('Ambiguous bundle marker: '+start);
 html=html.slice(0,a)+read(path.join(root,filename)).trimEnd()+'\n'+html.slice(b);
}
replaceBetween('/* Artificial compound-eye v54: pure, deterministic OFFLINE kinematics.','</script><script>(()=>{','kinematics-v54.js');
replaceBetween('// v54 single-motion reproducible CSV v2.',"// v47 motion-analysis workbench, resident in the app's existing IIFE.",'motion-csv-v54.js');
replaceBetween("// v47 motion-analysis workbench, resident in the app's existing IIFE.",'// v54: opt-in, offline kinematic exploration.','motion-workbench-v48.js');
replaceBetween('// v54: opt-in, offline kinematic exploration.','// v55 UI organization:','kinematic-view-v54.js');
replaceBetween('// v55 UI organization:','window.__sensorTest={','ui-v55.js');
replaceBetween('/* AEGIS v55:','/* AEGIS v56 motion:','aegis-geometry-v55.js');
replaceBetween('/* AEGIS v56 motion:','/* AEGIS v57 details:','aegis-motion-v56.js');
replaceBetween('/* AEGIS v57 details:','// AEGIS v57 runtime:','aegis-details-v57.js');
replaceBetween('// AEGIS v57 runtime:','function parseGLB','aegis-runtime-v57.js');
if(process.argv.includes('--check')){if(html!==read(file))throw Error('Embedded sources differ: run npm run build');console.log('PASS embedded/source equality');}
else{fs.writeFileSync(file,html);console.log('Bundled current modules into self-contained index.html');}
const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
for(const [i,s] of scripts.entries())new (require('node:vm').Script)(s,{filename:'index-inline-'+i+'.js'});
console.log('PASS '+scripts.length+' inline JavaScript syntax checks');
