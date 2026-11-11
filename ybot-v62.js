/* v62 YBot: one X Bot skeleton, known programmable motion perturbations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__YBot62=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const schema='compound-eye-ybot-modifications-v1',clone=x=>JSON.parse(JSON.stringify(x));
const defaults={schema,revision:'ybot-known-shifts-v62-001',motions:{
 xbot_punch:[{joint_id:7,modification_type:'rotation_peak_shift',requested_change:.04,start_time:.05,end_time:.96}],
 xbot_punch1:[],xbot_punch2:[],xbot_hook:[]}};
function validate(raw,validIds,motions=['xbot_punch','xbot_punch1','xbot_punch2','xbot_hook']){
 if(!raw||raw.schema!==schema||!raw.motions||typeof raw.motions!=='object')throw Error('invalid_ybot_schema');
 if(Object.keys(raw).some(k=>!['schema','revision','motions'].includes(k)))throw Error('unknown_ybot_key');
 const valid=new Set(validIds),out={schema,revision:String(raw.revision||'configured').slice(0,100),motions:{}};
 for(const motion of Object.keys(raw.motions))if(!motions.includes(motion))throw Error('unknown_motion_id');
 for(const motion of motions){
  const arr=raw.motions[motion]||[];if(!Array.isArray(arr)||arr.length>32)throw Error('bad_modifier_count');
  out.motions[motion]=arr.map((x,i)=>{
   if(!x||Object.keys(x).some(k=>!['joint_id','modification_type','requested_change','start_time','end_time','axis'].includes(k)))throw Error('invalid_modifier_fields');
   const {joint_id,modification_type,requested_change,start_time,end_time}=x;
   if(!Number.isInteger(joint_id)||!valid.has(joint_id))throw Error('invalid_joint_id');
   if(!['time_shift','onset_shift','speed_peak_shift','rotation_peak_shift','local_time_shift','rotation_delta_deg','speed_waveform_deg'].includes(modification_type))throw Error('unknown_modification_type');
   if(![requested_change,start_time,end_time].every(Number.isFinite)||start_time<0||end_time<=start_time||end_time>8||Math.abs(requested_change)>(modification_type==='rotation_delta_deg'?30:modification_type==='speed_waveform_deg'?15:.25))throw Error('invalid_change');
   const axis=x.axis||'x';if(!['x','y','z'].includes(axis))throw Error('invalid_axis');
   return{joint_id,modification_type,requested_change,start_time,end_time,axis};
  });
 }
 return out;
}
function envelope(t,start,end){if(t<=start||t>=end)return 0;const u=(t-start)/(end-start);return Math.pow(Math.sin(Math.PI*u),2);}
function sampleShift(time,mod){
 if(!mod.modification_type.includes('shift'))return time;
 return time-mod.requested_change*envelope(time,mod.start_time,mod.end_time);
}
function twist(time,mod){
 if(mod.modification_type==='rotation_delta_deg')return mod.requested_change*Math.PI/180*envelope(time,mod.start_time,mod.end_time);
 if(mod.modification_type==='speed_waveform_deg')return mod.requested_change*Math.PI/180*Math.sin(8*Math.PI*(time-mod.start_time)/(mod.end_time-mod.start_time))*envelope(time,mod.start_time,mod.end_time);
 return 0;
}
function revise(config,motion){let s=JSON.stringify(config.motions[motion]||[]),h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return 'ybot-'+motion+'-'+(h>>>0).toString(16)+'-'+config.revision;}
function compareSkeleton(x,y){if(!x||!y||x.nodes.length!==y.nodes.length||x.skin?.joints?.length!==32||y.skin?.joints?.length!==32)return false;
 return x.nodes.every((n,i)=>{const v=y.nodes[i];return n.name===v.name&&n.parent===v.parent&&JSON.stringify(n.translation)===JSON.stringify(v.translation)&&JSON.stringify(n.rotation)===JSON.stringify(v.rotation)&&JSON.stringify(n.scale)===JSON.stringify(v.scale);})&&x.skin.joints.every((i,k)=>i===y.skin.joints[k]);}
return{schema,defaults,validate,clone,envelope,sampleShift,twist,revise,compareSkeleton};
});
