const fs=require('fs'),path=require('path'),http=require('http');
const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer');
const input=path.join(require('node:os').tmpdir(),'v54-shot-raw'),
 output=path.resolve(__dirname,'../docs/evidence/v54');
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.join(input,decodeURIComponent(pathname.slice(1)));
 try{res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(file));}
 catch(e){res.statusCode=404;res.end('not found');}});
(async()=>{await new Promise(ok=>server.listen(19660,'127.0.0.1',ok));
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox']});
 const page=await browser.newPage();await page.setViewport({width:1256,height:815,deviceScaleFactor:1});
 for(const model of ['NAVY','SOLDIER'])for(const version of ['before','after']){
  const cells=[];
  for(const view of ['front','three-quarter','side'])for(const phase of ['guard','outgoing','extended','return']){
   const file=version+'-'+model+'-'+view+'-'+phase+'.png';
   cells.push('<div class="cell"><div class="label">'+view+' / '+phase+
    '</div><img src="http://127.0.0.1:19660/'+file+'"></div>');
  }
  await page.setContent('<html><head><style>body{background:#061828;color:#e1f4ff;font-family:Arial,sans-serif;margin:0;padding:8px;box-sizing:border-box;}header{height:41px;font-weight:bold;font-size:20px;padding:6px 8px 0;} .grid{display:grid;grid-template-columns:repeat(4,305px);gap:5px}.cell{background:#091b2b;border:1px solid #30657c;border-radius:6px;overflow:hidden;height:240px}.label{height:21px;font-size:12px;padding-left:8px;color:#bbecfa;background:#0c293e}.cell img{object-fit:contain;width:100%;height:219px}</style></head><body><header>AEGIS '+model+' — '+version.toUpperCase()+' punch A · front / oblique / side</header><div class="grid">'+cells.join('')+'</div></body></html>');
  await page.waitForFunction(()=>[...document.querySelectorAll('img')].every(e=>e.complete&&e.naturalWidth>0),{timeout:20000});
  const f=path.join(output,model.toLowerCase()+'-'+version+'-punch-a.png');
  await page.screenshot({path:f,fullPage:true});
  console.log('MONTAGE',path.basename(f),fs.statSync(f).size);
 }
 await browser.close();server.close();
})().catch(e=>{console.error('MONTAGE_FAILED',e);server.close();process.exit(1)});
