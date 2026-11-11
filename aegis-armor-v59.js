/* AEGIS v59 armor: chest-matched visor strokes, upright center triangle, articulated pauldrons. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisArmor59=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const add=(a,b)=>a.map((x,i)=>x+b[i]),sub=(a,b)=>a.map((x,i)=>x-b[i]),mul=(a,s)=>a.map(x=>x*s),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),norm=a=>{const n=Math.hypot(...a);if(n<1e-10)throw Error('degenerate_vector');return mul(a,1/n);};
function chestThickness(p){
 if(!p||p.length!==12||!Array.from(p).every(Number.isFinite))throw Error('invalid_chest_bar_quad');
 const v=Array.from({length:4},(_,i)=>Array.from(p.slice(i*3,i*3+3))),axis=norm(add(sub(v[1],v[0]),sub(v[2],v[3]))),separation=mul(sub(add(v[0],v[1]),add(v[3],v[2])),.5);
 const thickness=Math.hypot(...sub(separation,mul(axis,dot(separation,axis))));
 if(thickness<.002||thickness>.03)throw Error('unexpected_chest_bar_thickness');return thickness;
}
function mesh(name,bone,color){return{name,bone,p:[],tri:[],col:[],joints:[],weights:[],color};}
function face(m,points){const first=m.p.length/3;for(const p of points){m.p.push(...p);m.col.push(...m.color);m.joints.push(m.bone,0,0,0);m.weights.push(1,0,0,0);}for(let i=1;i<points.length-1;i++)m.tri.push(first,first+i,first+i+1);}
function typed(m){return{...m,p:Float32Array.from(m.p),tri:Uint32Array.from(m.tri),col:Float32Array.from(m.col),joints:Float32Array.from(m.joints),weights:Float32Array.from(m.weights)};}
function shoulders(){
 const out=[];
 for(const side of [-1,1]){
  const name=side<0?'left':'right',bone=side<0?3:6,center=[side*.198,1.010,.018],axis=norm([side*.067,-.176,.037]),outward=[side,0,0];
  const u=norm(sub(outward,mul(axis,dot(axis,outward))));let v=norm([axis[1]*u[2]-axis[2]*u[1],axis[2]*u[0]-axis[0]*u[2],axis[0]*u[1]-axis[1]*u[0]]);if(v[2]<0)v=mul(v,-1);
  const p=(length,radius,angle)=>add(center,add(mul(axis,length),add(mul(u,radius*Math.cos(angle)),mul(v,radius*Math.sin(angle)))));
  const shell=mesh('shoulder_armor_'+name,bone,[.53,.53,.53,1]),edge=mesh('shoulder_armor_trim_'+name,bone,[.71,.71,.71,1]);
  // Open toward the front/inside: the cap does not replace or recolor SOLDIER's cable geometry.
  // The crown and overlapping outer skirt are separate rigid panels on the same upper-arm joint.
  for(const sections of [[[-.020,.045],[.001,.073],[.035,.080],[.065,.073]],[[.061,.076],[.082,.072],[.103,.059]]]){
   const N=11,angles=Array.from({length:N+1},(_,k)=>(-145+205*k/N)*Math.PI/180),wall=.005;
   for(let row=0;row<sections.length-1;row++)for(let k=0;k<N;k++){
    const [a,ra]=sections[row],[b,rb]=sections[row+1],t=angles[k],n=angles[k+1];
    face(shell,[p(a,ra,t),p(b,rb,t),p(b,rb,n),p(a,ra,n)]);
    face(shell,[p(a,ra-wall,n),p(b,rb-wall,n),p(b,rb-wall,t),p(a,ra-wall,t)]);
   }
   for(const index of [0,sections.length-1]){const [s,r]=sections[index];for(let k=0;k<N;k++)face(edge,[p(s,r,angles[k]),p(s,r-wall,angles[k]),p(s,r-wall,angles[k+1]),p(s,r,angles[k+1])]);}
   for(const t of [angles[0],angles[N]])for(let row=0;row<sections.length-1;row++){const [a,ra]=sections[row],[b,rb]=sections[row+1];face(edge,[p(a,ra,t),p(a,ra-wall,t),p(b,rb-wall,t),p(b,rb,t)]);}
  }
  // A chamfer-like raised ridge and four compact fasteners provide readable hard-surface detail.
  for(const angle of [-.8,.30]){
   const a=p(.010,.075,angle),b=p(.054,.077,angle),n=mul(v,.0018);face(edge,[sub(a,n),sub(b,n),add(b,n),add(a,n)]);
  }
  shell.shoulder_side=name;shell.rigid_bone_slot=bone;shell.rigid_pivot_model=center;edge.shoulder_side=name;edge.rigid_bone_slot=bone;edge.rigid_pivot_model=center;out.push(typed(shell),typed(edge));
 }
 return out;
}
function enhance(existing,chestQuads){
 if(!Array.isArray(chestQuads)||chestQuads.length!==2)throw Error('expected_two_chest_bars');
 const measured=chestQuads.map(chestThickness),width=measured.reduce((s,x)=>s+x,0)/measured.length;
 const result=existing.map(m=>{if(!m.name.startsWith('visor_white_bar_'))return m;const p=new Float32Array(m.p);let low=Infinity,high=-Infinity;for(let i=1;i<p.length;i+=3){low=Math.min(low,p[i]);high=Math.max(high,p[i]);}const center=(low+high)/2;for(let i=1;i<p.length;i+=3)p[i]=center+(p[i]-center)*width/(high-low);return{...m,p,stroke_width_model_units:width,chest_reference_widths:measured};});
 const triangle=mesh('visor_white_triangle',2,[1,1,1,1]),cy=1.1765,h=.023,w=.025,front=.139,back=.137;
 const a=[-w/2,cy-h/3,front],b=[w/2,cy-h/3,front],c=[0,cy+2*h/3,front],rear=x=>[x[0],x[1],back];
 face(triangle,[a,b,c]);face(triangle,[rear(c),rear(b),rear(a)]);for(const [v,n] of [[a,b],[b,c],[c,a]])face(triangle,[v,rear(v),rear(n),n]);triangle.upright=true;
 return [...result,typed(triangle),...shoulders()];
}
// Remove inherited scale/shear for hard shoulder shells, preserving the moving joint anchor.
// Only per-mesh draw matrices are updated; measured skeleton matrices remain untouched.
function rigidMatrix(m,pivot){
 if(m.length!==16||pivot.length!==3||![...m,...pivot].every(Number.isFinite))throw Error('invalid_rigid_matrix');
 const x=norm([m[0],m[1],m[2]]),columnY=[m[4],m[5],m[6]],y=norm(sub(columnY,mul(x,dot(columnY,x))));
 const z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
 const anchor=[0,1,2].map(k=>m[k]*pivot[0]+m[4+k]*pivot[1]+m[8+k]*pivot[2]+m[12+k]);
 const t=anchor.map((v,k)=>v-x[k]*pivot[0]-y[k]*pivot[1]-z[k]*pivot[2]);
 return new Float32Array([...x,0,...y,0,...z,0,...t,1]);
}
function updateRigidMeshes(md){
 for(const mesh of md.geo){if(!mesh.v59RigidPivot)continue;const slot=mesh.v57Bone;
  mesh.v59Bones??=new Float32Array(md.bones.length);mesh.v59Bones.set(md.bones);
  mesh.v59Bones.set(rigidMatrix(md.bones.slice(slot*16,slot*16+16),mesh.v59RigidPivot),slot*16);
 }
}
return{chestThickness,shoulders,enhance,rigidMatrix,updateRigidMeshes,revision:'aegis-v59-visor-triangle-chest-matched-strokes-shoulder-armor'};
});
