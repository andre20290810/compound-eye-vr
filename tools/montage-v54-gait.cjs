const fs=require('fs'),path=require('path'),http=require('http'),puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const raw=path.join(require('node:os').tmpdir(),'v54-gait-shot-raw'),out=path.resolve(__dirname,'../docs/evidence/v54');
const server=http.createServer((req,res)=>{const f=path.join(raw,decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^[/\\]/,''));
 try{res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(f))}catch(e){res.statusCode=404;res.end('404')}});
(async()=>{await new Promise(ok=>server.listen(19667,'127.0.0.1',ok));const b=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox']});
const p=await b.newPage();await p.setViewport({width:1180,height:665,deviceScaleFactor:1});
for(const model of ['NAVY','SOLDIER'])for(const motion of ['walk','run']){
const cells=[];
for(const version of ['before','after'])for(const phase of ['start','mid','stride']){
 const file=version+'-'+model+'-'+motion+'-'+phase+'.png';
 cells.push('<div class="cell"><div class="label">'+version.toUpperCase()+' / '+phase+'</div><img src="http://127.0.0.1:19667/'+file+'"></div>');
}
await p.setContent('<html><head><style>body{margin:0;padding:7px;background:#071a28;color:#e0f7fd;font-family:Arial,sans-serif}header{font-size:20px;font-weight:bold;height:36px}.grid{display:grid;grid-template-columns:repeat(3,378px);gap:5px}.cell{height:302px;border:1px solid #316582;border-radius:6px;overflow:hidden;background:#081b2b}.label{height:20px;padding:3px 8px;background:#0f2d40;color:#fff;font-size:12px}.cell img{width:100%;height:275px;object-fit:contain}</style></head><body><header>AEGIS '+model+' — '+motion.toUpperCase()+' · before (top) vs after (bottom)</header><div class="grid">'+cells.join('')+'</div></body></html>');
await p.waitForFunction(()=>[...document.querySelectorAll('img')].every(e=>e.complete&&e.naturalWidth>0),{timeout:16000});
const f=path.join(out,model.toLowerCase()+'-'+motion+'-before-after.png');
await p.screenshot({path:f,fullPage:true});console.log('GAIT_MONTAGE',path.basename(f),fs.statSync(f).size);
}
await b.close();server.close();
})().catch(e=>{console.error('MONTAGE_FATAL',e);server.close();process.exit(1)});
