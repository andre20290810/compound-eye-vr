/* v65: full-width live dynamics, foldable viewer settings, synchronized XBot/YBot variants. */
const V65_VARIANT_KEY='compoundeye.v65.ybotVariant';
let v65Installed=false;
function v65$(id){return document.getElementById(id);}
function v65CurrentVariant(){return v65$('tl65YVariant')?.value||'trajectory';}
const v65Trajectory=[
 {joint_id:3,modification_type:'rotation_delta_deg',requested_change:2.5,start_time:.06,end_time:1.04,axis:'z'},
 {joint_id:6,modification_type:'rotation_delta_deg',requested_change:5.5,start_time:.06,end_time:1.04,axis:'y'},
 {joint_id:7,modification_type:'rotation_delta_deg',requested_change:6.5,start_time:.06,end_time:1.04,axis:'y'},
 {joint_id:8,modification_type:'rotation_delta_deg',requested_change:-5.5,start_time:.06,end_time:1.04,axis:'z'},
 {joint_id:10,modification_type:'rotation_delta_deg',requested_change:-3.5,start_time:.06,end_time:1.04,axis:'y'},
 {joint_id:11,modification_type:'rotation_delta_deg',requested_change:-6.5,start_time:.06,end_time:1.04,axis:'y'},
 {joint_id:12,modification_type:'rotation_delta_deg',requested_change:5.5,start_time:.06,end_time:1.04,axis:'z'}
];
function v65GetYBotModifiers(motion,configured){
 const source=Array.isArray(configured)?configured:[];
 if(motion!=='xbot_punch')return source;
 const variant=v65CurrentVariant();
 if(variant==='configured')return source;
 const retained=source.filter(m=>!String(m.modification_type).includes('shift'));
 const path=v65Trajectory.map(m=>({...m}));
 if(variant==='trajectory')return retained.concat(path);
 if(variant==='timingTrajectory')return retained.concat(path,{joint_id:6,modification_type:'local_time_shift',requested_change:.12,start_time:.05,end_time:.96,axis:'x'});
 return source;
}
function v65Revision(motion){
 if(motion!=='xbot_punch')return null;
 const variant=v65CurrentVariant(),copy=window.__YBot62.clone(v62YConfig);
 copy.revision=String(copy.revision)+'-v66-'+variant;
 copy.motions[motion]=v65GetYBotModifiers(motion,copy.motions[motion]||[]);
 return window.__YBot62.revise(copy,motion);
}
function v65DrawExistingMarkers(){
 const layer=v65$('motionMarkers'),analysis=timeline62.analysis;
 if(!layer||!analysis||!state.showMotionMarkers)return;
 const duration=timeline62.sourceX?.data?.duration||1;
 const time=((Number(state._renderedAnimationTime)||0)%duration+duration)%duration;
 const byName=new Map(analysis.rows.filter(r=>r.X).map(r=>[r.X.joint.name,r]));
 for(const mark of layer.querySelectorAll('span[data-joint-name]')){
  const row=byName.get(mark.dataset.jointName);if(!row)continue;
  const value=v64StateAt(row.X,time,analysis);
  const size=v64Clamp(6+(value.radius||3)*.75,8,14);
  mark.style.width=size+'px';mark.style.height=size+'px';
  mark.dataset.timelineState=value.state;
 }
}
function v65StoreDetails(details,key){try{localStorage.setItem(key,details.open?'1':'0');}catch(e){}}
function v65InstallWideUi(){
 if(v65Installed||!v64Live?.workspace)return;
 v65Installed=true;
 const workspace=v64Live.workspace,main=document.querySelector('.main');
 const settings=main&&[...main.children].find(el=>el.classList?.contains('panel')&&el.querySelector('h2')?.textContent.includes('見たいもの'));
 if(settings){
  const heading=settings.querySelector('h2'),content=document.createElement('div');
  content.id='viewOptionsContent';
  while(settings.firstChild){const child=settings.firstChild;if(child===heading){child.remove();continue;}content.append(child);}
  const summary=document.createElement('summary');summary.textContent='見たいもの・複眼数';
  settings.replaceWith(Object.assign(document.createElement('details'),{id:'viewOptionsPanel'}));
  const options=v65$('viewOptionsPanel');options.className='panel';
  options.append(summary,content);
  const saved=(()=>{try{return localStorage.getItem('compoundeye.v65.viewOptionsOpen')==='1';}catch(e){return false;}})();
  options.open=saved;options.addEventListener('toggle',()=>v65StoreDetails(options,'compoundeye.v65.viewOptionsOpen'));
  if(main){
   main.classList.add('v65TimelineMain');
   main.insertBefore(options,main.firstChild);
   main.insertBefore(workspace,options.nextSibling);
  }
  const eyes=content.querySelector('.eyes')?.closest('.group');
  const appearance=v65$('appearanceOpen58'),visor=v65$('visorOpen60');
  const quick=document.createElement('div');quick.id='v65QuickControls';quick.setAttribute('aria-label','複眼数とAEGIS表示設定');
  const eyeLabel=document.createElement('strong');eyeLabel.textContent='複眼数';quick.append(eyeLabel);
  if(eyes){eyes.querySelector('.label')?.remove();quick.append(eyes);}
  if(appearance)quick.append(appearance);
  if(visor)quick.append(visor);
  content.prepend(quick);
  const aegis=document.createElement('details');aegis.id='v65AegisSettings';
  const aegisSummary=document.createElement('summary');aegisSummary.textContent='AEGIS固有設定 — 配色・バイザー';
  aegis.append(aegisSummary);content.insertBefore(aegis,quick.nextSibling);
  const editor=v65$('appearancePanel58');if(editor)aegis.append(editor);
  const openAegis=()=>{options.open=true;aegis.open=true;};
  if(appearance){const prior=appearance.onclick;appearance.onclick=async function(e){openAegis();await prior?.call(this,e);v65$('appearancePanel58')?.scrollIntoView({block:'nearest'});};}
  if(visor){const prior=visor.onclick;visor.onclick=async function(e){openAegis();await prior?.call(this,e);v65$('appearancePanel58')?.scrollIntoView({block:'nearest'});};}
  const close=v65$('appearanceClose58');if(close)close.addEventListener('click',()=>setTimeout(()=>{aegis.open=false;},0));
  aegis.addEventListener('toggle',()=>v65StoreDetails(aegis,'compoundeye.v65.aegisSettingsOpen'));
  try{aegis.open=localStorage.getItem('compoundeye.v65.aegisSettingsOpen')==='1';}catch(e){}
  v65SyncAegisTools();
  setInterval(v65SyncAegisTools,250);
 }else if(main){main.insertBefore(workspace,main.firstChild);main.classList.add('v65TimelineMain');}
 const controls=v65$('liveDynamicsControls');
 if(controls){
  const compare=v64$('tl64Compare3d')?.parentElement;
  const variant=document.createElement('label');variant.id='tl65VariantWrap';variant.textContent='YBot差分';
  const select=document.createElement('select');select.id='tl65YVariant';select.setAttribute('aria-label','YBotパンチの差分方式');
  select.innerHTML='<option value="trajectory">軌道のみ</option><option value="timingTrajectory">タイミング＋軌道</option><option value="configured">現行設定JSON</option>';
  try{select.value=localStorage.getItem(V65_VARIANT_KEY)||'trajectory';}catch(e){select.value='trajectory';}
  if(!['trajectory','timingTrajectory','configured'].includes(select.value))select.value='trajectory';
  variant.append(select);
  const sync=document.createElement('button');sync.id='tl65SyncStart';sync.type='button';sync.textContent='X/Y先頭同期して再生';sync.title='両動作を0秒から開始し、元の時間軸の速度差を保って比較します';
  const speed=document.createElement('label');speed.id='tl65SpeedWrap';speed.textContent='共通スロー';
  const range=document.createElement('input');range.id='tl65SlowRate';range.type='range';range.min='.25';range.max='1';range.step='.05';range.setAttribute('aria-label','X/Y共通再生速度');
  const value=document.createElement('span');value.id='tl65SlowValue';speed.append(range,value);
  if(compare)compare.append(variant,sync,speed);
  const note=document.createElement('p');note.id='tl65CompareNote';note.textContent='XBotを基準にYBotを重ねます。両方を同じ0秒から再生し、元の動作時間の差を残します。全体のスロー倍率は両方に同じ値を掛けます。軌道のみは関節回転を変え、タイミング＋軌道はさらに右肩の局所タイミングを120 msずらします。AEGIS比較は関節対応確認後に追加します。';
  v64Live.dock.append(note);
  range.value='0.50';
  const originalSpeed=v65$('motionSpeed');
  const setSpeed=n=>{const val=v64Clamp(Number(n),.25,1);if(originalSpeed){originalSpeed.value=String(val);originalSpeed.dispatchEvent(new Event('input',{bubbles:true}));}range.value=String(val);value.textContent=val.toFixed(2)+'×';};
  if(originalSpeed)setSpeed(.50);else value.textContent='0.50×';
  range.addEventListener('input',()=>setSpeed(range.value));
  select.addEventListener('change',()=>{
   try{localStorage.setItem(V65_VARIANT_KEY,select.value);}catch(e){}
   timeline62.latestModificationReport=[];timeline62.lastKey='';
   tl62Analyze();v64Render();
   if(v64Live.overlay){v64Live.frame=null;draw(performance.now());}
  });
  sync.addEventListener('click',v65SyncStart);
  const align=v65$('tl62Alignment');if(align)align.addEventListener('change',()=>{if(v64Live.overlay&&align.value!=='raw'){align.value='raw';tl62Analyze();v64Render();}});
  const compareBox=v65$('tl62Compare');if(compareBox)compareBox.addEventListener('change',()=>{v65UpdateCompareUi();});
  const motionY=v65$('tl62MotionY');if(motionY)motionY.addEventListener('change',()=>v65UpdateCompareUi());
  const sourceX=v65$('tl62X'),sourceY=v65$('tl62Y');
  for(const selectEl of [sourceX,sourceY])if(selectEl)selectEl.addEventListener('change',v65UpdateCompareUi);
  v65UpdateCompareUi();
 }
 const style=document.createElement('style');style.id='v65WideTimelineStyles';style.textContent=[
  '.main.v65TimelineMain{display:flex!important;flex-direction:column!important;gap:10px!important;width:100%!important;min-width:0!important}',
  '.main.v65TimelineMain>*{width:100%;min-width:0;box-sizing:border-box}',
  '#viewOptionsPanel{width:100%;box-sizing:border-box;margin:0 0 2px}',
  '#viewOptionsPanel>summary,#v65AegisSettings>summary{cursor:pointer;font-weight:700;padding:8px 2px}',
  '#viewOptionsContent{display:flex;flex-direction:column;gap:8px;padding-top:8px}',
  '#v65QuickControls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;border:1px solid #426a80;border-radius:10px;background:#102b40}',
  '#v65QuickControls>strong{font-size:12px;color:#e8f7fc}',
  '#v65QuickControls .group{display:flex!important;align-items:center;gap:8px;margin:0!important}',
  '#v65QuickControls .eyes{display:flex;gap:5px;flex-wrap:wrap}',
  '#v65QuickControls #appearanceOpen58,#v65QuickControls #visorOpen60{display:none}',
  '#v65QuickControls.aegis-active #appearanceOpen58,#v65QuickControls.aegis-active #visorOpen60{display:inline-flex}',
  '#v65AegisSettings{border:1px solid #385c73;border-radius:9px;padding:3px 9px;background:#0d2435}',
  '#appearancePanel58[hidden]{display:none!important}',
  '#v65AegisSettings #appearancePanel58{position:static!important;inset:auto!important;width:100%!important;max-width:none!important;max-height:none!important;overflow:visible!important;margin:6px 0 8px;padding:10px!important;box-sizing:border-box;box-shadow:none!important}',
  '#v65AegisSettings #appearancePanel58 .apHead{position:static!important}',
  '#viewerWorkspace{display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto auto!important;gap:10px!important;align-items:stretch!important;width:100%!important;min-width:0!important}',
  '#liveDynamicsDock{grid-column:1!important;grid-row:1!important;width:100%!important;height:clamp(480px,58vh,620px)!important;min-height:470px!important;max-height:none!important;overflow:hidden}',
  '#tl64Sequence{max-height:36px!important}',
  '#tl64PlotWrap{flex:0 0 238px!important;height:238px!important;min-height:220px!important;overflow:auto!important}',
  '#tl64Plot{min-height:220px!important}',
  '#liveDynamicsDock .v64Note{display:none!important}',
  '#liveMotionMarkers{display:none!important}',
  '#viewerWorkspace>#screen{grid-column:1!important;grid-row:2!important;width:100%!important;height:clamp(380px,62vh,700px)!important;min-height:360px!important}',
  '#viewerControlShelf{grid-column:1!important;grid-row:3!important;width:100%!important;box-sizing:border-box}',
  '#tl65CompareNote{margin:0;color:#b8d3df;font-size:10px;line-height:1.4}',
  '#tl65VariantWrap,#tl65SpeedWrap{display:inline-flex;align-items:center;gap:5px;color:#d7edf5;font-size:10px}',
  '#tl65VariantWrap[hidden],#tl65CompareNote[hidden],#v65AegisSettings[hidden]{display:none!important}',
  '#tl65VariantWrap select{max-width:160px!important}',
  '#tl65SlowRate{width:95px;max-width:25vw}',
  '#tl65SlowValue{min-width:32px;font-variant-numeric:tabular-nums}',
  '#tl65SyncStart{font-size:10px!important;padding:6px 8px!important}',
  '@media(max-width:700px){#liveDynamicsDock{height:clamp(480px,58vh,540px)!important;min-height:470px!important;padding:7px!important}#viewerWorkspace>#screen{height:clamp(340px,58vh,600px)!important}#tl64PlotWrap{flex-basis:225px!important;height:225px!important;min-height:210px!important}#v65QuickControls{gap:5px;padding:7px}#tl65VariantWrap select{max-width:140px!important}}',
  'body.compact-layout #viewerWorkspace{display:block!important}body.compact-layout #liveDynamicsDock,body.compact-layout #viewerControlShelf{display:none!important}body.compact-layout #viewOptionsPanel{display:none!important}',
  '#tl62Panel{margin-top:8px}'
 ].join('');document.head.append(style);
 workspace.dataset.v65Wide='true';v64Live.wideTimeline=true;
 if(window.__LiveDynamicsV64)window.__LiveDynamicsV64.drawMarkers=v65DrawExistingMarkers;
 timeline62.latestModificationReport=[];timeline62.lastKey='';tl62Analyze();
 v64Layout();v64Render();
}
function v65SyncAegisTools(){
 const quick=v65$('v65QuickControls');if(!quick)return;
 const aegis=['aegisEmber','aegisSoldier'].includes(state.model);
 quick.classList.toggle('aegis-active',aegis);
 const details=v65$('v65AegisSettings');if(details)details.hidden=!aegis;
}
function v65UpdateCompareUi(){
 const x=v65$('tl62X')?.value,y=v65$('tl62Y')?.value,variant=v65$('tl65VariantWrap');
 const xy=x==='xbot'&&y==='ybot';
 if(variant)variant.hidden=!(xy&&v65$('tl62MotionY')?.value==='xbot_punch');
 const note=v65$('tl65CompareNote');if(note)note.hidden=!xy;
}
function v65SyncStart(){
 const sx=v65$('tl62X'),sy=v65$('tl62Y'),mx=v65$('tl62MotionX'),my=v65$('tl62MotionY'),cmp=v65$('tl62Compare'),align=v65$('tl62Alignment');
 if(sx&&sx.value!=='xbot'){sx.value='xbot';sx.dispatchEvent(new Event('change',{bubbles:true}));}
 if(sy&&sy.value!=='ybot'){sy.value='ybot';sy.dispatchEvent(new Event('change',{bubbles:true}));}
 if(mx&&mx.value!=='xbot_punch'){mx.value='xbot_punch';mx.dispatchEvent(new Event('change',{bubbles:true}));}
 if(my&&my.value!=='xbot_punch'){my.value='xbot_punch';my.dispatchEvent(new Event('change',{bubbles:true}));}
 if(cmp&&!cmp.checked){cmp.checked=true;cmp.dispatchEvent(new Event('change',{bubbles:true}));}
 if(align&&align.value!=='raw'){align.value='raw';align.dispatchEvent(new Event('change',{bubbles:true}));}
 timeline62.latestModificationReport=[];timeline62.lastKey='';tl62Analyze();
 if(state.model!=='xbot')changeModel('xbot');
 if(state.motion!=='xbot_punch')setMotion('xbot_punch');
 if(!v64Live.overlay)v64SetOverlay(true);
 const now=performance.now()*.001;state.paused=false;state.pauseTime=0;state.timeStart=now;state._renderedAnimationTime=0;
 draw(performance.now());v64Tick();v64UpdatePlayLabel();
}
const v65BaseInstall=v64InstallLiveDynamics;
v64InstallLiveDynamics=function(){v64Live.wideTimeline=true;const result=v65BaseInstall.apply(this,arguments);v65InstallWideUi();return result;};
const v65BaseRecalculate=v62RecalculateModifications;
v62RecalculateModifications=function(){
 const current=v62YConfig;
 try{
  if(v65CurrentVariant()!=='configured'&&v65$('tl65VariantWrap')?.hidden!==true){
   v62YConfig=window.__YBot62.clone(current);
   v62YConfig.revision=String(current.revision)+'-v65-'+v65CurrentVariant();
   v62YConfig.motions={...current.motions,xbot_punch:v65GetYBotModifiers('xbot_punch',current.motions.xbot_punch||[])};
  }
  return v65BaseRecalculate.apply(this,arguments);
 }finally{v62YConfig=current;}
};
window.__TimelineLiveV65={getModifiers:v65GetYBotModifiers,revision:v65Revision,variant:v65CurrentVariant,drawMarkers:v65DrawExistingMarkers,syncStart:v65SyncStart,trajectory:v65Trajectory};
