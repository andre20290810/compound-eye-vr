// v63: a readable sequence + sparse state bands, not dozens of circles.
function tl63Name(j){const labels={RightUpLeg:'右脚',Hips:'骨盤',Spine2:'胸部',Spine1:'体幹',RightShoulder:'右肩',RightArm:'右上腕',RightForeArm:'右前腕',RightHand:'右手',R_UpperLeg:'右脚',Pelvis:'骨盤',Chest:'胸部',R_UpperArm:'右上腕',R_Forearm:'右前腕',R_Hand:'右手'};return labels[j?.name]||j?.name||'部位未選択';}
function tl63StateName(v){return {accelerating:'増速',decelerating:'減速',low:'低活動',stable:'一定',unavailable:'欠損',peak:'ピーク'}[v]||'—';}
function tl63Label(t){return Number.isFinite(t)?t.toFixed(3)+'秒':'検出なし';}
function tl63Ms(t){return Number.isFinite(t)?(t>=0?'+':'')+(t*1000).toFixed(0)+'ms':'—';}
function tl62Draw(){
 const a=timeline62.analysis;if(!a)return;const fmt=x=>Number.isFinite(x)?Number(x).toFixed(3):'—';
 tl62$('tl62Quality').textContent=a.compatibility.ok?'同一骨格・同一関節IDを検証済み／運動特徴のピーク時刻順':a.compatibility.reason;
 const sequence=tl62$('tl62Order');sequence.replaceChildren();
 const intro=document.createElement('div');intro.className='tl63SectionLabel';intro.textContent='① ピークの発生順と隣接時間差（Xの代表ピーク）';sequence.append(intro);
 const chain=document.createElement('div');chain.className='tl63Chain';sequence.append(chain);
 if(!a.events.length){const empty=document.createElement('p');empty.textContent='この区間では代表的なピークが検出されませんでした。区間・閾値を変更してください。';chain.append(empty);}
 for(const e of a.events){const card=document.createElement('button');card.type='button';card.className='tl63Event';card.textContent=e.order+' '+tl63Name({name:e.joint_name})+'  '+tl63Label(e.peak_time);card.title=e.joint_name+' の速度ピークへ移動';card.onclick=()=>tl62Seek(e.peak_time);chain.append(card);
  if(e.next_event_delta_ms!=null){const edge=document.createElement('span');edge.className='tl63Gap';edge.textContent=e.next_event_delta_ms<.5?'＝同時刻':'→ +'+e.next_event_delta_ms.toFixed(0)+'ms';chain.append(edge);}}
 const graphic=tl62$('tl62Graphic');graphic.replaceChildren();const table=document.createElement('div');table.className='tl63Table';graphic.append(table);
 const heading=document.createElement('div');heading.className='tl63Grid tl63Heading';table.append(heading);
 const hName=document.createElement('span');hName.textContent='② 部位';heading.append(hName);
 const ticks=document.createElement('div');ticks.className='tl63Ticks';for(let i=0;i<=5;i++){const el=document.createElement('span');el.textContent=(a.config.from+(a.config.to-a.config.from)*i/5).toFixed(2);ticks.append(el);}heading.append(ticks);
 const hn=document.createElement('span');hn.textContent='ピーク時刻・速度／Yとの差';heading.append(hn);
 const ns='http://www.w3.org/2000/svg';
 const scale=time=>Math.max(0,Math.min(500,(time-a.config.from)/Math.max(.001,a.config.to-a.config.from)*500));
 const makeTrack=(part,side,y,svg)=>{
  if(!part)return;
  const first=part.times.findIndex(t=>t>=a.config.from),last=part.times.findLastIndex(t=>t<=a.config.to);if(first<0||last<first)return;
  const boundaries=[];for(let i=first;i<=last;i++){
   const state=part.states[i]?.state||'unavailable',start=Math.max(a.config.from,i===first?a.config.from:(part.times[i-1]+part.times[i])/2),end=Math.min(a.config.to,i===last?a.config.to:(part.times[i]+part.times[i+1])/2);
   if(boundaries.length&&boundaries.at(-1).state===state){boundaries.at(-1).end=end;}else boundaries.push({state,start,end});
  }
  for(const run of boundaries){const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',scale(run.start));rect.setAttribute('y',y);rect.setAttribute('width',Math.max(.7,scale(run.end)-scale(run.start)));rect.setAttribute('height',8);rect.setAttribute('rx',2);
   rect.setAttribute('fill',side==='X'?(TL62.color[run.state]||'#8e98a2'):'none');rect.setAttribute('stroke',TL62.color[run.state]||'#8e98a2');rect.setAttribute('stroke-width',side==='X'?.3:1.6);rect.setAttribute('opacity',run.state==='low'||run.state==='stable'?.35:.87);
   rect.style.cursor='pointer';rect.title=part.joint.name+' '+side+' '+run.state;rect.onclick=()=>tl62Seek((run.start+run.end)/2,side);svg.append(rect);
  }
  if(part.peak){const x=scale(part.peak.time),cy=y+4,mark=document.createElementNS(ns,'path');mark.setAttribute('d',`M ${x} ${cy-8} l 7 8 -7 8 -7 -8 Z`);mark.setAttribute('fill',side==='X'?TL62.color.peak:'none');mark.setAttribute('stroke',TL62.color.peak);mark.setAttribute('stroke-width','2');mark.style.cursor='pointer';mark.onclick=()=>tl62Seek(part.peak.time,side);const title=document.createElementNS(ns,'title');title.textContent=tl63Name(part.joint)+' '+side+' ピーク '+tl63Label(part.peak.time);mark.append(title);svg.append(mark);}
 };
 for(const row of a.rows){if(!row.X)continue;const line=document.createElement('div');line.className='tl63Grid tl63DataRow';table.append(line);
  const name=document.createElement('div');name.className='tl63Part';name.textContent=(row.order?row.order+'  ':'')+tl63Name(row.X.joint);line.append(name);
  const graph=document.createElementNS(ns,'svg');graph.setAttribute('viewBox','0 0 500 '+(a.source_y&&a.compatibility.ok?38:23));graph.setAttribute('preserveAspectRatio','none');graph.setAttribute('class','tl63Track');graph.setAttribute('role','img');graph.setAttribute('aria-label',tl63Name(row.X.joint)+'の増速・減速とピーク');line.append(graph);
  for(let j=0;j<=5;j++){const x=j*100,r=document.createElementNS(ns,'line');r.setAttribute('x1',x);r.setAttribute('x2',x);r.setAttribute('y1',0);r.setAttribute('y2',a.source_y&&a.compatibility.ok?38:23);r.setAttribute('stroke','#41586a');r.setAttribute('opacity','.45');graph.append(r);}
  makeTrack(row.X,'X',5,graph);if(a.source_y&&a.compatibility.ok)makeTrack(row.Y,'Y',23,graph);
  const readout=document.createElement('div');readout.className='tl63Values';line.append(readout);
  const unit=row.X.unit==='model_units/s'?'MU/s':row.X.unit;const main=document.createElement('div');main.textContent='X '+tl63Label(row.X.peak?.time)+' · '+fmt(row.X.peak?.value)+' '+unit;readout.append(main);
  const sub=document.createElement('div');sub.className='tl63Sub';sub.textContent='次 '+(row.next_event_delta_ms!=null?'+'+row.next_event_delta_ms.toFixed(0)+'ms':'—')+' / 前後 '+(row.X.peak?tl63StateName(row.X.states[Math.max(0,row.X.times.findIndex(t=>t>=row.X.peak.time)-1)]?.state):'—')+' → '+(row.X.peak?tl63StateName(row.X.states[Math.min(row.X.states.length-1,row.X.times.findIndex(t=>t>=row.X.peak.time)+1)]?.state):'—');readout.append(sub);
  if(a.source_y&&a.compatibility.ok){const y=document.createElement('div');y.className='tl63Compare';y.textContent='Y '+tl63Label(row.Y?.peak?.time)+' · Δ '+tl63Ms(row.delta?.peak_time_seconds);readout.append(y);}
 }
 tl62Wave();
}

