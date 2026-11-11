const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const K=require('../kinematics-v54.js');
const fixture=path.join(__dirname,'fixtures','integrated_signed_rates_user_excerpt.csv');
const text=fs.readFileSync(fixture,'utf8');
const {records}=K.parseCSV(text);
assert.equal(records.length,70,'fixture contains actual excerpt from uploaded 1088-row CSV');
const as=(name)=>records.filter(r=>r.joint_name_source===name).sort((a,b)=>
 Number(a.original_animation_time_s)-Number(b.original_animation_time_s));
const hips=as('Hips'),hand=as('RightHand');
assert.equal(hips.length,34);assert.equal(hand.length,34);
assert.equal(as('Spine').length,1);assert.equal(as('Spine1').length,1);
assert.notEqual(as('Spine')[0].joint_id,as('Spine1')[0].joint_id);
const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,msg+': '+a+' vs '+b);
const derivatives=(r,key)=>K.derivative(r.map(x=>Number(x[key])),r.map(x=>Number(x.original_animation_time_s)));
const hLinear=derivatives(hand,'linear_speed_model_units_per_s');
const pelvisRot=derivatives(hips,'angular_speed_rad_per_s');
const ix=(rows,time)=>rows.findIndex(x=>Math.abs(Number(x.original_animation_time_s)-time)<.00001);
const h02=ix(hand,.2),h026=ix(hand,.266667),hip02=ix(hips,.2);
near(hLinear[h02].value,19.391639,.004,'RightHand t=0.200 derivative');
near(pelvisRot[hip02].value,-36.212747,.004,'Hips t=0.200 angular speed signed derivative');
near(hLinear[h026].value,-20.929140,.004,'RightHand t=0.266667 derivative');
near(Number(hand[h026].linear_acceleration_model_units_per_s2),23.178718,.00001,'accel-magnitude original');
assert.ok(hLinear[h026].value<0 && Number(hand[h026].linear_acceleration_model_units_per_s2)>0);
for(const row of [hand[h02],hand[h026],hips[hip02]]){
 const time=Number(row.original_animation_time_s);
 const list=row.joint_name_source==='Hips'?hips:hand;
 const index=ix(list,time);
 const derived=(row.joint_name_source==='Hips'?pelvisRot:hLinear)[index].value;
 const original=Number(row.joint_name_source==='Hips'?row.angular_speed_change_rate_rad_per_s2:row.linear_speed_change_rate_model_units_per_s2);
 near(derived,original,.004,'recomputed original rate without double smoothing');
}
const peaksH=K.peakCandidates(hand.map(r=>Number(r.linear_speed_model_units_per_s)),
 hand.map(r=>Number(r.original_animation_time_s)),0,.4);
const peaksHip=K.peakCandidates(hips.map(r=>Number(r.angular_speed_rad_per_s)),
 hips.map(r=>Number(r.original_animation_time_s)),0,.4);
const top=items=>items.candidates.reduce((a,b)=>!a||b.value>a.value?b:a,null);
near(top(peaksH).time,.233333,.000002,'hand peak time');
near(top(peaksHip).time,.166667,.000002,'pelvis peak time');
near(top(peaksH).time-top(peaksHip).time,.066666,.000004,'inter-joint 66.7ms lag');
const imported=K.legacyCSV(text);
const rows=imported.records.filter(r=>r.joint_name_source==='RightHand');
assert.equal(rows.length,34);
assert.equal(rows[ix(rows,.2)].raw_position_x_root_relative,'');
assert.equal(rows[ix(rows,.2)].quaternion_x,'');
assert.equal(rows[ix(rows,.2)].linear_speed_model_units_per_s,hand[h02].linear_speed_model_units_per_s);
console.log('PASS fixed excerpt of uploaded user CSV: 70 real rows, sign rates 19.39,-36.21,-20.93, 23.18 acceleration differs, peaks lag 66.7ms, Spine distinct, no raw fabrication');
