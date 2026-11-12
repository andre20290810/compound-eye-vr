/* v62 AEGIS B: closed gloves, attached rigid wrist cuffs and no dangling fingers.
   Meshes are anchored to the pre-existing hand skin slots; no new skeleton joints. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisFists62=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const color=[.20,.36,.67,1],P=Math.PI;
function mesh(name,bone){return{name,bone,onlyMotion:['armor_alternate_punch','armor_combo_punch','armor_punch'],p:[],n:[],col:[],tri:[],joints:[],weights:[]};}
function v(m,p,n){const id=m.p.length/3;m.p.push(...p);m.n.push(...n);m.col.push(...color);m.joints.push(m.bone,0,0,0);m.weights.push(1,0,0,0);return id;}
function quad(m,a,b,c,d,n){const ids=[a,b,c,d].map(p=>v(m,p,n));m.tri.push(ids[0],ids[1],ids[2],ids[0],ids[2],ids[3]);}
function ellipsoid(m,c,r,lat=10,lon=16){
 const start=m.p.length/3;
 for(let i=0;i<=lat;i++){const th=P*i/lat;for(let j=0;j<=lon;j++){const ph=2*P*j/lon,s=Math.sin(th),n=[s*Math.cos(ph),Math.cos(th),s*Math.sin(ph)],pos=c.map((x,k)=>x+n[k]*r[k]);v(m,pos,n);}}
 for(let i=0;i<lat;i++)for(let j=0;j<lon;j++){const a=start+i*(lon+1)+j,b=a+lon+1;m.tri.push(a,b,a+1,a+1,b,b+1);}
}
function cuff(m,c,a,b,radius){
 const rings=[],n=18;
 for(const [z,rad] of [[a,radius*.9],[a+.008,radius],[b-.006,radius*.85],[b,radius*.74]]){
  const ring=[];for(let j=0;j<n;j++){const theta=2*P*j/n,x=Math.cos(theta),y=Math.sin(theta);ring.push(v(m,[c[0]+rad*x,c[1]+rad*y,z],[x,y,0]));}rings.push(ring);
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){const next=(j+1)%n;const x=rings[k][j],y=rings[k][next],z=rings[k+1][j],w=rings[k+1][next];m.tri.push(x,y,z,y,w,z);}
}
function geometry(){
 const out=[];
 for(const sign of [-1,1]){
  const slot=sign<0?5:8,name=sign<0?'left':'right',x=sign*.31589,y=.704;
  const m=mesh('fist_closed_'+name,slot);
  // Joint-root -> knuckle shell: a single wrist cuff prevents visible separation.
  cuff(m,[x,.712],.080,.188,.032);
  ellipsoid(m,[x,y,.202],[.041,.037,.043],9,14);
  // Four rounded, tucked knuckles and a folded thumb; no splayed digits.
  for(let j=0;j<4;j++){const dx=(j-1.5)*.018;ellipsoid(m,[x+dx,y-.004,.235],[.011,.016,.016],7,11);}
  ellipsoid(m,[x+sign*.037,y-.027,.197],[.018,.021,.022],8,13);
  // Low-profile wrist guard seam.
  cuff(m,[x,.712],.114,.127,.037);
  out.push({...m,p:Float32Array.from(m.p),n:Float32Array.from(m.n),col:Float32Array.from(m.col),tri:Uint32Array.from(m.tri),joints:Float32Array.from(m.joints),weights:Float32Array.from(m.weights)});
 }
 return out;
}
return{geometry,revision:'aegis-closed-fist-wrist-attach-v63-002'};
});
