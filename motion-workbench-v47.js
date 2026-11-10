// v47 motion-analysis workbench, resident in the app's existing IIFE.
// All numbers describe embedded animation/model calculations, not human sensing.
const V47_SCHEMA='compound-eye-motion-comparison-v1';
const v47={A:null,B:null,comparison:null,currentTime:0,lastCursorAt:0,fitB:null,sourceA:null,sourceB:null,quality:[],on:false};
const v47Models=['xbot','aegisEmber','aegisSoldier'];
const v47Options=m=>{
 const old=state.model;state.model=m;
 let items=[];try{items=motionOptions()}finally{state.model=old}
 return items.filter(id=>id!=='spin');
};
function v47Format(n,dp=2){return Number.isFinite(n)?n.toFixed(dp):'—';}
function v47MotionRate(m){return /punch/i.test(m)?state.punchPlayback:1;}
function v47Duration(md,m){
 const actual=analysisSourceDuration(md,m);
 return Math.max(.28,Math.min(7.99,actual));
}
function v47MapName(name){
 let n=String(name||'').toLowerCase().replace(/^mixamorig:/,'').replace(/_/g,'');
 // X Bot has full anatomical names, AEGIS uses L_/R_ abbreviations.
 if(/^[lr](upperarm|forearm|hand|upperleg|lowerleg|shoulder|foot|toe)/.test(n))
  n=(n[0]==='l'?'left':'right')+n.slice(1);
 if(n==='hips'||n==='pelvis')return 'pelvis';
 if(n==='spine'||n==='spine1')return 'spine';
 if(n==='spine2'||n==='chest')return 'chest';
 if(n==='head'||n==='neck')return n;
 const side=n.startsWith('left')?'left':n.startsWith('right')?'right':'';
 if(!side)return n;
 const rest=n.slice(side.length);
 if(/shoulder/.test(rest))return side+'.shoulder';
 if(/upperarm|^arm$/.test(rest))return side+'.upperarm';
 if(/forearm/.test(rest))return side+'.forearm';
 if(/^hand$/.test(rest))return side+'.hand';
 if(/upleg|upperleg/.test(rest))return side+'.thigh';
 if(/lowerleg|^leg$/.test(rest))return side+'.shin';
 if(/foot/.test(rest))return side+'.foot';
 if(/toe/.test(rest))return side+'.toe';
 return side+'.'+rest;
}
function v47RootIndex(md){
 let id=md.nodes.findIndex(x=>/^(Hips|Pelvis)$/.test(x.name));
 return id>=0?id:0;
}
function v47SmoothArray(data,windowSize=3){
 const wing=Math.floor(windowSize/2);
 if(wing===0)return data.slice();
 return data.map((_,i)=>{
  let sum=0,count=0;
  for(let k=Math.max(0,i-wing);k<=Math.min(data.length-1,i+wing);k++){sum+=data[k];count++;}
  return count?sum/count:0;
 });
}
function v47Derivative(data,dt){
 return data.map((v,i)=>{
  if(i===0)return (data[1]-data[0])/dt;
  if(i===data.length-1)return (data[i]-data[i-1])/dt;
  return (data[i+1]-data[i-1])/(2*dt);
 });
}
function v47Norm3(q){return Math.hypot(q[0],q[1],q[2]);}
function v47Velocity3(position,dt){
 const arr=[0,1,2].map(k=>v47Derivative(position.map(p=>p[k]),dt));
 return position.map((_,i)=>[arr[0][i],arr[1][i],arr[2][i]]);
}
function v47QuatAngular(a,b,dt){
 if(!a||!b)return 0;
 const dot=Math.abs(a.reduce((acc,q,i)=>acc+q*b[i],0));
 return (2*Math.acos(clamp(dot,-1,1)))/dt;
}
function v47SustainedFirst(arr,threshold,hold){
 for(let i=0;i<=arr.length-hold;i++){
  let good=true;for(let k=0;k<hold;k++)if(!(arr[i+k]>threshold)){good=false;break;}
  if(good)return i;
 }
 return null;
}
function v47PeakCount(samples){
 const max=Math.max(...samples,0);if(max<1e-5)return 0;
 let count=0,last=-999;
 for(let i=2;i<samples.length-2;i++){
  if(samples[i]>=samples[i-1]&&samples[i]>=samples[i+1]&&samples[i]>=max*.25&&i-last>=3){count++;last=i;}
 }
 return count;
}
function v47SPARC(values,dt){
 // Estimated spectral arc length, indicative only; uniformly resampled speed
 // and cutoff at 10Hz, not a calibrated motor-smoothness measurement.
 if(values.length<45||dt<=0)return null;
 const F=Math.min(10,1/(2*dt)*.95),N=values.length;
 const bins=Math.max(4,Math.min(45,Math.floor(F*N*dt)));
 const mags=[];
 for(let k=0;k<=bins;k++){
  let re=0,im=0;
  for(let j=0;j<N;j++){
   const phase=-2*Math.PI*k*j/N;
   re+=values[j]*Math.cos(phase);im+=values[j]*Math.sin(phase);
  }
  mags.push(Math.hypot(re,im));
 }
 const divisor=Math.max(1e-9,...mags);
 let arc=0;
 for(let i=1;i<mags.length;i++){
  const dF=1/bins,dA=(mags[i]-mags[i-1])/divisor;
  arc+=Math.hypot(dF,dA);
 }
 return -arc;
}
function v47Sample(avatar,motion,config){
 const md=getModel(avatar);if(!md?.nodes?.length)throw Error('3Dモデルを取得できません');
 const duration=v47Duration(md,motion);
 const framesN=Math.min(241,Math.max(16,Math.round(duration*30)+1));
 const dt=duration/(framesN-1);
 const sampledEnd=duration-.00001;
 const rootIndex=v47RootIndex(md);
 const allJointIds=md.skin?.joints?.length?md.skin.joints:[...md.nodes.keys()];
 const ids=[...new Set(allJointIds)].filter(i=>i>=0&&i<md.nodes.length&&jointNamePattern.test(md.nodes[i].name));
 const backup={avatar:state.model,motion:state.motion,rendered:state._renderedAnimationTime};
 const frames=[];
 try{
  state.model=avatar;
  for(let k=0;k<framesN;k++){
   const t=Math.min(sampledEnd,k*dt);
   animateModel(md,motion,t);
   const root=md.world[rootIndex]||md.world[0];
   const center=root?[root[12],root[13],root[14]]:[0,0,0];
   const joints={};
   for(const id of ids){
    const world=md.world[id];if(!world)continue;
    joints[id]={
     p:[world[12]-center[0],world[13]-center[1],world[14]-center[2]],
     q:Array.from(md.poseRot?.[id]||md.nodes[id].rotation),
    };
   }
   frames.push({time:t,joints});
  }
 }finally{
  state.model=backup.avatar;
  const restoreT=Number.isFinite(backup.rendered)?backup.rendered:0;
  if(backup.avatar===avatar)animateModel(md,backup.motion,restoreT);
 }
 const height=Math.max(.05,md.max[1]-md.min[1]);
 const windowSize=config.smooth;
 const joints=[];
 for(const id of ids){
  const samples=frames.map(f=>f.joints[id]).filter(Boolean);
  if(samples.length!==frames.length)continue;
  const rawPos=samples.map(x=>x.p);
  const pos=[0,1,2].map(axis=>v47SmoothArray(rawPos.map(p=>p[axis]),windowSize));
  const smoothed=rawPos.map((_,i)=>[pos[0][i],pos[1][i],pos[2][i]]);
  const velocity=v47Velocity3(smoothed,dt);
  const acceleration=v47Velocity3(velocity,dt);
  const jerk=v47Velocity3(acceleration,dt);
  const linear=velocity.map(v47Norm3);
  const accel=acceleration.map(v47Norm3);
  const jerkNorm=jerk.map(v47Norm3);
  const angularRaw=samples.map((v,i)=>i===0?v47QuatAngular(v.q,samples[1].q,dt):v47QuatAngular(samples[i-1].q,v.q,dt));
  const angular=v47SmoothArray(angularRaw,windowSize);
  const angAccelSigned=v47Derivative(angular,dt);
  const angularAccel=angAccelSigned.map(Math.abs);
  const peakIndex=linear.indexOf(Math.max(...linear));
  const accIndex=accel.indexOf(Math.max(...accel));
  const angularIndex=angular.indexOf(Math.max(...angular));
  const threshold=Math.max(.045,Math.max(...linear)*config.onsetRatio);
  const onsetIndex=v47SustainedFirst(linear,threshold,config.sustain);
  let decelIndex=null;
  if(peakIndex>=0){
   for(let i=peakIndex+1;i<=linear.length-config.sustain;i++){
    if(linear.slice(i,i+config.sustain).every(v=>v<linear[peakIndex]*.88)){
     decelIndex=i;break;
    }
   }
  }
  const sumJerk=jerkNorm.reduce((a,v)=>a+v*v,0);
  joints.push({
   index:id,name:md.nodes[id].name,key:v47MapName(md.nodes[id].name),
   position:smoothed,quaternion:samples.map(x=>x.q),
   linear,angular,accel,angularAccel,jerk:jerkNorm,
   onsetIndex,onset:onsetIndex===null?null:frames[onsetIndex].time,
   peakIndex,peakTime:frames[peakIndex].time,peakLinear:linear[peakIndex],
   angularPeakTime:frames[angularIndex].time,peakAngular:angular[angularIndex],
   peakAccelTime:frames[accIndex].time,peakAccel:accel[accIndex],
   decelStart:decelIndex===null?null:frames[decelIndex].time,
   peaks:v47PeakCount(linear),jerkRMS:Math.sqrt(sumJerk/Math.max(1,jerkNorm.length)),
   sparc:v47SPARC(linear,dt),range:Math.max(...smoothed.map(p=>v47Norm3(p.map((v,k)=>v-smoothed[0][k]))))
  });
 }
 return {
  avatar,motion,sourceType:'synthetic_animation',sourceId:MATERIAL_REFERENCES?.[avatar]?.asset_id||avatar,
  skeletonId:MATERIAL_REFERENCES?.[avatar]?.skeleton_id||avatar,
  coordinateSystem:'local root-relative; native GLB model units',timebase:'original animation seconds',
  duration,dt,framesN,frames,joints,height,
  config:{...config},originalSampleRate:'embedded keyframe/procedural; uniformly interpolated at ~30Hz',
  warnings:['サンプリング値はアニメーション補間値。元素材の実測頻度ではありません','加速度・ジャークは微分により誤差が増幅されます']
 };
}
function v47Pair(A,B){
 if(!B)return null;
 const out=[],indexB=new Map();
 for(const joint of B.joints)if(!indexB.has(joint.key))indexB.set(joint.key,joint);
 for(const joint of A.joints){
  const b=indexB.get(joint.key);
  if(b)out.push({key:joint.key,A:joint,B:b,display:joint.name});
 }
 const differentSkeleton=A.skeletonId!==B.skeletonId;
 const unit=differentSkeleton?'body_heights_per_second':'model_units_per_second';
 const safe=out.length>=3;
 return {matched:out,differentSkeleton,unit,safe,
   method:differentSkeleton?'canonical joint-name mapping + height-normalized translational speed':'exact/common semantic bone mapping',
   warning:!safe?'共通関節が不足しているため定量比較を停止':differentSkeleton?
     '異なる骨格です。移動速度は身長比で正規化していますが、座標軸・関節中心・可動範囲の厳密一致は未検証です。':'同じ骨格規格のモデル計算値比較であり、人体実測の意味はありません'
 };
}
function v47Point(series,t,field,align='raw',A=null){
 if(!series)return null;
 const lookup=align==='phase'&&A?t*series.duration/Math.max(.001,A.duration):t;
 const idx=clamp(Math.round(lookup/series.dt),0,series.framesN-1);
 return {i:idx,time:lookup,actual:series.frames[idx]?.time??lookup};
}
function v47FeatureComparison(a,b,A,B,pair){
 const norm=pair.differentSkeleton;
 const pA=a.peakLinear/(norm?A.height:1),pB=b.peakLinear/(norm?B.height:1);
 return {
  key:a.key,display:a.name,sourceA:a.index,
  onsetDelta:a.onset===null||b.onset===null?null:b.onset-a.onset,
  speedDelta:pB-pA,speedRelative:pA>.0001?(pB-pA)/pA:null,
  peakTimeDelta:b.peakTime-a.peakTime,peakAccelerationDelta:b.peakAccel/(norm?B.height:1)-a.peakAccel/(norm?A.height:1),
  rangeDelta:b.range/(norm?B.height:1)-a.range/(norm?A.height:1),
  rangeRelative:a.range>.001?(b.range/(norm?B.height:1)-a.range/(norm?A.height:1))/(a.range/(norm?A.height:1)):null,
  sourceUnit:pair.unit
 };
}
function v47Category(delta,speedRatio,rangeRatio,config){
 if(delta!==null&&delta>config.onsetTolerance)return {id:'delayed',label:'B開始遅延',glyph:'遅',color:'#bb9af7'};
 if((speedRatio!==null&&speedRatio<-config.relativeTolerance)||(rangeRatio!==null&&rangeRatio<-config.relativeTolerance))
  return {id:'less',label:'B速度／範囲が小さい',glyph:'小',color:'#67c8ff'};
 if((speedRatio!==null&&speedRatio>config.relativeTolerance)||(rangeRatio!==null&&rangeRatio>config.relativeTolerance))
  return {id:'more',label:'B速度／範囲が大きい',glyph:'大',color:'#ffc477'};
 return {id:'within',label:'設定した差分範囲内',glyph:'≈',color:'#7ce4b1'};
}
function v47Config(){
 return {
  smooth:Math.max(1,Number($('v47Smooth').value)||3),
  onsetRatio:clamp(Number($('v47Threshold').value)||.15,.05,.50),
  sustain:clamp(Math.round(Number($('v47Sustain').value)||3),2,8),
  onsetTolerance:.08,relativeTolerance:.18,samplingHz:30,repeatabilityTrials:1
 };
}
function v47OptionsFor(model,select,allowEmpty=false){
 if(!select)return;
 const current=select.value;select.replaceChildren();
 if(allowEmpty){const option=document.createElement('option');option.value='';option.textContent='比較なし';select.append(option);}
 for(const key of v47Options(model)){
  const opt=document.createElement('option');opt.value=key;opt.textContent=MOTION_NAMES[key]||key;select.append(opt);
 }
 if([...select.options].some(o=>o.value===current))select.value=current;
}
function v47Init(){
 const createModels=(id,blank)=>{
  const el=$(id);el.replaceChildren();
  if(blank){const op=document.createElement('option');op.value='';op.textContent='比較しない';el.append(op);}
  for(const model of v47Models){
   const op=document.createElement('option');op.value=model;op.textContent=MODEL_NAMES[model]||model;el.append(op);
  }
 };
 createModels('v47AvatarA',false);createModels('v47AvatarB',true);
 $('v47AvatarA').value=state.model;
 v47OptionsFor(state.model,$('v47MotionA'));$('v47MotionA').value=state.motion;
 $('v47AvatarB').value='';
 v47OptionsFor('xbot',$('v47MotionB'));
 $('v47AvatarA').onchange=()=>{
  v47OptionsFor($('v47AvatarA').value,$('v47MotionA'));v47ResetSelection();
 };
 $('v47MotionA').onchange=v47ResetSelection;
 $('v47AvatarB').onchange=()=>{
  v47OptionsFor($('v47AvatarB').value||'xbot',$('v47MotionB'));v47ResetSelection();
 };
 $('v47MotionB').onchange=v47ResetSelection;
 for(const key of ['v47Smooth','v47Threshold','v47Sustain'])$(key).onchange=v47ResetSelection;
 $('v47Metric').onchange=v47Render;
 $('v47Joint').onchange=()=>{v47Render();v47DrawMarkers(v47.lastProjections||[]);};
 $('v47Alignment').onchange=()=>{v47Render();};
 $('v47DisplayMode').onchange=()=>v47DrawMarkers(v47.lastProjections||[]);
 $('v47Analyze').onclick=v47Analyze;
 $('v47PlayPause').onclick=v47TogglePlay;
 $('v47Prev').onclick=()=>v47FrameStep(-1);
 $('v47Next').onclick=()=>v47FrameStep(1);
 $('v47Speed').onchange=v47SetSpeed;
 $('v47Scrub').oninput=e=>v47Seek(Number(e.target.value));
 $('v47ExportCsv').onclick=v47ExportCSV;
 $('v47ExportJson').onclick=v47ExportJSON;
 for(const id of ['v47Ghost','v47Markers','v47MarkerLimit'])
  $(id).onchange=()=>{v47DrawMarkers(v47.lastProjections||[]);};
 $('v47Panel').addEventListener('toggle',()=>{if($('v47Panel').open&&!v47.A) v47Analyze();});
 $('experimentPanel').addEventListener('toggle',()=>{
  if($('experimentPanel').open&&!v47.A)setTimeout(v47Analyze,60);
 });
}
function v47ResetSelection(){
 v47.A=null;v47.B=null;v47.comparison=null;v47.on=false;
 $('v47Readout').textContent='モーションを選択し「解析・比較を開始」を押してください';
 $('v47Chart').replaceChildren();$('v47Timeline').replaceChildren();$('v47Narrative').replaceChildren();
 $('v47Quality').textContent='比較前。データの対応付けと品質確認は解析時に実施します。';
}


