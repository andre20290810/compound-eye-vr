'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/evidence/v57');fs.mkdirSync(output,{recursive:true});
const servers=[];let browser;
const serve=folder=>new Promise(resolve=>{const s=http.createServer((req,res)=>{let f=path.join(folder,new URL(req.url,'http://localhost').pathname.replace(/^\//,'')||'index.html');try{res.setHeader('Content-Type',f.endsWith('.json')?'application/json':'text/html;charset=utf-8');res.end(fs.readFileSync(f));}catch(e){res.statusCode=404;res.end('404');}});s.listen(0,'127.0.0.1',()=>{servers.push(s);resolve('http://127.0.0.1:'+s.address().port);});});
(async()=>{
 browser=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle']});
 const page=await browser.newPage();await page.setViewport({width:1200,height:820});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const results={date:new Date().toISOString(),errors,versions:{},screens:[]};
 for(const [version,folder] of [['before',process.env.V56_BASELINE_DIR],['after',root]]){
  if(!folder)continue;const url=await serve(folder);await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__compoundTest?.state?._modelFit&&window.ASSETS?.aegisEmber instanceof ArrayBuffer,{timeout:35000});
  const metrics=await page.evaluate(()=>{
   const t=window.__compoundTest;t.changeModel('aegisEmber');t.state.gameMode=false;t.setEyeCount(1);const md=t.getModelData(),gl=t.gl;
   const read=(buffer,target=gl.ARRAY_BUFFER,Type=Float32Array)=>{gl.bindBuffer(target,buffer);const n=gl.getBufferParameter(target,gl.BUFFER_SIZE);const a=new Type(n/4);gl.getBufferSubData(target,0,a);return a;};
   const meshes=md.geo.filter(m=>['pants','boots','cables','vest hardware','armor fabric'].includes(m.materialName)).map(m=>{const p=read(m.p),j=read(m.joint),w=read(m.weight),tri=read(m.ib,gl.ELEMENT_ARRAY_BUFFER,Uint32Array),set=new Set(),edges=[];
    for(let a=0;a<tri.length;a+=3)for(const pair of [[0,1],[1,2],[2,0]]){let i=tri[a+pair[0]],k=tri[a+pair[1]];if(i>k)[i,k]=[k,i];const id=i+':'+k;if(set.has(id))continue;set.add(id);if(Math.max(p[i*3+1],p[k*3+1])>.74)continue;const len=Math.hypot(...[0,1,2].map(a=>p[i*3+a]-p[k*3+a]));if(len>1e-5)edges.push([i,k,len]);}
    return {name:m.materialName,p,j,w,edges};});
   const reports=[];
   for(const motion of ['armor_walk','armor_run']){
    const duration=t.v47Sample('aegisEmber',motion,{...t.v47Config(),smooth:3,includeAllSkinJoints:true}).duration;
    const aggregate=meshes.map(m=>({...m,ratios:[],worst:null}));
    for(let frame=0;frame<40;frame++){
     const time=duration*frame/40;t.animateModel(md,motion,time);
     for(const m of aggregate){const points=new Float64Array(m.p.length);
      for(let i=0;i<m.p.length/3;i++)for(let k=0;k<4;k++){const weight=m.w[i*4+k];if(weight<=0)continue;const b=Math.round(m.j[i*4+k])*16,x=m.p[i*3],y=m.p[i*3+1],z=m.p[i*3+2];for(let axis=0;axis<3;axis++)points[3*i+axis]+=weight*(md.bones[b+axis]*x+md.bones[b+4+axis]*y+md.bones[b+8+axis]*z+md.bones[b+12+axis]);}
      for(const [i,k,len] of m.edges){const value=Math.hypot(...[0,1,2].map(a=>points[i*3+a]-points[k*3+a]))/len;m.ratios.push(value);if(!m.worst||value>m.worst.ratio)m.worst={ratio:value,time,edge:[i,k],bind_length:len,bind_positions:[Array.from(m.p.slice(i*3,i*3+3)),Array.from(m.p.slice(k*3,k*3+3))]};}
     }
    }
    for(const m of aggregate){m.ratios.sort((a,b)=>a-b);const n=m.ratios.length,retrieve=q=>n?m.ratios[Math.floor((n-1)*q)]:null;reports.push({material:m.name,motion,edges:m.edges.length,samples:n,min:retrieve(0),p50:retrieve(.5),p95:retrieve(.95),p99:retrieve(.99),max:retrieve(1),count_over_2:m.ratios.filter(x=>x>2).length,worst:m.worst});}
   }
   return {geometryAudit:md.geometryAudit||null,revision:md.geometryRevision||null,edge_stretch:reports};
  });results.versions[version]=metrics;console.log('DEFORM',version,JSON.stringify(metrics.edge_stretch.map(x=>({material:x.material,motion:x.motion,p95:x.p95,p99:x.p99,max:x.max,count_over_2:x.count_over_2}))));
  for(const [model,label] of [['aegisEmber','navy'],['aegisSoldier','soldier']])for(const [motion,short] of [['armor_run','run'],['armor_walk','walk'],['armor_guard','guard']])for(const [view,yaw] of short==='guard'?[['front',0],['back',Math.PI],['rear-angle',2.4]]:[['front',.45],['side',1.55]]){
   await page.evaluate(({model,motion,yaw})=>{const t=window.__compoundTest;t.changeModel(model);t.setMotion(motion);t.setEyeCount(1);Object.assign(t.state,{gameMode:false,paused:true,pauseTime:motion==='armor_run'?.22:motion==='armor_walk'?.32:0,punchPlayback:1,dragYaw:yaw,viewYaw:yaw,dragPitch:.08,viewPitch:.08,gyro:false,fish:false,zoom:1,showMotionMarkers:false,autoEye10:false});t.forceDraw();},{model,motion,yaw});
   const file=version+'-'+label+'-'+short+'-'+view+'.png';await(await page.$('#screen')).screenshot({path:path.join(output,file)});results.screens.push(file);
  }
  if(version==='after'){
   const ui=await page.evaluate(()=>({title:document.title,h1:document.querySelector('h1')?.textContent,editorDisplay:getComputedStyle(document.getElementById('lensEditorDisclosure')).display,supplements:document.getElementById('supplementDetails').innerText,remainingHelpers:[...document.querySelectorAll('.sublabel')].filter(e=>!e.closest('#supplementDetails')&&!e.closest('#lensEditorDisclosure')).map(e=>e.textContent.slice(0,120)),updated:document.getElementById('viewerUpdatedAt').textContent}));results.ui=ui;console.log('UI',JSON.stringify({...ui,supplements:ui.supplements.slice(0,300)}));await page.screenshot({path:path.join(output,'after-ui.png'),fullPage:true});
  }
 }
 fs.writeFileSync(path.join(output,'geometry-inspection.json'),JSON.stringify(results,null,2));console.log('VISUAL_REPORT',results.screens.length,'ERRORS',JSON.stringify(errors));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();servers.forEach(s=>s.close());});
