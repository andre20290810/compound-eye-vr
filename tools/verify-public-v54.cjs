'use strict';
// Verify deployed bytes, then boot the actual public URL. No real HMD claims.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const root=path.resolve(__dirname,'..'),expected=JSON.parse(fs.readFileSync(path.join(root,'build-manifest.json'),'utf8'));
const base=(process.env.PUBLIC_URL||'https://andre20290810.github.io/compound-eye-vr/').replace(/\/?$/,'/');
const report={url:base,checked_at:new Date().toISOString(),expected_source_commit:expected.source_commit,real_hardware_test:false};
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
let browser;
(async()=>{
 assert.equal(expected.app_version,'v54');let deployed=false,last;
 for(let i=0;i<18;i++){
  try{
   const stamp='?verify='+Date.now();const r=await fetch(base+'build-manifest.json'+stamp,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('manifest HTTP '+r.status);
   const m=await r.json();if(m.source_commit!==expected.source_commit||m.app_version!=='v54')throw Error('older build '+m.app_version+' '+m.source_commit);
   const html=await fetch(base+stamp,{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!html.ok)throw Error('HTML HTTP '+html.status);
   const digest=hash(Buffer.from(await html.arrayBuffer()));assert.equal(digest,expected.source_files_sha256['index.html']);
   report.manifest=m;report.html_sha256=digest;deployed=true;console.log('PUBLIC_BYTES_MATCH',m.source_commit);break;
  }catch(e){last=String(e);if(i%3===0)console.log('DEPLOY_CHECK',i+1,last);await new Promise(r=>setTimeout(r,5000));}
 }
 if(!deployed)throw Error('Published version not verified: '+last);
 for(const file of ['kinematics-v54.js','motion-csv-v54.js','kinematic-view-v54.js','motion-workbench-v48.js']){
  const r=await fetch(base+file+'?v='+expected.source_commit,{cache:'no-store'});assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),expected.source_files_sha256[file]);
 }
 browser=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle']});const page=await browser.newPage();await page.setCacheEnabled(false);await page.setViewport({width:1250,height:860});const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 report.open_url=base+'?v=54&build='+expected.source_commit.slice(0,7);await page.goto(report.open_url,{waitUntil:'domcontentloaded',timeout:45000});await page.waitForFunction(()=>window.__compoundTest?.version==='54'&&window.ASSETS?.aegisEmber instanceof ArrayBuffer&&window.__compoundTest.state._modelFit,{timeout:45000});
 const state=await page.evaluate(()=>{const t=window.__compoundTest;t.changeModel('xbot');t.setMotion('xbot_punch');t.setEyeCount(6);Object.assign(t.state,{paused:true,pauseTime:0,punchPlayback:1});t.forceDraw();const csv=t.v54ExportData();document.getElementById('experimentPanel').open=true;document.getElementById('v54AnalysisPanel').open=true;return{version:t.version,title:document.title,rows:csv.rows.length,columns:csv.headers.length,implementation_commit:csv.metadata.implementation_commit,skeleton_joints:csv.data.joints.length};});
 assert.equal(state.rows,1088);assert.equal(state.columns,86);assert.equal(state.implementation_commit,expected.source_commit);assert.equal(state.skeleton_joints,32);
 await page.waitForFunction(()=>window.__compoundTest.getV54().current);const analysis=await page.evaluate(()=>{const t=window.__compoundTest;t.v54Seek(.2);t.forceDraw();return{peak_lag_s:t.getV54().current.lag,source_time:t.state._renderedAnimationTime,gl_error:t.gl.getError(),quality:document.getElementById('v54Quality').textContent};});assert.ok(Math.abs(analysis.peak_lag_s-1/15)<1e-9);assert.equal(analysis.source_time,.2);assert.equal(analysis.gl_error,0);assert.ok(!/解析不可|解析失敗|ReferenceError/.test(analysis.quality));
 report.models=await page.evaluate(()=>{const t=window.__compoundTest;document.getElementById('v54AnalysisPanel').open=false;return ['aegisEmber','aegisSoldier'].map(model=>{t.changeModel(model);t.setMotion('armor_power_punch');Object.assign(t.state,{paused:true,pauseTime:.65,punchPlayback:1});t.forceDraw();return{model,bones:t.getModelData().skin.joints.length,gl_error:t.gl.getError()};});});for(const m of report.models){assert.equal(m.bones,13);assert.equal(m.gl_error,0);}
 assert.deepEqual(errors,[]);report.boot=state;report.analysis=analysis;report.page_errors=errors;report.status='PASS';console.log('PUBLIC_SMOKE_PASS',JSON.stringify({url:report.open_url,...state,analysis}));
})().catch(e=>{report.status='FAIL';report.error=String(e);console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();const file=process.env.PUBLIC_VERIFY_REPORT||path.join(require('node:os').tmpdir(),'compound-eye-v54-public-verify.json');fs.writeFileSync(file,JSON.stringify(report,null,2));console.log('PUBLIC_VERIFICATION_REPORT',file);});
