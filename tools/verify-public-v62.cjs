'use strict';
// Verify actual GitHub Pages bytes and real-browser core behavior before announcing deployment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const pp=require(process.env.PUPPETEER_MODULE||'puppeteer'),root=path.resolve(__dirname,'..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'),'utf8'));
const base=(process.env.PUBLIC_URL||'https://andre20290810.github.io/compound-eye-vr/').replace(/\/?$/,'/');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={checked_at:new Date().toISOString(),url:base,source_commit:expected.source_commit,physical_HMD:false,physical_GameSir:false,physical_iPhone:false};let browser;
(async()=>{
 assert.equal(expected.app_version,'v62');let matched=false,last;
 for(let attempt=0;attempt<24;attempt++){
  try{const q='?verify='+Date.now(),r=await fetch(base+'build-manifest.json'+q,{cache:'no-store',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);
   const m=await r.json();assert.equal(m.app_version,'v62');assert.equal(m.source_commit,expected.source_commit);
   const h=await fetch(base+q,{cache:'no-store',signal:AbortSignal.timeout(20000)});assert.equal(h.status,200);
   const digest=sha(Buffer.from(await h.arrayBuffer()));assert.equal(digest,expected.source_files_sha256['index.html']);
   report.manifest=m;report.html_sha256=digest;matched=true;console.log('PUBLIC_BYTES_MATCH',m.source_commit);break;
  }catch(e){last=String(e);if(attempt%4===0)console.log('DEPLOY_CHECK',attempt+1,last.slice(0,200));await new Promise(ok=>setTimeout(ok,5000));}
 }
 if(!matched)throw Error('Pages did not match v62 deployment: '+last);
 for(const [f,digest] of Object.entries(expected.source_files_sha256)){
  if(f==='index.html')continue;const r=await fetch(base+f+'?build='+expected.source_commit,{cache:'no-store'});assert.equal(r.status,200,f);
  assert.equal(sha(Buffer.from(await r.arrayBuffer())),digest,f);
 }
 for(const [f,digest] of [['public-appearance.json',expected.public_appearance.sha256],['ybot-modifications.json',expected.ybot_config.sha256]]){
  const r=await fetch(base+f+'?build='+expected.source_commit,{cache:'no-store'});assert.equal(r.status,200,f);assert.equal(sha(Buffer.from(await r.arrayBuffer())),digest,f);
 }
 browser=await pp.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle']});
 report.browser=await browser.version();const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.setViewport({width:1300,height:900});await p.setCacheEnabled(false);
 report.open_url=base+'?v=62&build='+expected.source_commit.slice(0,7);await p.goto(report.open_url,{waitUntil:'domcontentloaded',timeout:50000});
 await p.waitForFunction(()=>window.__compoundTest?.version==='62'&&window.__compoundTest.state._modelFit&&window.__TimelineUI62&&window.__YBot62&&window.ASSETS?.aegisEmber instanceof ArrayBuffer,{timeout:50000});
 report.boot=await p.evaluate(()=>({version:window.__compoundTest.version,eyes:window.__compoundTest.state.eyeCount,title:document.title,updated:document.getElementById('viewerUpdatedAt').textContent,timeline:!!document.getElementById('tl62Panel')}));
 assert.equal(report.boot.eyes,1);assert.equal(report.boot.title,'人工複眼シミュレーションシステム');assert.equal(report.boot.timeline,true);
 report.ybot=await p.evaluate(()=>{const t=window.__compoundTest,x=t.getModel('xbot'),y=t.getModel('ybot');return{skeletonMatched:window.__YBot62.compareSkeleton(x,y),skinJoints:y.skin.joints.length,sameGLBVertices:x.geo===y.geo,config:window.__compoundTest.v62GetYConfig().revision,observed:window.__compoundTest.v62RecalculateModifications().map(o=>({joint:o.modified_joint_id,requested:o.requested_change,actual:o.actual_change_after_recalculation,revision:o.motion_revision_id}))};});
 assert.ok(report.ybot.skeletonMatched&&report.ybot.sameGLBVertices);assert.equal(report.ybot.skinJoints,32);assert.ok(report.ybot.observed.length>0);
 report.timeline=await p.evaluate(()=>{document.getElementById('tl62Panel').open=true;window.__TimelineUI62.refresh();const a=window.__TimelineUI62.current();const rows=window.__Timeline62.records(a);return{ok:a?.compatibility?.ok,rows:a?.rows.length,events:a?.events.length,exportEvents:rows.length,notice:document.querySelector('#tl62Panel .tl62Notice')?.textContent};});
 assert.ok(report.timeline.ok);assert.ok(report.timeline.rows>=5);assert.ok(report.timeline.events>0);assert.match(report.timeline.notice,/因果|力/);
 report.models=await p.evaluate(()=>{const t=window.__compoundTest,out=[];for(const model of ['aegisEmber','aegisSoldier']){t.changeModel(model);t.setMotion('armor_punch');Object.assign(t.state,{paused:true,pauseTime:.5,punchPlayback:1,gameMode:false});t.forceDraw();const md=t.getModelData(),d=t.v54ExportData();out.push({model,joints:md.skin.joints.length,closedFists:md.geo.filter(m=>m.materialName.startsWith('fist_closed_')).length,legacyGloveHidden:md.geo.filter(m=>m.v62LegacyGloves).length,columns:d.headers.length,app:d.metadata.app_version,commit:d.metadata.implementation_commit,gl:t.gl.getError()});}return out;});
 for(const m of report.models){assert.equal(m.joints,13);assert.equal(m.closedFists,2);assert.equal(m.legacyGloveHidden,1);assert.equal(m.columns,86);assert.equal(m.app,'v62');assert.equal(m.commit,expected.source_commit);assert.equal(m.gl,0);}
 report.different_skeleton=await p.evaluate(()=>{const t=window.__compoundTest,a=t.v54ExportData('xbot','xbot_punch'),b=t.v54ExportData('aegisEmber','armor_punch');return window.__Timeline62.strictCompatibility(a,b,[7],{7:'linear'});});
 assert.equal(report.different_skeleton.ok,false);assert.deepEqual(errors,[]);report.page_errors=errors;report.status='PASS';console.log('PUBLIC_SMOKE_PASS',JSON.stringify({url:report.open_url,boot:report.boot,ybot:report.ybot,timeline:report.timeline,models:report.models}));
})().catch(e=>{report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();const f=process.env.PUBLIC_VERIFY_REPORT||path.join(require('node:os').tmpdir(),'compound-eye-v62-public-verify.json');fs.writeFileSync(f,JSON.stringify(report,null,2));console.log('PUBLIC_VERIFICATION_REPORT',f);});