// Compact, readable layout. No numeric labels overlay the avatar.
(function(){const style=document.createElement('style');style.textContent=`
#tl62Order{display:block;margin:12px 0 15px}#tl62Order .tl63SectionLabel{font-size:13px;font-weight:700;margin-bottom:7px}
#tl62Order .tl63Chain{display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#071f30;border-radius:9px;padding:11px}
#tl62Order .tl63Event{padding:9px 11px;background:#1e455b;color:#f5fbff;border:1px solid #6993a4;border-radius:8px;font-weight:650;font-size:12px;white-space:nowrap}
#tl62Order .tl63Gap{color:#ffe4a1;font-weight:700;font-size:12px;white-space:nowrap}
#tl62Graphic{overflow-x:auto;background:#0b2130;border-radius:9px;padding:9px 11px}
#tl62Graphic .tl63Table{min-width:630px;width:100%;font-size:12px}
#tl62Graphic .tl63Grid{display:grid;grid-template-columns:85px minmax(190px,1fr) 172px;align-items:center;gap:7px}
#tl62Graphic .tl63Heading{margin:0 0 5px;color:#adc9d8;font-size:11px;font-weight:bold}
#tl62Graphic .tl63Ticks{display:flex;justify-content:space-between;padding:0 4px}
#tl62Graphic .tl63DataRow{min-height:57px;border-bottom:1px solid #244657;padding:6px 0}
#tl62Graphic .tl63Part{font-size:11px;color:#edf9fa;font-weight:650;white-space:nowrap}
#tl62Graphic .tl63Track{width:100%;height:42px;overflow:visible}
#tl62Graphic .tl63Values{line-height:1.45;color:#eef6f9;white-space:nowrap;font-size:10px;min-width:0}
#tl62Graphic .tl63Sub{color:#9ebccf;font-size:9px}#tl62Graphic .tl63Compare{font-weight:700;color:#f0e7bf}
#tl62Panel .tl62Notice{font-size:11px;opacity:.85}#tl62Graphic .tl63Heading{font-size:10px}
.v54StateMarker.v63Point{width:11px!important;height:11px!important;min-width:11px!important;min-height:11px!important;padding:0!important;margin:0!important;border-radius:50%!important;font-size:0!important;box-shadow:0 0 0 2px #001b2b,0 0 7px currentColor!important;transform:translate(-50%,-50%)!important;white-space:nowrap!important;overflow:visible!important}
@media(max-width:700px){#tl62Graphic .tl63Table{min-width:630px}#tl62Order .tl63Chain{gap:4px}#tl62Order .tl63Event{font-size:11px;padding:7px}}
`;document.head.append(style);})();
