// v62 YBot uses identical X Bot bind hierarchy, bone lengths and coordinates; ONLY pose tracks/colors differ.
let v62YConfig=window.__YBot62.clone(window.__YBot62.defaults),v62YLastValidation=null;
async function v62LoadYBotConfig(){
 try{const r=await fetch('ybot-modifications.json',{cache:'no-store'});if(!r.ok)return;const x=getModel('xbot');v62YConfig=window.__YBot62.validate(await r.json(),x.skin.joints);}catch(e){console.warn('YBot settings fallback:',e.message);}
}
function v62RegisterYBot(){
 for(const id of ['avatarHeaderSelect','model','clAvatar','experimentAvatar']){
  const select=document.getElementById(id);if(!select||[...select.options].some(x=>x.value==='ybot'))continue;
  const option=document.createElement('option');option.value='ybot';option.textContent='Y Bot（X Botと同一骨格）';
  const x=[...select.options].find(o=>o.value==='xbot');if(x)x.insertAdjacentElement('afterend',option);else select.append(option);
 }
}
function v62YModel(){const source=getModel('xbot');
 if(!modelCache.ybot){
  modelCache.ybot={...source,nodes:source.nodes.map(n=>({...n,translation:n.translation.slice(),rotation:n.rotation.slice(),scale:n.scale.slice(),children:n.children.slice()})),
   skin:{...source.skin,joints:source.skin.joints.slice()},geo:source.geo,world:new Array(source.nodes.length).fill(null),
   bones:new Float32Array(source.bones.length),poseRot:source.nodes.map(n=>n.rotation.slice()),poseTrans:source.nodes.map(n=>n.translation.slice()),poseScale:source.nodes.map(n=>n.scale.slice())};
 }
 return modelCache.ybot;
}
function v62SourcePose(motion,time){
 const src=getModel('xbot');
 if(motion==='xbot_hook')return v61ComboPose(time);
 const name=motion==='xbot_punch'?'XBot_Punching_Original52':XBOT_CLIPS[motion],clip=src.animations.find(c=>c.name===name);
 if(!clip)throw Error('missing_XBot_clip_'+motion);
 const dur=motion==='xbot_punch'?1.10:clip.duration;
 const t=motion==='xbot_punch'?Math.min(window.__Punch61.cycle(time,dur),Math.max(clip.duration-.001,0)):window.__Punch61.cycle(time,dur);
 return v61ClipPose(src,clip,t);
}
function v62ApplyYMotion(md,motion,time,T,R,S){
 const configured=v62YConfig.motions[motion]||[],config=window.__TimelineLiveV65?.getModifiers(motion,configured)||configured;if(!config.length)return;
 for(const mod of config){
  const i=mod.joint_id,t=window.__YBot62.sampleShift(time,mod);
  if(t!==time){const source=v62SourcePose(motion,Math.max(0,t));T[i]=source.T[i].slice();R[i]=source.R[i].slice();S[i]=source.S[i].slice();}
  const a=window.__YBot62.twist(time,mod);
  if(a){const axis=mod.axis==='x'?[1,0,0]:mod.axis==='y'?[0,1,0]:[0,0,1];R[i]=qmul(R[i],window.__AegisMotion56.axisQuaternion(axis,a));}
 }
}
function v62SetYConfig(input){const valid=window.__YBot62.validate(input,getModel('xbot').skin.joints);v62YConfig=valid;v62YLastValidation=null;v54.result=null;v47.A=null;return valid;}
function v62PeaksFor(data,joint,metric,range){
 const rows=data.byJoint[String(joint)]||[],times=rows.map(x=>x.time),field=metric==='angular'?'angular_speed':'linear_speed',values=rows.map(x=>x[field]);
 const from=range?.[0]??times[0]??0,to=range?.[1]??times.at(-1)??0;
 const candidates=K54.peakCandidates(values,times,from,to,{prominence:.12}).candidates;
 const peak=candidates.reduce((a,b)=>!a||b.value>a.value?b:a,null);
 return {peak_time:peak?.time??null,peak_value:peak?.value??null};
}
function v62RecalculateModifications(){
 const out=[],modes=['xbot_punch','xbot_punch1','xbot_punch2','xbot_hook'];
 for(const motion of modes){
  const mods=v62YConfig.motions[motion]||[];if(!mods.length)continue;
  const source=v54ExportData('xbot',motion),modified=v54ExportData('ybot',motion);
  for(const mod of mods){
   const metric=['rotation_delta_deg','rotation_peak_shift','speed_waveform_deg'].includes(mod.modification_type)?'angular':'linear',range=[mod.start_time,mod.end_time];
   const a=v62PeaksFor(source,mod.joint_id,metric,range),b=v62PeaksFor(modified,mod.joint_id,metric,range),delta=a.peak_time===null||b.peak_time===null?null:b.peak_time-a.peak_time;
   let actual=delta,actualUnit='s';
   if(mod.modification_type==='onset_shift'){
    const onset=src=>{const rr=src.byJoint[String(mod.joint_id)],times=rr.map(x=>x.time),speed=rr.map(x=>x[metric==='angular'?'angular_speed':'linear_speed']);return K54.detectOnset(speed,times,mod.start_time,mod.end_time,.15,3).time;};
    const ax=onset(source),by=onset(modified);actual=ax!==null&&by!==null?by-ax:null;
   }else if(mod.modification_type==='rotation_delta_deg'){
    let best=0;const aa=source.byJoint[String(mod.joint_id)],bb=modified.byJoint[String(mod.joint_id)];
    for(let i=0;i<aa.length;i++){const t=aa[i].time;if(t<mod.start_time||t>mod.end_time)continue;
     const q=source.data.frames[i]?.joints?.[mod.joint_id]?.q,r=modified.data.frames[i]?.joints?.[mod.joint_id]?.q;
     if(q&&r){const dot=Math.min(1,Math.abs(q.reduce((a,v,j)=>a+v*r[j],0)));best=Math.max(best,2*Math.acos(dot)*180/Math.PI);}
    }
    actual=best;actualUnit='deg';
   }else if(mod.modification_type==='speed_waveform_deg'){
    actual=a.peak_value!==null&&b.peak_value!==null?b.peak_value-a.peak_value:null;actualUnit='rad/s';
   }
   out.push({avatar_id:'ybot',source_motion_id:motion,motion_id:motion,modified_joint_id:mod.joint_id,modification_type:mod.modification_type,
    requested_change:mod.requested_change,actual_change_after_recalculation:actual,actual_change_unit:actualUnit,source_asset_sha256:modified.asset.source_asset_sha256,start_time:mod.start_time,end_time:mod.end_time,
    metric,baseline_peak:a,modified_peak:b,motion_revision_id:v54Revision('ybot',motion),quality:actual===null?'event_unavailable':'recalculated_from_full_kinematics',
    note:'Requested time warp parameter and observed peak shift need not match exactly; no force or skill inference'});
  }
 }
 v62YLastValidation=out;return out;
}
