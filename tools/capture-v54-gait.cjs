const fs=require('fs'),path=require('path'),http=require('http'),
puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const current=path.resolve(__dirname,'..'),
 previous=process.env.V53_BASELINE_DIR,
 out=path.join(current,'docs','evidence','v54'),raw=path.join(require('node:os').tmpdir(),'v54-gait-shot-raw');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(raw,{recursive:true});
const startServer=(folder,port)=>new Promise(r=>{const srv=http.createServer((req,res)=>{const f=path.join(folder,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^[/\\]/,'')||'index.html');try{res.setHeader('Content-Type','text/html;charset=utf-8');res.end(fs.readFileSync(f));}catch(e){res.statusCode=404;res.end('404')}});srv.listen(port,'127.0.0.1',()=>r(srv));});
(async()=>{
 const servers=[await startServer(previous,19665),await startServer(current,19666)];
 const b=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle']});
 const p=await b.newPage();await p.setViewport({width:1030,height:690});
 const errors=[];p.on('pageerror',e=>errors.push(String(e)));
 for(const [version,port] of [['before',19665],['after',19666]]){
  await p.goto('http://127.0.0.1:'+port+'/?gait='+version,{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.__compoundTest?.state?._modelFit&&window.ASSETS?.aegisEmber instanceof ArrayBuffer,{timeout:25000});
  for(const [model,modelID] of [['NAVY','aegisEmber'],['SOLDIER','aegisSoldier']]){
   for(const [motion,id] of [['walk','armor_walk'],['run','armor_run']]){
    for(const [phase,tm] of [['start',.08],['mid',.20],['stride',.35]]){
     await p.evaluate(({modelID,id,tm})=>{
      const t=window.__compoundTest;
      t.changeModel(modelID);t.setEyeCount(1);t.setMotion(id);
      Object.assign(t.state,{paused:true,pauseTime:tm,viewYaw:.55,dragYaw:.55,viewPitch:.05,dragPitch:.05,gyro:false,showMotionMarkers:false,zoom:1});
      t.forceDraw();
     },{modelID,id,tm});
     const f=version+'-'+model+'-'+motion+'-'+phase+'.png';
     await (await p.$('#screen')).screenshot({path:path.join(raw,f)});
    }
   }
  }
 }
 console.log('GAIT_FRAMES',fs.readdirSync(raw).filter(f=>f.endsWith('.png')).length,'ERRORS',JSON.stringify(errors));
 await b.close();servers.forEach(s=>s.close());
})().catch(e=>{console.error('CAPTURE_FAIL',e);process.exit(1)});
