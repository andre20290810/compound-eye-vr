/* AEGIS v56 details: paired temple antennae and working exposed turbine rotors. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisDetails56=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const palette={navy:[.62,.72,.96,1],steel:[.78,.84,.98,1],panel:[.48,.60,.88,1],white:[1,1,1,1]};
function builder(name,bone=1,color=palette.navy,animation=null){return {name,bone,color,animation,p:[],tri:[],col:[],joints:[],weights:[]};}
function vertex(m,p){const i=m.p.length/3;m.p.push(...p);m.col.push(...m.color);m.joints.push(m.bone,0,0,0);m.weights.push(1,0,0,0);return i;}
function face(m,points){const base=m.p.length/3;for(const p of points)vertex(m,p);for(let i=1;i<points.length-1;i++)m.tri.push(base,base+i,base+i+1);}
function box(m,c,size){const v=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])v.push(c.map((n,k)=>n+[x,y,z][k]*size[k]/2));for(const q of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])face(m,q.map(i=>v[i]));}
function ring(m,c,inner,outer,depth,axis='z',N=24){
 const point=(r,a,d)=>axis==='z'?[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[2]+d]:[c[0]+r*Math.cos(a),c[1]+d,c[2]+r*Math.sin(a)];
 for(let k=0;k<N;k++){const a=k*2*Math.PI/N,b=(k+1)*2*Math.PI/N,d=depth/2;
  for(const rr of [inner,outer])face(m,[point(rr,a,-d),point(rr,b,-d),point(rr,b,d),point(rr,a,d)]);
  for(const dd of [-d,d])face(m,[point(inner,a,dd),point(outer,a,dd),point(outer,b,dd),point(inner,b,dd)]);
 }
}
function tube(m,start,end,r1,r2,N=10){
 const dir=end.map((x,k)=>x-start[k]),len=Math.hypot(...dir),d=dir.map(x=>x/len),ref=Math.abs(d[1])<.9?[0,1,0]:[1,0,0];
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let u=cross(d,ref);u=u.map(x=>x/Math.hypot(...u));const v=cross(d,u);
 const point=(p,r,a)=>p.map((x,k)=>x+r*(u[k]*Math.cos(a)+v[k]*Math.sin(a)));
 for(let k=0;k<N;k++){const a=k*2*Math.PI/N,b=(k+1)*2*Math.PI/N;face(m,[point(start,r1,a),point(start,r1,b),point(end,r2,b),point(end,r2,a)]);}
 face(m,Array.from({length:N},(_,k)=>point(start,r1,-k*2*Math.PI/N)));face(m,Array.from({length:N},(_,k)=>point(end,r2,k*2*Math.PI/N)));
}
function rotor(m,c,radius,axis='z',blades=9){
 const p=(r,a,offset=0)=>axis==='z'?[c[0]+r*Math.cos(a),c[1]+r*Math.sin(a),c[2]+offset]:[c[0]+r*Math.cos(a),c[1]+offset,c[2]+r*Math.sin(a)];
 ring(m,c,.002,radius*.20,.007,axis,16);
 for(let k=0;k<blades;k++){const a=k*2*Math.PI/blades;
  face(m,[p(radius*.18,a,-.002),p(radius*.87,a+.13,.003),p(radius*.93,a+.35,.003),p(radius*.25,a+.48,-.002)]);
  face(m,[p(radius*.25,a+.48,-.003),p(radius*.93,a+.35,.002),p(radius*.87,a+.13,.002),p(radius*.18,a,-.003)]);
 }
}
function typed(m){return {...m,p:Float32Array.from(m.p),tri:Uint32Array.from(m.tri),col:Float32Array.from(m.col),joints:Float32Array.from(m.joints),weights:Float32Array.from(m.weights)};}
function geometry(){
 const all=[],antenna=builder('temple_antennae',2,palette.steel),mounts=builder('temple_mounts',2,palette.navy);all.push(antenna,mounts);
 // One slender rearward/upward antenna on each temple, as indicated in the photos.
 for(const side of [-1,1]){const start=[side*.078,1.162,.030],end=[side*.111,1.253,-.071];box(mounts,start,[.013,.020,.022]);tube(antenna,start,end,.0047,.0018,8);}
 const casing=builder('jet_intake_housings',1,palette.navy),rings=builder('jet_mechanical_rings',1,palette.steel),details=builder('jet_service_panels',1,palette.panel);all.push(casing,rings,details);
 for(const [side,x] of [[-1,-.077],[1,.077]]){
  const intake=[x,.923,-.230];
  // Open back-facing fan port: the moving vanes remain visible inside a fixed rim.
  ring(casing,intake,.034,.047,.030,'z');ring(rings,[x,.923,-.248],.033,.039,.006,'z');
  const fan=builder('jet_intake_rotor_'+(side<0?'left':'right'),1,palette.steel,{kind:'turbine',pivot:[x,.923,-.247],axis:[0,0,1],direction:side});rotor(fan,fan.animation.pivot,.034,'z');all.push(fan);
  const nozzle=[x,.699,-.177];ring(rings,nozzle,.040,.049,.008,'y');
  const ex=builder('jet_exhaust_rotor_'+(side<0?'left':'right'),1,palette.steel,{kind:'turbine',pivot:[x,.705,-.177],axis:[0,1,0],direction:-side});rotor(ex,ex.animation.pivot,.037,'y',10);all.push(ex);
  // Nested cooling collars, visible fasteners and longitudinal heat-exchanger fins.
  for(const y of [.795,.812,.833,1.015,1.032])ring(rings,[x,y,-.177],.038,.044,.004,'y');
  for(let k=0;k<8;k++){const a=2*Math.PI*k/8;const c=[x+.042*Math.cos(a),.923+.042*Math.sin(a),-.251];box(rings,c,[.004,.004,.006]);}
  for(let k=0;k<4;k++)box(details,[x+side*.039,.85+k*.016,-.176],[.013,.006,.062]);
  tube(casing,[x+side*.030,.80,-.19],[x+side*.030,1.02,-.19],.005,.005);
  box(details,[x,.872,-.224],[.033,.020,.008]);
 }
 for(const side of [-1,1]){const bar=builder('visor_spinner_'+(side<0?'left':'right'),2,palette.white,{kind:'visor_clockwise',pivot:[side*.042,1.1765,.137],axis:[0,0,1]});bar.onlyMotion='armor_idle2';bar.whiteEmission=true;box(bar,bar.animation.pivot,[.037,.005,.002]);all.push(bar);}
 return all.map(typed);
}
function isOriginalVisorBar(material,p,joints){return material==='Aegis_Luminous_Trim'&&p.length===12&&joints&&Math.round(joints[0])===2&&p[1]>1.17;}
return {geometry,isOriginalVisorBar,palette,revision:'aegis-v56-temple-antenna-working-turbines'};
});
