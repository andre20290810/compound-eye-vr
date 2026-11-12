/* v66: low-clutter event timeline, resizable viewer, detailed analysis below. */
const V66_PREF_WIDTH='compoundeye.v66.timelineWidth';
const V66_PREF_HEIGHT='compoundeye.v66.viewerHeight';
const V67_YBOT_COLOR_KEY='compoundeye.v67.ybotBaseColor';
const V67_Y_RATE_KEY='compoundeye.v67.yComparisonRate';
let v66Installed=false,v66SvgState=null,v66WaveMode='speed';
function v66$(id){return document.getElementById(id);}
function v66Clamp(x,a,b){return Math.max(a,Math.min(b,x));}
function v66Fmt(t){return Number.isFinite(t)?Number(t).toFixed(3)+' s':'—';}
function v66Hex(hex){return /^#[0-9a-f]{6}$/i.test(hex||'')?hex:'#ff5db7';}
function v66YBotColor(){try{return v66Hex(localStorage.getItem(V67_YBOT_COLOR_KEY)||'#ff7a45');}catch(e){return'#ff7a45';}}
function v66YBotColorRgb(){return v64ColorRgb(v66YBotColor());}
function v66StartSynced(){return v66$('tl66StartSync')?.checked!==false;}
function v66Rate(){const n=Number(v66$('tl66YRate')?.value);return Number.isFinite(n)&&n>0?n:1;}
function v66MapYTime(timeX,analysis=timeline62?.analysis){
 const xDuration=timeline62?.sourceX?.data?.duration||1,yDuration=timeline62?.sourceY?.data?.duration||xDuration;
 if(v66StartSynced()&&analysis?.config?.alignment==='raw'){const t=timeX*v66Rate();return((t%yDuration)+yDuration)%yDuration;}
 return analysis?.config?.alignment==='phase'?(timeX/xDuration)*yDuration:timeX;
}
function v66DisplayAxis(time,side,analysis){
 if(side==='Y'&&v66StartSynced()&&analysis?.config?.alignment==='raw')return v64TimelineAxis(time/v66Rate(),'X',analysis);
 return v64TimelineAxis(time,side,analysis);
}
function v66UpdatePlaybackControls(){
 const start=v66$('tl66StartSync'),rate=v66$('tl66YRate'),out=v66$('tl66YRateValue'),analysis=timeline62?.analysis;
 if(rate)rate.disabled=!start?.checked||!analysis?.source_y||!analysis?.compatibility?.ok;
 if(out)out.textContent=v66Rate().toFixed(2)+'×';
}
function v66InstallWaveDock(dock){
 if(v66$('tl66WaveDock'))return v66$('tl66WaveDock');
 const root=document.createElement('section');root.id='tl66WaveDock';root.setAttribute('aria-label','比較波形');
 const tabs=document.createElement('div');tabs.id='tl66WaveTabs';tabs.setAttribute('role','tablist');
 const pages=document.createElement('div');pages.id='tl66WavePages';
 const xy=document.createElement('div');xy.id='tl66WaveXY';xy.setAttribute('role','tabpanel');
 const compare=document.createElement('div');compare.id='tl66WaveCompare';compare.setAttribute('role','tabpanel');compare.hidden=true;
 const button=(id,label,mode)=>{const b=document.createElement('button');b.id=id;b.type='button';b.textContent=label;b.setAttribute('role','tab');b.setAttribute('aria-pressed',String(mode==='xy'));return b;};
 const xyButton=button('tl66WaveTabXY','詳細解析：選択部位X/Y速度波形','xy');
 const compareButton=button('tl66WaveTabCompare','実験計測：時刻同期・2動作比較波形','compare');
 tabs.append(xyButton,compareButton);
 const joint=v66$('tl62WaveJoint'),mode=v66$('tl66WaveMode'),wave=v66$('tl62Wave'),legend=v66$('tl62WaveLegend'),oldWaveDetails=wave?.closest('details');
 const xyTools=document.createElement('div');xyTools.id='tl66WaveXYTools';xyTools.append(document.createTextNode('対象部位 '));
 if(joint)xyTools.append(joint);
 if(mode)xyTools.append(document.createTextNode(' 波形 '),mode);
 if(wave)xy.append(xyTools,wave);
 if(legend)xy.append(legend);
 const compareSettings=document.createElement('button');compareSettings.id='tl66OpenExperimentSettings';compareSettings.type='button';compareSettings.textContent='比較条件を開く';
 compareSettings.title='実験計測の比較条件を設定します。';
 compareSettings.onclick=()=>{const p=v66$('experimentPanel'),v=v66$('v47Panel');if(p)p.open=true;if(v)v.open=true;p?.scrollIntoView({block:'nearest',behavior:'smooth'});};
 compare.append(compareSettings);
 for(const id of ['v47Readout','v48GraphLegend','v47Chart','v47Timeline']){const el=v66$(id);if(el)compare.append(el);}
 if(oldWaveDetails)oldWaveDetails.hidden=true;
 const activate=modeName=>{const isXY=modeName==='xy';xy.hidden=!isXY;compare.hidden=isXY;xyButton.setAttribute('aria-pressed',String(isXY));compareButton.setAttribute('aria-pressed',String(!isXY));root.dataset.mode=modeName;if(isXY)v66DrawWave();else{if(typeof v47Render==='function')v47Render();if(typeof v47RenderTimeline==='function')v47RenderTimeline();}};
 xyButton.onclick=()=>activate('xy');compareButton.onclick=()=>activate('compare');
 pages.append(xy,compare);root.append(tabs,pages);
 dock.insertBefore(root,v66$('tl66Legend'));
 return root;
}
function v66Install(){
 if(v66Installed||!v64Live?.workspace)return;
 v66Installed=true;
 const workspace=v64Live.workspace,dock=v64Live.dock,screen=v66$('screen'),shelf=v66$('viewerControlShelf');
 if(!workspace||!dock||!screen||!shelf)return;
 let savedWidth=370,savedHeight=610;
 try{savedWidth=Number(localStorage.getItem(V66_PREF_WIDTH))||savedWidth;savedHeight=Number(localStorage.getItem(V66_PREF_HEIGHT))||savedHeight;}catch(e){}
 workspace.style.setProperty('--v66TimelineWidth',v66Clamp(savedWidth,300,520)+'px');
 workspace.style.setProperty('--v66ViewerHeight',v66Clamp(savedHeight,360,900)+'px');
 const play=v66$('tl64Play'),status=v66$('tl64Status'),readout=v66$('tl64Readout'),comparison=dock.querySelector('.v64CompareTools');
 dock.replaceChildren();
 const head=document.createElement('div');head.className='v66DockHead';
 const title=document.createElement('strong');title.textContent='運動ダイナミクスタイムライン';
 if(play)head.append(title,play);else head.append(title);
 const legend=document.createElement('div');legend.id='tl66Legend';
 legend.innerHTML='<span><i class="x"></i>X:開始◆・ピーク●</span><span><i class="y"></i>Y:開始◆・ピーク●</span><span class="diff"><i></i>色帯: X/Y速度差が設定基準以上</span><span class="hint">点の横位置＝開始同期後の時刻／円の大きさ＝再生速度補正後のピーク速度</span>';
 const playback=document.createElement('div');playback.id='tl66PlaybackControls';
 const syncLabel=document.createElement('label');syncLabel.className='tl66SyncLabel';
 const sync=document.createElement('input');sync.id='tl66StartSync';sync.type='checkbox';sync.checked=true;sync.setAttribute('aria-label','X/Yの動作開始を0秒に同期する');
 syncLabel.append(sync,document.createTextNode('X/Yの開始を同期'));
 const rateLabel=document.createElement('label');rateLabel.className='tl66RateLabel';rateLabel.append(document.createTextNode('Y実行速度'));
 const rate=document.createElement('input');rate.id='tl66YRate';rate.type='range';rate.min='.50';rate.max='2.00';rate.step='.05';rate.setAttribute('aria-label','開始時刻を揃えたY側モーションの再生速度');
 try{rate.value=String(v66Clamp(Number(localStorage.getItem(V67_Y_RATE_KEY))||1,.5,2));}catch(e){rate.value='1';}
 const rateValue=document.createElement('output');rateValue.id='tl66YRateValue';rateLabel.append(rate,rateValue);playback.append(syncLabel,rateLabel);
 const plotWrap=document.createElement('div');plotWrap.id='tl64PlotWrap';
 const plot=document.createElement('div');plot.id='tl64Plot';plotWrap.append(plot);
 const foot=document.createElement('div');foot.className='v66DockFoot';
 if(readout)foot.append(readout);
 if(status)foot.append(status);
 dock.append(head,playback,plotWrap,legend,foot);
 const widthGrip=document.createElement('div');widthGrip.id='tl66WidthGrip';widthGrip.setAttribute('role','separator');widthGrip.setAttribute('aria-label','ビューワーとタイムラインの幅を調整');widthGrip.setAttribute('aria-orientation','vertical');widthGrip.tabIndex=0;
 const heightGrip=document.createElement('div');heightGrip.id='tl66HeightGrip';heightGrip.setAttribute('role','separator');heightGrip.setAttribute('aria-label','ビューワーの高さを調整');heightGrip.setAttribute('aria-orientation','horizontal');heightGrip.tabIndex=0;
 workspace.append(widthGrip,heightGrip);
 if(v64Live.controls||v66$('liveDynamicsControls'))shelf.append(v66$('liveDynamicsControls'));
 const ybotColorLabel=document.createElement('label');ybotColorLabel.id='tl66YBotBaseColorWrap';ybotColorLabel.className='tl66ControlLabel';ybotColorLabel.append(document.createTextNode('YBot全身色 '));
 const ybotColorInput=document.createElement('input');ybotColorInput.id='tl66YBotBaseColor';ybotColorInput.type='color';ybotColorInput.value=v66YBotColor();ybotColorInput.setAttribute('aria-label','YBot全身の色');
 ybotColorInput.addEventListener('input',()=>{try{localStorage.setItem(V67_YBOT_COLOR_KEY,ybotColorInput.value);}catch(e){};requestAnimationFrame(()=>window.__compoundTest?.forceDraw?.());});
 ybotColorLabel.append(ybotColorInput);shelf.append(ybotColorLabel);
 if(comparison)shelf.append(comparison);
 const compare=v66$('tl64Compare3d')?.parentElement;
 const colorLabel=compare?.querySelector('.v64ColorLabel');
 if(colorLabel){const input=colorLabel.querySelector('input');colorLabel.firstChild.nodeValue='YBot差分色 ';if(input)colorLabel.append(input);}
 const settings=document.querySelector('#viewOptionsPanel');
 if(settings){settings.open=false;try{localStorage.setItem('compoundeye.v65.viewOptionsOpen','0');}catch(e){}}
 const details=v66$('tl62Panel');
 if(details){
  const summary=details.querySelector(':scope > summary');if(summary)summary.textContent='運動ダイナミクスタイムライン — 詳細解析';
  details.open=true;
  v66$('tl62Graphic')?.setAttribute('hidden','');
  v66$('tl62Order')?.setAttribute('hidden','');
  const sync3d=v66$('tl62Sync3D');if(sync3d?.parentElement)sync3d.parentElement.hidden=true;
  let summaryBlock=v66$('tl66AnalysisSummary');
  if(!summaryBlock){summaryBlock=document.createElement('section');summaryBlock.id='tl66AnalysisSummary';summaryBlock.setAttribute('aria-live','polite');details.insertBefore(summaryBlock,v66$('tl62Quality'));}
  const waveDetails=v66$('tl62Wave')?.closest('details');if(waveDetails)waveDetails.open=true;
  const tools=details.querySelectorAll('.tl62Tools');
  const exportAnchor=v66$('tl62CSV')?.parentElement;
  if(exportAnchor&&!v66$('tl66SourceCsv')){
   const btn=document.createElement('button');btn.id='tl66SourceCsv';btn.type='button';btn.textContent='X/Y元データ統合CSV';
   btn.title='選択中のX・Yモーションを再計算可能な元データ行として一つのCSVに出力します。';
   btn.onclick=v66ExportComparisonCsv;exportAnchor.append(btn);
  }
  const wave=v66$('tl62Wave'),legend=v66$('tl62WaveLegend');
  if(wave&&legend&&!v66$('tl66WaveMode')){
   const select=document.createElement('select');select.id='tl66WaveMode';select.setAttribute('aria-label','詳細波形の種類');
   select.innerHTML='<option value="speed">速度</option><option value="change">速度変化（符号付き）</option>';
   select.addEventListener('change',()=>{v66WaveMode=select.value;v66DrawWave();});
   wave.parentElement.insertBefore(select,wave);
  }
 }
 v66InstallWaveDock(dock);
 const style=document.createElement('style');style.id='v66DynamicsStyles';style.textContent=[
  '#viewerWorkspace{display:grid!important;grid-template-columns:minmax(400px,1fr) 8px minmax(300px,var(--v66TimelineWidth,370px))!important;grid-template-rows:minmax(360px,var(--v66ViewerHeight,610px)) 8px auto!important;gap:0 7px!important;align-items:stretch!important;width:100%!important;min-width:0!important}',
  '#viewerWorkspace>#screen{grid-column:1!important;grid-row:1!important;width:100%!important;height:100%!important;min-height:360px!important;max-height:none!important;resize:none!important}',
  '#viewerWorkspace>#liveDynamicsDock{grid-column:3!important;grid-row:1!important;width:100%!important;height:100%!important;min-height:360px!important;max-height:none!important;overflow:hidden!important;padding:9px!important;gap:6px!important}',
  '#tl66WidthGrip{grid-column:2;grid-row:1;cursor:col-resize;touch-action:none;position:relative;z-index:5;align-self:stretch;border-radius:6px;background:#31546b}',
  '#tl66WidthGrip:after{content:"";position:absolute;left:3px;top:45%;width:2px;height:10%;min-height:34px;border-left:1px solid #9dc2d2;border-right:1px solid #9dc2d2}',
  '#tl66HeightGrip{grid-column:1/-1;grid-row:2;cursor:row-resize;touch-action:none;position:relative;z-index:5;border-radius:6px;background:#31546b}',
  '#tl66HeightGrip:after{content:"";position:absolute;left:48%;top:3px;width:4%;height:2px;border-top:1px solid #9dc2d2;border-bottom:1px solid #9dc2d2}',
  '#viewerWorkspace[data-multiview="true"]{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(430px,460px) minmax(360px,var(--v66ViewerHeight,610px)) 8px auto!important;row-gap:7px!important;column-gap:0!important}',
  '#viewerWorkspace[data-multiview="true"]>#liveDynamicsDock{grid-column:1!important;grid-row:1!important;height:100%!important;min-height:420px!important;max-height:none!important}',
  '#viewerWorkspace[data-multiview="true"]>#screen{grid-column:1!important;grid-row:2!important;height:100%!important;min-height:360px!important}',
  '#viewerWorkspace[data-multiview="true"]>#tl66HeightGrip{grid-column:1!important;grid-row:3!important}',
  '#viewerWorkspace[data-multiview="true"]>#viewerControlShelf{grid-column:1!important;grid-row:4!important}',
  '#viewerWorkspace[data-multiview="true"]>#tl66WidthGrip{display:none!important}',
  '#viewerControlShelf{grid-column:1/-1!important;grid-row:3!important;align-self:start}',
  '#liveDynamicsControls{margin:0!important;max-width:100%;box-sizing:border-box}',
  '#liveDynamicsControls .tl62Tools{max-width:100%}',
  '.v66DockHead{display:flex;align-items:center;justify-content:space-between;gap:7px;font-size:13px;min-height:28px}',
  '#tl66PlaybackControls{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;padding:2px 5px;border:1px solid #29495d;border-radius:7px;background:#0b2232;color:#d9edf5;font-size:10px}',
  '#tl66PlaybackControls label{display:flex;align-items:center;gap:5px;white-space:nowrap}',
  '#tl66PlaybackControls input[type=checkbox]{accent-color:#55d6be}',
  '#tl66YRate{width:95px;accent-color:#55d6be}',
  '#tl66YRateValue{min-width:37px;color:#fff;font-variant-numeric:tabular-nums}',
  '#tl66YRate:disabled{opacity:.4}',
  '.tl66ControlLabel{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;color:#d8edf5;background:#132f42;border:1px solid #35566b;border-radius:7px;font-size:11px}',
  '.tl66ControlLabel input{width:30px;height:22px;padding:0;border:0;background:transparent}',
  '#tl66Legend .diff i{background:'+v66Hex(v64Live.color)+';height:8px;border-radius:2px}',
  '#tl66Legend .diff{color:#f1c5de}',
  '#tl64PlotWrap{flex:0 1 43%!important;height:43%!important;min-height:145px!important;max-height:48%!important;overflow:auto!important;background:#081d2c;border:1px solid #29495d;border-radius:8px}',
  '#tl64Plot{width:100%;min-height:100%;overflow:visible}',
  '#tl64Plot svg{display:block;width:100%;height:auto;min-width:300px}',
  '#tl66WaveDock{display:flex;flex:1 1 35%;flex-direction:column;gap:5px;min-height:155px;max-height:46%;padding:6px;border:1px solid #29495d;border-radius:8px;background:#081d2c;box-sizing:border-box;overflow:hidden}',
  '#tl66WaveTabs{display:flex;gap:5px;flex-wrap:wrap;flex:0 0 auto}',
  '#tl66WaveTabs button{flex:1 1 145px;padding:5px 7px;font-size:9px;line-height:1.25;background:#19364b;color:#d9edf5;border:1px solid #45677d;border-radius:6px}',
  '#tl66WaveTabs button[aria-pressed="true"]{background:#24624f;border-color:#62c9a1;color:#fff}',
  '#tl66WavePages{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}',
  '#tl66WavePages>[hidden]{display:none!important}',
  '#tl66WaveXY,#tl66WaveCompare{min-width:0}',
  '#tl66WaveXYTools{display:flex;align-items:center;flex-wrap:wrap;gap:5px;color:#bbd7e2;font-size:9px;margin-bottom:3px}',
  '#tl66WaveXYTools select{max-width:145px;padding:4px 6px;background:#19364b;color:#eff8fb;border:1px solid #527990;border-radius:5px;font-size:10px}',
  '#tl66WaveXY #tl62Wave{overflow-x:auto}',
  '#tl66WaveXY #tl62Wave svg{display:block;width:100%;height:auto;min-width:300px}',
  '#tl66WaveXY #tl62WaveLegend{font-size:9px;color:#aac9d5;line-height:1.35;margin-top:3px}',
  '#tl66OpenExperimentSettings{padding:4px 7px;font-size:9px;margin:0 0 4px}',
  '#tl66WaveCompare #v47Readout{font-size:9px!important;margin:2px 0!important}',
  '#tl66WaveCompare #v48GraphLegend{font-size:9px;max-height:34px;overflow:auto}',
  '#tl66WaveCompare .v47Chart{width:100%;max-height:160px;overflow:auto;background:#061b2a;border:1px solid #28465a;border-radius:5px;margin:3px 0}',
  '#tl66WaveCompare .v47Chart svg{display:block;width:100%;min-width:560px;height:auto}',
  '.v66DockFoot{display:flex;flex-direction:column;gap:2px;min-height:26px}',
  '#tl64Readout{font-size:10px;font-variant-numeric:tabular-nums;color:#f2f8fb;min-height:14px}',
  '#tl64Status{font-size:10px;color:#b7d9e5;min-height:14px;line-height:1.35}',
  '#tl66Legend{display:flex;flex-wrap:wrap;align-items:center;gap:5px 10px;color:#c8dce4;font-size:9px}',
  '#tl66Legend span{display:inline-flex;align-items:center;gap:4px}',
  '#tl66Legend i{width:16px;height:3px;border-radius:4px;display:inline-block}',
  '#tl66Legend i.x{background:#55d6be}#tl66Legend i.y{background:'+v66Hex(v64Live.color)+'}',
  '#tl66Legend .hint{color:#9fbdca}',
  '.tl66Event{cursor:pointer;transition:r 100ms,filter 100ms}',
  '.tl66Event.is-current{filter:drop-shadow(0 0 4px currentColor)}',
  '#tl66AnalysisSummary{margin:8px 0;padding:10px 11px;background:#091e2d;border:1px solid #31566c;border-radius:9px;color:#e7f3f8}',
  '#tl66AnalysisSummary h3{font-size:14px;margin:0 0 7px}',
  '#tl66AnalysisSummary h4{font-size:12px;margin:10px 0 5px;color:#cbe2ed}',
  '#tl66AnalysisSummary p,#tl66AnalysisSummary li{font-size:11px;line-height:1.55;margin:4px 0;color:#c4dce7}',
  '#tl66AnalysisSummary .tableWrap{overflow-x:auto}',
  '#tl66AnalysisSummary table{border-collapse:collapse;width:100%;min-width:760px;font-size:11px;font-variant-numeric:tabular-nums}',
  '#tl66AnalysisSummary th,#tl66AnalysisSummary td{padding:5px 7px;border-bottom:1px solid #29495d;text-align:right;white-space:nowrap}',
  '#tl66AnalysisSummary th:first-child,#tl66AnalysisSummary td:first-child{text-align:left}',
  '#tl66AnalysisSummary th{color:#a9cfdf;font-weight:600}',
  '#tl66AnalysisSummary .limitations{border-top:1px solid #31566c;margin-top:8px;padding-top:6px}',
  '#tl62Graphic[hidden],#tl62Order[hidden]{display:none!important}',
  '#tl66WaveMode{margin:8px 0 0;background:#19364b;color:#eff8fb;border:1px solid #527990;border-radius:5px;padding:5px}',
  '@media(max-width:900px){#viewerWorkspace,#viewerWorkspace[data-multiview="true"]{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(390px,420px) minmax(320px,var(--v66ViewerHeight,500px)) 8px auto!important;row-gap:7px!important;column-gap:0!important}#viewerWorkspace>#liveDynamicsDock,#viewerWorkspace[data-multiview="true"]>#liveDynamicsDock{grid-column:1!important;grid-row:1!important;height:100%!important;min-height:380px!important}#viewerWorkspace>#screen,#viewerWorkspace[data-multiview="true"]>#screen{grid-column:1!important;grid-row:2!important;height:100%!important;min-height:320px!important}#tl66WidthGrip{display:none}#viewerWorkspace>#tl66HeightGrip,#viewerWorkspace[data-multiview="true"]>#tl66HeightGrip{grid-column:1!important;grid-row:3!important}#viewerWorkspace>#viewerControlShelf,#viewerWorkspace[data-multiview="true"]>#viewerControlShelf{grid-column:1!important;grid-row:4!important}}',
  '@media(max-width:500px){#viewerWorkspace{grid-template-rows:minmax(360px,390px) minmax(300px,var(--v66ViewerHeight,460px)) 8px auto!important}#viewerWorkspace>#liveDynamicsDock{padding:6px!important}.v66DockHead{font-size:12px}#tl66Legend{gap:4px 7px}#liveDynamicsControls{padding:7px!important;gap:5px!important}}',
  '@media(max-width:700px){#v65AegisSettings #appearancePanel58{max-height:45dvh!important;overflow:auto!important}}',
  'body.compact-layout #viewerWorkspace{display:block!important}body.compact-layout #liveDynamicsDock,body.compact-layout #viewerControlShelf,body.compact-layout #tl66WidthGrip,body.compact-layout #tl66HeightGrip{display:none!important}',
  '#tl62Panel{margin-top:8px}#tl62Panel>summary{font-size:16px!important;padding:5px 0 10px}',
  '#tl62Wave{overflow-x:auto}',
 ].join('');document.head.append(style);
 const input=v66$('tl64DiffThreshold');if(input)input.addEventListener('input',v66Render);
 const startSync=v66$('tl66StartSync'),rateControl=v66$('tl66YRate'),alignmentControl=v66$('tl62Alignment');
 if(startSync)startSync.addEventListener('change',()=>{
  if(startSync.checked&&alignmentControl&&alignmentControl.value!=='raw'){alignmentControl.value='raw';alignmentControl.dispatchEvent(new Event('change',{bubbles:true}));}
  v66UpdatePlaybackControls();v66Render();v66DrawWave();
 });
 if(rateControl)rateControl.addEventListener('input',()=>{
  try{localStorage.setItem(V67_Y_RATE_KEY,rateControl.value);}catch(e){}
  v66UpdatePlaybackControls();v66Render();v66Tick();v66DrawWave();v66RenderDetail();
 });
 if(alignmentControl)alignmentControl.addEventListener('change',()=>{
  if(alignmentControl.value==='phase'&&startSync)startSync.checked=false;
  v66UpdatePlaybackControls();v66Render();v66DrawWave();
 });
 const existingPlot=v66$('tl64Plot');
 if(existingPlot)existingPlot.setAttribute('data-timeline-design','onset-peak-events-only');
 const resizer=(grip,axis)=>{
  let start=null;
  grip.addEventListener('pointerdown',e=>{start={x:e.clientX,y:e.clientY,width:workspace.getBoundingClientRect().width,height:Number.parseFloat(getComputedStyle(workspace).getPropertyValue('--v66ViewerHeight'))||610};grip.setPointerCapture(e.pointerId);e.preventDefault();});
  grip.addEventListener('pointermove',e=>{if(!start)return;const r=workspace.getBoundingClientRect();if(axis==='width'){const w=v66Clamp(r.right-e.clientX,300,Math.min(560,r.width-400));workspace.style.setProperty('--v66TimelineWidth',w+'px');}else{const h=v66Clamp(start.height+e.clientY-start.y,360,Math.max(380,innerHeight-150));workspace.style.setProperty('--v66ViewerHeight',h+'px');}});
  const end=()=>{if(!start)return;start=null;try{localStorage.setItem(axis==='width'?V66_PREF_WIDTH:V66_PREF_HEIGHT,parseFloat(workspace.style.getPropertyValue(axis==='width'?'--v66TimelineWidth':'--v66ViewerHeight')));}catch(e){};v64Layout();v64Render();};
  grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
 };
 resizer(widthGrip,'width');resizer(heightGrip,'height');
 widthGrip.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const old=parseFloat(getComputedStyle(workspace).getPropertyValue('--v66TimelineWidth'))||370;const next=v66Clamp(old+(e.key==='ArrowLeft'?-20:20),300,560);workspace.style.setProperty('--v66TimelineWidth',next+'px');try{localStorage.setItem(V66_PREF_WIDTH,next);}catch(_){}v64Render();e.preventDefault();}});
 heightGrip.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){const old=parseFloat(getComputedStyle(workspace).getPropertyValue('--v66ViewerHeight'))||610;const next=v66Clamp(old+(e.key==='ArrowUp'?-20:20),360,900);workspace.style.setProperty('--v66ViewerHeight',next+'px');try{localStorage.setItem(V66_PREF_HEIGHT,next);}catch(_){}e.preventDefault();}});
 if(typeof v64Render==='function'){v64Render=v66Render;v64Tick=v66Tick;}
 if(window.__LiveDynamicsV64){window.__LiveDynamicsV64.render=v66Render;window.__LiveDynamicsV64.refresh=v66Render;}
 if(typeof tl62Draw==='function'){const baseDraw=tl62Draw;tl62Draw=function(){const out=baseDraw.apply(this,arguments);v66RenderDetail();return out;};}
 tl62Wave=v66DrawWave;
 const waveJoint=v66$('tl62WaveJoint'),alignmentView=v66$('tl62Alignment');if(waveJoint)waveJoint.onchange=v66DrawWave;if(alignmentView)alignmentView.onchange=v66DrawWave;
 const colorInput=v66$('tl64DiffColor');if(colorInput)colorInput.addEventListener('input',()=>{const y=v66$('tl66Legend')?.querySelector('.y');if(y)y.style.background=colorInput.value;v66Render();});
 const pause=v66$('togglePause');if(pause)pause.addEventListener('click',()=>{v64Live.frame=null;requestAnimationFrame(()=>{draw(performance.now());v64Tick();v66Tick();v64UpdatePlayLabel();});});
 window.addEventListener('resize',()=>{v64Layout();v66Render();v66DrawWave();if(v66$('tl66WaveCompare')?.hidden===false){if(typeof v47Render==='function')v47Render();if(typeof v47RenderTimeline==='function')v47RenderTimeline();}});
 v66RenderDetail();v66DrawWave();v66Render();
}
function v66AddEvent(svg,ns,row,side,type,time,value,scaleX,y,unit){
 if(!Number.isFinite(time))return;
 const analysis=timeline62.analysis,color=side==='X'?'#55d6be':v66Hex(v64Live.color),x=scaleX(v66DisplayAxis(time,side,analysis));
 let marker;
 if(type==='peak'){
  const related=timeline62.analysis?.rows.find(r=>r.jointId===row.jointId),xSpeeds=related?.X?.speed||row.speed,ySpeeds=(related?.Y?.speed||[]).map(v=>v*v66Rate());
  const max=Math.max(.000001,...xSpeeds.filter(Number.isFinite).map(Math.abs),...ySpeeds.filter(Number.isFinite).map(Math.abs));
  const effective=Math.abs(value)*(side==='Y'&&v66StartSynced()?v66Rate():1),ratio=v66Clamp(effective/max,0,1),radius=3.2+3.2*ratio;
  marker=document.createElementNS(ns,'circle');marker.setAttribute('cx',x);marker.setAttribute('cy',y);marker.setAttribute('r',radius);marker.setAttribute('fill',color);marker.setAttribute('stroke','#071b27');marker.setAttribute('stroke-width','1');
 }else{
  marker=document.createElementNS(ns,'path');marker.setAttribute('d','M '+x+' '+(y-3.4)+' l 3.4 3.4 -3.4 3.4 -3.4 -3.4 Z');marker.setAttribute('fill',color);
 }
 marker.setAttribute('class','tl66Event');marker.setAttribute('data-event',type);marker.setAttribute('data-side',side);marker.setAttribute('data-joint-id',row.jointId);marker.setAttribute('data-time',time);
 marker.style.color=color;marker.style.cursor='pointer';marker.addEventListener('click',()=>{
  const synced=side==='Y'&&v66StartSynced()&&analysis?.config?.alignment==='raw';
  tl62Seek(synced?time/v66Rate():time,synced?'X':side);
 });
 const title=document.createElementNS(ns,'title');title.textContent=(row.joint?.name||'')+' '+side+' '+(type==='peak'?'ピーク ':'動き始め ')+v66Fmt(time)+(type==='peak'?' / '+Number(value).toFixed(3)+' '+unit:'');marker.append(title);svg.append(marker);
}
function v66Nearest(times,target){
 let lo=0,hi=times.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(times[mid]<target)lo=mid+1;else hi=mid;}
 return lo>0&&Math.abs(times[lo-1]-target)<Math.abs(times[lo]-target)?lo-1:lo;
}
function v66DifferenceRuns(entry,analysis){
 const x=entry?.X,y=entry?.Y;if(!x||!y||!analysis.compatibility?.ok)return[];
 const threshold=v66Clamp((Number(v66$('tl64DiffThreshold')?.value)||15)/100,.01,1);
 const scale=Math.max(1e-9,...x.speed.filter(Number.isFinite).map(Math.abs),...y.speed.filter(Number.isFinite).map(v=>Math.abs(v*v66Rate())));
 const from=analysis.config.from,to=analysis.config.to,runs=[];let begin=null,last=null;
 for(let i=0;i<x.times.length;i++){
  const t=x.times[i];if(t<from||t>to||!Number.isFinite(x.speed[i]))continue;
  const sampleY=v66MapYTime(t,analysis);if(sampleY<y.times[0]||sampleY>y.times.at(-1))continue;
  const j=v66Nearest(y.times,sampleY),speedY=y.speed[j]*((v66StartSynced()&&analysis.config.alignment==='raw')?v66Rate():1);
  const axis=v64TimelineAxis(t,'X',analysis),changed=Number.isFinite(speedY)&&Math.abs(x.speed[i]-speedY)/scale>=threshold;
  if(changed){if(begin===null)begin=axis;last=axis;}
  else if(begin!==null){runs.push({start:begin,end:last});begin=null;last=null;}
 }
 if(begin!==null)runs.push({start:begin,end:last});
 return runs;
}
function v66Render(){
 const analysis=timeline62?.analysis,plot=v66$('tl64Plot');if(!plot)return;v66UpdatePlaybackControls();if(!analysis){plot.replaceChildren();return;}
 const compatible=!!(analysis.source_y&&analysis.compatibility?.ok),rows=analysis.rows.filter(r=>r.X),width=Math.max(300,Math.floor(plot.clientWidth||340)),left=58,right=9,top=23,rowH=31,height=top+Math.max(1,rows.length)*rowH+8;
 const [from,to]=v64AxisRange(analysis,'X'),span=Math.max(.001,to-from),plotWidth=Math.max(150,width-left-right),scaleX=t=>left+(t-from)/span*plotWidth;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('width',width);svg.setAttribute('height',height);svg.setAttribute('role','img');svg.setAttribute('aria-label','部位ごとの動き始めと速度ピークを実時間上に比較するタイムライン');svg.setAttribute('data-row-count',rows.length);
 const add=(tag,attrs,text)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
 for(let k=0;k<=4;k++){const t=from+span*k/4,x=scaleX(t);add('line',{x1:x,x2:x,y1:top-7,y2:height-4,stroke:'#385566','stroke-width':.7,opacity:.65});add('text',{x,y:12,fill:'#a9c5d1','font-size':9,'text-anchor':'middle'},v64TickLabel(t,analysis));}
 rows.forEach((entry,index)=>{
  const y=top+index*rowH,xY=y+21,xX=y+10,label=tl63Name(entry.X.joint);
  add('text',{x:3,y:y+16,fill:'#e4f0f5','font-size':10},label.length>10?label.slice(0,9)+'…':label);
  add('text',{x:left-21,y:xX+3,fill:'#8fcfc5','font-size':8,'text-anchor':'middle'},'X');
  add('text',{x:left-21,y:xY+3,fill:'#d6a6c4','font-size':8,'text-anchor':'middle'},compatible?'Y':'');
  add('line',{x1:left,x2:width-right,y1:xX,y2:xX,stroke:'#425b68','stroke-width':1});
  if(compatible)add('line',{x1:left,x2:width-right,y1:xY,y2:xY,stroke:'#425b68','stroke-width':1});
  if(compatible)for(const run of v66DifferenceRuns(entry,analysis)){
   const x=scaleX(run.start),end=scaleX(run.end),band=add('rect',{x,y:y+3,width:Math.max(2,end-x),height:4,rx:2,fill:v66Hex(v64Live.color),opacity:.84,stroke:'none','data-difference':'true','data-difference-start':run.start.toFixed(4),'data-difference-end':run.end.toFixed(4)});
   const title=document.createElementNS(ns,'title');title.textContent='速度差基準を超えた区間 '+run.start.toFixed(3)+'–'+run.end.toFixed(3)+'秒（Y速度は再生倍率を反映）';band.append(title);
  }
  for(const [side,line,cy] of [['X',entry.X,xX],['Y',entry.Y,xY]])if(line){
   if(line.onset?.time!==null)v66AddEvent(svg,ns,line,side,'onset',line.onset.time,null,scaleX,cy,line.unit);
   if(line.peak)v66AddEvent(svg,ns,line,side,'peak',line.peak.time,line.peak.value,scaleX,cy,line.unit);
  }
  const hit=add('rect',{x:left,y:y,width:plotWidth,height:rowH,fill:'transparent'});hit.style.cursor='crosshair';
 });
 const cursor=add('line',{id:'tl66Playhead',x1:left,x2:left,y1:top-7,y2:height-4,stroke:'#edf9ff','stroke-width':1.3,opacity:.8,'pointer-events':'none'});
 let scrubbing=false;
 const seekPointer=e=>{const box=svg.getBoundingClientRect(),vx=(e.clientX-box.left)/Math.max(1,box.width)*width,axis=v66Clamp(from+(vx-left)/plotWidth*span,from,to);tl62Seek(v64AxisToXTime(axis,analysis),'X');v64Live.frame=null;draw(performance.now());v64Tick();v66Tick();};
 svg.style.touchAction='none';svg.style.cursor='crosshair';svg.dataset.scrubbable='true';svg.setAttribute('aria-label','ドラッグまたはクリックして一時停止位置を選択する運動ダイナミクスタイムライン');
 svg.addEventListener('pointerdown',e=>{if(e.target.closest?.('.tl66Event'))return;scrubbing=true;try{svg.setPointerCapture(e.pointerId);}catch(_){}seekPointer(e);e.preventDefault();});
 svg.addEventListener('pointermove',e=>{if(scrubbing)seekPointer(e);});svg.addEventListener('pointerup',()=>{scrubbing=false;});svg.addEventListener('pointercancel',()=>{scrubbing=false;});
 plot.replaceChildren(svg);plot.setAttribute('data-row-count',String(rows.length));plot.setAttribute('data-design','event-markers-no-per-row-playhead-dots');
 v66SvgState={svg,scaleX,from,to,top,height,compatible,analysis};
 v66Tick();
}
function v66Tick(){
 const a=timeline62?.analysis,s=v66SvgState;if(!s||!a)return;
 const durationX=timeline62.sourceX?.data?.duration||1,durationY=timeline62.sourceY?.data?.duration||durationX;
 const raw=Number(state._renderedAnimationTime)||0,timeX=((raw%durationX)+durationX)%durationX,timeY=v66MapYTime(timeX,a),axis=v64TimelineAxis(timeX,'X',a),x=s.scaleX(axis);
 const cursor=s.svg.querySelector('#tl66Playhead');if(cursor){cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);cursor.setAttribute('opacity',axis>=s.from&&axis<=s.to?'.8':'0');}
 for(const el of s.svg.querySelectorAll('.tl66Event')){const t=Number(el.getAttribute('data-time')),side=el.getAttribute('data-side'),now=side==='Y'?timeY:timeX,dt=.028;el.classList.toggle('is-current',Math.abs(t-now)<=dt);}
 const readout=v66$('tl64Readout');if(readout)readout.textContent='再生位置 '+v66Fmt(timeX)+(a.config.alignment==='phase'?' ／ 局面 '+(100*timeX/durationX).toFixed(0)+'%':'');
}
function v66Share(x,from,to){const points=x?.source?.byJoint?.[String(x.jointId)];if(!points?.length)return null;const rows=points.filter(p=>p.time>=from&&p.time<=to&&Array.isArray(p.position_raw)&&p.position_raw.length===3&&p.position_raw.every(Number.isFinite));if(rows.length<7)return null;
 const ts=rows.map(r=>r.time),pos=rows.map(r=>r.position_raw);
 const derive=(arr,times)=>arr.map((v,i)=>{const a=i===0?0:i-1,b=i===arr.length-1?arr.length-1:i+1,dt=times[b]-times[a];return dt>1e-9?v.map((_,k)=>(arr[b][k]-arr[a][k])/dt):[0,0,0];});
 const vel=derive(pos,ts),acc=derive(vel,ts),jerk=derive(acc,ts);let integral=0;
 for(let i=1;i<jerk.length;i++){const h=ts[i]-ts[i-1],a=Math.hypot(...jerk[i-1])**2,b=Math.hypot(...jerk[i])**2;integral+=h*(a+b)/2;}
 const amp=Math.hypot(...pos.at(-1).map((v,k)=>v-pos[0][k])),duration=ts.at(-1)-ts[0];if(amp<1e-5||duration<1e-4)return null;
 return{value:(duration**5/(2*amp**2))*integral,samples:rows.length,duration,amplitude:amp};
}
function v66Pattern(row,from,to){const values=row?.times.map((t,i)=>({t,v:row.changes[i]})).filter(x=>x.t>=from&&x.t<=to&&Number.isFinite(x.v))||[];if(!values.length)return null;let up=0,down=0;for(const x of values){if(x.v>1e-8)up++;else if(x.v<-1e-8)down++;}return{up:100*up/values.length,down:100*down/values.length};}
function v66Cell(tr,text){const td=document.createElement(tr?'th':'td');td.textContent=String(text);return td;}
function v66RenderDetail(){
 const box=v66$('tl66AnalysisSummary'),a=timeline62?.analysis;if(!box||!a)return;
 box.replaceChildren();
 const h=document.createElement('h3');h.textContent='観察できる運動学的特徴';box.append(h);
 const seq=(side)=>a.events.filter(e=>side==='X'||a.rows.find(r=>r.jointId===e.joint_id)?.Y?.peak).map(e=>e.order+'. '+e.joint_name+' ('+Number(e.peak_time).toFixed(3)+'s)').join(' → ')||'代表ピークを検出できません';
 const p=document.createElement('p');p.textContent='A 部位間のピーク順：X '+seq('X')+(a.source_y&&a.compatibility.ok?' ／ Y '+a.rows.filter(r=>r.Y?.peak).map((r,i)=>({name:r.Y.joint.name,t:r.Y.peak.time})).sort((x,y)=>x.t-y.t).map((r,i)=>(i+1)+'. '+r.name+' ('+r.t.toFixed(3)+'s)').join(' → '):'');box.append(p);
 const wrap=document.createElement('div');wrap.className='tableWrap';const table=document.createElement('table'),thead=document.createElement('thead'),hr=document.createElement('tr');
 ['部位','X開始','Xピーク','Y開始','Yピーク','開始差 Y−X','ピーク差 Y−X','ピーク速度比 Y/X','X増速/減速'].forEach(x=>hr.append(v66Cell(true,x)));thead.append(hr);table.append(thead);
 const body=document.createElement('tbody');
 const f=t=>Number.isFinite(t)?Number(t).toFixed(3)+'s':'—',signed=x=>Number.isFinite(x)?(x>=0?'+':'')+(1000*x).toFixed(1)+'ms':'—';
 for(const r of a.rows){const cells=[r.X?.joint.name||r.jointId,f(r.X?.onset?.time),f(r.X?.peak?.time),f(r.Y?.onset?.time),f(r.Y?.peak?.time),signed(r.delta?.onset_time_seconds),signed(r.delta?.peak_time_seconds),r.X?.peak&&r.Y?.peak&&r.X.peak.value>1e-9?(r.Y.peak.value/r.X.peak.value).toFixed(2)+'×':'—'];
  const pat=v66Pattern(r.X,a.config.from,a.config.to);cells.push(pat?Math.round(pat.up)+'% / '+Math.round(pat.down)+'%':'—');const tr=document.createElement('tr');cells.forEach(x=>tr.append(v66Cell(false,x)));body.append(tr);}
 table.append(body);wrap.append(table);box.append(wrap);
 const sub=document.createElement('h4');sub.textContent='C 滑らかさの参考値（正規化ジャーク）';box.append(sub);
 const list=document.createElement('ul');for(const r of a.rows){const x=v66Share(r.X,a.config.from,a.config.to),y=v66Share(r.Y,a.config.from,a.config.to);if(!x&&!y)continue;const li=document.createElement('li');li.textContent=(r.X?.joint.name||r.jointId)+'：X '+(x?x.value.toExponential(2)+'（'+x.samples+'点）':'算出不可')+(y?' ／ Y '+y.value.toExponential(2)+'（'+y.samples+'点）':'');list.append(li);}if(!list.children.length){const li=document.createElement('li');li.textContent='位置系列または移動振幅が不足しているため算出できません。';list.append(li);}box.append(list);
 const note=document.createElement('div');note.className='limitations';
 const items=[
  'A 順序・時刻・ピーク：合成アニメーションの関節位置／姿勢から算出。',
  'B 速度比・増減：同一部位・同一指標・同一単位のX/Yだけを比較。異なる身体部位の値は比べません。',
  'C 滑らかさ：正規化ジャークの探索用参考値。フィルタ条件や動作区間に依存し、熟練度判定には使えません。',
  'D X/Y差：同一骨格・関節ID・名前・座標／時刻仕様を照合できた場合だけ表示。AEGISは対応関節を確認するまでX/Y重ね合わせ対象にしません。',
  '現在のXBot／YBotは埋め込みアニメーションから作った合成データです。実測値、力・トルク、因果関係、技能評価を示すものではありません。'
 ];
 for(const text of items){const li=document.createElement('li');li.textContent=text;note.append(li);}box.append(note);
 if(v66WaveMode==='change'){const control=v66$('tl66WaveMode');if(control)control.value='change';}
}
function v66DrawWave(){
 const a=timeline62?.analysis,container=v66$('tl62Wave');if(!a||!container)return;
 const id=Number(v66$('tl62WaveJoint')?.value)||timeline62.selected?.[0],r=a.rows.find(x=>x.jointId===id)||a.rows[0];if(!r)return;
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 150');svg.setAttribute('role','img');svg.setAttribute('aria-label',v66WaveMode==='speed'?'X/Y速度波形':'X/Y速度変化の波形');
 const start=a.config.alignment==='phase'?0:a.config.from,end=a.config.alignment==='phase'?1:a.config.to;
 const series=[['X',r.X],['Y',r.Y]].filter(x=>x[1]),value=(side,row,i)=>{const v=(v66WaveMode==='speed'?row.speed:row.changes)[i];return v*(side==='Y'&&v66StartSynced()&&a.config.alignment==='raw'?v66Rate()**(v66WaveMode==='speed'?1:2):1);};
 const all=series.flatMap(([side,row])=>row.times.map((_,i)=>value(side,row,i))).filter(Number.isFinite),max=Math.max(1e-8,...all.map(Math.abs));
 const rowForSide=side=>side==='X'?r.X:r.Y;
 const x=(time,side)=>{const axis=side==='Y'&&v66StartSynced()&&a.config.alignment==='raw'?time/v66Rate():a.config.alignment==='phase'?time/(rowForSide(side)?.source?.data?.duration||1):time;return 45+(axis-start)/Math.max(.0001,end-start)*540;};
 const y=v=>v66WaveMode==='speed'?130-112*v/max:75-62*v/max;
 for(let k=0;k<=4;k++){const ax=start+(end-start)*k/4,X=45+k*135;const line=document.createElementNS(ns,'line');line.setAttribute('x1',X);line.setAttribute('x2',X);line.setAttribute('y1',15);line.setAttribute('y2',140);line.setAttribute('stroke','#31516b');svg.append(line);const label=document.createElementNS(ns,'text');label.setAttribute('x',X);label.setAttribute('y',12);label.setAttribute('fill','#abcbd8');label.setAttribute('font-size',9);label.setAttribute('text-anchor','middle');label.textContent=a.config.alignment==='phase'?(ax*100).toFixed(0)+'%':ax.toFixed(2)+'s';svg.append(label);}
 if(v66WaveMode==='change'){const baseline=document.createElementNS(ns,'line');baseline.setAttribute('x1',45);baseline.setAttribute('x2',585);baseline.setAttribute('y1',75);baseline.setAttribute('y2',75);baseline.setAttribute('stroke','#7895a3');baseline.setAttribute('stroke-width',1);svg.append(baseline);}
 for(const [side,row] of series){const d=row.times.map((t,i)=>({t:x(t,side),v:value(side,row,i)})).filter(q=>q.t>=45&&q.t<=585&&Number.isFinite(q.v)).map((q,i)=>(i?'L':'M')+q.t.toFixed(2)+','+y(q.v).toFixed(2)).join(' ');const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',side==='X'?'#55d6be':v66Hex(v64Live.color));path.setAttribute('stroke-width',2);if(side==='Y')path.setAttribute('stroke-dasharray','7 5');svg.append(path);}
 container.replaceChildren(svg);const legend=v66$('tl62WaveLegend');if(legend)legend.textContent=(v66WaveMode==='speed'?'速度（':'速度変化・符号付き（')+(v66WaveMode==='speed'?(r.X?.unit||''):(r.X?.metric==='angular'?'rad/s²':'model_units/s²'))+'。X＝実線、Y＝破線。Y系列との比較が可能なのは互換性確認済みの場合だけです。';
}
function v66ExportComparisonCsv(){
 try{
  const x=tl62Source('X'),y=tl62Source('Y');if(!x||!y||x.avatar==='csv'||y.avatar==='csv')throw Error('XBot／YBotなどの生成モーションを選択してください。読み込みCSVはこの出力では統合できません。');
  if(x.headers.length!==y.headers.length||x.headers.some((h,i)=>h!==y.headers[i]))throw Error('X/Yの元データ列が一致しません。');
  const headers=[...x.headers,'comparison_side'],rows=[...x.rows.map(r=>[...r,'X']),...y.rows.map(r=>[...r,'Y'])];
  const enc=v=>{const s=String(v??'');return '"'+s.replace(/"/g,'""')+'"';};
  const csv=[headers,...rows].map(r=>r.map(enc).join(',')).join('\r\n');
  downloadExperimentFile('xy-motion-source-v66.csv',csv,'text/csv;charset=utf-8');
  if(v66$('tl64Status'))v66$('tl64Status').textContent='元データ統合CSVを出力しました（X/Y区別列付き）。';
 }catch(e){if(v66$('tl64Status'))v66$('tl64Status').textContent='CSV出力できません：'+e.message;}
}
const v66BaseInstall=v64InstallLiveDynamics;
v64InstallLiveDynamics=function(){const result=v66BaseInstall.apply(this,arguments);v66Install();return result;};
window.__TimelineLiveV66={render:v66Render,tick:v66Tick,exportComparison:v66ExportComparisonCsv,smoothness:v66Share,ybotColorRgb:v66YBotColorRgb,getYBotColor:v66YBotColor,mapYTime:v66MapYTime,displayAxis:v66DisplayAxis,differenceRuns:v66DifferenceRuns,playbackRate:v66Rate};
