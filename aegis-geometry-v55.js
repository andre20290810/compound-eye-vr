/* AEGIS v55: anatomical lower-body binding and rigid hard-surface accessories.
   Pure geometry preparation; never changes the source skeleton, joint poses or camera. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisGeometry55=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const u=clamp((x-a)/(b-a),0,1);return u*u*(3-2*u);};
function components(p,tri){
 const parent=new Int32Array(p.length/3);for(let i=0;i<parent.length;i++)parent[i]=i;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
 const weld=new Map();
 for(let i=0;i<parent.length;i++){const key=[0,1,2].map(k=>Math.round(p[3*i+k]*1e5)).join(',');if(weld.has(key))join(i,weld.get(key));else weld.set(key,i);}
 for(let i=0;i<tri.length;i+=3){join(tri[i],tri[i+1]);join(tri[i],tri[i+2]);}
 const groups=new Map();for(let i=0;i<parent.length;i++){const id=find(i);if(!groups.has(id))groups.set(id,{id,vertices:[],min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});const g=groups.get(id);g.vertices.push(i);for(let k=0;k<3;k++){g.min[k]=Math.min(g.min[k],p[3*i+k]);g.max[k]=Math.max(g.max[k],p[3*i+k]);}}
 return {groups:[...groups.values()],groupOf:Uint32Array.from(parent,(_,i)=>find(i))};
}
function legWeights(x,y){
 // Bone slots in the unchanged 13-joint AEGIS skin: pelvis0,Lthigh9,Lshank10,Rthigh11,Rshank12.
 const upper=x>=0?11:9,lower=upper+1;
 if(y<=.305)return [[lower,1]];
 if(y<.385){const u=smooth(.305,.385,y);return [[lower,1-u],[upper,u]];}
 if(y<=.59)return [[upper,1]];
 if(y<.705){const u=smooth(.59,.705,y);return [[upper,1-u],[0,u]];}
 return [[0,1]];
}
function prepare({modelId,materialName,p,n,col,tri,joints,weights}){
 const report={material:materialName,changed_vertices:0,removed_triangles:0,rigid_components:0,knife_components:0,backpack_components:0};
 if(!['aegisEmber','aegisSoldier'].includes(modelId)||!joints||!weights)return {tri,report};
 const topology=components(p,tri),remove=new Set();
 const put=(i,pairs)=>{for(let k=0;k<4;k++){joints[i*4+k]=pairs[k]?.[0]||0;weights[i*4+k]=pairs[k]?.[1]||0;}report.changed_vertices++;};
 for(const g of topology.groups){
  const [xmin,ymin,zmin]=g.min,[xmax,ymax,zmax]=g.max;
  const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
  // The asymmetrical shoulder blade is in armor fabric, NOT the neck cable primitive.
  const blade=materialName==='armor fabric'&&xmin>.10&&xmax<.17&&ymin>1.005&&ymax>1.07&&ymax<1.12&&zmin<-.06;
  const bladeMount=materialName==='vest hardware'&&xmin>.118&&xmax<.14&&ymin>1.018&&ymax>1.04&&ymax<1.05;
  // Replace the rear pack with actual thrust pods; preserve front chest accessories.
  const oldPack=materialName==='backpack'&&zmax<-.045;
  if(blade||bladeMount||oldPack){remove.add(g.id);if(oldPack)report.backpack_components++;else report.knife_components++;continue;}
  if(['pants','boots','cables','vest hardware','armor fabric'].includes(materialName)&&ymin<.74){
   const oneSide=xmin>0||xmax<0;
   // Detached plates, pockets and boot shells rotate rigidly. No skin shear inside a plate.
   const rigid=oneSide&&ymax<.755&&(
    materialName==='boots'||materialName==='vest hardware'||
    materialName==='armor fabric'||(materialName==='pants'&&g.vertices.length<1000)||
    (materialName==='cables'&&(ymax<.305||(ymin>.385&&ymax<.59))));
   if(rigid){
    const bone=cy<.395?(cx>=0?12:10):cy<.665?(cx>=0?11:9):0;
    for(const i of g.vertices)put(i,[[bone,1]]);report.rigid_components++;
   }else{
    for(const i of g.vertices){const x=p[i*3],y=p[i*3+1];if(y<.74&&Math.abs(x)<.19)put(i,materialName==='armor fabric'?[[0,1]]:legWeights(x,y));}
   }
  }
 }
 if(remove.size){const keep=[];for(let i=0;i<tri.length;i+=3){if(remove.has(topology.groupOf[tri[i]])){report.removed_triangles++;continue;}keep.push(tri[i],tri[i+1],tri[i+2]);}tri=new Uint32Array(keep);}
 if(materialName==='pants'){const rebuilt=splitPants({p,n,col,tri,joints,weights},topology);report.segmented_main_panels=true;return {...rebuilt,report};}
 return {tri,report};
}
// A continuous plate cannot be pulled by opposite legs without stretching.
// Cut the original surface at the actual knee and hip articulation zones, duplicate
// boundary vertices and bind each resulting panel rigidly. No source triangles are hidden.
function splitPants(source,topology){
 const output={p:[],n:[],col:[],tri:[],joints:[],weights:[]};
 const main=new Set(topology.groups.filter(g=>g.vertices.length>=1000).map(g=>g.id));
 const {p,n,col,tri,joints,weights}=source;
 const vertex=i=>({p:Array.from(p.slice(i*3,i*3+3)),n:n?Array.from(n.slice(i*3,i*3+3)):[0,0,1],c:col?Array.from(col.slice(i*4,i*4+4)):[.5,.5,.5,1]});
 const mix=(a,b,t)=>({p:a.p.map((v,i)=>v+(b.p[i]-v)*t),n:a.n.map((v,i)=>v+(b.n[i]-v)*t),c:a.c.map((v,i)=>v+(b.c[i]-v)*t)});
 const clip=(poly,axis,bound,sign)=>{
  const out=[];if(!poly.length)return out;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],da=sign*(a.p[axis]-bound),db=sign*(b.p[axis]-bound),insideA=da>=-1e-9,insideB=db>=-1e-9;
   if(insideA)out.push(a);if(insideA!==insideB)out.push(mix(a,b,da/(da-db)));
  }return out;
 };
 const emit=(poly,bone)=>{
  if(poly.length<3)return;
  for(let j=1;j<poly.length-1;j++){
   const points=[poly[0],poly[j],poly[j+1]],a=points[0].p,b=points[1].p,c=points[2].p;
   const u=b.map((v,k)=>v-a[k]),v=c.map((w,k)=>w-a[k]);
   if(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])<1e-12)continue;
   for(const point of points){const idx=output.p.length/3;output.p.push(...point.p);const length=Math.hypot(...point.n)||1;output.n.push(...point.n.map(x=>x/length));output.col.push(...point.c);output.joints.push(bone,0,0,0);output.weights.push(1,0,0,0);output.tri.push(idx);}
  }
 };
 for(let i=0;i<tri.length;i+=3){
  const ids=[tri[i],tri[i+1],tri[i+2]],poly=ids.map(vertex);
  if(!main.has(topology.groupOf[ids[0]])){emit(poly,Math.round(joints[ids[0]*4]));continue;}
  emit(clip(poly,1,.64,1),0);
  const lower=clip(poly,1,.64,-1);
  emit(clip(clip(lower,0,-.026,1),0,.026,-1),0);
  for(const [sign,upper] of [[-1,9],[1,11]]){
   const leg=clip(lower,0,sign*.026,sign);
   emit(clip(leg,1,.348,1),upper);emit(clip(leg,1,.348,-1),upper+1);
  }
 }
 return {p:Float32Array.from(output.p),n:Float32Array.from(output.n),col:Float32Array.from(output.col),tri:Uint32Array.from(output.tri),joints:Float32Array.from(output.joints),weights:Float32Array.from(output.weights)};
}
function jointCovers(){
 const p=[],tri=[],col=[],joints=[],weights=[],N=20,R=12;
 for(const side of [-1,1])for(const knee of [false,true]){
  const center=knee?[side*.117,.348,.004]:[side*.107,.665,0],radius=knee?[.045,.048,.042]:[.055,.055,.055],bone=side<0?(knee?10:9):(knee?12:11),start=p.length/3;
  for(let row=0;row<=R;row++){const angle=Math.PI*row/R;for(let k=0;k<N;k++){const theta=k*2*Math.PI/N;p.push(center[0]+radius[0]*Math.sin(angle)*Math.cos(theta),center[1]+radius[1]*Math.cos(angle),center[2]+radius[2]*Math.sin(angle)*Math.sin(theta));col.push(.53,.64,.82,1);joints.push(bone,0,0,0);weights.push(1,0,0,0);}}
  for(let row=0;row<R;row++)for(let k=0;k<N;k++){const a=start+row*N+k,b=start+row*N+(k+1)%N,c=a+N,d=b+N;tri.push(a,b,c,b,d,c);}
 }
 return {name:'leg_articulation_covers',p:Float32Array.from(p),tri:Uint32Array.from(tri),col:Float32Array.from(col),joints:Float32Array.from(joints),weights:Float32Array.from(weights)};
}
function jetGeometry(){
 const meshes=[];
 const make=name=>{const o={name,p:[],tri:[],col:[],joints:[],weights:[]};meshes.push(o);return o;};
 const body=make('jet_body'),trim=make('jet_trim'),dark=make('jet_nozzle'),glow=make('jet_exhaust');
 const colors={jet_body:[.58,.68,.85,1],jet_trim:[.88,.92,.98,1],jet_nozzle:[.62,.72,.96,1],jet_exhaust:[1,.35,.055,1]};
 function vertex(m,p){const i=m.p.length/3;m.p.push(...p);m.col.push(...colors[m.name]);m.joints.push(1,0,0,0);m.weights.push(1,0,0,0);return i;}
 function lathe(m,cx,cz,rings,N=20){
  const start=m.p.length/3;for(const [y,r] of rings)for(let k=0;k<N;k++){const a=k*2*Math.PI/N;vertex(m,[cx+r*Math.cos(a),y,cz+r*Math.sin(a)]);}
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<N;k++){const a=start+j*N+k,b=start+j*N+(k+1)%N,c=a+N,d=b+N;m.tri.push(a,b,c,b,d,c);}
 }
 function box(m,center,size){const start=m.p.length/3;for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])vertex(m,center.map((c,k)=>c+[x,y,z][k]*size[k]/2));for(const q of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])m.tri.push(...q.slice(0,3).map(i=>start+i),start+q[0],start+q[2],start+q[3]);}
 // Twin slender rocket pods: pointed fairing, cylindrical engine, neck and hollow flared nozzle.
 for(const x of [-.077,.077]){
  const z=-.177;
  lathe(body,x,z,[[1.13,.001],[1.10,.023],[1.055,.041],[.82,.041],[.777,.032],[.758,.025]]);
  for(const y of [.835,.99,1.052])lathe(trim,x,z,[[y-.007,.041],[y-.006,.044],[y+.006,.044],[y+.007,.041]]);
  lathe(dark,x,z,[[.775,.027],[.751,.027],[.704,.05],[.694,.051],[.693,.045],[.704,.043],[.744,.022]]);
  lathe(glow,x,z,[[.741,.021],[.738,.021],[.737,.001]]);
  // Engine service rail and compact stabilizing fins. Neither is a knife-shaped shoulder prop.
  box(dark,[x,.915,z-.042],[.015,.20,.010]);
  box(trim,[x,.94,z-.049],[.007,.055,.004]);
  box(body,[x+(x<0?-.043:.043),.792,z],[.016,.07,.062]);
 }
 box(dark,[0,.925,-.106],[.205,.22,.035]);
 box(body,[0,.94,-.137],[.047,.17,.044]);
 box(trim,[0,.95,-.161],[.017,.06,.005]);
 return meshes.map(m=>({...m,p:new Float32Array(m.p),tri:new Uint32Array(m.tri),col:new Float32Array(m.col),joints:new Float32Array(m.joints),weights:new Float32Array(m.weights)}));
}
return {prepare,components,legWeights,jetGeometry,jointCovers,splitPants,revision:'aegis-anatomical-skin-jet-v55-001'};
});
