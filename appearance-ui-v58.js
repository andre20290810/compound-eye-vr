// v58 appearance editor: local preview is explicitly separate from public repository defaults.
const A58=window.__Appearance58,V58_APPEARANCE_KEY='compoundeye.v58.appearance';
let v58Published=A58.clone(A58.defaults),v58Appearance=A58.clone(A58.defaults),v58AppearanceSource='公開既定',v58PaletteVersion=0,v58AppearanceCache=new Map(),v58EditBefore=null;
function v58Invalidate(){v58PaletteVersion++;v58AppearanceCache.clear();}
async function v58LoadAppearance(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
 try{const response=await fetch('public-appearance.json',{cache:'no-store',signal:controller.signal});if(response.ok)v58Published=A58.validate(await response.json());}catch(e){console.warn('Appearance: using embedded defaults',e.message);}finally{clearTimeout(timer);}
 v58Appearance=A58.clone(v58Published);
 try{const saved=JSON.parse(localStorage.getItem(V58_APPEARANCE_KEY)||'null');if(saved?.base_revision===v58Published.revision){v58Appearance=A58.validate(saved.preset);v58AppearanceSource='この端末の保存設定';}}catch(e){console.warn('Invalid saved appearance ignored',e.message);}
 v58Invalidate();
}
function v58StyleFor(mesh,avatar){
 const key=avatar+'|'+mesh.materialName;let style=v58AppearanceCache.get(key);
 if(!style){style=A58.uniformSpec(v58Appearance,avatar,mesh.materialName);v58AppearanceCache.set(key,style);}return style;
}
function v58ApplyUniforms(mesh,avatar,ghost=false){
 const s=v58StyleFor(mesh,avatar);gl.uniform1f(shaderProg.uAppearanceMode,ghost?0:s.mode);gl.uniform1f(shaderProg.uAppearanceBrightness,ghost?1:s.brightness);gl.uniform1f(shaderProg.uAppearanceUnlit,s.unlit);gl.uniform3fv(shaderProg.uAppearanceA,s.a);gl.uniform3fv(shaderProg.uAppearanceB,s.b);gl.uniform1f(shaderProg.uAppearanceAxis,s.axis);gl.uniform2fv(shaderProg.uAppearanceRange,s.range);
}
function v58AppearanceNotice(text){const el=$('appearanceStatus58');if(el)el.textContent=text;}
function v58Selected(){const model=$('appearanceModel58').value,group=$('appearanceGroup58').value;return {model,group,spec:v58Appearance.models[model][group]};}
function v58SyncAppearanceControls(){
 const {model,group,spec}=v58Selected();$('appearanceMode58').value=spec.mode;$('appearanceColorA58').value=spec.colorA;$('appearanceColorB58').value=spec.colorB;$('appearanceAxis58').value=spec.axis;$('appearanceBrightness58').value=Math.round(spec.brightness*100);$('appearanceBrightnessValue58').textContent=Math.round(spec.brightness*100)+'%';
 const protectedHeat=model==='aegisSoldier'&&group==='heat';$('appearanceHeatGuard58').hidden=!protectedHeat;
 const locked=protectedHeat&&!$('appearanceUnlockHeat58').checked;
 for(const id of ['appearanceMode58','appearanceColorA58','appearanceColorB58','appearanceAxis58','appearanceBrightness58'])$(id).disabled=locked;
 $('appearanceColorBWrap58').hidden=spec.mode!=='gradient';$('appearanceAxisWrap58').hidden=spec.mode!=='gradient';
 $('appearanceColorAText58').textContent=spec.mode==='original'?'変更色':'色1';
 v58AppearanceNotice(v58AppearanceSource+(locked?' ／ 発光色は保護中':''));
}
function v58EditAppearance(event){
 const {model,group}=v58Selected();if(model==='aegisSoldier'&&group==='heat'&&!$('appearanceUnlockHeat58').checked)return;
 const draft=A58.clone(v58Appearance),spec=draft.models[model][group];spec.mode=$('appearanceMode58').value;
 if(event?.target?.id==='appearanceColorA58'&&spec.mode==='original')spec.mode='solid';
 spec.colorA=$('appearanceColorA58').value;spec.colorB=$('appearanceColorB58').value;spec.axis=$('appearanceAxis58').value;spec.brightness=Number($('appearanceBrightness58').value)/100;
 try{v58Appearance=A58.validate(draft);v58AppearanceSource='プレビュー（未保存・未公開）';v58Invalidate();v58SyncAppearanceControls();}catch(e){v58AppearanceNotice(e.message);}
}
async function v58OpenAppearance(){
 try{
  if(!A58.models.includes(state.model)){await unpackAsset('aegisEmber');changeModel('aegisEmber');}
  v58EditBefore={preset:A58.clone(v58Appearance),source:v58AppearanceSource};
  $('appearanceModel58').value=state.model;$('appearancePanel58').hidden=false;$('appearanceUnlockHeat58').checked=false;v58SyncAppearanceControls();$('appearanceClose58').focus({preventScroll:true});
  if(matchMedia('(max-width:700px)').matches)$('screen').scrollIntoView({block:'start',behavior:'auto'});
 }catch(e){toast('配色を開けません：'+e.message);}
}
function v58CloseAppearance(cancel=false){if(cancel&&v58EditBefore){v58Appearance=A58.clone(v58EditBefore.preset);v58AppearanceSource=v58EditBefore.source;v58Invalidate();}v58EditBefore=null;$('appearancePanel58').hidden=true;$('appearanceOpen58').focus({preventScroll:true});}
function v58ExportAppearance(){const data=A58.validate(v58Appearance);data.revision='appearance-'+new Date().toISOString();return data;}
function v58DownloadAppearance(){downloadExperimentFile('public-appearance.json',JSON.stringify(v58ExportAppearance(),null,2)+'\n','application/json;charset=utf-8');v58AppearanceNotice('公開用JSONを出力しました（まだ公開されていません）');}
function v58SaveLocalAppearance(){try{localStorage.setItem(V58_APPEARANCE_KEY,JSON.stringify({base_revision:v58Published.revision,preset:A58.validate(v58Appearance)}));v58AppearanceSource='この端末の保存設定';v58EditBefore={preset:A58.clone(v58Appearance),source:v58AppearanceSource};v58AppearanceNotice('この端末に保存しました（公開版は変更していません）');}catch(e){v58AppearanceNotice('端末への保存に失敗：'+e.message);}}
function v58ResetPublished(){v58Appearance=A58.clone(v58Published);v58AppearanceSource='公開既定';v58Invalidate();try{localStorage.removeItem(V58_APPEARANCE_KEY);}catch(e){}v58SyncAppearanceControls();}
function v58InitAppearanceUI(){
 const css=document.createElement('style');css.textContent=`
 #appearancePanel58[hidden],#appearancePanel58 [hidden]{display:none!important}#appearancePanel58{position:fixed;z-index:1500;right:16px;top:80px;width:min(360px,calc(100vw - 24px));max-height:calc(100dvh - 100px);overflow:auto;background:#112a3b;border:1px solid #6d9bad;border-radius:14px;padding:14px;color:#eef8fc;box-shadow:0 10px 40px #0008;font-size:13px;overscroll-behavior:contain}
 #appearancePanel58 .apHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;position:sticky;top:-14px;background:#112a3b;padding:7px 0;z-index:1}#appearancePanel58 .apGrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}#appearancePanel58 label{display:flex;flex-direction:column;gap:5px;min-width:0}#appearancePanel58 select{width:100%;min-width:0;padding:7px;font-size:13px}#appearancePanel58 input[type=color]{width:100%;height:36px;min-width:0;padding:2px;background:#1e3c50;border:1px solid #64889b;border-radius:7px}#appearancePanel58 input[type=range]{width:100%;min-width:0}#appearancePanel58 .apFull{grid-column:1/-1}#appearancePanel58 .apActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}#appearancePanel58 button{padding:7px 10px;font-size:12px}#appearancePanel58 button:disabled,#appearancePanel58 input:disabled,#appearancePanel58 select:disabled{opacity:.5}#appearanceStatus58{font-size:11px;line-height:1.5;min-height:1.5em;margin-top:9px;color:#c2e1ed}#appearanceHeatGuard58{margin:7px 0}#appearanceHeatGuard58 label{display:block}body.vr #appearancePanel58{display:none!important}
 @media(max-width:700px){#appearancePanel58{right:6px;left:6px;top:auto;bottom:max(5px,env(safe-area-inset-bottom));width:auto;max-height:45dvh;padding:11px}#appearancePanel58 .apHead{top:-11px}#appearancePanel58 .apGrid{gap:7px}}
 `;document.head.append(css);
 const button=document.createElement('button');button.type='button';button.id='appearanceOpen58';button.textContent='配色';button.onclick=v58OpenAppearance;
 const header=document.querySelector('header');const reference=[...header.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith('判定'));(reference?.parentElement||header).append(button);
 const panel=document.createElement('section');panel.id='appearancePanel58';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','AEGIS 配色編集');panel.setAttribute('aria-modal','false');
 panel.innerHTML=`<div class="apHead"><strong>AEGIS 配色</strong><button type="button" id="appearanceClose58" aria-label="配色ウィンドウを閉じる">閉じる</button></div><div class="apGrid">
 <label>モデル<select id="appearanceModel58"><option value="aegisEmber">AEGIS NAVY</option><option value="aegisSoldier">AEGIS SOLDIER</option></select></label><label>変更する部位<select id="appearanceGroup58"></select></label>
 <label class="apFull">色の方式<select id="appearanceMode58"><option value="original">元の材質・配色を維持</option><option value="solid">単色</option><option value="gradient">2色グラデーション</option></select></label>
 <label><span id="appearanceColorAText58">色1</span><input id="appearanceColorA58" type="color" aria-label="色1"></label><label id="appearanceColorBWrap58"><span>色2</span><input id="appearanceColorB58" type="color" aria-label="色2"></label>
 <label id="appearanceAxisWrap58">グラデーション方向<select id="appearanceAxis58"><option value="y">下 → 上</option><option value="z">後 → 前</option><option value="x">左 → 右（モデル座標）</option></select></label>
 <label class="apFull">明るさ <output id="appearanceBrightnessValue58">100%</output><input id="appearanceBrightness58" type="range" min="25" max="200" step="1" aria-label="明るさ"></label></div>
 <div id="appearanceHeatGuard58" hidden><label><input type="checkbox" id="appearanceUnlockHeat58"> SOLDIERの赤・黄色も変更する</label></div>
 <div class="apActions"><button type="button" id="appearanceSave58">この端末に保存</button><button type="button" id="appearanceCancel58">編集前へ戻す</button><button type="button" id="appearanceReset58">公開設定に戻す</button></div>
 <div class="apActions"><button type="button" id="appearanceExport58">公開用JSONを出力</button><button type="button" id="appearanceGitHub58">コピーしてGitHub編集</button><button type="button" id="appearanceImport58">JSONを読込</button><input type="file" id="appearanceFile58" accept="application/json,.json" hidden></div><div id="appearanceStatus58" role="status" aria-live="polite"></div>`;
 document.body.append(panel);for(const [id,label] of Object.entries(A58.labels)){const option=document.createElement('option');option.value=id;option.textContent=label;$('appearanceGroup58').append(option);}
 $('appearanceClose58').onclick=()=>v58CloseAppearance();$('appearanceCancel58').onclick=()=>v58CloseAppearance(true);$('appearanceSave58').onclick=v58SaveLocalAppearance;$('appearanceReset58').onclick=v58ResetPublished;$('appearanceExport58').onclick=v58DownloadAppearance;
 $('appearanceModel58').onchange=()=>{changeModel($('appearanceModel58').value);$('appearanceUnlockHeat58').checked=false;v58SyncAppearanceControls();};$('appearanceGroup58').onchange=()=>{$('appearanceUnlockHeat58').checked=false;v58SyncAppearanceControls();};$('appearanceUnlockHeat58').onchange=v58SyncAppearanceControls;
 for(const id of ['appearanceMode58','appearanceColorA58','appearanceColorB58','appearanceAxis58','appearanceBrightness58'])$(id).addEventListener('input',v58EditAppearance);
 $('appearanceImport58').onclick=()=>$('appearanceFile58').click();$('appearanceFile58').onchange=async event=>{try{const file=event.target.files[0];if(!file)return;if(file.size>65536)throw Error('JSONは64KB以内にしてください');v58Appearance=A58.validate(JSON.parse(await file.text()));v58AppearanceSource='読み込んだ設定（未保存・未公開）';v58Invalidate();v58SyncAppearanceControls();}catch(e){v58AppearanceNotice('読込失敗：'+e.message);}finally{event.target.value='';}};
 $('appearanceGitHub58').onclick=async()=>{const text=JSON.stringify(v58ExportAppearance(),null,2)+'\n';window.open('https://github.com/andre20290810/compound-eye-vr/edit/main/public-appearance.json','_blank','noopener,noreferrer');try{await navigator.clipboard.writeText(text);v58AppearanceNotice('JSONをコピーしました。GitHub側で貼り付け・コミットすると公開設定になります。');}catch(e){v58DownloadAppearance();v58AppearanceNotice('コピー不可のためJSONを保存しました。GitHub側で内容を貼り付けてコミットしてください。');}};
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();v58CloseAppearance(true);}});
 const notes=document.createElement('div');notes.innerHTML='<h3>配色の保存と公開</h3><p>「この端末に保存」はこのブラウザだけの設定です。「公開用JSONを出力」で public-appearance.json を保存できます。「コピーしてGitHub編集」はGitHubの編集画面を開きます。GitHubにログインし、内容をコピーしたJSONへ置き換えてコミットすると、Pages更新後の訪問者の既定配色になります。認証情報をこのサイトに入力する必要はありません。公開設定のrevisionが更新されると、古い端末保存設定より新しい公開設定を優先します。</p><p>JSONの読込・出力だけではGitHubへ書き込みません。SOLDIERの赤〜黄は初期状態で保持し、変更する場合のみ保護を解除します。配色や装飾は関節の解析・運動量スコアとは別です。</p>';
 ($('supplementDetails')||document.querySelector('footer')||document.body).append(notes);
 window.__AppearanceRuntime58={open:v58OpenAppearance,close:v58CloseAppearance,reset:v58ResetPublished,exportPreset:v58ExportAppearance,getPublished:()=>A58.clone(v58Published),getWorking:()=>A58.clone(v58Appearance),style:(model,material)=>A58.uniformSpec(v58Appearance,model,material),apply:input=>{v58Appearance=A58.validate(input);v58AppearanceSource='プレビュー（未保存・未公開）';v58Invalidate();if(!$('appearancePanel58').hidden)v58SyncAppearanceControls();}};
}
v58InitAppearanceUI();
