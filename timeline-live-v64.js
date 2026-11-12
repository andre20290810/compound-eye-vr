// v64: playback-linked kinematic dynamics in the viewer, with a separate numeric detail panel.
const V64_DIFF_COLOR_KEY='compoundeye.v64.diffColor';
const V64_STATE_LABEL={accelerating:'増速',decelerating:'減速',peak:'ピーク',low:'低活動',stable:'一定',unavailable:'データなし'};
const v64Live={installed:false,workspace:null,dock:null,svg:null,frame:null,overlay:false,overlayModel:null,overlayMask:null,changedJointCount:0,lastPoseAt:0,lastDrawAt:0,lastLayoutAt:0,animationId:0,color:'#ff5db7'};
function v64$ (id){return document.getElementById(id);}
function v64Clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function v64LabelTime(t){return Number.isFinite(t)?t.toFixed(3)+' s':'—';}
function v64ColorRgb(hex){const s=String(hex||'#ff5db7').replace('#','');const n=parseInt(s.length===3?s.split('').map(c=>c+c).join(''):s,16);return Number.isFinite(n)?[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255]:[1,.36,.72];}
function v64SourceDuration(side){return timeline62['source'+side]?.data?.duration||1;}
function v64JointOrder(row){return Number.isFinite(row?.order)?String.fromCharCode(9311+row.order):'';}
function v64BaseColor(){return v64Live.overlay?v64ColorRgb(v64Live.color):[.22,.91,1];}
function v64PartTime(time,side,analysis){
 if(analysis.config.alignment!=='phase')return time;
 const xDuration=timeline62.sourceX?.data?.duration||1,yDuration=timeline62.sourceY?.data?.duration||1;
 return side==='Y'?(time/xDuration)*yDuration:time;
}
function v64DisplayTime(time,side,analysis){
 if(analysis.config.alignment==='phase')return time/(timeline62['source'+side]?.data?.duration||1);
 return time;
}
function v64DisplayRange(analysis,side){
 if(analysis.config.alignment==='phase'){
  const d=timeline62['source'+side]?.data?.duration||1;
  return [analysis.config.from/d,analysis.config.to/d];
 }
 return [analysis.config.from,analysis.config.to];
}
function v64FormatPeakTime(time,side,analysis){const value=v64TimelineAxis(time,side,analysis);return analysis.config.alignment==='phase'?value.toFixed(0)+'%':value.toFixed(2)+'s';}
function v64TickLabel(t,analysis){
 return analysis.config.alignment==='phase'?(t*100).toFixed(0)+'%':t.toFixed(2)+'s';
}
function v64StateAt(part,time,analysis){
 const sideConfig={...analysis.config};
 const xDuration=timeline62.sourceX?.data?.duration||1;
 const d=part?.source?.data?.duration||xDuration;
 if(analysis.config.alignment==='phase'){sideConfig.from=analysis.config.from/xDuration*d;sideConfig.to=analysis.config.to/xDuration*d;}
 return TL62.at(part,time,sideConfig);
}
function v64InstallLiveDynamics(){
 if(v64Live.installed)return;
 const screen=v64$('screen'),panel=v64$('tl62Panel');
 if(!screen||!panel)return;
 v64Live.installed=true;
 const host=screen.parentElement,workspace=document.createElement('section');workspace.id='viewerWorkspace';workspace.setAttribute('aria-label','3Dビューアーと運動ダイナミクスタイムライン');
 host.insertBefore(workspace,screen);
 const dock=document.createElement('aside');dock.id='liveDynamicsDock';dock.setAttribute('aria-label','再生連動 運動ダイナミクスタイムライン');
 dock.innerHTML='<div class="v64DockHead"><strong>運動ダイナミクスタイムライン</strong><button id="tl64Play" type="button" aria-label="動作を再生または停止">一時停止</button></div><div id="tl64Sequence" aria-live="polite"></div><div id="tl64PlotWrap"><div id="tl64Plot"></div></div><div id="tl64Readout">再生位置 0.000 s</div><div id="tl64Legend"><span><i style="background:#58c99a"></i>増速</span><span><i style="background:#f0a553"></i>減速</span><span><i style="background:#ffdf64"></i>ピーク</span><span><i style="background:#929aa5"></i>低活動</span><span><i style="background:#d8dce2"></i>データなし</span></div><div class="v64CompareTools"><button id="tl64Compare3d" type="button" aria-pressed="false">X/Yを3Dに重ねる</button><label class="v64ColorLabel">差分色 <input id="tl64DiffColor" type="color" value="#ff5db7" aria-label="X/Y差分の表示色"></label><label class="v64ColorLabel">速度差基準 <input id="tl64DiffThreshold" type="number" min="1" max="100" step="1" value="15" aria-label="最大速度に対するX/Y速度差の基準（％）">%</label></div><div id="tl64Status" role="status">3D動作に同期しています</div><p class="v64Note">球の色は運動状態、球の大きさは各部位・指標内の相対変化です。部位間の力の大小は示しません。差分帯は同一関節・同一指標の速度差が設定基準（初期値15%）を超えた区間です。</p>';
 const controls=document.createElement('div');controls.id='liveDynamicsControls';controls.setAttribute('aria-label','X/Y動作の選択と解析');
 const shelf=document.createElement('nav');shelf.id='viewerControlShelf';shelf.setAttribute('aria-label','ビューワー操作');
 const existingControls=panel.querySelector('.tl62Tools');
 if(existingControls)controls.append(existingControls);
 workspace.append(dock,screen,shelf);
 const insert=panel.parentElement;
 insert.insertBefore(controls,panel);
 v64Live.workspace=workspace;v64Live.dock=dock;v64Live.svg=v64$('tl64Plot');
 const moveToShelf=['hmdStereoToggle','viewerMarkerToggle','viewerMarkerPlacement','viewerLabelToggle','viewerAllLenses','viewerFacetPickerToggle'];
 for(const id of moveToShelf){const el=v64$(id);if(el){el.classList.add('v64ShelfControl');shelf.append(el);}}
 const style=document.createElement('style');style.id='v64LiveDynamicsStyles';style.textContent=[
 '#viewerWorkspace{display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,31%);grid-template-rows:minmax(0,1fr) auto;gap:9px;align-items:stretch;width:100%;min-width:0}',
 '#viewerWorkspace>#screen{grid-column:1;grid-row:1;min-width:0}',
 '#liveDynamicsDock{grid-column:2;grid-row:1;min-width:0;height:clamp(350px,66vh,720px);max-height:720px;display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid #4d7891;border-radius:13px;background:linear-gradient(160deg,#102d42,#0b2032);color:#edf9ff;box-sizing:border-box;overflow:hidden}',
 '#viewerWorkspace[data-multiview="true"]{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(350px,1fr) auto}',
 '#viewerWorkspace[data-multiview="true"]>#liveDynamicsDock{grid-column:1;grid-row:1;height:clamp(480px,54vh,520px);max-height:520px;min-height:460px}',
 '#viewerWorkspace[data-multiview="true"]>#screen{grid-column:1;grid-row:2;height:clamp(350px,58vh,680px)}',
 '#viewerWorkspace[data-multiview="true"] #tl64Sequence{max-height:40px}#viewerWorkspace[data-multiview="true"] .v64Note{display:none}',
 '#viewerWorkspace[data-multiview="true"]>#viewerControlShelf{grid-column:1;grid-row:3}',
 '#viewerControlShelf{grid-column:1/-1;grid-row:2;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:7px 9px;border:1px solid #426a80;border-radius:10px;background:#102b40;min-width:0}',
 '#viewerControlShelf .v64ShelfControl{position:static!important;inset:auto!important;transform:none!important;z-index:auto!important;margin:0!important;padding:6px 9px!important;min-height:30px!important;font-size:11px!important;white-space:nowrap}',
 '#viewerControlShelf #viewerAllLenses{display:none!important}',
 '#viewerControlShelf #viewerFacetPickerToggle{display:inline-flex!important}',
 '#viewerControlShelf #viewerMarkerToggle,#viewerControlShelf #viewerMarkerPlacement,#viewerControlShelf #viewerLabelToggle{display:inline-flex!important}',
 '#viewerControlShelf #hmdStereoToggle{display:inline-flex!important}',
 '#liveDynamicsControls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:6px 0 10px;padding:9px 11px;border:1px solid #4d7891;border-radius:11px;background:#102b40;min-width:0}',
 '#liveDynamicsControls .tl62Tools{display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin:0}',
 '#liveDynamicsControls label{font-size:11px;color:#d7edf5;display:flex;align-items:center;gap:4px}',
 '#liveDynamicsControls select,#liveDynamicsControls button{padding:6px 8px;font-size:11px;max-width:170px}',
 '.v64DockHead{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:13px;min-height:27px}',
 '.v64DockHead button{font-size:10px;padding:5px 7px;white-space:nowrap}',
 '#tl64Sequence{font-size:10px;line-height:1.45;color:#d5eaf0;max-height:48px;overflow:auto;border:1px solid #29495d;border-radius:7px;padding:4px 6px;background:#0a1e2c}',
 '#tl64Sequence span{white-space:normal}',
 '#tl64PlotWrap{flex:1;min-height:120px;overflow:auto;overscroll-behavior:contain;background:#081d2c;border:1px solid #29495d;border-radius:8px}',
 '#tl64Plot{min-width:100%;width:100%;min-height:120px}',
 '#tl64Plot svg{display:block;width:100%;height:auto;min-width:300px}',
 '#tl64Readout{font-size:10px;font-variant-numeric:tabular-nums;color:#f2f8fb;min-height:14px}',
 '#tl64Legend{display:flex;flex-wrap:wrap;gap:5px 9px;font-size:9px;color:#c8dce4}',
 '#tl64Legend span{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}',
 '#tl64Legend i{width:8px;height:8px;border-radius:50%;display:inline-block}',
 '.v64CompareTools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}',
 '.v64CompareTools button{font-size:10px;padding:6px 8px}',
 '.v64ColorLabel{font-size:10px;color:#d7eaf0;display:flex;align-items:center;gap:4px}',
 '.v64ColorLabel input{width:27px;height:24px;padding:1px;border:1px solid #64839a;border-radius:5px;background:#18394c}',
 '.v64ColorLabel input[type=number]{width:48px}',
 '#tl64Status{font-size:10px;color:#b7d9e5;min-height:14px;line-height:1.4}',
 '.v64Note{margin:0;font-size:9px;line-height:1.45;color:#9fbdca}',
 '.v64LiveBall{filter:drop-shadow(0 0 3px currentColor)}',
 '#liveMotionMarkers{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:12}',
 '.v64MotionMarker{position:absolute;transform:translate(-50%,-50%);border-radius:50%;box-sizing:border-box;pointer-events:none}',
 '.v64MotionMarker.x{border:1px solid #071b27}',
 '.v64MotionMarker.y{background:rgba(4,18,28,.25);border:2px solid currentColor}',
 '@media(max-width:980px){#viewerWorkspace{grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto auto}#liveDynamicsDock{grid-column:1;grid-row:1;height:clamp(540px,64vh,560px);max-height:560px;min-height:520px}#viewerWorkspace>#screen{grid-column:1;grid-row:2;height:clamp(330px,57vh,620px)}#viewerControlShelf{grid-column:1;grid-row:3}}',
 '@media(max-width:500px){#liveDynamicsDock{height:clamp(540px,64vh,560px);max-height:560px;min-height:520px;padding:7px;gap:4px}.v64DockHead{font-size:12px}#tl64Sequence{font-size:9px;max-height:36px}#tl64Legend{gap:4px 7px}#liveDynamicsControls{padding:7px;gap:5px}}',
 'body.compact-layout #viewerWorkspace{display:block}body.compact-layout #liveDynamicsDock,body.compact-layout #viewerControlShelf{display:none!important}',
 '#tl62Panel{margin-top:8px}',
 ].join('');document.head.append(style);
 const markerLayer=document.createElement('div');markerLayer.id='liveMotionMarkers';screen.append(markerLayer);
 const play=v64$('tl64Play');play.onclick=()=>{const toggle=v64$('togglePause');if(toggle)toggle.click();v64UpdatePlayLabel();};
 const colorInput=v64$('tl64DiffColor');
 try{const saved=localStorage.getItem(V64_DIFF_COLOR_KEY);if(/^#[0-9a-f]{6}$/i.test(saved||''))v64Live.color=saved;}catch(e){}
 colorInput.value=v64Live.color;
 colorInput.addEventListener('input',()=>{v64Live.color=colorInput.value;try{localStorage.setItem(V64_DIFF_COLOR_KEY,v64Live.color);}catch(e){}v64Render();});
 const thresholdInput=v64$('tl64DiffThreshold');thresholdInput.addEventListener('input',v64Render);
 const overlayButton=v64$('tl64Compare3d');overlayButton.onclick=()=>v64SetOverlay(!v64Live.overlay);
 const cmp=tl62$('tl62Compare');if(cmp)cmp.addEventListener('change',()=>{if(!cmp.checked&&v64Live.overlay)v64SetOverlay(false);setTimeout(v64Render,0);});
 const xModel=tl62$('tl62X'),motionX=tl62$('tl62MotionX'),motionY=tl62$('tl62MotionY');
 if(xModel)xModel.addEventListener('change',()=>{if(v64Live.overlay)v64SetOverlay(false);v64AlignViewerToX();setTimeout(v64Render,0);});
 if(motionX)motionX.addEventListener('change',()=>{v64AlignViewerToX();setTimeout(v64Render,0);});
 if(motionY)motionY.addEventListener('change',()=>{if(v64Live.overlay&&!timeline62.analysis?.compatibility?.ok)v64SetOverlay(false);setTimeout(v64Render,0);});
 const alignment=tl62$('tl62Alignment');if(alignment)alignment.addEventListener('change',()=>setTimeout(()=>{tl62Analyze();v64Render();},0));
 const run=tl62$('tl62Run');if(run)run.addEventListener('click',()=>setTimeout(v64Render,0));
 const from=tl62$('tl62From'),to=tl62$('tl62To');
 for(const input of [from,to])if(input)input.addEventListener('input',()=>{timeline62.rangeUserChanged=true;setTimeout(v64Render,0);});
 panel.addEventListener('toggle',()=>{timeline62.enabled=true;setTimeout(v64Render,0);});
 if(!timeline62.rangeUserChanged){const src=tl62Source('X');if(src?.data?.duration)tl62$('tl62To').value=String(src.data.duration.toFixed(3));}
 timeline62.enabled=true;
 try{tl62Analyze();}catch(e){v64$('tl64Status').textContent='タイムライン初期化不可：'+e.message;}
 v64Live.overlay=false;overlayButton.setAttribute('aria-pressed','false');
 v64Layout();v64Render();v64UpdatePlayLabel();
 window.addEventListener('resize',()=>{v64Layout();v64Render();});
 window.__LiveDynamicsV64={state:v64Live,render:v64Render,refresh:v64Render,preparePose:v64PrepareComparisonPose,drawMarkers:v64Draw3DMarkers,setOverlay:v64SetOverlay,colorRgb:v64BaseColor,renderSecondary:v64RenderSecondary};
 if(window.__LiveDynamicsV64.animationId)clearInterval(window.__LiveDynamicsV64.animationId);
 window.__LiveDynamicsV64.animationId=setInterval(()=>{v64Layout();v64Tick();v64UpdatePlayLabel();},33);
}
function v64Layout(){
 if(!v64Live.workspace)return;
 if(performance.now()-v64Live.lastLayoutAt<100)return;
 v64Live.lastLayoutAt=performance.now();
 const count=Number(state.eyeCount)||1,oldMode=v64Live.workspace.dataset.multiview,nextMode=count>1?'true':'false';
 v64Live.workspace.dataset.eyeCount=String(count);
 v64Live.workspace.dataset.multiview=nextMode;
 if(oldMode!==nextMode)requestAnimationFrame(()=>v64Render());
}
function v64AlignViewerToX(){const x=tl62Source('X');if(!x||x.avatar==='csv')return;if(state.model!==x.avatar)changeModel(x.avatar);if(state.motion!==x.motion)setMotion(x.motion);}
function v64UpdatePlayLabel(){
 const button=v64$('tl64Play');if(!button)return;
 button.textContent=state.paused?'再生':'一時停止';
 button.setAttribute('aria-label',state.paused?'動作を再生':'動作を一時停止');
}
function v64SetOverlay(on){
 const button=v64$('tl64Compare3d'),a=timeline62.analysis;
 if(on){
  const x=tl62Source('X'),y=tl62Source('Y');
  if(!tl62$('tl62Compare').checked||!x||!y||!a?.compatibility?.ok){v64$('tl64Status').textContent='同一骨格・同一関節IDのX/Y比較が確認できないため、3D重ね合わせを停止しました。';return;}
  if(!['xbot','ybot'].includes(x.avatar)||!['xbot','ybot'].includes(y.avatar)){v64$('tl64Status').textContent='3D重ね合わせは同一骨格のXBot／YBotで利用できます。';return;}
  v64Live.overlay=true;
  if(state.model!==x.avatar)changeModel(x.avatar);
  if(state.motion!==x.motion)setMotion(x.motion);
  v64$('tl64Status').textContent='X＝実モデル、Y＝差分部位を差分色で重ねています。差分色は編集できます。';
 }else{
  v64Live.overlay=false;v64Live.frame=null;
  v64$('tl64Status').textContent='3D差分表示を停止しました。運動連鎖タイムラインは再生に同期しています。';
 }
 if(button)button.setAttribute('aria-pressed',String(v64Live.overlay));
 v64Live.frame=null;v64Render();v64UpdatePlayLabel();if(state.paused)draw(performance.now());
}
function v64TimelineAxis(time,side,analysis){
 if(analysis.config.alignment==='phase')return time/(timeline62['source'+side]?.data?.duration||1);
 return time;
}
function v64AxisToXTime(axisTime,analysis){return analysis.config.alignment==='phase'?axisTime*(timeline62.sourceX?.data?.duration||1):axisTime;}
function v64AxisRange(analysis,side){
 if(analysis.config.alignment==='phase')return [analysis.config.from/(timeline62.sourceX?.data?.duration||1),analysis.config.to/(timeline62.sourceX?.data?.duration||1)];
 return [analysis.config.from,analysis.config.to];
}
function v64SeriesState(part,index){
 const stateName=part?.states?.[index]?.state||'unavailable';
 return stateName;
}
function v64DrawStateSegments(svg,part,side,y,rowHeight,scaleX,analysis,ns){
 if(!part||!part.times.length)return;
 const xDuration=timeline62.sourceX?.data?.duration||1;
 const [from,to]=analysis.config.alignment==='phase'?[analysis.config.from/xDuration,analysis.config.to/xDuration]:[analysis.config.from,analysis.config.to];
 let first=part.times.findIndex(t=>v64TimelineAxis(t,side,analysis)>=from);
 let last=part.times.findLastIndex(t=>v64TimelineAxis(t,side,analysis)<=to);
 if(first<0||last<first)return;
 const runs=[];
 for(let i=first;i<=last;i++){
  const center=v64TimelineAxis(part.times[i],side,analysis);
  const before=i===first?from:(v64TimelineAxis(part.times[i-1],side,analysis)+center)/2;
  const after=i===last?to:(center+v64TimelineAxis(part.times[i+1],side,analysis))/2;
  const stateName=v64SeriesState(part,i);
  const lastRun=runs[runs.length-1];
  if(lastRun&&lastRun.state===stateName)lastRun.end=after;else runs.push({state:stateName,start:before,end:after});
 }
 for(const run of runs){
  const rect=document.createElementNS(ns,'rect'),color=TL62.color[run.state]||TL62.color.unavailable;
  rect.setAttribute('x',scaleX(run.start));rect.setAttribute('y',y);rect.setAttribute('width',Math.max(.6,scaleX(run.end)-scaleX(run.start)));rect.setAttribute('height',5);rect.setAttribute('rx',2);
  rect.setAttribute('fill',side==='X'?color:'none');rect.setAttribute('stroke',color);rect.setAttribute('stroke-width',side==='X'?'.4':'1.2');rect.setAttribute('opacity',run.state==='low'||run.state==='stable'?.48:.94);
  rect.setAttribute('data-state',run.state);rect.setAttribute('data-side',side);
  rect.style.cursor='pointer';rect.onclick=()=>tl62Seek(v64AxisToXTime((run.start+run.end)/2,analysis),'X');
  const title=document.createElementNS(ns,'title');title.textContent=part.joint.name+' '+side+' '+V64_STATE_LABEL[run.state]+' '+run.start.toFixed(3)+'–'+run.end.toFixed(3)+' s';rect.append(title);svg.append(rect);
 }
 if(part.peak){
  const xt=v64TimelineAxis(part.peak.time,side,analysis),cy=y+2.5;
  if(xt>=from&&xt<=to){const peak=document.createElementNS(ns,'path');peak.setAttribute('d','M '+xt+' '+(cy-4.2)+' l 4.2 4.2 -4.2 4.2 -4.2 -4.2 Z');peak.setAttribute('transform','translate('+(scaleX(xt)-xt)+' 0)');peak.setAttribute('fill',side==='X'?TL62.color.peak:'none');peak.setAttribute('stroke',TL62.color.peak);peak.setAttribute('stroke-width','1.3');peak.setAttribute('data-peak-side',side);peak.style.cursor='pointer';peak.onclick=()=>tl62Seek(v64AxisToXTime(xt,analysis),'X');const title=document.createElementNS(ns,'title');title.textContent=part.joint.name+' '+side+' 局所ピーク '+v64LabelTime(part.peak.time);peak.append(title);svg.append(peak);}
 }
}
function v64DifferenceRuns(row,analysis,threshold){
 if(!row.X||!row.Y||!analysis.compatibility.ok)return[];
 const xs=row.X.times,ys=row.Y.times,xv=row.X.speed,yv=row.Y.speed,scale=Math.max(1e-9,...xv.filter(Number.isFinite).map(Math.abs),...yv.filter(Number.isFinite).map(Math.abs));
 const from=analysis.config.from,to=analysis.config.to,runs=[];let start=null,prev=null;
 const yDuration=timeline62.sourceY?.data?.duration||1,xDuration=timeline62.sourceX?.data?.duration||1;
 for(let i=0;i<xs.length;i++){
  const t=xs[i];if(t<from||t>to||!Number.isFinite(xv[i]))continue;
  const sampleYTime=analysis.config.alignment==='phase'?t/xDuration*yDuration:t;
  let j=0;for(let k=1;k<ys.length;k++){if(Math.abs(ys[k]-sampleYTime)<Math.abs(ys[j]-sampleYTime))j=k;}
  const changed=Number.isFinite(yv[j])&&Math.abs(xv[i]-yv[j])/scale>=threshold;
  const xTime=v64TimelineAxis(t,'X',analysis);
  if(changed){if(start===null)start=xTime;prev=xTime;}else if(start!==null){runs.push({start,end:prev});start=null;prev=null;}
 }
 if(start!==null)runs.push({start,end:prev});
 return runs;
}
function v64Threshold(){const input=v64$('tl64DiffThreshold'),n=Number(input?.value);return v64Clamp(Number.isFinite(n)?n/100:.15,.01,1);}
function v64Render(){
 if(!v64Live.installed||!timeline62.analysis)return;
 const a=timeline62.analysis,plot=v64$('tl64Plot'),sequence=v64$('tl64Sequence');
 if(!plot||!plot.clientWidth)return;
 const compatible=a.compatibility.ok&&!!a.source_y;
 const xEvents=a.events||[];
 const yEvents=a.rows.filter(r=>r.Y?.peak).map(r=>({joint_id:r.jointId,joint_name:r.Y.joint.name,peak_time:r.Y.peak.time})).sort((x,y)=>x.peak_time-y.peak_time);
 const seqX=xEvents.map(e=>v64JointOrder({order:e.order})+tl63Name({name:e.joint_name})+' '+v64FormatPeakTime(e.peak_time,'X',a)).join(' → ');
 const seqY=yEvents.map((e,i)=>String.fromCharCode(9311+i+1)+tl63Name({name:e.joint_name})+' '+v64FormatPeakTime(e.peak_time,'Y',a)).join(' → ');
 if(sequence){sequence.innerHTML='';
  const xline=document.createElement('div');xline.innerHTML='<b>X</b> '+(seqX||'代表ピークなし');sequence.append(xline);
  if(compatible){const yline=document.createElement('div');yline.innerHTML='<b>Y</b> '+(seqY||'代表ピークなし');sequence.append(yline);}
 }
 if(!a.compatibility.ok){v64$('tl64Status').textContent=a.compatibility.reason||'関節対応が検証されていないため比較不可';}
 else if(!a.source_y){v64$('tl64Status').textContent='X単独表示です。X/Y比較を有効にすると同じ時間軸で比較できます。';}
 else if(v64Live.overlay){v64$('tl64Status').textContent='3D重ね合わせ中：姿勢差のある関節を差分色で表示しています。';}
 const compact=v64Live.workspace?.dataset.multiview==='true'||v64Live.wideTimeline===true;
 const visibleRows=a.rows.filter(row=>row.X);
 const width=Math.max(300,Math.floor(plot.clientWidth)),left=62,right=8,top=22,rowH=compatible?(compact?27:41):(compact?24:30),height=top+Math.max(1,visibleRows.length)*rowH+10;
 const [from,to]=v64AxisRange(a,'X'),span=Math.max(.001,to-from),plotWidth=Math.max(140,width-left-right),scaleX=t=>left+(t-from)/span*plotWidth;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('role','img');svg.setAttribute('aria-label','再生に同期する身体部位ごとの運動状態');
 for(let k=0;k<=4;k++){const t=from+span*k/4,x=scaleX(t),line=document.createElementNS(ns,'line');line.setAttribute('x1',x);line.setAttribute('x2',x);line.setAttribute('y1',top-5);line.setAttribute('y2',height-5);line.setAttribute('stroke','#36566a');line.setAttribute('opacity','.52');svg.append(line);const label=document.createElementNS(ns,'text');label.setAttribute('x',x);label.setAttribute('y',12);label.setAttribute('fill','#b8d2df');label.setAttribute('font-size','9');label.setAttribute('text-anchor','middle');label.textContent=v64TickLabel(t,a);svg.append(label);}
 const rowsData=[];
 for(let i=0;i<visibleRows.length;i++){
  const row=visibleRows[i],y=top+i*rowH;
  const name=document.createElementNS(ns,'text');name.setAttribute('x',4);name.setAttribute('y',y+14);name.setAttribute('fill','#f2f7fa');name.setAttribute('font-size','10');name.textContent=(row.order?String.fromCharCode(9311+row.order)+' ':'')+tl63Name(row.X.joint);svg.append(name);
  const xCenter=y+(compact?8:9),yPos=compatible?y+(compact?18:22):xCenter;
  const base=document.createElementNS(ns,'line');base.setAttribute('x1',left);base.setAttribute('x2',width-right);base.setAttribute('y1',xCenter);base.setAttribute('y2',xCenter);base.setAttribute('stroke','#526b78');base.setAttribute('stroke-width','1');svg.append(base);
  if(compatible){const ybase=document.createElementNS(ns,'line');ybase.setAttribute('x1',left);ybase.setAttribute('x2',width-right);ybase.setAttribute('y1',yPos);ybase.setAttribute('y2',yPos);ybase.setAttribute('stroke','#526b78');ybase.setAttribute('stroke-width','1');svg.append(ybase);}
  if(compatible){
   for(const run of v64DifferenceRuns(row,a,v64Threshold())){const diff=document.createElementNS(ns,'rect');diff.setAttribute('x',scaleX(run.start));diff.setAttribute('y',y+2);diff.setAttribute('width',Math.max(2,scaleX(run.end)-scaleX(run.start)));diff.setAttribute('height',24);diff.setAttribute('rx',4);diff.setAttribute('fill',v64Live.color);diff.setAttribute('opacity','.18');diff.setAttribute('data-difference','true');const title=document.createElementNS(ns,'title');title.textContent='同一関節・同一指標のX/Y速度差が基準を超えた区間';diff.append(title);svg.append(diff);}
  }
  v64DrawStateSegments(svg,row.X,'X',xCenter-3,rowH,scaleX,a,ns);
  if(compatible)v64DrawStateSegments(svg,row.Y,'Y',yPos-2,rowH,scaleX,a,ns);
  const ballX=document.createElementNS(ns,'circle');ballX.setAttribute('class','v64LiveBall');ballX.setAttribute('data-live-side','X');ballX.setAttribute('data-joint-id',row.jointId);ballX.setAttribute('cy',xCenter);ballX.setAttribute('r','5');ballX.setAttribute('fill',TL62.color.unavailable);ballX.setAttribute('stroke','#061722');ballX.setAttribute('stroke-width','1');svg.append(ballX);
  let ballY=null;if(compatible){ballY=document.createElementNS(ns,'circle');ballY.setAttribute('class','v64LiveBall');ballY.setAttribute('data-live-side','Y');ballY.setAttribute('data-joint-id',row.jointId);ballY.setAttribute('cy',yPos);ballY.setAttribute('r','5');ballY.setAttribute('fill','none');ballY.setAttribute('stroke',TL62.color.unavailable);ballY.setAttribute('stroke-width','2');svg.append(ballY);}
  rowsData.push({row,y,ballX,ballY});
  const hit=document.createElementNS(ns,'rect');hit.setAttribute('x',left);hit.setAttribute('y',y);hit.setAttribute('width',plotWidth);hit.setAttribute('height',rowH);hit.setAttribute('fill','transparent');hit.style.cursor='crosshair';hit.onclick=e=>{const box=svg.getBoundingClientRect(),t=from+((e.clientX-box.left)/Math.max(1,box.width)) * span;const actual=a.config.alignment==='phase'?t*(timeline62.sourceX?.data?.duration||1):t;tl62Seek(actual,'X');};svg.append(hit);
 }
 plot.replaceChildren(svg);plot.setAttribute('data-row-count',String(rowsData.length));v64Live.svg=svg;v64Live.rows=rowsData;v64Live.scaleX=scaleX;v64Live.axisRange=[from,to];v64Tick();
}
function v64Tick(){
 if(!v64Live.installed)return;
 const a=timeline62.analysis;if(!a)return;
 const xDuration=timeline62.sourceX?.data?.duration||1,yDuration=timeline62.sourceY?.data?.duration||xDuration;
 let raw=Number(state._renderedAnimationTime)||0;let timeX=((raw%xDuration)+xDuration)%xDuration;
 let timeY=a.config.alignment==='phase'?(timeX/xDuration)*yDuration:timeX;
 const displayX=v64TimelineAxis(timeX,'X',a),displayY=v64TimelineAxis(timeY,'Y',a);
 const [from,to]=v64Live.axisRange||v64AxisRange(a,'X'),inX=displayX>=from&&displayX<=to,inY=displayY>=from&&displayY<=to;
 if(v64Live.rows&&v64Live.scaleX){
  for(const entry of v64Live.rows){
   const sx=v64StateAt(entry.row.X,timeX,a);entry.ballX.setAttribute('cx',v64Live.scaleX(displayX));entry.ballX.setAttribute('r',String(v64Clamp(sx.radius||3,3,10)));entry.ballX.setAttribute('fill',sx.color||TL62.color.unavailable);entry.ballX.setAttribute('opacity',inX?'1':'0');entry.ballX.setAttribute('aria-label',entry.row.X.joint.name+' X '+(V64_STATE_LABEL[sx.state]||sx.state));
   if(entry.ballY&&entry.row.Y){const sy=v64StateAt(entry.row.Y,timeY,a);entry.ballY.setAttribute('cx',v64Live.scaleX(displayY));entry.ballY.setAttribute('r',String(v64Clamp(sy.radius||3,3,10)));entry.ballY.setAttribute('stroke',sy.color||TL62.color.unavailable);entry.ballY.setAttribute('fill','none');entry.ballY.setAttribute('opacity',inY?'1':'0');entry.ballY.setAttribute('aria-label',entry.row.Y.joint.name+' Y '+(V64_STATE_LABEL[sy.state]||sy.state));}
  }
 }
 const timeLabel=v64$('tl64Readout');if(timeLabel)timeLabel.textContent='再生位置 '+v64LabelTime(timeX)+(a.config.alignment==='phase'?' ／ 局面 '+(100*timeX/xDuration).toFixed(0)+'%':'');
}
function v64QuaternionDelta(a,b){
 if(!a||!b||a.length!==4||b.length!==4)return 0;
 const d=Math.abs(a.reduce((s,v,i)=>s+v*b[i],0)),la=Math.hypot(...a)||1,lb=Math.hypot(...b)||1;
 return 2*Math.acos(v64Clamp(d/(la*lb),-1,1))*180/Math.PI;
}
function v64PrepareComparisonPose(time){
 if(!v64Live.overlay||!timeline62.analysis?.compatibility?.ok){v64Live.frame=null;return;}
 if(!timeline62.sourceX||!timeline62.sourceY||!['xbot','ybot'].includes(timeline62.sourceX.avatar)||!['xbot','ybot'].includes(timeline62.sourceY.avatar)){v64Live.frame=null;return;}
 const xAvatar=timeline62.sourceX.avatar,yAvatar=timeline62.sourceY.avatar,xMotion=timeline62.sourceX.motion,yMotion=timeline62.sourceY.motion;
 if(state.model!==xAvatar||state.motion!==xMotion){v64Live.frame=null;const status=v64$('tl64Status');if(status)status.textContent='表示中のモデル／動作がX設定と異なるため、3D差分を一時停止しました。';return;}
 const now=performance.now();if(now-v64Live.lastPoseAt<28&&v64Live.frame)return;v64Live.lastPoseAt=now;
 const ym=getModel(yAvatar),xDuration=timeline62.sourceX.data.duration||1,yDuration=timeline62.sourceY.data.duration||1;
 const phase=tl62$('tl62Alignment')?.value==='phase',xTime=((time%xDuration)+xDuration)%xDuration,yTime=phase?(xTime/xDuration)*yDuration:(window.__TimelineLiveV66?.mapYTime?.(xTime,timeline62.analysis)??xTime);
 const previousModel=state.model,previousGame=state.gameMode;state.model=yAvatar;state.gameMode=false;
 try{animateModel(ym,yMotion,yTime);ym.currentMotion=yMotion;}finally{state.model=previousModel;state.gameMode=previousGame;}
 const mask=new Float32Array(48),xSkin=modelData.skin,ySkin=ym.skin;let count=0;
 if(!xSkin||!ySkin||xSkin.joints.length!==ySkin.joints.length){v64Live.frame=null;return;}
 for(let i=0;i<xSkin.joints.length&&i<48;i++){
  const xi=xSkin.joints[i],yi=ySkin.joints[i],xn=modelData.nodes[xi],yn=ym.nodes[yi];
  if(!xn||!yn||xn.name!==yn.name)continue;
  const angle=v64QuaternionDelta(modelData.poseRot?.[xi],ym.poseRot?.[yi]);
  const xt=modelData.poseTrans?.[xi],yt=ym.poseTrans?.[yi],move=xt&&yt?Math.hypot(xt[0]-yt[0],xt[1]-yt[1],xt[2]-yt[2]):0;
  if(angle>=5||move>=.025){mask[i]=1;count++;}
 }
 v64Live.overlayModel=ym;v64Live.overlayMask=mask;v64Live.changedJointCount=count;
 v64Live.frame=count?{model:ym,mask:mask,alpha:.62,joints:count,timeX:xTime,timeY:yTime}:null;
 const status=v64$('tl64Status');if(status){status.textContent=count?'3D差分を検出：'+count+'関節の影響領域を差分色で表示中。':'指定した姿勢差の基準未満です。差分は表示していません。';}
}
function v64RenderSecondary(pv,world,baseMask){
 const frame=v64Live.frame;if(!frame||!frame.model||!frame.mask)return;
 let mask=frame.mask;
 if(baseMask){const merged=new Float32Array(mask.length);for(let i=0;i<merged.length;i++)merged[i]=mask[i]*baseMask[i];mask=merged;}
 if(!mask.some(x=>x>0))return;
 renderMesh(pv,world,mask,frame.model,frame.alpha);
}
function v64Draw3DMarkers(pvs){
 const layer=v64$('liveMotionMarkers'),analysis=timeline62.analysis;
 if(!layer)return;
 layer.replaceChildren();
 if(!analysis||!analysis.compatibility.ok||!state.showMotionMarkers||!modelData?.skin||!state._modelFit||!pvs?.length)return;
 const box=v64$('screen').getBoundingClientRect(),duration=timeline62.sourceX?.data?.duration||1,time=((Number(state._renderedAnimationTime)||0)%duration+duration)%duration;
 const overlayFrame=v64Live.frame;
 for(const row of analysis.rows){
  if(!row.X)continue;
  const name=row.X.joint.name,nodeIndex=modelData.nodes.findIndex(n=>n.name===name);if(nodeIndex<0)continue;
  const local=modelData.world[nodeIndex];if(!local)continue;
  const p=mulPoint(state._modelFit,[local[12],local[13],local[14]]),uv=projectionUV(pvs[0],p);if(!uv)continue;
  const sx=box.width*uv[0],sy=box.height*(1-uv[1]),mx=v64StateAt(row.X,time,analysis),size=v64Clamp(6+(mx.radius||3)*.55,7,12);
  const dot=document.createElement('span');dot.className='v64MotionMarker x';dot.dataset.jointId=String(row.jointId);dot.dataset.state=mx.state;dot.style.left=sx+'px';dot.style.top=sy+'px';dot.style.width=size+'px';dot.style.height=size+'px';dot.style.background=mx.color||TL62.color.unavailable;dot.style.color=mx.color||TL62.color.unavailable;dot.title='';layer.append(dot);
  if(overlayFrame&&row.Y){const yName=row.Y.joint.name,yi=overlayFrame.model.nodes.findIndex(n=>n.name===yName),yw=overlayFrame.model.world[yi];if(yi>=0&&yw){const yp=mulPoint(state._modelFit,[yw[12],yw[13],yw[14]]),yuv=projectionUV(pvs[0],yp),my=v64StateAt(row.Y,overlayFrame.timeY,analysis);if(yuv){const ydot=document.createElement('span');ydot.className='v64MotionMarker y';ydot.dataset.jointId=String(row.jointId);ydot.dataset.state=my.state;ydot.style.left=box.width*yuv[0]+'px';ydot.style.top=box.height*(1-yuv[1])+'px';ydot.style.width=size+'px';ydot.style.height=size+'px';ydot.style.color=my.color||TL62.color.unavailable;ydot.title='';layer.append(ydot);}}}
 }
}
function v64RefreshAfterAnalysis(){
 if(!v64Live.installed)return;
 setTimeout(()=>{if(v64Live.overlay&&(!timeline62.analysis?.compatibility?.ok||!['xbot','ybot'].includes(timeline62.sourceX?.avatar)||!['xbot','ybot'].includes(timeline62.sourceY?.avatar)))v64SetOverlay(false);v64Layout();v64Render();},0);
}
const v64PreviousAnalyze=tl62Analyze;
tl62Analyze=function(){
 const result=v64PreviousAnalyze.apply(this,arguments);
 if(timeline62.panel&&!timeline62.panel.open)timeline62.enabled=true;
 v64RefreshAfterAnalysis();return result;
};
window.__LiveDynamicsV64={state:v64Live,render:v64Render,refresh:v64Render,preparePose:v64PrepareComparisonPose,drawMarkers:v64Draw3DMarkers,setOverlay:v64SetOverlay,colorRgb:v64BaseColor,renderSecondary:v64RenderSecondary};
