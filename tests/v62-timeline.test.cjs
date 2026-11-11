'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),T=require('../motion-timeline-v62.js'),Y=require('../ybot-v62.js'),K=require('../kinematics-v54.js'),F=require('../aegis-fists-v62.js');
const joints=[{index:0,name:'Hips'},{index:1,name:'Spine'},{index:2,name:'RightHand'}],times=Array.from({length:51},(_,i)=>i*.02);
function fixture(skeleton='xbot-32-node-bones',lag=0){
 const byJoint={};
 for(const j of joints){const center=.18+j.index*.14+lag,speed=times.map(t=>.02+2*Math.exp(-(((t-center)/.055)**2))),rate=K.derivative(speed,times);
 byJoint[j.index]=times.map((t,i)=>({time:t,linear_speed:speed[i],linear_speed_change:rate[i].value,angular_speed:speed[i]*.8,angular_speed_change:rate[i].value*.8}));}
 return{avatar:lag?'ybot':'xbot',motion:'xbot_punch',data:{skeletonId:skeleton,duration:1,joints:joints.map(j=>({...j}))},byJoint,asset:{source_asset_sha256:'hash',motion_revision_id:'rev-'+lag},metadata:{coordinateSystem:'GLB_model_axes',time_axis:'original_animation_seconds',data_schema:'compound-eye-single-motion-v2'}};
}
test('YBot must retain entire 32-joint hierarchy, names and binds to compare',()=>{
 const nodes=Array.from({length:33},(_,i)=>({name:'node'+i,parent:i===0?-1:i-1,translation:[0,i*.1,0],rotation:[0,0,0,1],scale:[1,1,1]}));
 const x={nodes,skin:{joints:Array.from({length:32},(_,i)=>i)}},y=Y.clone(x);assert.ok(Y.compareSkeleton(x,y));y.nodes[9].translation[1]+=.001;assert.equal(Y.compareSkeleton(x,y),false);
});
test('YBot JSON validates joint IDs, time shifts and amplitude modifiers, and keeps different motion configs',()=>{
 const cfg=Y.clone(Y.defaults),valid=Y.validate(cfg,Array.from({length:32},(_,i)=>i));
 assert.equal(valid.motions.xbot_punch.length,1);
 valid.motions.xbot_punch2=[{joint_id:7,modification_type:'rotation_delta_deg',requested_change:10,start_time:.1,end_time:.8,axis:'z'}];
 assert.equal(Y.validate(valid,Array.from({length:32},(_,i)=>i)).motions.xbot_punch2[0].requested_change,10);
 assert.throws(()=>Y.validate({...valid,motions:{xbot_punch:[{joint_id:999,modification_type:'time_shift',requested_change:.02,start_time:.1,end_time:.8}]}},Array.from({length:32},(_,i)=>i)),/invalid_joint_id/);
 assert.notEqual(Y.revise(valid,'xbot_punch'),Y.revise(valid,'xbot_punch2'));
});
test('time warp remains zero at boundaries and known sample temporal changes remain bounded',()=>{
 const mod=Y.defaults.motions.xbot_punch[0],center=(mod.start_time+mod.end_time)/2;
 assert.equal(Y.sampleShift(mod.start_time,mod),mod.start_time);
 assert.equal(Y.sampleShift(mod.end_time,mod),mod.end_time);
 assert.ok(Math.abs(Y.sampleShift(center,mod)-(center-mod.requested_change))<1e-8);
});
test('different skeleton and joint names always refuse comparison; coordinate and schema mismatch too',()=>{
 const x=fixture(),y=fixture('aegis-23-node-hierarchy');assert.equal(T.strictCompatibility(x,y,[0],{}).ok,false);
 const z=fixture('xbot-32-node-bones',.03);z.data.joints[0].name='different';assert.equal(T.strictCompatibility(x,z,[0],{}).ok,false);
 z.data.joints[0].name='Hips';z.metadata.coordinateSystem='IMU frame';assert.equal(T.strictCompatibility(x,z,[0],{}).ok,false);
});
test('selected joint peak orders and exported event orders are identical; lag is measured',()=>{
 const a=T.analyze(fixture(),fixture('xbot-32-node-bones',.04),[0,1,2],{0:'linear',1:'linear',2:'linear'},{from:0,to:.9,prominence:.10});
 assert.equal(a.compatibility.ok,true);assert.deepEqual(a.events.map(e=>e.order),[1,2,3]);assert.ok(a.events.every((e,i)=>i===0||e.peak_time>=a.events[i-1].peak_time));
 assert.ok(Math.abs(a.rows[1].delta.peak_time_seconds-.04)<.03);
 const records=T.records(a);assert.deepEqual(records.filter(e=>e.comparison_side==='X'&&e.event_type==='peak').map(e=>e.event_order),a.events.map(e=>e.order));
 assert.ok(records.every(x=>x.source_asset_sha256==='hash'&&x.motion_revision_id.startsWith('rev')));
});
test('same Kinematics54 states and peaks drive timeline and 3D; circle scale per-joint',()=>{
 const analysis=T.analyze(fixture(),null,[0],{0:'linear'},{from:.01,to:.8,change:.08,prominence:.10});
 const r=analysis.rows[0].X,i=10,s=T.at(r,r.times[i],analysis.config);
 const peak=r.peaks.some(p=>Math.abs(p.time-r.times[i])<.011);
 assert.equal(s.state,peak?'peak':r.states[i].state);
 assert.ok(s.radius>=3&&s.radius<=10);assert.equal(s.normalized_within_joint,true);
});
test('linear/angular speed are separate units and no mixed-unit ratio is produced',()=>{
 const a=T.analyze(fixture(),null,[0,1],{0:'linear',1:'angular'});
 assert.equal(a.rows[0].X.unit,'model_units/s');assert.equal(a.rows[1].X.unit,'rad/s');
 assert.ok(!Object.keys(a).some(k=>k.includes('speed_ratio')));
});
test('closed fist replaces open fingers in B only and retains hand-bone attachment',()=>{
 const meshes=F.geometry();assert.equal(meshes.length,2);
 assert.deepEqual(meshes.map(m=>m.bone),[5,8]);
 for(const m of meshes){assert.equal(m.onlyMotion,'armor_punch');assert.ok(m.p.every(Number.isFinite));assert.ok(m.weights.every((v,i)=>i%4===0?v===1:v===0));assert.ok(m.tri.length>300);}
});
