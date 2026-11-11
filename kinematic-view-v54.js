// v54: opt-in, offline kinematic exploration. Never infers forces/skill.
const v54={enabled:false,mode:'normal',result:null,comparison:null,events:[],
  jointX:null,jointY:null,config:null,log:{joint_events:[],relation_events:[],display_events:[]},
  lastCursor:0,lastDisplayLog:0,visualOverlay:null,selectedEvent:-1,
  dataSource:'current',importedResult:null,importCursor:0,lastSkeleton:null,markerNodes:new Map()};
function v54Active(){return v54.enabled&&$('v54AnalysisPanel')?.open;}
function v54GetResult(){
 if(v54.dataSource==='imported'&&v54.importedResult)return v54.importedResult;
 const a=state.model,m=state.motion;
 const rev=v54Revision(a,m);
 if(!v54.result||v54.result.avatar!==a||v54.result.motion!==m||
    v54.result.asset.motion_revision_id!==rev){
  v54.result=v54ExportData(a,m);
  v54.events=[];v54.comparison=null;
 }
 return v54.result;
}
function v54Config(){
 const result=v54GetResult(),duration=result.data.duration;
 const from=clamp(Number($('v54From').value)||0,0,duration-.002);
 const to=clamp(Number($('v54To').value)||duration,from+.002,duration);
 return {from,to,hold:clamp(Number($('v54Hold').value)||3,2,10),
  onset:Math.max(0,Number($('v54Onset').value)||0),
  threshold_units:{X:$('v54MetricX').value==='angular'?'rad/s':'model_units/s',Y:$('v54MetricY').value==='angular'?'rad/s':'model_units/s'},
  change:Math.max(0,Number($('v54ChangeThreshold').value)||0),
  prominence:clamp(Number($('v54Prominence').value)||.15,.05,.95),
  metricX:$('v54MetricX').value,metricY:$('v54MetricY').value,
  method:'offline_preserved_legacy_speed; signed_rates_actual_time; smoothing_already_applied',
  source_processing:result.config||'unrecorded_in_legacy_CSV',
  statusHold:0,clock:'original_animation_seconds'};
}
function v54JointList(){
 const result=v54GetResult(),opts=result.data.joints;
 const previous=v54.lastSkeleton===result.data.skeletonId?[v54.jointX,v54.jointY]:[null,null];
 v54.lastSkeleton=result.data.skeletonId;
 for(const [n,id] of ['v54JointX','v54JointY'].entries()){
  const element=$(id);element.replaceChildren();
  for(const joint of opts){
   const option=document.createElement('option');option.value=String(joint.index);
   option.textContent=v48JointLabel(joint)+' ／ '+joint.name+' ('+joint.index+')';
   element.append(option);
  }
  const preferred=n===0?/^(Hips|Pelvis)$/i:/^(RightHand|R_Hand)$/i;
  const fallback=opts.find(j=>preferred.test(j.name))?.index??opts[n]?.index??0;
  element.value=String(opts.some(j=>j.index===previous[n])?previous[n]:fallback);
 }
 v54.jointX=Number($('v54JointX').value);v54.jointY=Number($('v54JointY').value);
 const end=$('v54To');
 if(!end.dataset.userChanged){
  end.value=String(Math.min(result.data.duration-.001,.70));
 }
 end.max=String(result.data.duration);
 $('v54From').max=String(result.data.duration);
}
function v54Series(index,metric){
 const result=v54GetResult(),rows=result.byJoint[String(index)]||[];
 const name=metric==='angular'?'angular_speed':'linear_speed';
 const change=metric==='angular'?'angular_speed_change':'linear_speed_change';
 return {joint:result.data.joints.find(j=>j.index===index),
  times:rows.map(x=>x.time),
  speed:rows.map(x=>K54.finite(x[name])?x[name]:null),
  change:rows.map(x=>K54.finite(x[change])?x[change]:null),
  unit:metric==='angular'?'rad/s':'model_units/s',
  metric,rows};
}
function v54AnalyzeSeries(series,config,id){
 const {speed,times,change}=series,states=K54.states(speed,change,config.change,
    series.metric==='angular'?.02:.01);
 const onset=K54.detectOnset(speed,times,config.from,config.to,config.onset,config.hold);
 const peaks=K54.peakCandidates(speed,times,config.from,config.to,{prominence:config.prominence});
 const within=times.map((t,i)=>t>=config.from&&t<=config.to?i:-1).filter(i=>i>=0);
 const max=within.reduce((acc,i)=>K54.finite(speed[i])&&(!acc||speed[i]>acc.value)?{
   time:times[i],value:speed[i],index:i}:acc,null);
 const joint=series.joint;
 return {id,series,states,onset,peaks,max,joint,unit:series.unit,
   events:[
    ...(onset.time===null?[]:[{event_id:id+':onset',kind:'onset',time:onset.time,label:'開始候補',quality:onset.status}]),
    ...peaks.candidates.map((x,i)=>({event_id:id+':peak:'+i,kind:'peak',time:x.time,
      range:[x.start,x.end],value:x.value,label:'局所ピーク',quality:x.quality}))
   ]};
}
function v54ReadSelectedY(){
 const avatar=$('v47AvatarB')?.value;
 const motion=$('v47MotionB')?.value;
 if(!avatar||!motion||!v47Options(avatar).includes(motion))return null;
 return {avatar,motion};
}
function v54UpdateXYEnabled(){
 const available=v54.dataSource!=='imported'&&!!v54ReadSelectedY();
 const b=document.querySelector('[data-v54-mode="xy"]');
 if(b){b.disabled=!available;b.title=available?'現在の動作と比較B':'先に上段で比較Bのアバター・動作を指定してください';}
 if(!available&&v54.mode==='xy')v54SetMode('normal');
 return available;
}
function v54SetMode(mode){
 if(mode==='xy'&&!v54UpdateXYEnabled())return;
 v54.mode=mode;v54.selectedEvent=-1;
 document.querySelectorAll('[data-v54-mode]').forEach(x=>x.classList.toggle('selected',x.dataset.v54Mode===mode));
 if(mode==='normal')$('v54OverlayEnable').checked=false;
 v54Render();
}
function v54Comparison(config,x){
 const selected=v54ReadSelectedY();
 if(v54.dataSource==='imported')return {ok:false,reason:'読込CSVと比較Bの座標・動作条件の検証が未実施です'};
 if(!selected)return {ok:false,reason:'X・Yの比較対象モーションが未選択です'};
 const sourceA=v54GetResult(),sourceB=v54ExportData(selected.avatar,selected.motion);
 const sameSkeleton=sourceA.data.skeletonId===sourceB.data.skeletonId;
 const findMatching=j=>sourceB.data.joints.find(b=>b.index===j.index&&b.name===j.name);
 const xJointA=x.joint,yJointA=v54.current.Y.joint;
 const xJointB=findMatching(xJointA),yJointB=findMatching(yJointA);
 if(!sameSkeleton||!xJointB||!yJointB)return {
  ok:false,reason:'骨格・関節IDの一致を確認できません。異なる骨格には対応付けと検証が必要です。',
  source_a:sourceA.metadata,source_b:sourceB.metadata,
  joint_mapping:'not_verified',comparison_quality:'unavailable_cross_skeleton'
 };
 const interval={start:config.from,end:config.to},
  phaseB={start:clamp(config.from,0,sourceB.data.duration),
    end:clamp(config.to,0,sourceB.data.duration)};
 const field=m=>m==='angular'?'angular_speed':'linear_speed';
 const findPeak=(rows,from,to,metric)=>{
  const series=rows.map(r=>r[field(metric)]);
  const candidates=K54.peakCandidates(series,rows.map(r=>r.time),from,to,
    {prominence:config.prominence}).candidates;
  return candidates.reduce((acc,p)=>!acc||p.value>acc.value?p:acc,null);
 };
 const xa=sourceA.byJoint[String(xJointA.index)],ya=sourceA.byJoint[String(yJointA.index)],
  xb=sourceB.byJoint[String(xJointB.index)],yb=sourceB.byJoint[String(yJointB.index)];
 const xPeakA=findPeak(xa,interval.start,interval.end,config.metricX);
 const yPeakA=findPeak(ya,interval.start,interval.end,config.metricY);
 const xPeakB=findPeak(xb,phaseB.start,phaseB.end,config.metricX);
 const yPeakB=findPeak(yb,phaseB.start,phaseB.end,config.metricY);
 const displacementRange=(rows,from,to)=>{
  const samples=rows.filter(r=>r.time>=from&&r.time<=to&&
   r.position_smoothed?.every(K54.finite));
  if(samples.length<2)return null;
  const start=samples[0].position_smoothed;
  return Math.max(...samples.map(r=>Math.hypot(...r.position_smoothed.map((v,i)=>v-start[i]))));
 };
 const lagA=xPeakA&&yPeakA?yPeakA.time-xPeakA.time:null;
 const lagB=xPeakB&&yPeakB?yPeakB.time-xPeakB.time:null;
 const makeEvent=(src,joint,peak,range,lag)=>({
  skeleton_id:src.data.skeletonId,joint_id:joint.index,
  motion_revision_id:src.asset.motion_revision_id,
  source_asset_sha256:src.asset.source_asset_sha256,
  unit:config.metricX==='angular'?'rad/s':'model_units/s',
  peakTime:peak?.time??null,peak:peak?.value??null,range,timeLag:lag
 });
 const vA=makeEvent(sourceA,xJointA,xPeakA,
  displacementRange(xa,interval.start,interval.end),lagA);
 const vB=makeEvent(sourceB,xJointB,xPeakB,
  displacementRange(xb,phaseB.start,phaseB.end),lagB);
 // Comparison is explicitly between different asset versions; do not merge
 // their derived datasets. compareEvents checks the bone identity + unit,
 // while revisions remain separate in source metadata below.
 const delta=K54.compareEvents({...vA,motion_revision_id:''},{...vB,motion_revision_id:''});
 const onset=(rows,metric,from,to)=>K54.detectOnset(
  rows.map(r=>r[field(metric)]),rows.map(r=>r.time),from,to,config.onset,config.hold);
 const onsetA=onset(xa,config.metricX,interval.start,interval.end);
 const onsetB=onset(xb,config.metricX,phaseB.start,phaseB.end);
 const onsetDelta=onsetA.time!==null&&onsetB.time!==null?onsetB.time-onsetA.time:null;
 const durationA=sourceA.data.duration,durationB=sourceB.data.duration;
 return {ok:true,source_x:sourceA.metadata,source_y:sourceB.metadata,
  joint_id:xJointA.index,other_joint_id:yJointA.index,
  raw_time_difference:delta,
  onset_time_difference_seconds:onsetDelta,
  x_peak_time_A:xPeakA?.time??null,x_peak_time_B:xPeakB?.time??null,
  y_peak_time_A:yPeakA?.time??null,y_peak_time_B:yPeakB?.time??null,
  time_lag_A_seconds:lagA,time_lag_B_seconds:lagB,
  time_lag_difference_seconds:lagA!==null&&lagB!==null?lagB-lagA:null,
  phase_aligned_peak_difference_pp:xPeakA&&xPeakB?
   (xPeakB.time/durationB-xPeakA.time/durationA)*100:null,
  peak_range_A:xPeakA?[xPeakA.start,xPeakA.end]:null,
  peak_range_B:xPeakB?[xPeakB.start,xPeakB.end]:null,
  zero_if_identical:selected.avatar===sourceA.avatar&&selected.motion===sourceA.motion,
  source_revision_x:sourceA.asset.motion_revision_id,
  source_revision_y:sourceB.asset.motion_revision_id,
  source_duration_x:durationA,source_duration_y:durationB,
  note:'元時刻の差と動作0〜100％の位置合わせ後の差は別。絶対時刻の差を正規化後の差に置換しない。',
  comparison_quality:'same_skeleton_and_joint_id; synthetic_animation_only'
 };
}
function v54DoAnalysis(){
 if(!ready||!modelData)return;
 try{
  const result=v54GetResult();
  if(!v54.current||v54.current.source!==result)v54JointList();
  v54.jointX=Number($('v54JointX').value);v54.jointY=Number($('v54JointY').value);
  v54.config=v54Config();
  const X=v54AnalyzeSeries(v54Series(v54.jointX,v54.config.metricX),v54.config,'X');
  const Y=v54AnalyzeSeries(v54Series(v54.jointY,v54.config.metricY),v54.config,'Y');
  const compatible=X.unit===Y.unit;
  const ratioMax=compatible?K54.ratio(Y.max?.value,X.max?.value):{value:null,status:'unit_mismatch'};
  const now=clamp(state._renderedAnimationTime||0,v54.config.from,v54.config.to);
  const iX=X.series.times.reduce((acc,t,i)=>Math.abs(t-now)<Math.abs(X.series.times[acc]-now)?i:acc,0);
  const iY=Y.series.times.reduce((acc,t,i)=>Math.abs(t-now)<Math.abs(Y.series.times[acc]-now)?i:acc,0);
  const ratioNow=compatible?K54.ratio(Y.series.speed[iY],X.series.speed[iX]):{value:null,status:'unit_mismatch'};
  const overlap=K54.overlapIntervals(result.times,X.states,Y.states)
   .filter(e=>e.end>=v54.config.from&&e.start<=v54.config.to)
   .map(e=>({start:Math.max(e.start,v54.config.from),end:Math.min(e.end,v54.config.to)}))
   .map(e=>({...e,duration:e.end-e.start}));
  const peakX=X.peaks.candidates.reduce((acc,p)=>!acc||p.value>acc.value?p:acc,null);
  const peakY=Y.peaks.candidates.reduce((acc,p)=>!acc||p.value>acc.value?p:acc,null);
  const lag=peakX&&peakY?peakY.time-peakX.time:null;
  const relId='R:'+result.trial_id+':'+v54.jointX+':'+v54.jointY;
  v54.current={X,Y,compatible,ratioMax,ratioNow,overlap,peakX,peakY,lag,
    source:result,interval:[v54.config.from,v54.config.to],relation_id:relId,
    fastJoints:result.data.joints.filter(j=>!/Thumb|Index|Middle|Ring|Pinky/i.test(j.name))
     .map(j=>({joint:j,peak:Math.max(0,...(result.byJoint[String(j.index)]||[])
       .filter(r=>r.time>=v54.config.from&&r.time<=v54.config.to).map(r=>r.linear_speed||0))}))
     .sort((a,b)=>b.peak-a.peak).slice(0,3)};
  v54.comparison=v54.mode==='xy'?v54Comparison(v54.config,X):null;
  const jointEvents=[...X.events,...Y.events];
  const relationEvents=overlap.map((e,i)=>({event_id:relId+':overlap:'+i,kind:'relation',time:e.start,range:[e.start,e.end],label:'X減速・Y増速',quality:'observed_overlap_not_causality'}));
  v54.events=[...jointEvents,...relationEvents].sort((a,b)=>a.time-b.time);
  v54.log.joint_events=jointEvents.map(e=>({
   ...e,trial_id:result.trial_id,method:v54.config,joint_id:e.event_id.startsWith('X')?v54.jointX:v54.jointY,
   skeleton_id:result.data.skeletonId,motion_id:result.motion,motion_revision_id:result.asset.motion_revision_id,
   source_asset_sha256:result.asset.source_asset_sha256,quality:e.quality
  }));
  v54.log.relation_events=[{event_id:relId,relation_id:relId,trial_id:result.trial_id,
   motion_id:result.motion,motion_revision_id:result.asset.motion_revision_id,source_asset_sha256:result.asset.source_asset_sha256,
   skeleton_id:result.data.skeletonId,joint_ids:[v54.jointX,v54.jointY],
   metric_units:{X:X.unit,Y:Y.unit,lag:'s'},detection_settings:{...v54.config},
   x_joint_id:v54.jointX,y_joint_id:v54.jointY,
   x_metric:v54.config.metricX,y_metric:v54.config.metricY,
   time_range:v54.current.interval,peak_lag_seconds:lag,
   overlap,overlap_events:relationEvents,related_event_ids:v54.events.map(e=>e.event_id),
   quality:lag===null?'missing_peak_candidate':'observed_timing_only_not_causal'}];
  v54Render();
 }catch(e){console.error('Kinematic analysis failed',e);$('v54Readout').textContent='解析不可：'+e.message}
}


