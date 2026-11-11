// AEGIS v58 runtime: original-time animation, source-run curve fitting and rigid accessories.
let v56RunCache=null;
function v56BuildRunProfile(nodes){
 const info=getAegisRetargetSource(),{source,idx,worldBind}=info,data=info.clips.armor_run;
 if(!data)throw Error('X Bot run clip missing');
 if(v56RunCache?.source===source&&v56RunCache.nodes===nodes)return v56RunCache;
 const A=window.__AegisMotion56,N=256,duration=data.clip.duration;
 const targetIndex=Object.fromEntries(nodes.map((n,i)=>[n.name,i])),targetWorld=new Map();
 const world=i=>{if(i===undefined||i<0)return[0,0,0,1];if(!targetWorld.has(i))targetWorld.set(i,qmul(world(nodes[i].parent),nodes[i].rotation));return targetWorld.get(i);};
 const sample=(name,path,time)=>{const ch=data.channels.get(idx[name]+':'+path);if(!ch)return path==='rotation'?source.nodes[idx[name]].rotation:source.nodes[idx[name]].translation;
  let i=0;while(i<ch.input.length-2&&ch.input[i+1]<time)i++;const next=Math.min(ch.input.length-1,i+1),u=clamp01((time-ch.input[i])/Math.max(ch.input[next]-ch.input[i],1e-9));
  const a=Array.from(ch.output.slice(i*ch.size,(i+1)*ch.size)),b=Array.from(ch.output.slice(next*ch.size,(next+1)*ch.size));return path==='rotation'?qSlerp(a,b,u):a.map((v,k)=>lerp(v,b[k],u));};
 const curves={};
 for(const [src,dst,low,high] of [['LeftUpLeg','L_UpperLeg',-52,22],['RightUpLeg','R_UpperLeg',-52,22],['LeftLeg','L_LowerLeg',5,64],['RightLeg','R_LowerLeg',5,64]]){
  const sourceNode=source.nodes[idx[src]],targetNode=nodes[targetIndex[dst]],conversion=qmul(qInv(world(targetNode.parent)),worldBind.get(sourceNode.parent)||[0,0,0,1]);
  const values=Array.from({length:N},(_,k)=>{const delta=qmul(sample(src,'rotation',duration*k/N),qInv(sourceNode.rotation)),local=qmul(qmul(conversion,delta),qInv(conversion));return 2*Math.atan2(local[0],local[3]);});
  curves[dst]=A.fitToRange(A.unwrap(values),rad(low),rad(high),5);
 }
 const base=source.nodes[idx.Hips].translation,positions=Array.from({length:N},(_,k)=>sample('Hips','translation',duration*k/N));
 const rootX=A.fitBounded(positions.map(p=>(p[0]-base[0])*.55),.022,4),rootY=A.fitBounded(positions.map(p=>(p[1]-base[1])*.55),.033,4);
 v56RunCache={source,nodes,duration,curves,rootX,rootY,sourceClip:'Boxer_Run',sampleCount:N,harmonics:5,method:'periodic source-derived Fourier; whole-cycle range scaling; no framewise leg-angle clamps'};
 return v56RunCache;
}
function v56ApplyRunLegs(nodes,T,R,time){
 const profile=v56BuildRunProfile(nodes),A=window.__AegisMotion56,phase=time/profile.duration;
 for(const [name,curve] of Object.entries(profile.curves)){const i=nodes.findIndex(n=>n.name===name);R[i]=qmul(A.axisQuaternion([1,0,0],A.evaluate(curve,phase)),nodes[i].rotation);}
 const root=nodes.findIndex(n=>n.name==='Pelvis');
 T[root]=nodes[root].translation.slice();T[root][0]+=A.evaluate(profile.rootX,phase);T[root][1]+=A.evaluate(profile.rootY,phase);
}
function v58UpdateAccessories(md,motion,time){
 md.currentMotion=motion;md.originalAnimationTime=time;
 const D=window.__AegisDetails58,A=window.__AegisMotion56;
 for(const mesh of md.geo){
  const a=mesh.v57Animation;if(!a)continue;
  const angle=D.accessoryAngle(a,motion,time),q=A.axisQuaternion(a.axis,angle),p=a.pivot;
  const transform=mul(trans(...p),mul(matTRS([0,0,0],q,[1,1,1]),trans(...p.map(x=>-x))));
  mesh.v57Bones??=new Float32Array(md.bones.length);mesh.v57Bones.set(md.bones);
  mesh.v57Bones.set(mul(md.bones.slice(mesh.v57Bone*16,mesh.v57Bone*16+16),transform),mesh.v57Bone*16);
  mesh.v57Angle=angle;
  if(a.kind==='antenna')mesh.v57ElevationDeg=D.antennaElevation(time,a.side);
  if(a.kind==='tachometer')mesh.v57GaugeLevel=D.gaugeLevel(time,a.side);
 }
}
