'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),K=require('../kinematics-v54.js');
test('adjacent duplicate times invalidate every touching stencil',()=>{
 const out=K.derivative([1,2,3,4],[0,.1,.1,.3]);
 assert.equal(out[1].reason,'duplicate_or_invalid_time');
 assert.equal(out[2].reason,'duplicate_or_invalid_time');
});
test('missing central samples cannot acquire invented derivative values',()=>{
 assert.equal(K.derivative([0,null,2],[0,.1,.2])[1].value,null);
 assert.equal(K.angularSpeed([[0,0,0,1],null,[0,0,0,1]],[0,.1,.2])[1].value,null);
});
test('plateau reaching outside selected phase is not a phase-local peak',()=>{
 const t=[0,1,2,3,4,5,6],v=[0,1,3,3,3,1,0];
 assert.equal(K.peakCandidates(v,t,1,4).candidates.length,0);
 assert.equal(K.peakCandidates(v,t,1,5).candidates[0].flat,true);
});
test('static and constant-velocity trajectories distinguish speed change from vector acceleration',()=>{
 const t=Array.from({length:41},(_,i)=>i*.02);
 for(const p of [t.map(()=>[1,2,3]),t.map(t=>[2*t,3*t,0])]){
  const a=K.positionKinematics(p,t,{window:1});
  assert.ok(a.signedSpeedChange.slice(3,-3).every(x=>Math.abs(x.value)<1e-9));
  assert.ok(a.accelerationMagnitude.slice(3,-3).every(x=>Math.abs(x.value)<1e-9));
 }
});
test('CSV protects column identity, duplicate times and independent trial groups',()=>{
 assert.throws(()=>K.parseCSV('a,a\n1,2'),/duplicate_CSV_header/);
 assert.throws(()=>K.parseCSV('a,b\n"x,y'),/unterminated/);
 assert.throws(()=>K.parseCSV('a,b\n1,2,3'),/column_count/);
 const h='skeleton_id,joint_id,motion_id,trial_id,original_animation_time_s,linear_speed_model_units_per_s,angular_speed_rad_per_s';
 assert.throws(()=>K.legacyCSV(h+'\ns,1,m,a,0,1,1\ns,1,m,a,0,2,2'),/duplicate_or_nonmonotonic/);
 const x=K.legacyCSV(h+'\ns,1,m,a,0,1,1\ns,1,m,a,1,2,2\ns,1,m,b,0,4,4\ns,1,m,b,1,6,6');
 assert.equal(x.groupCount,2);assert.equal(x.records[0].linear_speed_change_rate_model_units_per_s2,'1');
 assert.equal(x.records[2].linear_speed_change_rate_model_units_per_s2,'2');
});
test('different exact joint IDs cannot silently compare under one canonical name',()=>{
 const x={skeleton_id:'s',joint_id:1,unit:'model_units/s',peak:3,peakTime:.2,range:1,timeLag:0};
 assert.equal(K.compareEvents(x,{...x,joint_id:2}).reason,'joint_id_mismatch');
 assert.equal(K.compareEvents(x,{...x,joint_id:null}).reason,'joint_id_missing');
 assert.equal(K.compareEvents(x,{...x}).peakValueDelta,0);
});
test('v2 reading retains quaternion and raw coordinates without extra smoothing',()=>{
 const h='data_schema,skeleton_id,joint_id,motion_id,original_animation_time_s,linear_speed_model_units_per_s,angular_speed_rad_per_s,quaternion_x,quaternion_y,quaternion_z,quaternion_w,raw_position_x_root_relative,raw_position_y_root_relative,raw_position_z_root_relative,root_model_matrix_16';
 const x=K.legacyCSV(h+'\nv2,s,1,m,0,2,3,0,0,0,1,1,2,3,recorded\nv2,s,1,m,1,4,5,0,0,0,1,2,3,4,recorded');
 assert.equal(x.records[0].raw_position_x_root_relative,'1');assert.equal(x.records[0].quaternion_w,'1');
 assert.ok(!x.warnings.some(w=>w.includes('unrecorded')));
 assert.ok(x.warnings.includes('do_not_resmooth'));
});