function v54Text(v,unit=''){
 return K54.finite(v)?v.toFixed(3)+(unit?' '+unit:''):'該当なし';
}
function v54PeakDescription(p,label){
 if(!p)return label+'：該当なし';
 return label+'：'+v54Text(p.time,'秒')+(p.flat?
   '（平坦なピーク候補：'+v54Text(p.start,'秒')+'～'+v54Text(p.end,'秒')+'）':'（局所ピーク候補）');
}
function v54ViewReadout(){
 const c=v54.current;
 if(!c)return '解析前です。区間と対象部位を選択してください。';
 const {X,Y}=c;
 const lag=c.lag===null?'候補がないため未定義':v54Text(c.lag*1000,'ms')+'（Yピーク－Xピーク）';
 const relationText='X：'+v48JointLabel(X.joint)+'（'+X.unit+'）、Y：'+v48JointLabel(Y.joint)+
  '（'+Y.unit+'）／分析区間 '+v54Text(c.interval[0],'秒')+'～'+v54Text(c.interval[1],'秒');
 const mode=v54.mode;
 if(mode==='normal')return relationText+'。通常表示：追加の部位マーカーはOFFです。';
 if(mode==='fast')return relationText+'。速度ピークの大きな部位を最大3つだけ候補表示します。';
 if(mode==='relation'){
  let lines=[
   relationText,
   '移動／回転の開始候補：X '+(X.onset.time===null?'検出不可':v54Text(X.onset.time,'秒'))+
    '、Y '+(Y.onset.time===null?'検出不可':v54Text(Y.onset.time,'秒')),
   v54PeakDescription(c.peakX,'X最大局所ピーク'),
   v54PeakDescription(c.peakY,'Y最大局所ピーク'),
   '部位間のピーク時間差：'+lag,
   '増速／減速区間：'+v54StateIntervals(X)+' ／ '+v54StateIntervals(Y),
   'X減速中・Y増速中の重なり：'+(c.overlap.length?
    c.overlap.map(v=>v54Text(v.start,'秒')+'～'+v54Text(v.end,'秒')).join('、'):'該当区間なし')
  ];
  if(c.compatible){
   lines.push('最大速度比 Y/X：'+(c.ratioMax.value===null?'未定義（分母0等）':v54Text(c.ratioMax.value,'倍')));
   lines.push('同時刻の速度比は下の「速度比・波形比較」欄で再生時刻に同期して更新します。');
  }else lines.push('XとYは単位が異なるため速度比を算出しません。');
  return lines.join('\n');
 }
 if(mode==='xy'){
  if(!v54.comparison?.ok)return 'X・Y差分：'+(v54.comparison?.reason||'比較対象がありません');
  const d=v54.comparison.raw_time_difference;
  return relationText+'。\n X・Y：同一骨格・同一部位IDの2動作比較。'+
   '\n元時刻のピーク差（Y－X）：'+v54Text(d.peakTimeDelta,'秒')+
   '\nピーク値差：'+v54Text(d.peakValueDelta,X.unit)+
   '\n可動範囲差：'+v54Text(d.rangeDelta,'モデル単位')+
   '\n運動開始判定の時刻差：'+v54Text(v54.comparison.onset_time_difference_seconds,'秒')+
   '\n部位間ピーク時間差の変化（Y−X）：'+v54Text(v54.comparison.time_lag_difference_seconds,'秒')+
   '\n時間正規化したXのピーク位置の差：'+v54Text(v54.comparison.phase_aligned_peak_difference_pp,'パーセントポイント')+
   '\n元時刻と局面0〜100％の位置合わせは別です。見かけ上の時間差を因果とは解釈しません。';
 }
 return relationText;
}
function v54DrawChart(){
 const c=v54.current,root=$('v54Chart');root.replaceChildren();
 if(!c)return;
 const svg=analysisElement('svg',{viewBox:'0 0 900 300','aria-label':'関節速度波形とイベント'});
 const left=85,right=16,start=37,height=102,width=900-left-right;
 const config=v54.config,from=config.from,to=config.to,duration=Math.max(.001,to-from);
 const xAt=t=>left+width*(t-from)/duration;
 for(const [j,part] of [c.X,c.Y].entries()){
  const yTop=start+j*135,ys=part.series.speed;
  const indices=part.series.times.map((t,i)=>t>=from&&t<=to?i:-1).filter(i=>i>=0);
  const max=Math.max(.00001,...indices.map(i=>K54.finite(ys[i])?ys[i]:0));
  svg.append(analysisElement('text',{x:10,y:yTop+10,'font-size':12,fill:j?'#f8c979':'#70dfe9'},
   (j?'Y：':'X：')+v48JointLabel(part.joint)+' '+part.unit));
  for(let k=0;k<=3;k++){
   const yy=yTop+16+height*k/3;
   svg.append(analysisElement('line',{x1:left,y1:yy,x2:900-right,y2:yy,
    stroke:'#284659','stroke-width':1}));
  }
  const points=indices.filter(i=>K54.finite(ys[i])).map(i=>{
   const yy=yTop+16+height*(1-ys[i]/max);
   return xAt(part.series.times[i]).toFixed(2)+','+yy.toFixed(2);
  }).join(' ');
  if(points)svg.append(analysisElement('polyline',{points,fill:'none',
   stroke:j?'#efba64':'#64dce5','stroke-width':2.3}));
  const peaks=part.peaks.candidates;
  for(const peak of peaks.slice(0,8)){
   const xx=xAt(peak.time);
   svg.append(analysisElement('line',{x1:xx,y1:yTop+18,x2:xx,y2:yTop+16+height,
    stroke:'#eadf80','stroke-width':1,'stroke-dasharray':'4 4'}));
  }
 }
 for(let i=0;i<=5;i++){
  const time=from+duration*i/5,x=xAt(time);
  svg.append(analysisAxisText(x,294,v54Text(time,'秒')));
 }
 const cursor=analysisElement('line',{id:'v54CursorLine',x1:left,y1:31,x2:left,y2:270,
  stroke:'#ffffff','stroke-width':2,'stroke-dasharray':'6 4'});
 svg.append(cursor);
 svg.addEventListener('pointerdown',ev=>{
  const bounds=svg.getBoundingClientRect(),x=(ev.clientX-bounds.left)/bounds.width*900;
  v54Seek(clamp(from+(x-left)/width*duration,from,to));
 });
 root.append(svg);v54UpdateCursor();
}
function v54CurrentOriginalTime(){
 if(v54.dataSource==='imported')return v54.importCursor;
 const result=v54.result;
 if(!result)return 0;
 const t=Number(state._renderedAnimationTime||0);
 return ((t%result.data.duration)+result.data.duration)%result.data.duration;
}
function v54Seek(time){
 const t=clamp(time,0,Math.max(.01,v54GetResult().data.duration-.001));
 if(v54.dataSource==='imported'){v54.importCursor=t;v54UpdateCursor();v54RefreshRatio();return;}
 if(!v47.A||v47.A.avatar!==state.model||v47.A.motion!==state.motion){
  $('v47AvatarA').value=state.model;
  v47OptionsFor(state.model,$('v47MotionA'));
  $('v47MotionA').value=state.motion;
  v47Analyze();
 }
 if(v47.A&&v47.A.avatar===state.model&&v47.A.motion===state.motion)v47Seek(t);
 else{
  state.paused=true;state.pauseTime=t/Math.max(.001,v61IsPunch(state.motion)?state.punchPlayback:1);
  draw(performance.now());
 }
 v54UpdateCursor();
 v54.log.display_events.push({trial_id:v54GetResult().trial_id,action:'seek_event',
  original_animation_time_s:t,requested_display_perf_ms:performance.now(),
  light_emission_time:'not_measured',eye_count:state.eyeCount,stereo:isStereoVR(),
  mode:v54.mode,selected_joints:[v54.jointX,v54.jointY],reason:'user_selected_event'});
}
function v54UpdateCursor(){
 const cursor=$('v54CursorLine');if(!cursor||!v54.config)return;
 const now=v54CurrentOriginalTime(),c=v54.config;
 const x=clamp(85+(900-85-16)*(now-c.from)/Math.max(.001,c.to-c.from),85,884);
 cursor.setAttribute('x1',String(x));cursor.setAttribute('x2',String(x));
}
function v54JumpEvent(dir){
 if(!v54.events.length){$('v54Readout').textContent='この区間で該当するイベントはありません';return;}
 const now=v54CurrentOriginalTime();
 const list=v54.events;
 const target=dir>0?(list.find(e=>e.time>now+.002)||list[0]):
  ([...list].reverse().find(e=>e.time<now-.002)||list[list.length-1]);
 v54.selectedEvent=list.indexOf(target);
 v54Seek(target.time);
 $('v54Quality').textContent=target.label+'：'+v54Text(target.time,'秒')+
  ' ／ '+target.quality+'。画面への描画を指示した時刻でありHMDの発光測定ではありません。';
}
function v54RenderEventButtons(){
 const el=$('v54EventList');el.replaceChildren();
 for(const e of v54.events.slice(0,14)){
  const btn=document.createElement('button');btn.type='button';btn.className='v54EventButton';
  btn.textContent=e.event_id[0]+' '+e.label+' '+v54Text(e.time,'秒');
  btn.title=e.quality;
  btn.onclick=()=>v54Seek(e.time);
  el.append(btn);
 }
}
function v54Render(){
 const note=$('v54Readout'),quality=$('v54Quality'),smooth=$('v54Smoothness');
 if(!v54.current){note.textContent='解析を実行してください';return;}
 note.textContent=v54ViewReadout();
 note.style.whiteSpace='pre-line';
 const title=$('v54SectionTitle');
 if(title)title.textContent=v54.mode==='xy'?'X・Yの差':
  v54.mode==='fast'?'速い部位':v54.mode==='normal'?'通常':'部位間の時間関係';
 const ratioPanel=$('v54RatioReadout');
 if(ratioPanel){
  const v=v54.current,now=v54CurrentOriginalTime();
  const compatible=v.compatible;
  const msg=compatible?[
   '最大速度比 Y/X：'+(v.ratioMax.value===null?'未定義（分母が0または微小値）':v54Text(v.ratioMax.value,'倍')),
   '同時刻 '+v54Text(now,'秒')+' の速度比 Y/X：'+(v.ratioNow.value===null?'未定義（分母が0または微小値）':v54Text(v.ratioNow.value,'倍')),
   '波形は同じ元アニメーション時刻に同期。ピーク比と同時刻比は別の値です。'
  ]:['異なる単位（移動速度と角速度）のため無次元比を計算しません。','別の縦軸と元時刻で波形を比較してください。'];
  ratioPanel.textContent=msg.join(' ／ ');
 }

 const c=v54.current;
 quality.textContent='品質：元GLBを約30Hzで補間サンプリングしたオフライン計算。'+
  '閾値 '+v54Config().onset+'、継続 '+v54Config().hold+'サンプル、ピーク検出割合 '+
  v54Config().prominence+'。空値、平坦なピーク、静止は候補・評価不可を明示します。';
 const from=v54.config.from,to=v54.config.to;
 const x=v54GetResult().byJoint[String(v54.jointX)].filter(r=>r.time>=from&&r.time<=to);
 const hasRaw=x.every(r=>r.position_raw?.every(K54.finite));
 const k=K54.positionKinematics(x.map(r=>hasRaw?r.position_raw:r.position_smoothed),x.map(r=>r.time),{window:hasRaw?3:1});
 const indices=x.map((_,i)=>i);
 const peaks=c.X.peaks.candidates;
 const jerk=indices.map(i=>k.jerkMagnitude[i]?.value).filter(K54.finite);
 const norm=jerk.length?Math.sqrt(jerk.reduce((a,v)=>a+v*v,0)/jerk.length):null;
 c.smoothness={vector_jerk_RMS:norm,unit:'model_units/s3',sample_count:x.length,raw_position_available:hasRaw,filter:hasRaw?'moving_average_3':'none_already_smoothed',interval:[from,to],quality:x.length<4?'insufficient_samples':'exploratory_not_skill_score',SPARC:null,SPARC_reason:'reference_unverified_disabled'};
 const values=c.X.series.speed,times=c.X.series.times;
 let valleys=0;
 for(let i=1;i<values.length-1;i++)if(times[i]>=from&&times[i]<=to&&
  K54.finite(values[i-1])&&K54.finite(values[i])&&K54.finite(values[i+1])&&
  values[i]<values[i-1]&&values[i]<=values[i+1]&&values[i]<Math.max(...values)*.9)valleys++;
 smooth.textContent='指定区間の速度局所ピーク候補数：'+peaks.length+'、速度の谷：'+valleys+'件。'+
  '位置を3階微分したベクトルジャークRMS：'+v54Text(norm,'モデル単位/秒³')+
  '（'+(indices.length<4?'区間内サンプル不足・評価不可':(hasRaw?'探索的参考値':'平滑化済み位置からの参考値・原位置は未収録'))+
  '）。局面・フィルターの影響を受け、技能の優劣ではありません。'+
  'SPARCは定義・参照実装が未照合のため評価不可。';
 if(v54.dataSource==='imported')quality.textContent='品質：読込CSVの保存済み速度・時刻を使用。位置は再平滑化しません。未収録項目は推測しません。アバター姿勢との対応は未検証のため重ね合わせは無効です。';
 v54DrawChart();v54RenderEventButtons();
}


