// v62 multi-joint kinematic timeline. Visible in page flow below viewer (never covers model).
const TL62=window.__Timeline62;
const timeline62={panel:null,analysis:null,selected:[],metrics:{},sourceX:null,sourceY:null,importX:null,importY:null,config:null,lastKey:'',enabled:false,show3d:false,latestModificationReport:[]};
const tl62$=id=>document.getElementById(id);
function tl62SourceFromCSV(csv){
 const parsed=K54.legacyCSV(csv),rows=parsed.records;
 if(!rows.length)throw Error('CSVにデータがありません');
 const required=['data_schema','skeleton_id','joint_id','joint_name_source','coordinate_system','time_axis','linear_speed_unit','angular_speed_unit','original_animation_time_s'];
 for(const key of required)if(!parsed.headers.includes(key))throw Error('required_csv_column_missing:'+key);
 if(!['compound-eye-single-motion-v2','legacy-v1'].includes(rows[0].data_schema))throw Error('unsupported_data_schema');
 const origin=rows[0],id=['skeleton_id','coordinate_system','time_axis','avatar_id','motion_id'];
 if(rows.some(r=>id.some(k=>r[k]!==origin[k])))throw Error('mixed_skeleton_or_coordinate_system');
 if(!['original_animation_seconds','original_animation_time_s'].includes(origin.time_axis))throw Error('timebase_not_supported');
 const grouped=new Map();for(const r of rows){const k=Number(r.joint_id);if(!Number.isInteger(k))throw Error('invalid_joint_id');if(!grouped.has(k))grouped.set(k,[]);grouped.get(k).push(r);}
 const joints=[],byJoint={},num=x=>x===''||x==null?null:Number.isFinite(Number(x))?Number(x):null;
 let times=null;
 for(const [jointId,group] of grouped){
  const names=new Set(group.map(r=>r.joint_name_source));if(names.size!==1)throw Error('inconsistent_joint_name');
  const t=group.map(r=>num(r.original_animation_time_s));
  if(t.some((x,i)=>!Number.isFinite(x)||(i>0&&x<=t[i-1])))throw Error('nonmonotonic_time');
  if(times&&(t.length!==times.length||t.some((x,i)=>x!==times[i])))throw Error('joint_timebase_mismatch');
  times=t;
  if(group.some(r=>r.linear_speed_unit!=='model_units/s'||r.angular_speed_unit!=='rad/s'))throw Error('unit_mismatch');
  const joint={index:jointId,name:group[0].joint_name_source};joints.push(joint);
  byJoint[String(jointId)]=group.map(r=>({time:num(r.original_animation_time_s),linear_speed:num(r.linear_speed_model_units_per_s),angular_speed:num(r.angular_speed_rad_per_s),
   linear_speed_change:num(r.linear_speed_change_rate_model_units_per_s2),angular_speed_change:num(r.angular_speed_change_rate_rad_per_s2)}));
 }
 return {avatar:origin.avatar_id,motion:origin.motion_id,data:{skeletonId:origin.skeleton_id,duration:times.at(-1),joints},byJoint,times,
  asset:{source_asset_sha256:origin.source_asset_sha256||'unrecorded',motion_revision_id:origin.motion_revision_id||'unrecorded'},
  metadata:{coordinateSystem:origin.coordinate_system,data_schema:origin.data_schema,time_axis:origin.time_axis,source_type:'imported_csv'}};
}
function tl62Models(){for(const id of ['tl62X','tl62Y']){const el=tl62$(id),current=el.value;el.replaceChildren();for(const [value,label] of [['xbot','X Bot'],['ybot','Y Bot'],['aegisEmber','AEGIS NAVY'],['aegisSoldier','AEGIS SOLDIER'],['csv','読込CSV']]){const op=document.createElement('option');op.value=value;op.textContent=label;el.append(op);}el.value=current||((id==='tl62X')?'xbot':'ybot');}}
function tl62Motions(id,avatar){const el=tl62$(id),old=el.value;el.replaceChildren();for(const m of avatar==='csv'?['uploaded_csv']:avatar==='xbot'||avatar==='ybot'?['xbot_punch','xbot_punch1','xbot_punch2','xbot_hook']:['armor_breathe','armor_walk','armor_run','armor_power_punch','armor_punch','armor_alternate_punch']){const o=document.createElement('option');o.value=m;o.textContent=MOTION_NAMES[m]||m;el.append(o);}el.value=[...el.options].some(x=>x.value===old)?old:el.options[0]?.value;}
function tl62Source(side){const avatar=tl62$('tl62'+side).value,motion=tl62$('tl62Motion'+side).value;if(avatar==='csv')return timeline62['import'+side];return v54ExportData(avatar,motion);}
function tl62Preferred(joints){
 const order=['RightUpLeg','R_UpperLeg','Hips','Pelvis','Spine2','Chest','RightShoulder','R_UpperArm','RightArm','RightForeArm','R_Forearm','RightHand','R_Hand'];
 const selected=[];for(const name of order){const j=joints.find(x=>x.name===name);if(j&&!selected.includes(j.index))selected.push(j.index);}
 return selected.length?selected: joints.slice(0,7).map(j=>j.index);
}
function tl62JointUI(){
 const source=timeline62.sourceX;if(!source)return;const parent=tl62$('tl62Joints');parent.replaceChildren();
 for(const j of source.data.joints){
  const label=document.createElement('label');label.className='tl62Joint';const check=document.createElement('input');check.type='checkbox';check.checked=timeline62.selected.includes(j.index);check.onchange=()=>{timeline62.selected=check.checked?[...timeline62.selected,j.index]:timeline62.selected.filter(x=>x!==j.index);tl62Analyze(false);};
  const name=document.createElement('span');name.textContent=(typeof v48JointLabel==='function'?v48JointLabel(j):j.name)+' ('+j.name+' #'+j.index+')';const m=document.createElement('select');
  for(const [value,text] of [['linear','移動速度'],['angular','角速度']]){const op=document.createElement('option');op.value=value;op.textContent=text;m.append(op);}
  m.value=timeline62.metrics[j.index]||'linear';m.onchange=()=>{timeline62.metrics[j.index]=m.value;tl62Analyze(false);};label.append(check,name,m);parent.append(label);
 }
}
function tl62Compute(){
 const x=tl62Source('X'),y=tl62$('tl62Compare').checked?tl62Source('Y'):null;
 if(!x)throw Error('XのCSVを読み込んでください');
 timeline62.sourceX=x;timeline62.sourceY=y;
 const key=x.data.skeletonId+'|'+x.data.joints.map(j=>j.index).join(',');
 if(timeline62.lastKey!==key){timeline62.selected=tl62Preferred(x.data.joints);timeline62.metrics={};timeline62.lastKey=key;tl62JointUI();}
 const config={from:Math.max(0,Number(tl62$('tl62From').value)||0),to:Number(tl62$('tl62To').value)||Math.min(.7,x.data.duration),
  change:Math.max(0,Number(tl62$('tl62Change').value)||.12),onset:Math.max(0,Number(tl62$('tl62Onset').value)||.15),
  hold:Math.max(2,Math.round(Number(tl62$('tl62Hold').value)||3)),prominence:Math.max(.05,Math.min(.9,Number(tl62$('tl62Prom').value)||.15)),
  alignment:tl62$('tl62Alignment').value};
 config.to=Math.min(x.data.duration,Math.max(config.from+.002,config.to));timeline62.config=config;
 timeline62.analysis=TL62.analyze(x,y,timeline62.selected,timeline62.metrics,config);
 return timeline62.analysis;
}
function tl62Draw(){
 const a=timeline62.analysis;if(!a)return;
 const msg=tl62$('tl62Quality');msg.textContent=a.compatibility.ok?'比較品質：'+a.compatibility.quality+' ／ ピーク順序は時刻順（因果・力の順序ではありません）':a.compatibility.reason;
 const width=540,from=a.config.from,to=a.config.to;
 const fmt=x=>x==null?'—':Number(x).toFixed(3),svgNS='http://www.w3.org/2000/svg',svg=document.createElementNS(svgNS,'svg');
 const rowH= a.source_y?62:36,svgHeight=28+Math.max(1,a.rows.length)*rowH;
 svg.setAttribute('viewBox','0 0 890 '+svgHeight);svg.setAttribute('role','img');svg.setAttribute('aria-label','身体部位ごとの運動学的速度変化と局所ピーク');svg.style.width='100%';svg.style.minWidth='700px';
 const node=(tag,attrs,text)=>{const el=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));if(text!==undefined)el.textContent=text;svg.append(el);return el;};
 const x=t=>190+Math.max(0,Math.min(1,(t-from)/Math.max(.001,to-from)))*390;
 node('text',{x:196,y:13,fill:'#bfe2f1','font-size':12},'元アニメーション時刻（秒）');
 for(let k=0;k<=5;k++){const t=from+(to-from)*k/5;node('line',{x1:x(t),x2:x(t),y1:22,y2:svgHeight,stroke:'#31516b','stroke-width':.7});node('text',{x:x(t)-10,y:27,fill:'#b2d7e5','font-size':10},t.toFixed(2));}
 a.rows.forEach((r,i)=>{
  const y=45+i*rowH;
  node('text',{x:5,y:y+6,fill:'#e0edf4','font-size':12},(r.order?r.order+' ':'')+(r.X?.joint.name||'#'+r.jointId));
  const render=(part,side,offset)=>{
   if(!part)return;
   const cy=y+offset;node('text',{x:150,y:cy+4,fill:'#d2e9f1','font-size':11},side);
   const count=Math.max(1,Math.ceil(part.times.length/55));
   for(let j=0;j<part.times.length;j+=count){const t=part.times[j];if(t<from||t>to)continue;const status=TL62.at(part,t,a.config);
    const circle=node('circle',{cx:x(t),cy,r:status.radius,fill:side==='X'?status.color:'none',stroke:status.color,'stroke-width':side==='X'?.9:2.1,'data-joint-id':r.jointId,'data-time':t});
    circle.style.cursor='pointer';circle.addEventListener('click',()=>tl62Seek(t,side));
    const title=document.createElementNS(svgNS,'title');title.textContent=part.joint.name+' '+side+' '+t.toFixed(3)+'秒 '+status.state+' '+part.unit;circle.append(title);
   }
   if(part.peak){const t=part.peak.time;if(t>=from&&t<=to){const k=node('circle',{cx:x(t),cy,r:6,fill:side==='X'?TL62.color.peak:'none',stroke:TL62.color.peak,'stroke-width':2.5});k.style.cursor='pointer';k.onclick=()=>tl62Seek(t,side);}}
  };
  render(r.X,'X',0);if(a.source_y&&a.compatibility.ok)render(r.Y,'Y',20);
  const p=r.X?.peak,delta=r.delta?.peak_time_seconds,num=p?fmt(p.time)+'s / '+fmt(p.value)+' '+r.X.unit:'ピークなし';
  node('text',{x:596,y:y+5,fill:'#edf6fa','font-size':11},num);
  node('text',{x:596,y:y+19,fill:'#bedbe8','font-size':10},'前後: '+(r.X?.states?.[Math.max(0,r.X.times.findIndex(t=>t>=p?.time)-1)]?.state||'—')+' → '+(r.X?.states?.[Math.min(r.X.states.length-1,r.X.times.findIndex(t=>t>=p?.time)+1)]?.state||'—')+' / 次 '+(r.next_event_delta_ms==null?'—':r.next_event_delta_ms+'ms'));
  if(a.source_y&&a.compatibility.ok){
   node('text',{x:596,y:y+36,fill:'#d3d8ef','font-size':10},'Y peak '+fmt(r.Y?.peak?.time)+'s  Δ '+(delta===null||delta===undefined?'—':(1000*delta).toFixed(1)+'ms')+' / 開始Δ '+(r.delta?.onset_time_seconds==null?'—':(1000*r.delta.onset_time_seconds).toFixed(1)+'ms'));
   node('text',{x:596,y:y+51,fill:'#d3d8ef','font-size':10},'ピーク値Δ '+fmt(r.delta?.peak_value_same_unit)+' '+(r.X?.unit||'')+' / 局面Δ '+fmt(r.delta?.phase_peak_position_pp)+'% / Y次 '+(r.next_y_delta_ms==null?'—':r.next_y_delta_ms.toFixed(1)+'ms'));
  }
 });
 const target=tl62$('tl62Graphic');target.replaceChildren(svg);
 tl62$('tl62Order').replaceChildren(...a.events.map(e=>{const b=document.createElement('button');b.type='button';b.textContent=e.order+' '+e.joint_name+' '+fmt(e.peak_time)+'秒'+(e.next_event_delta_ms==null?'':' → +'+e.next_event_delta_ms+'ms');b.onclick=()=>tl62Seek(e.peak_time);return b;}));
 tl62Wave();
}
function tl62Wave(){
 const a=timeline62.analysis;if(!a)return;const selected=Number(tl62$('tl62WaveJoint').value)||timeline62.selected[0],r=a.rows.find(r=>r.jointId===selected)||a.rows[0];if(!r)return;
 const mode=tl62$('tl62Alignment').value,container=tl62$('tl62Wave');container.replaceChildren();
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 105');svg.style.width='100%';
 const sharedMax=Math.max(.00001,...[r.X,r.Y].filter(Boolean).flatMap(row=>row.speed.filter(x=>Number.isFinite(x))));
 for(const [side,row] of [['X',r.X],['Y',r.Y]]){if(!row)continue;
  const poly=document.createElementNS(ns,'path');poly.setAttribute('d',TL62.wave(row,520,a.config,mode,sharedMax));poly.setAttribute('fill','none');poly.setAttribute('stroke','#d3edf8');poly.setAttribute('stroke-width',2.3);if(side==='Y')poly.setAttribute('stroke-dasharray','7 5');svg.append(poly);
  if(row.peak){const event=row.peak,ratio=mode==='phase'?event.time/row.source.data.duration:(event.time-a.config.from)/Math.max(.001,a.config.to-a.config.from);
   const cx=45+ratio*520,cy=75-60*event.value/sharedMax;const marker=document.createElementNS(ns,'circle');
   marker.setAttribute('cx',cx);marker.setAttribute('cy',cy);marker.setAttribute('r',5);marker.setAttribute('stroke',TL62.color.peak);marker.setAttribute('stroke-width',2);
   marker.setAttribute('fill',side==='X'?TL62.color.peak:'none');marker.style.cursor='pointer';marker.onclick=()=>tl62Seek(event.time,side);svg.append(marker);
  }
 }
 container.append(svg);tl62$('tl62WaveLegend').textContent='X：実線　Y：破線（色は状態を表すため、系列の区別は線種で表示） / '+(mode==='raw'?'元時刻':'局面0〜100％');
}
function tl62Seek(time,side='X'){if(!Number.isFinite(time))return;const a=timeline62.analysis;if(!a)return;const target=side==='Y'&&a.compatibility.ok&&a.source_y?a.source_y:a.source_x,model=target.avatar,motion=target.motion;if(model!=='csv'){if(state.model!==model)changeModel(model);if(state.motion!==motion)setMotion(motion);v54Seek(time);}else{timeline62.importCursor=time;}tl62$('tl62Cursor').textContent='再生位置：'+time.toFixed(3)+'秒';}
function tl62Analyze(reload=true){try{
 const a=tl62Compute();if(!timeline62.latestModificationReport.length){try{timeline62.latestModificationReport=v62RecalculateModifications();}catch(e){console.warn('YBot peak report not yet available',e.message);}}tl62$('tl62WaveJoint').replaceChildren(...a.rows.map(r=>{const o=document.createElement('option');o.value=r.jointId;o.textContent=r.X?.joint.name||r.jointId;return o;}));tl62Draw();timeline62.enabled=true;
 }catch(e){tl62$('tl62Quality').textContent='解析不可：'+e.message;timeline62.analysis=null;}}
