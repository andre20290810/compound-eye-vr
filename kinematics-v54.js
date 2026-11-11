/* Artificial compound-eye v54: pure, deterministic OFFLINE kinematics.
   No browser state, no AI inference, no human force/skill scores. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 root.__Kinematics54=api;
})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const EPS=1e-10;
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const err=(reason)=>({value:null,reason});
const ok=(value)=>finite(value)?{value,reason:null}:err('nonfinite');
const near=(a,b,tol=1e-8)=>Math.abs(a-b)<=tol;
function timeWindowValid(times,lo,hi){
 for(let j=lo;j<=hi;j++)if(!finite(times[j])||(j>lo&&times[j]<=times[j-1]))return false;
 return true;
}
const vecNorm=v=>Array.isArray(v)&&v.every(finite)?Math.hypot(...v):null;
function derivative(values,times) {
 const n=values.length;
 return values.map((_,i)=>{
  if(n<2)return err('insufficient_samples');
  const lo=i===0?0:i===n-1?n-2:i-1;
  const hi=i===0?1:i===n-1?n-1:i+1;
  const a=values[lo],b=values[hi],dt=times[hi]-times[lo];
  if(!timeWindowValid(times,lo,hi)||!finite(dt)||dt<=EPS)return err('duplicate_or_invalid_time');
  if(!finite(values[i])||!finite(a)||!finite(b))return err('missing_source_value');
  return ok((b-a)/dt);
 });
}
function derivativeVectors(points,times){
 if(!points.length)return [];
 const components=[0,1,2].map(j=>derivative(points.map(p=>p&&p[j]),times));
 return points.map((_,i)=>{
  const parts=components.map(c=>c[i]);
  const bad=parts.find(p=>p.reason);
  return bad?{value:null,reason:bad.reason}:{value:parts.map(p=>p.value),reason:null};
 });
}
function smoothPositions(points,windowSize=3){
 if(windowSize===1)return points.map(p=>p?.slice()||null);
 if(![3,5].includes(windowSize))throw Error('unsupported_smoothing_window');
 const wing=Math.floor(windowSize/2);
 return points.map((p,i)=>{
  if(!p||!p.every(finite))return null;
  const neighbors=[];
  for(let k=Math.max(0,i-wing);k<=Math.min(points.length-1,i+wing);k++)
   if(points[k]&&points[k].every(finite))neighbors.push(points[k]);
  if(!neighbors.length)return null;
  return [0,1,2].map(j=>neighbors.reduce((s,v)=>s+v[j],0)/neighbors.length);
 });
}
function normalizeQuaternion(q){
 if(!Array.isArray(q)||q.length!==4||!q.every(finite))return null;
 const len=Math.hypot(...q);
 return len>EPS?q.map(x=>x/len):null;
}
function quaternionAngle(a,b){
 const qa=normalizeQuaternion(a),qb=normalizeQuaternion(b);
 if(!qa||!qb)return null;
 const dot=Math.abs(qa.reduce((s,v,i)=>s+v*qb[i],0)); // q == -q
 return 2*Math.acos(clamp(dot,0,1));
}
function angularSpeed(quats,times){
 const n=quats.length;
 return quats.map((_,i)=>{
  if(n<2)return err('insufficient_samples');
  const lo=i===0?0:i===n-1?n-2:i-1;
  const hi=i===0?1:i===n-1?n-1:i+1;
  const dt=times[hi]-times[lo],angle=quaternionAngle(quats[lo],quats[hi]);
  if(!timeWindowValid(times,lo,hi)||!finite(dt)||dt<=EPS)return err('duplicate_or_invalid_time');
  return angle===null||!normalizeQuaternion(quats[i])?err('missing_quaternion'):ok(angle/dt);
 });
}
function positionKinematics(rawPoints,times,settings={}){
 const window=Number(settings.window||3);
 const smoothed=smoothPositions(rawPoints,window);
 const velocity=derivativeVectors(smoothed,times);
 const acceleration=derivativeVectors(velocity.map(v=>v.value),times);
 const jerk=derivativeVectors(acceleration.map(v=>v.value),times); // actual vector jerk
 const speed=velocity.map(v=>v.reason?err(v.reason):ok(vecNorm(v.value)));
 const signedSpeedChange=derivative(speed.map(v=>v.value),times);
 return {
  raw:rawPoints,smoothed,velocity,acceleration,jerk,speed,signedSpeedChange,
  accelerationMagnitude:acceleration.map(a=>a.reason?err(a.reason):ok(vecNorm(a.value))),
  jerkMagnitude:jerk.map(a=>a.reason?err(a.reason):ok(vecNorm(a.value))),
  settings:{filter:'moving_average_or_none',window,endpoint:'truncated_window',derivative:'central_secant_actual_time;one_sided_endpoints'}
 };
}
function parseCSV(csv){
 const text=String(csv||'').replace(/^\uFEFF/,'');
 const lines=[];let row=[],token='',quoted=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(quoted){
   if(c==='"'&&text[i+1]==='"'){token+='"';i++;}
   else if(c==='"')quoted=false;
   else token+=c;
  }else if(c==='"')quoted=true;
  else if(c===','){row.push(token);token='';}
  else if(c==='\n'){row.push(token.replace(/\r$/,''));lines.push(row);row=[];token='';}
  else token+=c;
 }
 if(token.length||row.length){row.push(token);lines.push(row);}
 if(quoted)throw Error('unterminated_CSV_quote');
 const header=lines.shift()||[];
 if(new Set(header).size!==header.length)throw Error('duplicate_CSV_header');
 if(lines.some(r=>r.some(v=>v!=='')&&r.length!==header.length))throw Error('CSV_column_count_mismatch');
 return {header,rows:lines.filter(a=>a.some(v=>v!=='')),records:lines.filter(a=>a.some(v=>v!=='')).map(r=>Object.fromEntries(header.map((name,i)=>[name,r[i]??''])))};
}
function legacyCSV(csv){
 const data=parseCSV(csv);
 const required=['skeleton_id','joint_id','original_animation_time_s','linear_speed_model_units_per_s','angular_speed_rad_per_s'];
 if(required.some(k=>!data.header.includes(k)))throw Error('missing_legacy_required_columns');
 const groups=new Map();
 for(const [i,row] of data.records.entries()){
  const key=JSON.stringify([row.dataset_id||'',row.trial_id||'',row.skeleton_id,row.joint_id,row.motion_id,row.motion_revision_id||'']);
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({index:i,row});
 }
 const typed=v=>(v===''||v===null||v===undefined)?null:(finite(Number(v))?Number(v):null);
 for(const group of groups.values()){
  // Preserve original row order and reject nonmonotonic/duplicate times; never silently repair them.
  if(group.some((g,i)=>{const t=typed(g.row.original_animation_time_s);return t===null||(i>0&&t<=typed(group[i-1].row.original_animation_time_s));}))throw Error('duplicate_or_nonmonotonic_time');
  const times=group.map(g=>typed(g.row.original_animation_time_s));
  const linear=derivative(group.map(g=>typed(g.row.linear_speed_model_units_per_s)),times);
  const angular=derivative(group.map(g=>typed(g.row.angular_speed_rad_per_s)),times);
  group.forEach((g,i)=>{
   const r=g.row;
   if(!('linear_speed_change_rate_model_units_per_s2' in r)||r.linear_speed_change_rate_model_units_per_s2==='')
    r.linear_speed_change_rate_model_units_per_s2=linear[i].reason?'':String(linear[i].value);
   if(!('angular_speed_change_rate_rad_per_s2' in r)||r.angular_speed_change_rate_rad_per_s2==='')
    r.angular_speed_change_rate_rad_per_s2=angular[i].reason?'':String(angular[i].value);
   const missing=[];
   if(!['quaternion_x','quaternion_y','quaternion_z','quaternion_w'].every(k=>typed(r[k])!==null))missing.push('quaternions_unrecorded');
   if(!['raw_position_x_root_relative','raw_position_y_root_relative','raw_position_z_root_relative'].every(k=>typed(r[k])!==null))missing.push('raw_positions_unrecorded');
   if(!r.root_model_matrix_16)missing.push('root_transform_unrecorded');
   r._legacy_quality=[...missing,'no_repeat_smoothing'].join(';');
   r._rate_quality=[linear[i].reason,angular[i].reason].filter(Boolean).join(';');
   if(r.quaternion_x===undefined)for(const name of ['quaternion_x','quaternion_y','quaternion_z','quaternion_w'])r[name]='';
   if(r.raw_position_x_root_relative===undefined)for(const name of ['raw_position_x_root_relative','raw_position_y_root_relative','raw_position_z_root_relative'])r[name]='';
  });
 }
 return {schema:data.records[0]?.data_schema||'legacy-v1-or-signed-rates',headers:data.header,records:data.records,
  warnings:['do_not_resmooth',...new Set(data.records.flatMap(r=>r._legacy_quality.split(';')))],
  groupCount:groups.size
 };
}
function peakCandidates(values,times,from=0,to=Infinity,config={}){
 const prom=Number(config.prominence??.12),minVal=Number(config.minValue??1e-6);
 const max=Math.max(0,...values.filter((v,i)=>finite(v)&&times[i]>=from&&times[i]<=to));
 if(max<=minVal)return {candidates:[],status:'no_activity'};
 const threshold=Math.max(minVal,max*prom),out=[],tieTol=Math.max(1e-9,max*.001);
 for(let i=1;i<values.length-1;){
  if(times[i]<from||times[i]>to||!finite(values[i])){i++;continue;}
  let j=i;while(j+1<values.length&&finite(values[j+1])&&Math.abs(values[j+1]-values[i])<=tieTol)j++;
  const left=values[i-1],right=values[j+1],height=values[i];
  if(times[i-1]>=from&&times[j+1]<=to&&finite(left)&&finite(right)&&height>threshold&&height>left+tieTol&&height>right+tieTol){
   out.push({start:times[i],end:times[j],time:(times[i]+times[j])/2,value:height,
    quality:j>i?'plateau_time_interval':'local_peak_candidate',
    flat:j>i});
  }
  i=Math.max(i+1,j+1);
 }
 return {candidates:out,status:out.length?'candidates':'no_local_peak'};
}
function detectOnset(speed,times,from,to,threshold,hold=3){
 if(!Number.isInteger(hold)||hold<2)return {time:null,status:'invalid_hold'};
 const inds=times.map((t,i)=>t>=from&&t<=to?i:-1).filter(i=>i>=0);
 // If movement is already above threshold at the selected interval's left
 // edge, the onset occurred before the observation window or is ambiguous.
 // Never mislabel the first sample (especially t=0) as a confirmed onset.
 if(inds.length>=hold&&inds.slice(0,hold).every(i=>finite(speed[i])&&speed[i]>=threshold))
  return {time:null,status:'already_active_at_interval_start',threshold,hold};
 for(let k=0;k<=inds.length-hold;k++){
  if(inds.slice(k,k+hold).every((i,j,a)=>finite(speed[i])&&speed[i]>=threshold&&(j===0||i===a[j-1]+1)))
   return {time:times[inds[k]],status:'candidate',threshold,hold};
 }
 return {time:null,status:'no_sustained_onset',threshold,hold};
}
function states(values,changes,threshold=.08,minSpeed=.05){
 return values.map((speed,i)=>{
  const change=changes[i]?.value??changes[i];
  if(!finite(speed)||!finite(change))return {state:'unavailable',label:'?',reason:'missing_rate'};
  if(speed<=minSpeed)return {state:'low',label:'低',reason:null};
  if(change>threshold)return {state:'accelerating',label:'増',reason:null};
  if(change< -threshold)return {state:'decelerating',label:'減',reason:null};
  return {state:'stable',label:'≈',reason:null};
 });
}
function overlapIntervals(times,statesA,statesB,a='decelerating',b='accelerating'){
 const out=[];let start=-1;
 const emit=end=>{
  if(start>=0){out.push({start:times[start],end:times[end],duration:Math.max(0,times[end]-times[start])});start=-1;}
 };
 for(let i=0;i<times.length;i++){
  const both=statesA[i]?.state===a&&statesB[i]?.state===b;
  if(both&&start<0)start=i;
  if(!both&&start>=0)emit(i-1);
 }
 if(start>=0)emit(times.length-1);
 return out;
}
function ratio(numerator,denominator,minDenom=1e-5){
 if(!finite(numerator)||!finite(denominator))return {value:null,status:'missing_value'};
 if(Math.abs(denominator)<=minDenom)return {value:null,status:'undefined_denominator_near_zero'};
 return {value:numerator/denominator,status:'defined'};
}
function ratioCompatible(metaA,metaB,metric){
 if(metaA.unit!==metaB.unit)return {ok:false,reason:'unit_mismatch'};
 if(metaA.coord!==metaB.coord)return {ok:false,reason:'coordinate_frame_mismatch'};
 if(metaA.phase!==metaB.phase)return {ok:false,reason:'phase_mismatch'};
 if(metaA.skeleton!==metaB.skeleton&&!metaA.mappingVerified)return {ok:false,reason:'cross_skeleton_mapping_unverified'};
 if(metric==='mixed_linear_angular')return {ok:false,reason:'incompatible_dimensions'};
 return {ok:true,reason:null};
}
function sameSource(a,b) {
 return ['source_asset_sha256','motion_revision_id','implementation_commit','skeleton_id','motion_id']
  .every(k=>a[k]&&b[k]&&a[k]===b[k]);
}
function compareEvents(x,y,allowCross=false){
 if(!x||!y)return {ok:false,reason:'comparison_X_Y_not_selected'};
 const hasID=(obj)=>obj.skeleton_id&&obj.joint_id!==undefined&&obj.joint_id!==null&&obj.joint_id!=='';
 if(!hasID(x)||!hasID(y))return {ok:false,reason:'joint_id_missing'};
 if(x.skeleton_id!==y.skeleton_id&&!allowCross)return {ok:false,reason:'cross_skeleton_mapping_unverified'};
 if(x.skeleton_id===y.skeleton_id&&String(x.joint_id)!==String(y.joint_id))return {ok:false,reason:'joint_id_mismatch'};
 if(x.unit!==y.unit)return {ok:false,reason:'unit_mismatch'};
 if(x.motion_revision_id&&y.motion_revision_id&&x.motion_revision_id!==y.motion_revision_id&&x.source_asset_sha256===y.source_asset_sha256)
  return {ok:false,reason:'motion_revision_mismatch'};
 return {
  ok:true,
  peakTimeDelta:finite(x.peakTime)&&finite(y.peakTime)?y.peakTime-x.peakTime:null,
  peakValueDelta:finite(x.peak)&&finite(y.peak)?y.peak-x.peak:null,
  intervalDelta:finite(x.timeLag)&&finite(y.timeLag)?y.timeLag-x.timeLag:null,
  rangeDelta:finite(x.range)&&finite(y.range)?y.range-x.range:null,
  status:'kinematic_difference_not_skill_score'
 };
}
return {EPS,finite,derivative,derivativeVectors,smoothPositions,normalizeQuaternion,
 quaternionAngle,angularSpeed,positionKinematics,parseCSV,legacyCSV,peakCandidates,
 detectOnset,states,overlapIntervals,ratio,ratioCompatible,sameSource,compareEvents};
});