function v54OverlayDraw(projections){
 if(!v54.visualOverlay)return;
 if(v54Active()&&performance.now()-v54.lastCursor>80){v54.lastCursor=performance.now();v54UpdateCursor();v54RefreshRatio();}
 if(!v54Active()||!$('v54OverlayEnable').checked||v54.mode==='normal'||!v54.current||v54.dataSource==='imported'){
  if(v54.visualOverlay.childElementCount)v54.visualOverlay.replaceChildren();v54.markerNodes.clear();return;
 }
 v54.markersUsed=new Set();
 const processingStart=performance.now();
 if(v54.current.source.avatar!==state.model||v54.current.source.motion!==state.motion){
  v54.visualOverlay.replaceChildren();v54.markerNodes.clear();
  if(!v54.pendingRefresh){v54.pendingRefresh=true;queueMicrotask(()=>{v54.pendingRefresh=false;v54JointList();v54DoAnalysis();});}
  return;
 }
 const result=v54.current.source,now=v54CurrentOriginalTime(),choice=v54.mode;
 const indices=[];
 if(choice==='fast'){
  for(const x of v54.current.fastJoints)if(x.peak>1e-5)indices.push({index:x.joint.index,
   text:'速 '+v48JointLabel(x.joint),color:'#f3df81',reason:'interval_max_speed_top3'});
 }else if(choice==='relation'){
  for(const [key,part] of [['X',v54.current.X],['Y',v54.current.Y]]){
   const i=part.series.times.reduce((best,t,k)=>Math.abs(t-now)<Math.abs(part.series.times[best]-now)?k:best,0);
   const inInterval=now>=v54.config.from&&now<=v54.config.to;
   const base=part.states[i]||{state:'unavailable',label:'?'};
   const nearPeak=part.peaks.candidates.some(p=>Math.abs(now-p.time)<=Math.max(.001,(part.series.times[1]-part.series.times[0])/2));
   const stateInfo=!inInterval?{state:'unavailable',label:'区間外'}:nearPeak?{state:'peak',label:'峰'}:base;
   const color=stateInfo.state==='peak'?'#fff27a':stateInfo.state==='unavailable'?'#aaa':stateInfo.state==='accelerating'?'#92f5c9':
     stateInfo.state==='decelerating'?'#f4c27f':
     stateInfo.state==='low'?'#e0d2e4':'#a4d3f3';
   indices.push({index:part.joint.index,text:key+' '+v48JointLabel(part.joint)+' '+stateInfo.label,
    color,reason:'observed_'+stateInfo.state});
  }
 }else if(choice==='xy'&&v54.comparison?.ok){
  indices.push({index:v54.jointX,text:'X・Y Δ'+v54Text(v54.comparison.raw_time_difference?.peakTimeDelta,'秒'),
   color:'#d9c1ff',reason:'two_motion_peak_time_difference'});
 }
 const visible=new Set();
 for(const item of indices.slice(0,3)){
  if(visible.has(item.index))continue;visible.add(item.index);
  const world=modelData?.world?.[item.index];if(!world)continue;
  const point=mulPoint(state._modelFit,[world[12],world[13],world[14]]);
  const facets=state.markerPlacement==='facet'&&state.eyeCount>=2&&state.viewMode!=='pov';
  const chosen=v52SelectedIndices();
  for(let eye=0;eye<projections.length;eye++){
   if(facets){
    const possible=chosen.length?chosen:[...Array(activeCameras().length).keys()];
    for(const lens of possible){
     if(!v51MaskOwner(lens,item.index)||!v52FacetVisible(lens))continue;
     const mapped=projectV51LensMarker(projections,eye,lens,point);
     if(!mapped)continue;
     v54AppendMarker(item,mapped.x,mapped.y,eye,projections.length);
     break; // one highlight per joint/eye, even with overlapping facet masks
    }
   }else{
    const uv=projectionUV(projections[eye],point);
    if(!uv)continue;
    const fit=isVrRender()?1.10:1,x=.5+(uv[0]-.5)/fit,y=.5+(uv[1]-.5)/fit;
    if(x<0||x>1||y<0||y>1)continue;
    v54AppendMarker(item,x,y,eye,projections.length);
   }
  }
 }
 for(const [key,node] of v54.markerNodes)if(!v54.markersUsed.has(key)){node.remove();v54.markerNodes.delete(key);}
 if(performance.now()-v54.lastDisplayLog>350){
  v54.lastDisplayLog=performance.now();
  v54.log.display_events.push({trial_id:result.trial_id,eye_count:state.eyeCount,
   lens_selection:v52SelectedIndices(),lens_layout:activeCameras().map((_,i)=>({...cameraSpec(i)})),
   stereo:isStereoVR(),mode:v54.mode,skeleton_id:result.data.skeletonId,motion_id:result.motion,
   motion_revision_id:result.asset.motion_revision_id,source_asset_sha256:result.asset.source_asset_sha256,
   selected_joint_ids:indices.map(j=>j.index),reason_codes:indices.map(j=>j.reason),
   original_animation_time_s:now,requested_display_perf_ms:performance.now(),
   processing_duration_ms:performance.now()-processingStart,light_emission_latency_ms:null,
   light_emission_time:'not_measured',live_latency:'offline_analysis_uses_future_samples',
   viewport:{width:canvas.width,height:canvas.height}});
  if(v54.log.display_events.length>300)v54.log.display_events.splice(0,100);
 }
}
function v54AppendMarker(item,x,y,eye,count){
 const key=item.index+':'+eye;v54.markersUsed.add(key);
 let div=v54.markerNodes.get(key);
 if(!div){div=document.createElement('div');div.className='v54StateMarker';v54.markerNodes.set(key,div);v54.visualOverlay.append(div);}
 div.style.left=((eye+x)*100/count)+'%';div.style.top=((1-y)*100)+'%';
 div.style.color=item.color;div.textContent=item.text;
 div.title=item.reason+'：計測上の特徴であって力の流れ・技能点ではありません';
 div.dataset.jointId=String(item.index);
 div.dataset.eye=String(eye);
}
function v54EventExport(){
 if(!v54.current||!v54.config)return toast('先に区間を解析してください');
 const result=v54.current.source;
 const trial=result.trial_id;
 const structure={
  schema:'compound-eye-v54-kinematic-events-v1',
  trial_id:trial,dataset_id:result.dataset_id,
  source_asset_sha256:result.asset.source_asset_sha256,
  motion_revision_id:result.asset.motion_revision_id,
  analysis_config:v54.config,
  joint_events:v54.log.joint_events,
  relation_events:v54.log.relation_events,
  display_operation_log:v54.log.display_events.filter(e=>e.trial_id===trial),
  comparison:v54.comparison||null,
  velocity_ratio:{peak:v54.current.ratioMax,simultaneous:v54.current.ratioNow,original_animation_time_s:v54CurrentOriginalTime(),unit_compatible:v54.current.compatible},
  smoothness_reference:v54.current.smoothness||null,
  expert_rule_schema:result.metadata.expert_rule_schema,rules:[],
  provenance:{observed_facts:v54.log.joint_events,
   expert_rules:[],model_predictions:[],explanation_text:[]},
  cautions:['offline analysis uses future samples','no HMD photon timestamp',
   'no force transfer/cause inference','human recorded response is not collected',
   'SPARC unverified and disabled','no neural activity or skill scoring']
 };
 downloadExperimentFile('compound-eye-'+result.avatar+'-'+result.motion+'-events-v54.json',
  JSON.stringify(structure,null,2),'application/json;charset=utf-8');
 toast('部位イベント・関係イベント・操作ログをJSONに保存しました');
}
function v54Init(){
 v54.visualOverlay=document.createElement('div');
 v54.visualOverlay.id='v54KinematicOverlay';
 v54.visualOverlay.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:22';
 scope.append(v54.visualOverlay);
 const panel=$('v54AnalysisPanel');
 for(const b of panel.querySelectorAll('[data-v54-mode]'))b.onclick=()=>{
  v54SetMode(b.dataset.v54Mode);
  if(v54.enabled)v54DoAnalysis();
 };
 panel.addEventListener('toggle',()=>{
  v54.enabled=panel.open;
  if(!panel.open){v54.visualOverlay.replaceChildren();v54.markerNodes.clear();return;}
  try{v54JointList();v54UpdateXYEnabled();v54DoAnalysis();}
  catch(e){console.warn('v54 panel not yet initialized',e)}
 });
 $('v54DataSource').onchange=()=>{v54.dataSource=$('v54DataSource').value;v54JointList();v54UpdateXYEnabled();v54DoAnalysis();};
 $('v54Analyze').onclick=v54DoAnalysis;
 $('v54Previous').onclick=()=>v54JumpEvent(-1);
 $('v54Next').onclick=()=>v54JumpEvent(+1);
 $('v54ExportEvents').onclick=v54EventExport;
 $('v54JointX').onchange=()=>{v54.jointX=Number($('v54JointX').value);v54DoAnalysis();};
 $('v54JointY').onchange=()=>{v54.jointY=Number($('v54JointY').value);v54DoAnalysis();};
 for(const id of ['v54MetricX','v54MetricY','v54From','v54To','v54Onset','v54Hold','v54ChangeThreshold','v54Prominence']){
  $(id).onchange=()=>{if(id==='v54To')$(id).dataset.userChanged='1';v54DoAnalysis();};
 }
 for(const name of ['v47AvatarB','v47MotionB']){
  $(name)?.addEventListener('change',v54UpdateXYEnabled);
 }
 v54UpdateXYEnabled();
}
function v54StateIntervals(part){
 const ids=part.series.times.map((t,i)=>t>=v54.config.from&&t<=v54.config.to?i:-1).filter(i=>i>=0);
 const runs=[];let start=null,state=null,last=null;
 for(const i of ids){const current=part.states[i]?.state;if(current!==state){if(start!==null)runs.push([state,start,last]);start=part.series.times[i];state=current;}last=part.series.times[i];}
 if(start!==null)runs.push([state,start,last]);
 return part.id+' '+runs.filter(r=>['accelerating','decelerating'].includes(r[0])).map(r=>(r[0]==='accelerating'?'増 ':'減 ')+r[1].toFixed(3)+'–'+r[2].toFixed(3)+'秒').join('、');
}
function v54RefreshRatio(){
 const c=v54.current;if(!c||!v54.config)return;
 const now=v54CurrentOriginalTime();
 const value=part=>{const idx=part.series.times.reduce((a,t,i)=>Math.abs(t-now)<Math.abs(part.series.times[a]-now)?i:a,0);return part.series.speed[idx];};
 c.ratioNow=c.compatible?K54.ratio(value(c.Y),value(c.X)):{value:null,status:'unit_mismatch'};
 const el=$('v54RatioReadout');if(el)el.textContent=c.compatible?
  '最大速度比 Y/X：'+v54Text(c.ratioMax.value,'倍')+' ／ 同時刻 '+v54Text(now,'秒')+' の速度比：'+
   (now<v54.config.from||now>v54.config.to?'区間外':c.ratioNow.value===null?'未定義（分母0・微小値・欠損）':v54Text(c.ratioNow.value,'倍'))+
   '。最大値同士の比と同時刻比は別です。':
  '移動速度と角速度は単位が異なるため比は未定義。別軸の波形と元時刻で比較します。';
}
function v54UseImportedCSV(loaded){
 const records=loaded.records;if(!records.length)throw Error('CSVにデータがありません');
 const ids=new Set(records.map(r=>JSON.stringify([r.dataset_id||'',r.trial_id||'',r.skeleton_id,r.motion_id,r.avatar_id])));
 if(ids.size!==1)throw Error('1ファイルにつき1骨格・1モーション・1試行を指定してください');
 const units=new Set(records.map(r=>r.linear_speed_unit||''));
 const angularUnits=new Set(records.map(r=>r.angular_speed_unit||''));
 if([...units].some(u=>u&&u!=='model_units/s')||[...angularUnits].some(u=>u&&u!=='rad/s'))throw Error('単位が一致しません。未較正の単位変換は行いません');
 const frames=new Set(records.map(r=>r.coordinate_system||''));
 if(frames.size!==1)throw Error('座標基準が混在しています');
 const first=records[0],num=x=>x===''||x==null?null:Number.isFinite(Number(x))?Number(x):null;
 const groups=new Map();for(const row of records){const id=Number(row.joint_id);if(!Number.isInteger(id))throw Error('関節IDが不正です');if(!groups.has(id))groups.set(id,[]);groups.get(id).push(row);}
 const joints=[],byJoint={};
 for(const [id,rows] of groups){
  const j={index:id,name:rows[0].joint_name_source,key:rows[0].canonical_joint_id};joints.push(j);
  byJoint[String(id)]=rows.map(r=>({time:num(r.original_animation_time_s),joint_id:id,name:j.name,key:j.key,
   linear_speed:num(r.linear_speed_model_units_per_s),angular_speed:num(r.angular_speed_rad_per_s),
   linear_speed_change:num(r.linear_speed_change_rate_model_units_per_s2),angular_speed_change:num(r.angular_speed_change_rate_rad_per_s2),
   position_raw:['x','y','z'].map(k=>num(r['raw_position_'+k+'_root_relative'])),
   position_smoothed:['x','y','z'].map(k=>num(r['position_'+k+'_root_relative'])),
   quaternion:['x','y','z','w'].map(k=>num(r['quaternion_'+k])),reason:r._legacy_quality}));
 }
 const times=byJoint[String(joints[0].index)].map(r=>r.time);
 if(times.length<2||times.some(t=>!Number.isFinite(t)))throw Error('時刻データが不足しています');
 if(Object.values(byJoint).some(rows=>rows.length!==times.length||rows.some((r,i)=>r.time!==times[i])))throw Error('部位間で時刻が一致しません。補間せず読込を停止しました');
 const duration=times[times.length-1];if(duration<=0)throw Error('有効な時刻範囲がありません');
 const asset={motion_revision_id:first.motion_revision_id||'unrecorded',source_asset_sha256:first.source_asset_sha256||'unrecorded'};
 v54.importedResult={imported:true,avatar:first.avatar_id,motion:first.motion_id,
  trial_id:first.trial_id||'import_'+Date.now().toString(36),dataset_id:first.dataset_id||'legacy_import',
  asset,times,byJoint,data:{duration,dt:times[1]-times[0],joints,skeletonId:first.skeleton_id},
  metadata:{source_type:first.source_type,quality:loaded.warnings,expert_rule_schema:{rules:[]}}};
 const el=$('v54DataSource');el.querySelector('[value=imported]').disabled=false;el.value='imported';
 v54.dataSource='imported';v54.importCursor=times[0];v54.current=null;
 $('v54To').dataset.userChanged='';$('v54From').value=times[0];
 $('v54OverlayEnable').checked=false;v54.mode='relation';
 $('v54AnalysisPanel').open=true;v54.enabled=true;
 v54JointList();v54UpdateXYEnabled();v54DoAnalysis();
 $('v54Quality').textContent+=' CSVの姿勢と現在の素材の対応が未検証のため、アバターへの重ね合わせは無効です。';
}
v54Init();