function tl62Export(type){const a=timeline62.analysis;if(!a)return;const rows=TL62.records(a),analysis={schema:'compound-eye-kinematic-chain-v62',source_x:a.source_x,source_y:a.source_y,analysis_settings:a.config,events:rows,peak_order:a.events,ybot_modifications:timeline62.latestModificationReport,limitations:a.restrictions};
 if(type==='json')return downloadExperimentFile('kinematic-chain-v62.json',JSON.stringify(analysis,null,2),'application/json;charset=utf-8');
 const keys=Object.keys(rows[0]||{}),enc=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v??'').replace(/"/g,'""')+'"';
 downloadExperimentFile('kinematic-chain-v62.csv',[keys.map(enc).join(','),...rows.map(r=>keys.map(k=>enc(r[k])).join(','))].join('\r\n'),'text/csv;charset=utf-8');
}
function tl62Init(){
 const style=document.createElement('style');style.textContent=`
 #tl62Panel{margin:12px 0;background:#10293e;border:1px solid #45718b;border-radius:13px;color:#edf9ff;padding:12px;max-width:100%;box-sizing:border-box}#tl62Panel summary{cursor:pointer;font-weight:700;font-size:15px}
 #tl62Panel .tl62Tools{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:9px 0}#tl62Panel label{font-size:12px}#tl62Panel select,#tl62Panel input{background:#19364b;color:#f0f8fa;border:1px solid #527990;border-radius:5px;padding:5px;max-width:100%}
 #tl62Panel input[type=number]{width:75px}#tl62Joints{display:grid;grid-template-columns:repeat(auto-fit,minmax(195px,1fr));gap:5px;max-height:155px;overflow:auto}
 .tl62Joint{display:flex;align-items:center;gap:5px;padding:3px;border-bottom:1px solid #31546c}.tl62Joint select{max-width:85px}.tl62Joint span{flex:1}
 #tl62Graphic{overflow-x:auto;background:#071d2d;border-radius:9px}#tl62Order{display:flex;gap:5px;flex-wrap:wrap}#tl62Panel button{padding:6px;font-size:12px}
 #tl62Panel .tl62Notice{font-size:12px;line-height:1.6;border-top:1px solid #42657c;margin-top:8px;padding-top:9px;color:#cce6f1}
 @media(max-width:650px){#tl62Panel{padding:9px}#tl62Joints{grid-template-columns:1fr}#tl62Panel .tl62Tools{gap:5px}}
 `;document.head.append(style);
 const panel=document.createElement('details');panel.id='tl62Panel';panel.innerHTML=`
 <summary>運動連鎖タイムライン — 複数部位の増速・減速・ピークを時刻比較</summary>
 <div class="tl62Tools"><label>X：<select id="tl62X"></select></label><label>動作：<select id="tl62MotionX"></select></label><label><input id="tl62Compare" type="checkbox" checked> X／Y比較</label><label><input id="tl62Sync3D" type="checkbox"> 3D位置に小さな点を表示（任意）</label>
 <label>Y：<select id="tl62Y"></select></label><label>動作：<select id="tl62MotionY"></select></label><button id="tl62Run">解析・再計算</button></div>
 <details><summary>対象部位（追加・削除・単位）</summary><div id="tl62Joints"></div></details>
 <div class="tl62Tools"><label>開始<input type="number" id="tl62From" value="0" step=".01" min="0"></label><label>終了<input type="number" id="tl62To" value=".7" step=".01" min=".01"></label>
 <label>速度変化閾値<input type="number" id="tl62Change" value=".12" min="0" step=".01"></label><label>開始閾値<input type="number" id="tl62Onset" value=".15" min="0" step=".01"></label>
 <label>持続<input type="number" id="tl62Hold" value="3" min="2" max="10"></label><label>ピーク割合<input type="number" id="tl62Prom" value=".15" step=".01" min=".05" max=".9"></label>
 <label>波形位置<select id="tl62Alignment"><option value="raw">元時刻</option><option value="phase">局面0〜100％</option></select></label></div>
 <div id="tl62Quality" role="status"></div><div id="tl62Graphic"></div><div id="tl62Cursor">再生位置：0.000秒</div>
 <strong>代表ピーク時刻順・隣接差</strong><div id="tl62Order"></div>
 <details><summary>選択部位のX／Y速度波形</summary><select id="tl62WaveJoint"></select><div id="tl62Wave"></div><div id="tl62WaveLegend"></div></details>
 <div class="tl62Tools"><button id="tl62JSON">イベントJSON出力</button><button id="tl62CSV">イベントCSV出力</button><button id="tl62ModRecalc">YBot指定量と再計算結果</button></div>
 <details><summary>YBot動作差分JSON（パンチA〜D）</summary><p>変更する関節ID・時間差・回転量・速度波形等をJSONで指定します。変更後の値は運動学を再計算して確認してください。</p>
 <textarea id="tl62YBotJSON" rows="9" style="width:100%;box-sizing:border-box;background:#0a1e2d;color:#effafa"></textarea><button id="tl62YBotApply">JSONを検証して適用</button><button id="tl62YBotExport">変更JSON出力</button><pre id="tl62YBotReport" style="white-space:pre-wrap;font-size:11px"></pre></details>
 <details><summary>実測CSV X／Y（実験前の互換性検査）</summary><label>X CSV<input id="tl62CSVX" type="file" accept=".csv,text/csv"></label><label>Y CSV<input id="tl62CSVY" type="file" accept=".csv,text/csv"></label><p>同一骨格・関節ID・座標系・時刻軸・単位を検証します。対応が未検証なら比較不可。</p></details>
 <p class="tl62Notice">表示される順序・増速・減速・ピークは、位置・姿勢から計算した運動学的特徴です。力・関節トルク・エネルギー伝達・技能の優劣を示すものではありません。区間バーは増速・減速状態、黄色の菱形は代表ピークです。元の相対変化率は解析データに保存されます。異なる部位や異なる単位間の力の大小は比較できません。X＝塗りつぶしバー、Y＝輪郭バー。緑 増速／橙 減速／黄 ピーク／灰 低活動。MU/s＝モデル単位/秒、rad/s＝角速度。</p>`;
 const anchor=tl62$('viewerUpdatedAt')||tl62$('screen');anchor.insertAdjacentElement('afterend',panel);timeline62.panel=panel;timeline62.show3d=false;
 panel.querySelector('strong')?.remove();tl62$('tl62Graphic').before(tl62$('tl62Order'));
 tl62Models();tl62Motions('tl62MotionX','xbot');tl62Motions('tl62MotionY','ybot');
 for(const side of ['X','Y'])tl62$('tl62'+side).onchange=()=>{tl62Motions('tl62Motion'+side,tl62$('tl62'+side).value);timeline62.lastKey='';tl62Analyze();};
 tl62$('tl62Sync3D').onchange=()=>{timeline62.show3d=tl62$('tl62Sync3D').checked;v54.visualOverlay?.replaceChildren();v54.markerNodes.clear();};
 tl62$('tl62Run').onclick=()=>{timeline62.lastKey='';tl62Analyze();};
 tl62$('tl62Alignment').onchange=tl62Wave;tl62$('tl62WaveJoint').onchange=tl62Wave;
 tl62$('tl62JSON').onclick=()=>tl62Export('json');tl62$('tl62CSV').onclick=()=>tl62Export('csv');
 tl62$('tl62YBotJSON').value=JSON.stringify(v62YConfig,null,2);
 tl62$('tl62YBotApply').onclick=()=>{try{const config=v62SetYConfig(JSON.parse(tl62$('tl62YBotJSON').value));timeline62.latestModificationReport=v62RecalculateModifications();tl62$('tl62YBotReport').textContent=JSON.stringify(timeline62.latestModificationReport,null,2);tl62Analyze();}catch(e){tl62$('tl62YBotReport').textContent='適用不可：'+e.message;}};
 tl62$('tl62YBotExport').onclick=()=>downloadExperimentFile('ybot-modifications.json',JSON.stringify(v62YConfig,null,2),'application/json;charset=utf-8');
 tl62$('tl62ModRecalc').onclick=()=>{try{timeline62.latestModificationReport=v62RecalculateModifications();tl62$('tl62YBotReport').textContent=JSON.stringify(timeline62.latestModificationReport,null,2);tl62$('tl62YBotReport').scrollIntoView({block:'nearest'});}catch(e){tl62$('tl62Quality').textContent='再計算失敗：'+e.message;}};
 for(const side of ['X','Y'])tl62$('tl62CSV'+side).onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>4e6)throw Error('CSV exceeds 4MB');timeline62['import'+side]=tl62SourceFromCSV(await file.text());tl62$('tl62'+side).value='csv';tl62Motions('tl62Motion'+side,'csv');timeline62.lastKey='';tl62Analyze();}catch(err){tl62$('tl62Quality').textContent='CSV読込不可：'+err.message;}};
 panel.addEventListener('toggle',()=>{if(panel.open){timeline62.enabled=true;tl62Analyze();}else timeline62.enabled=false;});
 window.__TimelineUI62={active:()=>timeline62.enabled&&timeline62.show3d&&!!timeline62.analysis,current:()=>timeline62.analysis,at:TL62.at,seek:tl62Seek,refresh:tl62Analyze,loadCSV:tl62SourceFromCSV,source:timeline62};
}
