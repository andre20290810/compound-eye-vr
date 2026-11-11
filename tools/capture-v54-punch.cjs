const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer'),
fs=require('fs'),path=require('path'),http=require('http');
const current=path.resolve(__dirname,'..'),
 baseline=process.env.V53_BASELINE_DIR,
 out=path.join(current,'docs','evidence','v54'),raw=path.join(require('node:os').tmpdir(),'v54-shot-raw');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(raw,{recursive:true});
const serve=(folder,port)=>new Promise(resolve=>{
 const server=http.createServer((req,res)=>{
  const f=path.join(folder,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^[/\\]/,'')||'index.html');
  try{res.setHeader('Content-Type',f.endsWith('.json')?'application/json;charset=utf-8':'text/html;charset=utf-8');res.end(fs.readFileSync(f))}
  catch(e){res.statusCode=404;res.end('Not found')}
 });server.listen(port,'127.0.0.1',()=>resolve(server));
});
(async()=>{
 const servers=[await serve(baseline,19651),await serve(current,19652)];
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,
  args:['--no-sandbox','--enable-webgl','--use-gl=angle']});
 const page=await browser.newPage();await page.setViewport({width:1050,height:740,deviceScaleFactor:1});
 const mistakes=[];
 page.on('pageerror',e=>mistakes.push(String(e)));
 const versions=[['before','19651'],['after','19652']],
 models=[['NAVY','aegisEmber'],['SOLDIER','aegisSoldier']],
 views=[['front',0],['three-quarter',.8],['side',1.53]],
 phases=[['guard',.0],['outgoing',.45],['extended',.65],['return',1.25]];
 const metrics=[];
 for(const [version,port] of versions) {
  await page.goto('http://127.0.0.1:'+port+'/?snap='+version,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.ASSETS?.aegisEmber instanceof ArrayBuffer&&window.__compoundTest?.state?._modelFit,{timeout:25000});
  for(const [modelName,modelId] of models){
   for(const [view,yaw] of views){
    for(const [phase,time] of phases){
     const info=await page.evaluate(({modelId,phase,time,yaw})=>{
      const t=window.__compoundTest;
      t.changeModel(modelId);t.setEyeCount(1);t.setMotion('armor_power_punch');
      Object.assign(t.state,{paused:true,pauseTime:time,punchPlayback:1,gyro:false,viewYaw:yaw,dragYaw:yaw,viewPitch:.07,dragPitch:.07,
       gameLookYaw:0,gameLookPitch:0,showMotionMarkers:false});
      t.forceDraw();
      const md=t.getModelData(),get=n=>{
       const i=md.nodes.findIndex(x=>x.name===n),m=md.world[i];
       return m?[m[12],m[13],m[14]]:null;
      };
      const p={head:get('Head'),elbow:get('R_Forearm'),hand:get('R_Hand'),
       shoulder:get('R_UpperArm'),sourceTime:t.state._renderedAnimationTime};
      return p;
     },{modelId,phase,time,yaw});
     const file=version+'-'+modelName+'-'+view+'-'+phase+'.png';
     await (await page.$('#screen')).screenshot({path:path.join(raw,file)});
     metrics.push({version,model:modelName,view,phase,time,...info});
    }
   }
  }
 }
 fs.writeFileSync(path.join(out,'punch-pose-measurements.json'),JSON.stringify({
  note:'Original animation seconds, punchPlayback=1; camera drag and view yaw both fixed for front/oblique/side. Bone origins are not glove centroid or human skill criteria.',metrics
 },null,2));
 console.log('FRAMES',metrics.length,'ERRORS',mistakes.length,JSON.stringify(mistakes).slice(0,250));
 await browser.close();servers.forEach(s=>s.close());
})().catch(e=>{console.error('SCREENSHOTS_FAILED',e);process.exit(1)});