function v47Analyze(){
 if(!ready||!modelData)return;
 const a=$('v47AvatarA').value||state.model,m=$('v47MotionA').value||v47Options(a)[0];
 const b=$('v47AvatarB').value,mb=b?$('v47MotionB').value||v47Options(b)[0]:null;
 const config=v47Config();
 try{
  if(state.model!==a)changeModel(a);
  if(state.motion!==m)setMotion(m);
  const A=v47Sample(a,m,config),B=b&&mb?v47Sample(b,mb,config):null;
  v47.A=A;v47.B=B;v47.comparison=v47Pair(A,B);v47.on=true;v47.currentTime=0;
  const selected=$('v47Joint').value,select=$('v47Joint');select.replaceChildren();
  const top=document.createElement('option');top.value='top3';top.textContent='速度の大きい3関節';select.append(top);
  for(const j of A.joints){
   const opt=document.createElement('option');opt.value=j.key;opt.textContent=j.name+' ('+j.key+')';select.append(opt);
  }
  if([...select.options].some(x=>x.value===selected))select.value=selected;
  $('v47Scrub').max=String(A.duration);$('v47Scrub').step=String(A.dt/4);
  $('v47Speed').value='1';state.motionSpeed=1;
  v47Seek(0,true);v47Render();
  $('v47Readout').textContent='A：'+MODEL_NAMES[a]+'・'+(MOTION_NAMES[m]||m)+(B?'　B：'+MODEL_NAMES[b]+'・'+(MOTION_NAMES[mb]||mb):'');
 }catch(err){console.error('v47 analysis failed',err);$('v47Readout').textContent='解析失敗：'+(err.message||err);}
}
function v47Selected(){
 if(!v47.A)return [];
 if($('v47Joint').value==='top3')return [...v47.A.joints].sort((a,b)=>b.peakLinear-a.peakLinear).slice(0,3);
 return v47.A.joints.filter(j=>j.key===$('v47Joint').value);
}
function v47Metric(){
 return {
  linear:{name:'関節移動速度',unit:v47.comparison?.differentSkeleton?'身長比/秒':'モデル単位/秒',key:'linear'},
  angular:{name:'関節角速度',unit:'度/秒',key:'angular'},
  accel:{name:'関節移動加速度',unit:v47.comparison?.differentSkeleton?'身長比/秒²':'モデル単位/秒²',key:'accel'},
  angularAccel:{name:'関節角加速度',unit:'度/秒²',key:'angularAccel'},
  jerk:{name:'ジャーク（数値参考）',unit:'モデル単位/秒³',key:'jerk'}
 }[$('v47Metric').value];
}
function v47Value(j,metric,index,data){
 if(!j)return 0;
 let v=j[metric.key]?.[index]??0;
 if(metric.key==='angular'||metric.key==='angularAccel')v*=180/Math.PI;
 if(v47.comparison?.differentSkeleton&&['linear','accel','jerk'].includes(metric.key))v/=data.height;
 return Number.isFinite(v)?v:0;
}
function v47Render(){
 if(!v47.A)return;
 const A=v47.A,B=v47.B,pair=v47.comparison;
 const align=$('v47Alignment').value,metric=v47Metric(),selected=v47Selected();
 const width=900,height=330,left=84,right=20,top=32,bottom=59,plW=width-left-right,plH=height-top-bottom;
 const graph=$('v47Chart');graph.replaceChildren();
 const svg=analysisElement('svg',{viewBox:'0 0 '+width+' '+height,'aria-label':'関節運動特徴の時間同期グラフ'});
 let ymax=.0001;const plotData=[];
 for(const joint of selected){
  const item=pair?.matched.find(x=>x.A.key===joint.key),bj=item?.B||null;
  const a=A.frames.map((frame,i)=>({t:frame.time,v:v47Value(joint,metric,i,A)}));
  const b=B&&bj?A.frames.map(frame=>{
   const pt=v47Point(B,frame.time,'',align,A);
   return {t:frame.time,v:v47Value(bj,metric,pt.i,B)};
  }):null;
  for(const x of a)ymax=Math.max(ymax,x.v);
  if(b)for(const x of b)ymax=Math.max(ymax,x.v);
  plotData.push({joint,a,b});
 }
 ymax=ymax*1.16||1;
 for(let n=0;n<=4;n++){
  const y=top+plH*n/4,level=ymax*(1-n/4);
  svg.append(analysisElement('line',{x1:left,y1:y,x2:width-right,y2:y,stroke:'#28475e','stroke-width':1}));
  svg.append(analysisAxisText(left-10,y+4,v47Format(level,level<10?2:1),'end'));
 }
 for(let n=0;n<=5;n++){
  const x=left+plW*n/5;
  svg.append(analysisElement('line',{x1:x,y1:top,x2:x,y2:height-bottom,stroke:'#244257','stroke-width':1}));
  svg.append(analysisAxisText(x,height-34,v47Format(A.duration*n/5,2)));
 }
 const colors=['#58e6e9','#f4b561','#b4a2fc'];
 const toPoints=items=>items.map(item=>[
  left+plW*item.t/A.duration,top+plH*(1-item.v/ymax)
 ].map(x=>x.toFixed(2)).join(',')).join(' ');
 plotData.forEach((part,k)=>{
  svg.append(analysisElement('polyline',{points:toPoints(part.a),fill:'none',stroke:colors[k%3],
   'stroke-width':2.35,'stroke-linejoin':'round','stroke-linecap':'round'}));
  if(part.b)svg.append(analysisElement('polyline',{points:toPoints(part.b),fill:'none',stroke:'#f7cd7e',
   'stroke-width':1.9,'stroke-dasharray':'7 4'}));
  svg.append(analysisElement('text',{x:left+k*238,y:height-7,fill:colors[k%3],'font-size':11},
   part.joint.name+(part.b?'（A実線・B点線）':'')));
 });
 svg.append(analysisElement('text',{x:left,y:16,fill:'#def4fb','font-size':12},metric.name+'（'+metric.unit+'）'));
 svg.append(analysisAxisText(left+plW/2,height-17,'Aの元アニメーション時刻（秒）'));
 svg.append(analysisElement('line',{id:'v47Cursor',x1:left,y1:top,x2:left,y2:height-bottom,
  stroke:'#fffbba','stroke-width':2,'stroke-dasharray':'5 4'}));
 svg.addEventListener('pointerdown',ev=>{
  const bounds=svg.getBoundingClientRect();if(!bounds.width)return;
  const x=(ev.clientX-bounds.left)/bounds.width*width;
  v47Seek(clamp((x-left)/plW*A.duration,0,A.duration));
 });
 graph.append(svg);
 v47RenderTimeline();v47RenderNarrative();v47UpdateCursor();
}
function v47SelectJoint(key,time){
 const select=$('v47Joint');
 if([...select.options].some(o=>o.value===key))select.value=key;
 v47Render();v47Seek(time);
}
function v47RenderTimeline(){
 const A=v47.A,B=v47.B,pair=v47.comparison,selected=v47Selected(),container=$('v47Timeline');
 container.replaceChildren();if(!A)return;
 const width=900,left=165,right=25,row=41,top=42,upper=Math.max(A.duration,B?.duration||0);
 const svg=analysisElement('svg',{viewBox:'0 0 '+width+' '+(top+selected.length*row+53),
  'aria-label':'運動開始時刻と最大速度到達時刻の独立比較'});
 const xAt=t=>left+(width-left-right)*t/Math.max(.01,upper);
 for(let m=0;m<=5;m++){
  const x=xAt(upper*m/5);
  svg.append(analysisElement('line',{x1:x,y1:top-10,x2:x,y2:top+row*selected.length,stroke:'#24485b'}));
  svg.append(analysisAxisText(x,top+row*selected.length+23,v47Format(upper*m/5,2)));
 }
 svg.append(analysisElement('text',{x:left,y:19,fill:'#d6eff9','font-size':12},
 '● 運動開始　◆ 最大速度（上：A／下：B、元の時刻）'));
 selected.forEach((j,i)=>{
  const y=top+i*row,bj=pair?.matched.find(x=>x.A.key===j.key)?.B;
  svg.append(analysisElement('text',{x:left-12,y:y+12,'text-anchor':'end',fill:'#d9f0f6','font-size':11},j.name));
  const diamond=(t,cy,color)=>{
   const x=xAt(t),points=[x+','+(cy-6),(x+6)+','+cy,x+','+(cy+6),(x-6)+','+cy].join(' ');
   svg.append(analysisElement('polygon',{points,fill:color}));
  };
  if(j.onset!==null){
   const dot=analysisElement('circle',{cx:xAt(j.onset),cy:y,r:5,fill:'#62e4ef'});
   dot.addEventListener('click',()=>v47SelectJoint(j.key,j.onset));svg.append(dot);
  }
  diamond(j.peakTime,y+8,'#62e4ef');
  const peakClick=analysisElement('circle',{cx:xAt(j.peakTime),cy:y+8,r:10,fill:'transparent','pointer-events':'all'});
  peakClick.addEventListener('click',()=>v47SelectJoint(j.key,j.peakTime));svg.append(peakClick);
  if(bj){
   if(bj.onset!==null)svg.append(analysisElement('circle',{cx:xAt(bj.onset),cy:y+19,r:5,fill:'#f5bd68'}));
   diamond(bj.peakTime,y+26,'#f5bd68');
   const bClick=analysisElement('circle',{cx:xAt(bj.peakTime),cy:y+26,r:10,fill:'transparent','pointer-events':'all'});
   bClick.addEventListener('click',()=>{
    const aTime=$('v47Alignment').value==='phase'?bj.peakTime*A.duration/B.duration:bj.peakTime;
    v47SelectJoint(j.key,aTime);
   });svg.append(bClick);
  }
 });
 container.append(svg);
}
function v47RenderNarrative(){
 const A=v47.A,B=v47.B,pair=v47.comparison;
 const el=$('v47Narrative'),quality=$('v47Quality');el.replaceChildren();
 const line=txt=>{const p=document.createElement('p');p.textContent=txt;el.append(p);};
 line('基準A：'+MODEL_NAMES[A.avatar]+'／'+(MOTION_NAMES[A.motion]||A.motion)+
  '。元の長さ '+v47Format(A.duration)+'秒、'+A.framesN+'サンプル。');
 const selected=v47Selected();
 for(const j of selected.slice(0,4)){
  line(j.name+'：開始 '+(j.onset===null?'検出不可':v47Format(j.onset)+'秒')+
   '／最大速度 '+v47Format(j.peakLinear,3)+'モデル単位/秒（'+v47Format(j.peakTime)+'秒）'+
   '／最大加速度 '+v47Format(j.peakAccel,3)+'（'+v47Format(j.peakAccelTime)+'秒）'+
   '／減速開始 '+(j.decelStart===null?'検出不可':v47Format(j.decelStart)+'秒')+'。');
 }
 if(B&&pair){
  line('比較B：'+MODEL_NAMES[B.avatar]+'／'+(MOTION_NAMES[B.motion]||B.motion)+
   '。対応関節 '+pair.matched.length+'、マッピング：'+pair.method+'。');
  if(pair.safe)for(const j of selected.slice(0,3)){
   const match=pair.matched.find(x=>x.A.key===j.key);if(!match)continue;
   const d=v47FeatureComparison(match.A,match.B,A,B,pair);
   line(j.name+'のB−A：開始 '+(d.onsetDelta===null?'検出不可':v47Format(d.onsetDelta,3)+'秒')+
    '／最大速度 '+v47Format(d.speedDelta,3)+(pair.differentSkeleton?'身長比/秒':'モデル単位/秒')+
    '／ピーク時刻 '+v47Format(d.peakTimeDelta,3)+'秒。差は良し悪しを意味しません。');
  }
 }
 if(selected[0]){
  const j=selected[0];
  line('参考：速度ピーク '+j.peaks+'回、ジャークRMS '+v47Format(j.jerkRMS,3)+
   '（モデル単位/秒³）、推定SPARC '+(j.sparc===null?'必要サンプル数不足':v47Format(j.sparc,3))+
   '。平滑化とサンプル間隔に敏感な探索的指標です。');
 }
 line('再現性：独立した複数試行が登録されていないため評価不可。人体実測・技能評価・因果関係の証明ではありません。');
 const config=v47Config();
 const messages=[
  '元素材の記録Hzは未確認。約30Hzはアニメーションを補間・再サンプリングした値。',
  '開始時刻は最大速度比 '+Math.round(config.onsetRatio*100)+'％ と'+config.sustain+'連続サンプルで検出。',
  '加速度・ジャークは位置の数値微分値。高周波・短い動作で誤差が増幅します。'
 ];
 if(B&&pair)messages.push(pair.warning);
 quality.textContent=messages.join('　／　');
}
function v47UpdateCursor(){
 const A=v47.A;if(!A)return;
 const t=clamp(v47.currentTime,0,A.duration);
 $('v47Scrub').value=String(t);
 $('v47Time').textContent=v47Format(t,3)+' 秒（元アニメーション）';
 const line=$('v47Cursor');
 if(line){
  const x=84+(900-84-20)*t/A.duration;
  line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));
 }
}
function v47Seek(time,init=false){
 if(!v47.A)return;
 const A=v47.A;
 v47.currentTime=clamp(time,0,A.duration-.00001);
 state.paused=true;
 // pauseTime is time before punch-rate adjustment; source time is canonical.
 state.pauseTime=v47.currentTime/Math.max(.001,v47MotionRate(A.motion));
 state._renderedAnimationTime=v47.currentTime;
 $('v47PlayPause').textContent='▶ 再生';
 if(!init&&ready)draw(performance.now());
 v47UpdateCursor();
}
function v47FrameStep(direction){if(v47.A)v47Seek(v47.currentTime+direction*v47.A.dt);}
function v47SetSpeed(){
 const speed=Number($('v47Speed').value)||1,paused=state.paused;
 state.motionSpeed=speed;
 state.timeStart=performance.now()/1000-v47.currentTime/(Math.max(.001,v47MotionRate(state.motion))*speed);
 if(paused)state.pauseTime=v47.currentTime/Math.max(.001,v47MotionRate(state.motion));
}
function v47TogglePlay(){
 if(!v47.A){v47Analyze();return;}
 if(state.paused){
  const rate=Number($('v47Speed').value)||1;state.motionSpeed=rate;
  state.timeStart=performance.now()/1000-v47.currentTime/(rate*Math.max(.001,v47MotionRate(state.motion)));
  state.paused=false;$('v47PlayPause').textContent='⏸ 一時停止';
 }else{
  state.paused=true;state.pauseTime=v47.currentTime/Math.max(.001,v47MotionRate(state.motion));
  $('v47PlayPause').textContent='▶ 再生';
 }
}
function v47Tick(now){
 if(!v47.on||!v47.A)return;
 if(now-v47.lastCursorAt<65)return;
 v47.lastCursorAt=now;
 const value=state._renderedAnimationTime||0;
 v47.currentTime=((value%v47.A.duration)+v47.A.duration)%v47.A.duration;
 v47UpdateCursor();
}


