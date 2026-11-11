/* v62 research timeline: observables only; no causal or skill inference. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./kinematics-v54.js'):root.__Kinematics54);if(typeof module==='object'&&module.exports)module.exports=api;root.__Timeline62=api;})(typeof globalThis==='object'?globalThis:this,function(K){
'use strict';
const color={accelerating:'#58c99a',decelerating:'#f0a553',peak:'#ffdf64',low:'#929aa5',stable:'#929aa5',unavailable:'#d8dce2'};
const types=['linear','angular'],units={linear:'model_units/s',angular:'rad/s'};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const defaultConfig={from:0,to:.7,change:.12,onset:.15,hold:3,prominence:.15,alignment:'raw'};
function strictCompatibility(a,b,selected,metrics){
 if(!a||!b)return{ok:false,reason:'missing_comparison_source'};
 if(a.data.skeletonId!==b.data.skeletonId)return{ok:false,reason:'関節対応が検証されていないため比較不可',code:'skeleton_mismatch'};
 if(a.metadata?.coordinateSystem&&b.metadata?.coordinateSystem&&a.metadata.coordinateSystem!==b.metadata.coordinateSystem)return{ok:false,reason:'coordinate_system_mismatch'};
 if(a.metadata?.time_axis&&b.metadata?.time_axis&&a.metadata.time_axis!==b.metadata.time_axis)return{ok:false,reason:'time_axis_mismatch'};
 if(a.metadata?.data_schema&&b.metadata?.data_schema&&a.metadata.data_schema!==b.metadata.data_schema)return{ok:false,reason:'data_schema_mismatch'};
 for(const jointId of selected){
  const aj=a.data.joints.find(j=>j.index===jointId),bj=b.data.joints.find(j=>j.index===jointId);
  if(!aj||!bj||aj.index!==bj.index||aj.name!==bj.name)return{ok:false,reason:'関節対応が検証されていないため比較不可',code:'joint_identity_mismatch'};
  if(!types.includes(metrics[jointId]||'linear'))return{ok:false,reason:'unsupported_metric'};
 }
 return{ok:true,quality:'same_skeleton_joint_id_name_metric_unit'};
}
function series(result,jointId,metric,config){
 if(!types.includes(metric))throw Error('unsupported_metric');
 const rows=result.byJoint[String(jointId)]||[],joint=result.data.joints.find(j=>j.index===jointId);
 if(!rows.length||!joint)return null;
 const speedName=metric==='angular'?'angular_speed':'linear_speed',changeName=metric==='angular'?'angular_speed_change':'linear_speed_change';
 const times=rows.map(r=>r.time),speed=rows.map(r=>finite(r[speedName])?r[speedName]:null),changes=rows.map(r=>finite(r[changeName])?r[changeName]:null);
 const states=K.states(speed,changes,config.change,metric==='angular'?.02:.01);
 const peaks=K.peakCandidates(speed,times,config.from,config.to,{prominence:config.prominence}).candidates;
 const onset=K.detectOnset(speed,times,config.from,config.to,config.onset,config.hold);
 const top=peaks.reduce((a,b)=>!a||b.value>a.value?b:a,null);
 const maxRate=Math.max(0,...changes.filter((v,i)=>times[i]>=config.from&&times[i]<=config.to&&finite(v)).map(Math.abs));
 return {joint,jointId,metric,unit:units[metric],times,speed,changes,states,peaks,onset,peak:top,maxRate,source:result};
}
function at(row,time,config){
 if(!row)return{state:'unavailable',time,reason:'missing_joint'};
 const i=row.times.reduce((best,t,k)=>Math.abs(t-time)<Math.abs(row.times[best]-time)?k:best,0),dt=row.times.length>1?Math.abs(row.times[1]-row.times[0]):.02;
 const peak=row.peaks.some(p=>Math.abs(p.time-time)<=dt*.51);
 const state=time<config.from||time>config.to?'unavailable':peak?'peak':row.states[i].state;
 const v=row.changes[i],radius=finite(v)&&row.maxRate>0?3+7*Math.min(1,Math.abs(v)/row.maxRate):3;
 return{state,color:color[state],radius,time:row.times[i],speed:row.speed[i],signed_speed_change:v,unit:row.unit,normalized_within_joint:true,peak};
}
function analyze(a,b,selected,metrics,options={}){
 const config={...defaultConfig,...options},compat=b?strictCompatibility(a,b,selected,metrics):{ok:true};
 const durationX=a.data.duration||1,durationY=b?.data?.duration||durationX;
 const configX={...config},configY={...config};
 if(config.alignment==='phase'&&b){configY.from=config.from/durationX*durationY;configY.to=config.to/durationX*durationY;}
 const rows=selected.map(jointId=>{const metric=metrics[jointId]||'linear';return{jointId,metric,X:series(a,jointId,metric,configX),Y:compat.ok&&b?series(b,jointId,metric,configY):null};});
 const events=rows.filter(r=>r.X?.peak).map(r=>({joint_id:r.jointId,joint_name:r.X.joint.name,metric:r.metric,unit:r.X.unit,peak_time:r.X.peak.time,peak_value:r.X.peak.value,kind:'peak'}))
   .sort((a,b)=>a.peak_time-b.peak_time||a.joint_id-b.joint_id).map((e,i,all)=>({...e,order:i+1,next_event_delta_ms:i+1<all.length?+(1000*(all[i+1].peak_time-e.peak_time)).toFixed(2):null}));
 const yEvents=rows.filter(r=>r.Y?.peak).map(r=>({joint_id:r.jointId,time:r.Y.peak.time})).sort((x,y)=>x.time-y.time||x.joint_id-y.joint_id);
 for(let i=0;i<yEvents.length;i++)yEvents[i].next_event_delta_ms=i+1<yEvents.length?(yEvents[i+1].time-yEvents[i].time)*1000:null;
 for(const row of rows){
  row.order=events.find(e=>e.joint_id===row.jointId)?.order??null;row.next_y_delta_ms=yEvents.find(e=>e.joint_id===row.jointId)?.next_event_delta_ms??null;
  row.next_event_delta_ms=events.find(e=>e.joint_id===row.jointId)?.next_event_delta_ms??null;
  row.delta=row.X&&row.Y?{peak_time_seconds:row.X.peak&&row.Y.peak?row.Y.peak.time-row.X.peak.time:null,
    onset_time_seconds:row.X.onset.time!==null&&row.Y.onset.time!==null?row.Y.onset.time-row.X.onset.time:null,
    peak_value_same_unit:row.X.peak&&row.Y.peak?row.Y.peak.value-row.X.peak.value:null,
    phase_peak_position_pp:row.X.peak&&row.Y.peak?100*(row.Y.peak.time/b.data.duration-row.X.peak.time/a.data.duration):null,
    unit:row.X.unit}:null;
 }
 return{config,compatibility:compat,rows,events,selected,metrics,source_x:{avatar:a.avatar,motion:a.motion,revision:a.asset.motion_revision_id},source_y:b?{avatar:b.avatar,motion:b.motion,revision:b.asset.motion_revision_id}:null,
  restrictions:'Kinematic temporal relationships only: no force, torque, energy transfer, causation or skill ranking'};
}
function records(analysis){
 const rows=[];for(const line of analysis.rows){for(const [side,row] of [['X',line.X],['Y',line.Y]]){if(!row)continue;
  const p=row.peak,order=side==='X'?line.order:null;
  const events=[{type:'peak',time:p?.time??null,value:p?.value??null},{type:'onset',time:row.onset.time,value:null}];
  for(const e of events.filter(e=>e.time!==null)){const sample=at(row,e.time,analysis.config);
   rows.push({motion_id:row.source.motion,source_motion_id:row.source.metadata?.motion_composition?.source||row.source.motion,avatar_id:row.source.avatar,
    skeleton_id:row.source.data.skeletonId,joint_id:row.jointId,joint_name:row.joint.name,metric:row.metric,metric_unit:row.unit,
    event_type:e.type,event_time:e.time,event_order:order,speed:e.value,signed_speed_change:sample?.signed_speed_change??null,state:sample?.state??'unavailable',
    next_event_delta_ms:side==='X'?line.next_event_delta_ms:line.next_y_delta_ms,
    comparison_motion_id:analysis.source_y?.motion??null,comparison_event_time:side==='X'&&e.type==='peak'?line.Y?.peak?.time??null:null,
    event_time_delta_ms:side==='X'&&e.type==='peak'&&line.delta?.peak_time_seconds!==null?1000*line.delta.peak_time_seconds:null,
    comparison_onset_delta_ms:line.delta?.onset_time_seconds==null?null:1000*line.delta.onset_time_seconds,
    comparison_peak_value_delta:line.delta?.peak_value_same_unit??null,comparison_phase_peak_delta_pp:line.delta?.phase_peak_position_pp??null,
    analysis_settings:analysis.config,source_asset_sha256:row.source.asset.source_asset_sha256,motion_revision_id:row.source.asset.motion_revision_id,comparison_side:side,
    quality:'representative_local_peak_or_onset;not_force_or_causation'});
  }
 }}
 rows.sort((a,b)=>a.event_time-b.event_time||((a.comparison_side==='X'?0:1)-(b.comparison_side==='X'?0:1)));
 return rows;
}
function wave(row,width=500,config=defaultConfig,alignment='raw',sharedMax=null){
 if(!row)return'';
 const start=alignment==='phase'?0:config.from,end=alignment==='phase'?1:config.to,valid=row.times.map((t,i)=>({x:alignment==='phase'?t/row.source.data.duration:t,y:row.speed[i]})).filter(p=>p.x>=start&&p.x<=end&&finite(p.y)),max=sharedMax||Math.max(1e-9,...valid.map(p=>p.y));
 return valid.map((p,i)=>(i?'L':'M')+(45+(p.x-start)/Math.max(1e-8,end-start)*width).toFixed(2)+','+(75-60*p.y/max).toFixed(2)).join(' ');
}
return{color,types,units,defaultConfig,strictCompatibility,series,at,analyze,records,wave};
});
