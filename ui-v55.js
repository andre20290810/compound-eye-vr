// v55 UI organization: keep settings/data IDs intact; collect descriptive notes at page end.
function v55InstallUI(){
 const style=document.createElement('style');style.id='v55UiStyles';style.textContent=`
 #lensEditorDisclosure{display:none!important}
 #viewerUpdatedAt{color:#fff;font-size:11px;line-height:1.5;margin:6px 3px 12px;font-weight:400;text-align:left}
 #supplementDetails{margin:20px 0 12px;padding:12px 16px;border:1px solid #3b5b72;border-radius:12px;color:#bdd0df;font-size:12px;line-height:1.75}
 #supplementDetails>summary{cursor:pointer;font-weight:600;color:#fff;font-size:13px}
 #supplementDetails section{margin:14px 0}#supplementDetails h3{font-size:13px;margin:8px 0;color:#e4f2fa}
 #supplementDetails .sublabel,#supplementDetails .v55Note{display:block;margin:8px 0;position:static;max-width:none;font-size:12px;color:#b8cddd;line-height:1.75}
 body.vr #viewerUpdatedAt,body.vr #supplementDetails{display:none!important}
 `;document.head.append(style);
 document.title='人工複眼シミュレーションシステム';
 const h=document.querySelector('header h1');if(h)h.textContent=document.title;
 const editor=$('lensEditorDisclosure');if(editor){editor.hidden=true;editor.setAttribute('aria-hidden','true');}
 const bottom=document.createElement('details');bottom.id='supplementDetails';
 const summary=document.createElement('summary');summary.textContent='補足・操作ガイド';bottom.append(summary);
 const controls=document.createElement('section'),analysis=document.createElement('section');
 for(const [section,title] of [[controls,'操作・表示について'],[analysis,'計測・データについて']]){const h=document.createElement('h3');h.textContent=title;section.append(h);bottom.append(section);}
 const targets=[...document.querySelectorAll('.sublabel'),...['v54Quality','v54QualityNote','v54LegacyStatus','v47Quality','experimentQuality','experimentQualityWarning','ghostNote','markerMetricSummaryV52'].map(id=>$(id)).filter(Boolean)];
 for(const el of document.querySelectorAll('small,span.label')){
  if(el.closest('#lensEditorDisclosure')||el.querySelector('input,select,button,textarea'))continue;
  if(el.textContent.length>30&&/です|ません|できます|ください|そろえます/.test(el.textContent))targets.push(el);
 }
 const moved=new Set();
 for(const el of targets){
  if(moved.has(el)||bottom.contains(el)||el.closest('#lensEditorDisclosure')||el.querySelector('input,select,button,textarea'))continue;
  if(!el.textContent.trim()&&!el.id)continue;
  const isAnalysis=el.closest('#experimentPanel')||/v47|v54|experiment/i.test(el.id);
  el.classList.add('v55Note');
  if(el.id==='ghostNote')el.style.cssText='display:none';
  const parent=el.parentElement;(isAnalysis?analysis:controls).append(el);moved.add(el);
  if(parent?.classList.contains('group')&&!parent.textContent.trim()&&!parent.querySelector('input,button,select'))parent.style.display='none';
 }
 const legacyFooter=document.querySelector('footer');if(legacyFooter){const note=document.createElement('p');note.className='v55Note';note.textContent=legacyFooter.textContent;controls.append(note);legacyFooter.hidden=true;}
 (document.querySelector('.app')||document.body).append(bottom);
 const auto=$('autoEye10')?.closest('label');if(auto){for(const node of [...auto.childNodes])if(node.nodeType===3)node.textContent=' 10秒ごとに個眼数を自動切替';const note=document.createElement('p');note.className='v55Note';note.textContent='自動切替：双眼表示では1→2→3→4→5→6、通常表示では2→3→4→5→6の順です。個眼数と左右の双眼表示は別の設定です。';controls.append(note);}
}
function v55StereoDefault(){
 const stereo=isStereoVR();
 if(stereo&&!state._v55PreviousStereo){state.fish=true;if($('fish'))$('fish').checked=true;}
 state._v55PreviousStereo=stereo;
}
v55InstallUI();
// Short control captions; qualifications are retained in the supplemental section.
for(const [id,caption] of [['punchGhostToggle',' X Botのパンチ参考残像を重ねる']]){
 const control=$(id),label=control?.closest('label');if(!label)continue;
 const original=label.textContent.trim();
 const note=document.createElement('p');note.className='v55Note';note.textContent=original;$('supplementDetails').append(note);
 for(const node of [...label.childNodes])if(node.nodeType===3)node.textContent=caption;
}
