const puppeteer=require(process.env.PUPPETEER_MODULE||'puppeteer'),http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),server=http.createServer((req,res)=>{try{res.end(fs.readFileSync(path.join(root,'index.html')))}catch(e){res.statusCode=404;res.end('404')}});
(async()=>{await new Promise(ok=>server.listen(19645,'127.0.0.1',ok));const browser=await puppeteer.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--enable-webgl','--use-gl=angle']});
const page=await browser.newPage();await page.goto('http://127.0.0.1:19645',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.ASSETS?.aegisEmber instanceof ArrayBuffer&&!!window.__compoundTest?.state?._modelFit,{timeout:28000});
const r=await page.evaluate(()=>{
 const t=window.__compoundTest;t.changeModel('aegisEmber');t.state.punchPlayback=1;t.setEyeCount(1);t.state.paused=true;t.state.pauseTime=0;t.setMotion('armor_breathe');t.forceDraw();
 const md=t.getModelData(),gl=t.gl,handIndex=md.skin.joints.indexOf(md.nodes.findIndex(x=>x.name==='R_Hand'));
 const read=buf=>{gl.bindBuffer(gl.ARRAY_BUFFER,buf);const bytes=gl.getBufferParameter(gl.ARRAY_BUFFER,gl.BUFFER_SIZE),v=new Float32Array(bytes/4);gl.getBufferSubData(gl.ARRAY_BUFFER,0,v);return v;};
 const verts=[];let count=0;
 for(const mesh of md.geo){
  if(!mesh.skinned||mesh.materialName!=='gloves')continue;
  const pos=read(mesh.p),joint=read(mesh.joint),w=read(mesh.weight);
  for(let i=0;i<pos.length/3;i++){
   const J=[...joint.slice(i*4,i*4+4)].map(Math.round),W=[...w.slice(i*4,i*4+4)];
   if(J.some((id,k)=>id===handIndex&&W[k]>.55)){verts.push({p:[...pos.slice(i*3,i*3+3)],j:J,w:W});count++;}
  }
 }
 const mp=(a,p)=>[a[0]*p[0]+a[4]*p[1]+a[8]*p[2]+a[12],a[1]*p[0]+a[5]*p[1]+a[9]*p[2]+a[13],a[2]*p[0]+a[6]*p[1]+a[10]*p[2]+a[14]];
 const frames=[];
 for(const motion of ['armor_breathe','armor_power_punch','armor_punch']){
  t.setMotion(motion);t.state.paused=true;
  for(const time of [0,.3,.45,.65,.75,1.25,1.6]){
   t.state.pauseTime=time;t.forceDraw();
   const idx=n=>md.nodes.findIndex(x=>x.name===n),bone=n=>{const m=md.world[idx(n)];return [m[12],m[13],m[14]]};
   const xyz=verts.map(v=>{
    let dst=[0,0,0];for(let k=0;k<4;k++)if(v.w[k]>0&&v.j[k]>=0&&v.j[k]<13){
     const m=md.bones.slice(v.j[k]*16,(v.j[k]+1)*16),p=mp(m,v.p);
     dst=dst.map((x,j)=>x+p[j]*v.w[k]);
    }return dst;
   });
   const centroid=[0,1,2].map(j=>xyz.reduce((sum,v)=>sum+v[j],0)/xyz.length);
   const hand=bone('R_Hand'),elbow=bone('R_Forearm'),head=bone('Head');
   frames.push({motion,time,original_animation_time_s:t.state._renderedAnimationTime,hand,elbow,head,glove:centroid,
    gloveOffset:centroid.map((x,j)=>x-hand[j]),
    gloveToHead:centroid.map((x,j)=>x-head[j]),
    elbowHeightGap:centroid[1]-elbow[1],
    upperLen:Math.hypot(...bone('R_Forearm').map((x,j)=>x-bone('R_UpperArm')[j])),
    foreLen:Math.hypot(...hand.map((x,j)=>x-elbow[j]))});
  }
 }
 t.setMotion('armor_power_punch');t.state.paused=true;t.state.pauseTime=0;t.forceDraw();
 const hIdx=md.nodes.findIndex(n=>n.name==='R_Hand'),m=md.world[hIdx];
 const before=frames.find(f=>f.motion==='armor_power_punch'&&f.time===0);
 const delta=before.glove.map((v,j)=>v-before.hand[j]);
 const local=[m[0]*delta[0]+m[1]*delta[1]+m[2]*delta[2],
  m[4]*delta[0]+m[5]*delta[1]+m[6]*delta[2],
  m[8]*delta[0]+m[9]*delta[1]+m[10]*delta[2]];
 return {vertexCount:count,neutralWorldHandMatrix:Array.from(m),
  neutralOffsetWorld:delta,bindHandLocalOffset:local,frames};
});
const dst=path.join(root,'docs','evidence','v54','fist-geometry-samples.json');
 fs.writeFileSync(dst,JSON.stringify({source:'skinned R_Hand glove vertices',model:'AEGIS shared 13-joint asset',
  hand_vertex_count:r.vertexCount,glove_bind_offset_local:r.bindHandLocalOffset,
  samples:r.frames},null,2));
 const punches=r.frames.filter(x=>x.motion==='armor_power_punch'&&[0,.45,.65,.75,1.25].includes(x.time));
 console.log('FIST_SAMPLES',JSON.stringify(punches));
 await browser.close();server.close()})().catch(e=>{console.error('FATAL',e);process.exit(1)});