function v47MatchedFeatureRows(){
 if(!v47.comparison?.safe)return [];
 return v47.comparison.matched.map(pair=>{
  const feature=v47FeatureComparison(pair.A,pair.B,v47.A,v47.B,v47.comparison);
  return {...feature,marker:v47Category(feature.onsetDelta,feature.speedRelative,feature.rangeRelative,v47Config())};
 });
}
function v47RawRows(){
 const result=[];
 for(const d of [v47.A,v47.B].filter(Boolean)){
  const names=new Map(d.joints.map(j=>[j.index,j]));
  d.frames.forEach((frame,i)=>{
   for(const [id,pose] of Object.entries(frame.joints)){
    const j=names.get(Number(id));
    if(!j)continue;
    result.push([V47_SCHEMA,d.sourceType,d.avatar,d.motion,d.sourceId,d.skeletonId,
      frame.time,i,d.dt,d.coordinateSystem,'model_units','quaternion_xyzw',
      j.name,j.index,j.key,...pose.p,...pose.q]);
   }
  });
 }
 return result;
}
function v47ProcessedRows(){
 const rows=[];
 for(const d of [v47.A,v47.B].filter(Boolean)){
  for(const j of d.joints){
   for(let i=0;i<d.framesN;i++){
    rows.push([
      V47_SCHEMA,d.avatar,d.motion,d.sourceType,d.skeletonId,d.frames[i].time,
      j.name,j.index,j.key,
      j.linear[i],j.angular[i],j.accel[i],j.angularAccel[i],j.jerk[i],
      j.onset,j.peakLinear,j.peakTime,j.peakAccel,j.peakAccelTime,
      j.decelStart,j.peaks,j.jerkRMS,j.sparc
    ]);
   }
  }
 }
 return rows;
}
function v47ExportCSV(){
 if(!v47.A){toast('先に解析を実行してください');return;}
 const origin=['schema','source_type','avatar_id','motion_id','source_asset','skeleton_id',
  'original_animation_time_s','resampled_index','resampled_interval_s','coordinate_system',
  'position_unit','rotation_type','joint_name','joint_id','canonical_joint_id',
  'root_relative_x','root_relative_y','root_relative_z',
  'quaternion_x','quaternion_y','quaternion_z','quaternion_w'];
 const features=['schema','avatar_id','motion_id','source_type','skeleton_id',
  'original_animation_time_s','joint_name','joint_id','canonical_joint_id',
  'speed_model_units_per_s','angular_speed_rad_per_s',
  'acceleration_model_units_per_s2','angular_accel_rad_per_s2','jerk_model_units_per_s3',
  'motion_onset_time_s','peak_speed_model_units_per_s','peak_speed_time_s',
  'peak_acceleration_model_units_per_s2','peak_acceleration_time_s',
  'deceleration_start_time_s','velocity_peak_count','jerk_rms','sparc_exploratory'];
 const exportRows=(name,headers,rows)=>{
  downloadExperimentFile('compound-eye-v47-'+name+'.csv',
   ['\ufeff'+csvEncodeRow(headers),...rows.map(csvEncodeRow)].join('\r\n'),'text/csv;charset=utf-8');
 };
 exportRows('raw-synthetic-series',origin,v47RawRows());
 exportRows('derived-features',features,v47ProcessedRows());
 if(v47.comparison?.safe){
  const headers=['schema','model_a','motion_a','model_b','motion_b','canonical_joint_id','joint_name',
   'mapping_method','unit','alignment_mode',
   'onset_delta_b_minus_a_s','peak_speed_delta_b_minus_a',
   'peak_speed_relative_delta','peak_time_delta_b_minus_a_s',
   'peak_acceleration_delta','range_delta','marker_category'];
  const rows=v47MatchedFeatureRows().map(f=>[
   V47_SCHEMA,v47.A.avatar,v47.A.motion,v47.B.avatar,v47.B.motion,
   f.key,f.display,v47.comparison.method,v47.comparison.unit,$('v47Alignment').value,
   f.onsetDelta,f.speedDelta,f.speedRelative,f.peakTimeDelta,
   f.peakAccelerationDelta,f.rangeDelta,f.marker.id
  ]);
  exportRows('comparison-differences',headers,rows);
 }
 toast('元時系列・導出特徴'+(v47.comparison?.safe?'・比較差分':'')+'のCSVを書き出しました');
}
function v47ExportJSON(){
 if(!v47.A){toast('先に解析を実行してください');return;}
 const dataset=[v47.A,v47.B].filter(Boolean);
 const raw={
  schema:V47_SCHEMA,kind:'original_synthetic_keyframe_samples',
  origin:'pre-existing GLB animation keyframes or procedural animation, resampled at ~30Hz',
  is_human_measurement:false,
  data:dataset.map(d=>({
   avatar_id:d.avatar,motion_id:d.motion,source_id:d.sourceId,
   skeleton_id:d.skeletonId,coordinate_system:d.coordinateSystem,
   time_unit:'second_original_animation',position_unit:'native_model_unit',
   rotation_unit:'quaternion_xyzw',resampled_interval_s:d.dt,
   original_fbx_frequency_known:false,
   frames:d.frames
  }))
 };
 const config=v47Config(),pair=v47.comparison;
 const results={
  schema:V47_SCHEMA,kind:'processed_motion_analytics',
  app_version:'v47',
  git_source_commit:experimentBuildManifest.source_commit,
  data_type:'synthetic_animation',
  is_human_measurement:false,
  source_metadata:dataset.map(d=>({
   avatar_id:d.avatar,motion_id:d.motion,asset_id:d.sourceId,
   origin:MATERIAL_REFERENCES?.[d.avatar]?.origin||'bundled animation',
   license:MATERIAL_REFERENCES?.[d.avatar]?.license||'not independently verified',
   model_height_native_units:d.height
  })),
  quality_status:pair?.warning||'simulation-only',
  method:{
   interpolation:'GLB keyframe interpolation / procedural pose, approximately 30Hz uniform resampling',
   smoothing_window_samples:config.smooth,
   derivatives:'central finite difference, one-sided at endpoints',
   motion_onset_threshold:config.onsetRatio,minimum_consecutive_samples:config.sustain,
   onset_tolerance_s:config.onsetTolerance,
   relative_motion_tolerance:config.relativeTolerance,
   comparison_time_alignment:$('v47Alignment').value,
   coordinate_mapping:pair?.method||'no comparison',
   cross_skeleton_speed_unit:pair?.differentSkeleton?'body-heights-per-second':'native-model-units-per-second',
   sparc:'exploratory sampled-speed DFT arc length, max cutoff 10 Hz',
   repeatability:'not assessable without separate recorded trials'
  },
  viewer:{
   eye_count:state.eyeCount,radial_distance:state.radialDistance,
   common_scale:state.radialScale,four_eye_horizontal_gap:state.fourEyeGap,
   opacity:state.anchorAlpha,mode:state.vizMode,stereo:isStereoVR()
  },
  source_kinematics:dataset.map(d=>({
   avatar_id:d.avatar,motion_id:d.motion,source_type:d.sourceType,
   duration_s:d.duration,original_sample_frequency:'not verified',
   resampled_hz:1/d.dt,skeleton:d.skeletonId,
   model_height_native:d.height,unit:'native model units',
   joints:d.joints.map(j=>({
    name:j.name,canonical_joint:j.key,index:j.index,
    onset_time_s:j.onset,peak_speed:j.peakLinear,peak_speed_time_s:j.peakTime,
    peak_acceleration:j.peakAccel,peak_acceleration_time_s:j.peakAccelTime,
    deceleration_start_time_s:j.decelStart,peak_count:j.peaks,
    jerk_rms:j.jerkRMS,sparc_exploratory:j.sparc
   }))
  })),
  comparison:pair?.safe?{
   model_a:v47.A.avatar,motion_a:v47.A.motion,model_b:v47.B.avatar,motion_b:v47.B.motion,
   mapping_method:pair.method,mapping_count:pair.matched.length,unit:pair.unit,
   differences:v47MatchedFeatureRows()
  }:null,
  warnings:[
   'These are interpolated 3D animation coordinates, not physical measurements',
   'No ground-truth motor skill judgment, causal claim or AI correctness estimate',
   'No repeatability assessment from one independent take',
   'Acceleration, jerk and approximate SPARC require validation against raw source sample frequency'
  ]
 };
 downloadExperimentFile('compound-eye-v47-original-series.json',JSON.stringify(raw),'application/json;charset=utf-8');
 downloadExperimentFile('compound-eye-v47-analysis-metadata.json',JSON.stringify(results,null,2),'application/json;charset=utf-8');
 toast('元時系列と解析条件を分けたJSONを書き出しました');
}
function v47ClockForB(){
 const A=v47.A,B=v47.B;if(!A||!B)return 0;
 const liveSource=Number.isFinite(state._renderedAnimationTime)?state._renderedAnimationTime:v47.currentTime;
 const sourceTime=((liveSource%A.duration)+A.duration)%A.duration;
 return $('v47Alignment').value==='phase'?
  sourceTime*B.duration/Math.max(.001,A.duration):sourceTime;
}
function v47DrawReference(pv,world){
 if(!v47.on||!v47.B||!v47.comparison?.safe||!$('v47Ghost').checked||
    $('v47DisplayMode').value!=='compare'||state.model!==v47.A.avatar)return;
 const B=v47.B,md=getModel(B.avatar);
 const isSame=md===modelData;
 const renderTime=Math.min(B.duration-.0001,Math.max(0,v47ClockForB()));
 const primaryTime=state._renderedAnimationTime;
 const originalStateModel=state.model;
 try{
  state.model=B.avatar;
  animateModel(md,B.motion,renderTime);
  state.model=originalStateModel;
  const height=Math.max(.1,md.max[1]-md.min[1],md.max[0]-md.min[0],md.max[2]-md.min[2]);
  const scaleValue=1.75/height;
  const center=[(md.min[0]+md.max[0])/2,(md.min[1]+md.max[1])/2,(md.min[2]+md.max[2])/2];
  const shift=mul(trans(state.actorPos[0]+.26,.86,state.actorPos[1]),
    mul(rotY(state.actorYaw+(state.facingBack?Math.PI:0)),
    mul(scale(scaleValue,scaleValue,scaleValue),trans(-center[0],-center[1],-center[2]))));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);gl.disable(gl.DEPTH_TEST);
  renderMesh(pv,shift,null,md,.32);
 }catch(err){if(!v47.ghostError){console.warn('Reference render failed',err);v47.ghostError=true;}}
 finally{
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  state.model=originalStateModel;
  if(isSame)animateModel(md,state.motion,primaryTime);
 }
}
function v47MarkerAtTime(f){
 const A=v47.A,B=v47.B,pair=v47.comparison;
 if(!A||!B||!pair)return f.marker;
 const ref=pair.matched.find(x=>x.A.key===f.key);
 if(!ref)return f.marker;
 const a=v47Point(A,v47.currentTime,'','raw',A);
 const b=v47Point(B,v47.currentTime,'',$('v47Alignment').value,A);
 const norm=pair.differentSkeleton;
 const va=(ref.A.linear[a.i]||0)/(norm?A.height:1);
 const vb=(ref.B.linear[b.i]||0)/(norm?B.height:1);
 const speedRatio=va>.04?(vb-va)/va:null;
 const t=v47.currentTime;
 const onsetDelta=t<=Math.max(ref.B.onset||0,ref.A.onset||0)+.12?f.onsetDelta:null;
 return v47Category(onsetDelta,speedRatio,f.rangeRelative,v47Config());
}
function v47DrawMarkers(projections){
 if(v47.A&&Number.isFinite(state._renderedAnimationTime))
  v47.currentTime=((state._renderedAnimationTime%v47.A.duration)+v47.A.duration)%v47.A.duration;
 v47MarkerLayer.replaceChildren();v47.lastProjections=projections;
 if(!v47.on||!v47.A||!Array.isArray(projections)||!projections.length||
    state.model!==v47.A.avatar)return;
 if($('v47DisplayMode').value==='normal')return;
 const selected=v47Selected(),only=selected.length===1?selected[0]:null;
 const items=[];
 if(only)items.push({id:only.index,key:only.key,color:'#fff2a1',glyph:'◎',label:'選択'});
 if($('v47DisplayMode').value==='compare'&&v47.comparison?.safe&&$('v47Markers').checked){
  const comparisons=v47MatchedFeatureRows();
  const ranked=comparisons.sort((a,b)=>
    (Math.abs(b.onsetDelta||0)+Math.abs(b.speedRelative||0))-
    (Math.abs(a.onsetDelta||0)+Math.abs(a.speedRelative||0)));
  const limit=Number($('v47MarkerLimit').value)||5;
  for(const item of ranked.slice(0,limit)){
   const category=v47MarkerAtTime(item);
   if(items.some(x=>x.key===item.key))continue;
   items.push({id:item.sourceA,key:item.key,color:category.color,glyph:category.glyph,label:category.label});
  }
 }
 for(const item of items){
  const bone=modelData.world[item.id];if(!bone)continue;
  const pos=mulPoint(state._modelFit,[bone[12],bone[13],bone[14]]);
  for(let eye=0;eye<projections.length;eye++){
   const uv=projectionUV(projections[eye],pos);
   if(!uv||uv[0]<0||uv[0]>1||uv[1]<0||uv[1]>1)continue;
   const ring=document.createElement('div');ring.className='v47DiffRing';
   ring.textContent=item.glyph;
   ring.setAttribute('aria-label',item.key+' '+item.label);
   ring.title=item.key+' '+item.label;
   ring.style.color=item.color;
   ring.style.left=((eye+uv[0])*100/projections.length)+'%';
   ring.style.top=((1-uv[1])*100)+'%';
   v47MarkerLayer.appendChild(ring);
  }
  const jointName=modelData.nodes[item.id].name;
  let lens=motionLensForBone(jointName);
  if(lens<0&&state.eyeCount===2)lens=/^(Right|R_)/.test(jointName)?1:0;
  if(lens<0)continue;
  for(let eye=0;eye<projections.length;eye++){
   const centroid=lensDiagnostics.perEye[eye]?.[lens]?.centerUV;
   if(!centroid)continue;
   const glow=document.createElement('div');glow.className='v47LensGlow';
   glow.style.left=((eye+centroid[0])*100/projections.length)+'%';
   glow.style.top=((1-centroid[1])*100)+'%';
   v47MarkerLayer.appendChild(glow);
  }
 }
}

