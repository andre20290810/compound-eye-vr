// v54 single-motion reproducible CSV v2. Legacy v1's first 29 columns are
// untouched in name/order/meaning. All extra fields are appended.
const K54=window.__Kinematics54;
const V54_ASSET_META={
 xbot:{source_sha256:'422985d9c532b8afca4b0f8605d5dec3bd90eee996ff45dca3f24cfd1ee92161',source_revision:'xbot-original-glb'},
 aegisEmber:{source_sha256:'5e4e3d77ce579fd9827a61586b65854cc1b23817ed23657728837040e4c085eb',source_revision:'AEGIS-adjustable-visor-no-shoulders-v60-001'},
 aegisSoldier:{source_sha256:'5e4e3d77ce579fd9827a61586b65854cc1b23817ed23657728837040e4c085eb',source_revision:'AEGIS-adjustable-visor-no-shoulders-v60-001'}
};
const V54_V1_HEADERS=[
 'data_schema','source_type','avatar_id','motion_id','source_asset_id','skeleton_id',
 'coordinate_system','time_axis','original_animation_time_s','resampled_interval_s',
 'joint_name_source','joint_id','joint_name_ja','canonical_joint_id',
 'position_x_root_relative','position_y_root_relative','position_z_root_relative',
 'linear_speed_model_units_per_s','angular_speed_rad_per_s',
 'linear_acceleration_model_units_per_s2','angular_acceleration_rad_per_s2',
 'motion_score_0_to_100','position_unit','linear_speed_unit','angular_speed_unit',
 'linear_acceleration_unit','angular_acceleration_unit','motion_score_unit','quality_warning'
];
const V54_MORE_HEADERS=[
 'linear_speed_change_rate_model_units_per_s2','angular_speed_change_rate_rad_per_s2',
 'raw_position_x_root_relative','raw_position_y_root_relative','raw_position_z_root_relative',
 'smoothed_position_x_root_relative','smoothed_position_y_root_relative','smoothed_position_z_root_relative',
 'quaternion_x','quaternion_y','quaternion_z','quaternion_w','quaternion_reference',
 'joint_parent_id','joint_bind_translation_x','joint_bind_translation_y','joint_bind_translation_z',
 'joint_bind_quaternion_x','joint_bind_quaternion_y','joint_bind_quaternion_z','joint_bind_quaternion_w',
 'joint_bind_scale_x','joint_bind_scale_y','joint_bind_scale_z',
 'joint_local_translation_x','joint_local_translation_y','joint_local_translation_z',
 'root_model_position_x','root_model_position_y','root_model_position_z',
 'root_local_quaternion_x','root_local_quaternion_y','root_local_quaternion_z','root_local_quaternion_w',
 'root_model_matrix_16','model_to_world_matrix_16','model_to_world_transform_kind',
 'dataset_id','trial_id','motion_revision_id','source_asset_version','source_asset_sha256',
 'app_version','implementation_commit','analysis_config','filter_method','filter_window_samples',
 'endpoint_handling','differentiation_method','root_relative_definition','angular_acceleration_definition',
 'position_raw_origin','data_quality_status','unavailable_reason',
 'joint_local_scale_x','joint_local_scale_y','joint_local_scale_z'
];
const V54_SCHEMA='compound-eye-single-motion-v2';
let v54LastExport=null,v54Imported=null;
const v54TrialIds=new Map();
function v54Revision(avatar,motion){
 return avatar==='xbot'?'xbot-embedded-animation-original-v54-export':
   motion==='armor_power_punch'?'aegis-punchA-ik-skin-v56-001':
   ['armor_walk','armor_run'].includes(motion)?'aegis-gait-periodic-v56-001':
   'aegis-procedural-motion-skin-v56-001';
}
function v54SourceMetadata(avatar,motion){
 const base=V54_ASSET_META[avatar]||{source_sha256:'unrecorded',source_revision:'unrecorded'};
 return {...base,source_asset_sha256:base.source_sha256,motion_revision_id:v54Revision(avatar,motion)};
}
function v54Number(value){return K54.finite(value)?value:'';}
function v54CSVRow(row){return csvEncodeRow(row.map((v,i)=>i>=29&&K54.finite(v)?Number(v.toPrecision(15)).toString():v));}
function v54ExportData(avatar=state.model,motion=state.motion,params={}){
 const md=getModel(avatar);if(!md?.nodes?.length)throw Error('model_not_loaded');
 const settings={...v47Config(),smooth:3,includeAllSkinJoints:true};
 const data=v47Sample(avatar,motion,settings);
 const timestamps=data.frames.map(f=>f.time);
 const asset=v54SourceMetadata(avatar,motion);
 const runtime=experimentBuildManifest?.app_version==='v60'?experimentBuildManifest.source_commit:'unverified_build_v60';
 const datasetId=['synthetic',avatar,motion,asset.motion_revision_id,asset.source_sha256.slice(0,12)].join(':');
 const trialId=params.trialId||v54TrialIds.get(datasetId)||'trial_'+Date.now().toString(36)+'_'+v54TrialIds.size;
 v54TrialIds.set(datasetId,trialId);
 const modelToWorld=avatar===state.model&&state._modelFit?Array.from(state._modelFit):null;
 const config={
  source_type:'synthetic_animation_not_human_measurement',
  interpolation:'embedded_keyframes_or_procedural_animation',
  timebase:'original_animation_seconds',
  resample_hz_nominal:30,
  original_source_frequency:'unverified',
  filter:{type:'moving_average',window_samples:3,endpoints:'truncated_window'},
  derivative:{type:'central_secant_actual_time',endpoints:'one_sided',duplicate_time:'unavailable'},
  quaternion:'xyzw_local_parent_normalized; q_and_neg_q_same_rotation',
  coordinate:'GLB_model_axes; root_translation_subtracted_only_not_root_rotation',
  model_to_world:'viewer_actor_transform_snapshot_not_gameplay_time_series',
  previous_angular_acceleration:'absolute_derivative_of_angular_speed_scalar_not_angular_acceleration_vector',
  original_29_columns_unchanged:true,
  legacy_linear_derivative:{method:'central_secant_nominal_dt;one_sided_endpoints',nominal_dt:data.dt,endpoint_sample:'duration_minus_0.00001'},
  legacy_angular_speed:{method:'backward_shortest_quaternion_angle/nominal_dt;first_uses_next',filter:'moving_average_3_truncated_window',nominal_dt:data.dt},
  legacy_angular_acceleration:'abs(central_secant_of_smoothed_angular_speed_nominal_dt)',
  signed_speed_derivative:'central_secant_of_preserved_legacy_speed_actual_timestamps;one_sided_endpoints',
  jerk:'third_vector_derivative_of_position_actual_timestamps',
  repeated_synthetic_exports_are_not_independent_human_trials:true,
  source_revision:asset.motion_revision_id
 };
 const rows=[],byJoint={};
 const rootId=data.frames[0]?.rootModelMatrix?data.frames[0].rootModelPosition:null;
 for(const joint of data.joints){
  const i=joint.index,node=md.nodes[i],raw=data.frames.map(f=>f.joints[i]?.p||null);
  const times=timestamps;
  // Existing v53 visualisation values continue to occupy the initial 29 columns.
  // Differentiate the displayed speed, NOT the acceleration vector's norm.
  const signedLinear=K54.derivative(joint.linear,times);
  const signedAngular=K54.derivative(joint.angular,times);
  const q=data.frames.map(f=>K54.normalizeQuaternion(f.joints[i]?.q)||null);
  const analysis=K54.positionKinematics(raw,times,{window:3});
  // Legacy angular speed is deliberately retained; its exact recipe is in config.
  let score=0;
  const frameRows=[];
  for(let k=0;k<data.framesN;k++){
   const f=data.frames[k],point=f.joints[i],original=point?.p||[null,null,null];
   const filtered=analysis.smoothed[k]||[null,null,null];
   const rot=q[k]||[null,null,null,null];
   const linear=joint.linear[k],angular=joint.angular[k];
   const isFinger=/Hand(?:Thumb|Index|Middle|Ring|Pinky)/i.test(joint.name);
   const heuristic=K54.finite(linear)&&K54.finite(angular)?
    100*clamp01(.68*linear/.85+.32*angular/5.0)*(isFinger?.20:1):null;
   score=heuristic===null?null:k===0?0:lerp(score===null?0:score,heuristic,.58);
   const reason=[];
   if(!point)reason.push('joint_pose_unavailable');
   if(signedLinear[k].reason)reason.push('linear_rate:'+signedLinear[k].reason);
   if(signedAngular[k].reason)reason.push('angular_rate:'+signedAngular[k].reason);
   if(!rot.every(K54.finite))reason.push('local_quaternion_unavailable');
   const rootM=f.rootModelMatrix||null,rootP=f.rootModelPosition||[null,null,null],
    rootQ=K54.normalizeQuaternion(f.rootLocalQuaternion)||[null,null,null,null];
   const legacy=[
    V54_SCHEMA,'synthetic_animation',avatar,motion,data.sourceId,data.skeletonId,
    'root_translation_subtracted_only','original_animation_time_s',
    f.time,data.dt,joint.name,i,v48JointLabel(joint),joint.key,
    ...filtered,
    v54Number(linear),v54Number(angular),
    v54Number(joint.accel[k]),v54Number(joint.angularAccel[k]),
    v54Number(score),
    'model_units','model_units/s','rad/s','model_units/s2',
    'angular_accel_abs_d_speed_rad/s2','unitless_0_100',
    '3-point smoothed source pose; synthetic keyframe/procedural interpolation; not human measurement'
   ];
   const extra=[
    v54Number(signedLinear[k].value),v54Number(signedAngular[k].value),
    ...original.map(v54Number),...filtered.map(v54Number),...rot.map(v54Number),
    'xyzw_local_parent_normalized',
    node.parent??'',...node.translation.map(v54Number),...node.rotation.map(v54Number),
    ...node.scale.map(v54Number),...(point?.localTranslation||[null,null,null]).map(v54Number),
    ...rootP.map(v54Number),...rootQ.map(v54Number),
    rootM?JSON.stringify(rootM):'',modelToWorld?JSON.stringify(modelToWorld):'',
    'static_viewer_actor_transform_snapshot',
    datasetId,trialId,asset.motion_revision_id,asset.source_revision,asset.source_sha256,
    'v60',runtime,JSON.stringify(config),
    'moving_average',3,'truncated_window','central_secant_actual_time;one_sided_endpoints',
    'root_translation_only_rotation_not_removed',
    'absolute_derivative_of_scalar_angular_speed',
    'unfiltered_resampled_GLTF_pose_not_raw_human_measurement',
    reason.length?'partial':'synthetic_interpolated',reason.join('|'),
    ...(point?.localScale||[null,null,null]).map(v54Number)
   ];
   if(legacy.length!==V54_V1_HEADERS.length||extra.length!==V54_MORE_HEADERS.length)
    throw Error('CSV column mismatch '+legacy.length+' '+extra.length);
   rows.push([...legacy,...extra]);
   frameRows.push({time:f.time,joint_id:i,key:joint.key,name:joint.name,
    linear_speed:linear,angular_speed:angular,
    linear_speed_change:signedLinear[k].value,angular_speed_change:signedAngular[k].value,
    position_raw:original,position_smoothed:filtered,quaternion:rot,
    acceleration_vector:analysis.acceleration[k]?.value,
    jerk_vector:analysis.jerk[k]?.value,reason:reason.join('|')||null});
  }
  byJoint[String(i)]=frameRows;
 }
 const skeleton={
  skeleton_id:data.skeletonId,source_asset_id:data.sourceId,source_sha256:asset.source_sha256,
  source_asset_version:asset.source_revision,motion_revision_id:asset.motion_revision_id,
  coordinate_system:'GLB model units; root-relative subtracts only root translation',
  model_to_world_matrix_snapshot:modelToWorld,
  nodes:md.nodes.map((n,i)=>({id:i,name:n.name,parent_id:n.parent,
   bind_translation:n.translation,bind_rotation_xyzw:n.rotation,bind_scale:n.scale,bind_matrix:n.matrix?Array.from(n.matrix):null})),
  skin_joint_ids:md.skin?.joints||[],
  root_node_id:md.nodes.findIndex(n=>/^(Hips|Pelvis)$/.test(n.name)),
  per_frame_local_node_poses:data.frames.map(f=>({t:f.time,nodes:f.nodeLocalPoses})),
  per_frame_root_poses:data.frames.map(f=>({
   t:f.time,model_matrix:f.rootModelMatrix,model_position:f.rootModelPosition,
   local_quaternion_xyzw:f.rootLocalQuaternion
  }))
 };
 const result={avatar,motion,dataset_id:datasetId,trial_id:trialId,version:V54_SCHEMA,
  headers:[...V54_V1_HEADERS,...V54_MORE_HEADERS],rows,times:timestamps,byJoint,data,
  skeleton,config,asset,metadata:{
   dataset_id:datasetId,trial_id:trialId,motion_id:motion,
   source_asset_id:data.sourceId,source_asset_sha256:asset.source_sha256,
   motion_revision_id:asset.motion_revision_id,app_version:'v60',
   visual_appearance:{public_revision:v58Published.revision,settings:A58.clone(v58Appearance)},
   implementation_commit:runtime,original_time_axis:true,
   cosmetic_animation:{schema:'aegis-accessory-v60',visor_triangle:'adjustable head-bound marker',visor_settings:A58.models.includes(avatar)?{...v58Appearance.visor[avatar]}:null,shoulder_armor:false,...window.__AegisDetails58.cosmeticMetadata,note:'Cosmetic antenna and gauge matrices never modify joint series, motion score, or marker selection'},
   restrictions:['synthetic animation, not human measurement','no automatic skill judgment'],
   expert_rule_schema:{fields:['rule_id','technique','conditions','target_joint_id','phase',
    'evidence_metrics','correction_direction','expected_result','exceptions','defer_conditions','version'],
    rules:[]},separate_provenance:{observations:[],expert_rules:[],model_predictions:[],explanations:[]}
  }
 };
 return result;
}
function v54ExportSingleCsv(){
 const button=$('v53UnifiedCsv');if(button)button.disabled=true;
 try{
  const result=v54ExportData();
  v54LastExport=result;
  const csv=['\uFEFF'+csvEncodeRow(result.headers),...result.rows.map(v54CSVRow)].join('\r\n');
  downloadExperimentFile('compound-eye-'+result.avatar+'-'+result.motion+'-all-joints-v2.csv',
   csv,'text/csv;charset=utf-8');
  $('v54QualityNote').textContent=result.data.joints.length+'関節×'+result.times.length+
   'サンプル、元姿勢・解析用姿勢・クォータニオン・符号付き変化率を記録。元の時刻軸で再計算できます。';
  toast('統合CSV v2を保存：'+result.data.joints.length+'関節×'+result.times.length+'時刻');
  recordExperimentEvent('unified_motion_v2',{avatar:result.avatar,motion:result.motion,
   dataset_id:result.dataset_id,trial_id:result.trial_id});
 }catch(err){console.error(err);toast('CSV出力に失敗：'+err.message);}
 finally{if(button)button.disabled=false;}
}
function v54ExportMetadataJson(){
 try{
  const result=v54LastExport&&v54LastExport.avatar===state.model&&v54LastExport.motion===state.motion?
   v54LastExport:v54ExportData();
  v54LastExport=result;
  downloadExperimentFile('compound-eye-'+result.avatar+'-'+result.motion+'-skeleton-v2.json',
   JSON.stringify({...result.metadata,analysis_config:result.config,skeleton:result.skeleton},null,2),
   'application/json;charset=utf-8');
  toast('骨格・解析設定JSONを保存しました');
 }catch(e){toast('骨格JSONを作れません：'+e.message);}
}
function v54ImportLegacyCsvFile(event){
 const file=event.target.files?.[0];if(!file)return;
 file.text().then(content=>{
  const loaded=K54.legacyCSV(content);v54Imported=loaded;
  const missing=loaded.warnings.filter(v=>v.includes('unrecorded'));
  const note=$('v54LegacyStatus');
  if(note)note.textContent='統合CSV '+loaded.records.length+'行を読込。'+
   (missing.length?'未収録：'+missing.join(' / '):'収録済みの元姿勢・版情報は保持。')+
   '。保存済みの位置・速度へ再平滑化はしません。';
  if(typeof v54UseImportedCSV==='function')v54UseImportedCSV(loaded);
  toast('CSV読込：欠損を推測補完せず、元の時刻と計算値を保持');
 }).catch(err=>{$('v54LegacyStatus').textContent='読込失敗：'+err.message});
}
$('v53UnifiedCsv').onclick=v54ExportSingleCsv;
$('v54ExportSkeletonJson').onclick=v54ExportMetadataJson;
$('v54LegacyImport').onchange=v54ImportLegacyCsvFile;
