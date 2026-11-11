/* v61 punch sequences: deterministic timing, mirrored poses and source-directed retargeting. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__Punch61=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function cycle(t,d){if(!Number.isFinite(t)||!Number.isFinite(d)||d<=0)throw Error('invalid_cycle');return((t%d)+d)%d;}
function smooth(t){t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));}
function sequence(t,a,b,bridge=.12){if(![a,b,bridge].every(x=>Number.isFinite(x)&&x>0))throw Error('invalid_sequence');const duration=a+b+2*bridge,p=cycle(t,duration);if(p<a)return{kind:'a',time:p,duration};if(p<a+bridge)return{kind:'a_to_b',mix:smooth((p-a)/bridge),duration};if(p<a+bridge+b)return{kind:'b',time:p-a-bridge,duration};return{kind:'b_to_a',mix:smooth((p-a-bridge-b)/bridge),duration};}
const mirrorVector=v=>[-v[0],v[1],v[2]],mirrorQuaternion=q=>[q[0],-q[1],-q[2],q[3]];
function mirrorPose(nodes,pose){const ids=Object.fromEntries(nodes.map((n,i)=>[n.name,i]));const pairs=nodes.map((n,i)=>/^L_/.test(n.name)?ids[n.name.replace(/^L_/,'R_')]:/^R_/.test(n.name)?ids[n.name.replace(/^R_/,'L_')]:i);return{T:pairs.map(i=>mirrorVector(pose.T[i])),R:pairs.map(i=>mirrorQuaternion(pose.R[i])),S:pairs.map(i=>pose.S[i].slice())};}
function sampleChannel(ch,time,slerp){const inp=ch.input,out=ch.output,size=ch.size;if(!inp.length)throw Error('empty_animation_track');if(inp.length===1)return Array.from(out.slice(0,size));let lo=0,hi=inp.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(inp[mid]<time)lo=mid+1;else hi=mid;}const next=Math.min(inp.length-1,Math.max(1,lo)),prev=next-1,f=clamp((time-inp[prev])/Math.max(inp[next]-inp[prev],1e-6),0,1),a=Array.from(out.slice(prev*size,(prev+1)*size)),b=Array.from(out.slice(next*size,(next+1)*size));return ch.path==='rotation'?slerp(a,b,f):a.map((v,k)=>v+(b[k]-v)*f);}
return{cycle,smooth,sequence,mirrorVector,mirrorQuaternion,mirrorPose,sampleChannel,revision:'punch-sequences-v61-001'};
});
// v61 runtime: only the requested punch modes use these pose paths.
function v61Source(){const source=getModel('xbot'),a=source.animations.find(c=>c.name==='XBot_Punching_Original52'),c=source.animations.find(c=>c.name==='Boxer_Punching2');if(!a||!c)throw Error('X Bot punch source missing');return{source,a,c};}
function v61Blank(nodes){return{T:nodes.map(n=>n.translation.slice()),R:nodes.map(n=>n.rotation.slice()),S:nodes.map(n=>n.scale.slice())};}
function v61ClipPose(source,clip,time){const p=v61Blank(source.nodes);for(const ch of clip.channels){const v=window.__Punch61.sampleChannel(ch,time,qSlerp);if(ch.path==='translation')p.T[ch.node]=v;else if(ch.path==='rotation')p.R[ch.node]=v;else if(ch.path==='scale')p.S[ch.node]=v;}return p;}
function v61Blend(a,b,u){return{T:a.T.map((v,i)=>v.map((x,k)=>lerp(x,b.T[i][k],u))),R:a.R.map((q,i)=>qSlerp(q,b.R[i],u)),S:a.S.map((v,i)=>v.map((x,k)=>lerp(x,b.S[i][k],u)))};}
function v61ComboPose(time){const{source,a,c}=v61Source(),M=window.__Punch61,s=M.sequence(time,1.10,c.duration);const ap=t=>v61ClipPose(source,a,Math.min(t,Math.max(a.duration-.001,0))),cp=t=>v61ClipPose(source,c,t);if(s.kind==='a')return ap(s.time);if(s.kind==='b')return cp(s.time);return s.kind==='a_to_b'?v61Blend(ap(1.10),cp(0),s.mix):v61Blend(cp(c.duration),ap(0),s.mix);}
function v61AlternatePose(nodes,time){const M=window.__Punch61,s=M.sequence(time,1.65,1.65);const right=t=>{const p=v61Blank(nodes);aegisFullBodyPunch(nodes,p.T,p.R,Math.min(t,1.65-.000001));return p;},left=t=>M.mirrorPose(nodes,right(t));if(s.kind==='a')return right(s.time);if(s.kind==='b')return left(s.time);return s.kind==='a_to_b'?v61Blend(right(1.65),left(0),s.mix):v61Blend(left(1.65),right(0),s.mix);}
function v61World(nodes,pose){const matrices=[],quats=[];function calc(i){if(matrices[i])return;const n=nodes[i],local=n.matrix?new Float32Array(n.matrix):matTRS(pose.T[i],pose.R[i],pose.S[i]);if(n.parent>=0){calc(n.parent);matrices[i]=mul(matrices[n.parent],local);quats[i]=qmul(quats[n.parent],pose.R[i]);}else{matrices[i]=local;quats[i]=pose.R[i].slice();}}nodes.forEach((_,i)=>calc(i));return{matrices,quats};}
function v61FrameQuat(bindDirection,bindSecondary,direction,secondary){
 const u=norm(direction),q=quatBetween(bindDirection,u),project=v=>v.map((x,k)=>x-u[k]*v.reduce((sum,vv,j)=>sum+vv*u[j],0));
 const a=project(rotateQ(q,bindSecondary)),b=project(secondary);if(Math.hypot(...a)<1e-7||Math.hypot(...b)<1e-7)return q;
 const na=norm(a),nb=norm(b),angle=Math.atan2(u.reduce((sum,v,i)=>sum+v*cross(na,nb)[i],0),clamp(na.reduce((sum,v,i)=>sum+v*nb[i],0),-1,1));return qmul(window.__AegisMotion56.axisQuaternion(u,angle),q);
}
let v61SourceBindCache=null;
function v61RetargetCPose(md,time){
 const{source,c}=v61Source(),M=window.__Punch61,phase=M.cycle(time,c.duration),sample=v61ClipPose(source,c,phase),world=v61World(source.nodes,sample),ids=Object.fromEntries(source.nodes.map((n,i)=>[n.name,i])),target=Object.fromEntries(md.nodes.map((n,i)=>[n.name,i])),p=v61Blank(md.nodes),targetQ={};
 if(v61SourceBindCache?.source!==source)v61SourceBindCache={source,world:v61World(source.nodes,v61Blank(source.nodes))};
 const bind=v61SourceBindCache.world,ref=M.mirrorVector,sub=(a,b)=>a.map((v,k)=>v-b[k]),point=name=>Array.from(world.matrices[ids[name]]).slice(12,15),direction=(a,b)=>ref(sub(point(b),point(a)));
 // X Bot's named right side is negative X; AEGIS's named right side is positive X.
 // Reflect model X while preserving both rigs' forward (+Z) direction and anatomical labels.
 const worldDelta=name=>M.mirrorQuaternion(qmul(world.quats[ids[name]],qInv(bind.quats[ids[name]])));
 targetQ.Pelvis=worldDelta('Hips');targetQ.Chest=worldDelta('Spine2');targetQ.Head=worldDelta('Head');
 p.R[target.Pelvis]=targetQ.Pelvis;p.R[target.Chest]=qmul(qInv(targetQ.Pelvis),targetQ.Chest);p.R[target.Head]=qmul(qInv(targetQ.Chest),targetQ.Head);
 const ratio=md.nodes[target.Pelvis].translation[1]/source.nodes[ids.Hips].translation[1],delta=ref(sub(sample.T[ids.Hips],source.nodes[ids.Hips].translation));p.T[target.Pelvis]=p.T[target.Pelvis].map((v,k)=>v+ratio*delta[k]);
 for(const [prefix,side] of [['Left','L'],['Right','R']]){
  const u=target[side+'_UpperArm'],f=target[side+'_Forearm'],h=target[side+'_Hand'],du=direction(prefix+'Arm',prefix+'ForeArm'),df=direction(prefix+'ForeArm',prefix+'Hand');
  const qu=v61FrameQuat(md.nodes[f].translation,md.nodes[h].translation,du,df),qf=qmul(quatBetween(rotateQ(qu,md.nodes[h].translation),df),qu);
  p.R[u]=qmul(qInv(targetQ.Chest),qu);p.R[f]=qmul(qInv(qu),qf);
  // The AEGIS glove bind is offset from the wrist. Preserve its neutral attachment;
  // transfer only the source forearm-axis pronation instead of rotating the offset into a gap.
  const sourceLocalHand=sample.R[ids[prefix+'Hand']],twist=-2*Math.atan2(sourceLocalHand[1],sourceLocalHand[3]);
  p.R[h]=window.__AegisMotion56.axisQuaternion(norm(md.nodes[h].translation),twist);
  const thigh=target[side+'_UpperLeg'],shin=target[side+'_LowerLeg'],dt=direction(prefix+'UpLeg',prefix+'Leg'),ds=direction(prefix+'Leg',prefix+'Foot'),lowerBind=[0,-.317,.004];
  const qt=v61FrameQuat(md.nodes[shin].translation,lowerBind,dt,ds),qs=qmul(quatBetween(rotateQ(qt,lowerBind),ds),qt);p.R[thigh]=qmul(qInv(targetQ.Pelvis),qt);p.R[shin]=qmul(qInv(qt),qs);
 }
 // Stabilize the helmet/hips/shanks within the existing 13-bone rig.
 // This deliberately preserves the source-driven arms, timing and torso direction.
 for(const [name,weight] of [['Head',.35],['Pelvis',.75],['L_UpperLeg',.65],['R_UpperLeg',.65],['L_LowerLeg',.45],['R_LowerLeg',.45]]){
  const i=target[name];if(i!==undefined)p.R[i]=qSlerp(md.nodes[i].rotation,p.R[i],weight);
 }
 // Preserve source-facing chest/world arm directions after damping pelvis yaw.
 // Re-express the original chest orientation in the stabilized pelvis frame.
 p.R[target.Chest]=qmul(qInv(p.R[target.Pelvis]),targetQ.Chest);
 return p;
}
function v61ApplyPunch(md,motion,time,T,R,S){let p;if(motion==='xbot_hook')p=v61ComboPose(time);else if(motion==='armor_punch')p=v61RetargetCPose(md,time);else if(motion==='armor_alternate_punch')p=v61AlternatePose(md.nodes,time);else return;for(let i=0;i<T.length;i++){T[i]=p.T[i];R[i]=p.R[i];S[i]=p.S[i];}}
function v61PunchDuration(motion){if(motion==='xbot_hook')return 1.10+v61Source().c.duration+.24;if(motion==='armor_punch')return v61Source().c.duration;if(motion==='armor_alternate_punch')return 3.54;return null;}
function v61IsPunch(motion){return /punch/i.test(motion)||motion==='xbot_hook';}
function v61MotionMetadata(motion){if(motion==='xbot_hook')return{source:['xbot_punch','xbot_punch2'],order:'A then C',transition_seconds:.12,duration_seconds:v61PunchDuration(motion)};if(motion==='armor_punch')return{source:'xbot_punch2',source_clip:'Boxer_Punching2',method:'world segment directions and torso rotations; X reflection for named sides; target bone lengths retained',source_duration_seconds:v61Source().c.duration,limitations:['AEGIS has no separate shoulder, ankle, toe or finger bones','not identical surface geometry or physical contact']};if(motion==='armor_alternate_punch')return{source:'armor_power_punch',order:'right then left mirrored full-body A',transition_seconds:.12,duration_seconds:3.54};return null;}
