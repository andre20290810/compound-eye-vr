/* AEGIS v58 appearance: validated public presets and per-avatar material groups. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__Appearance58=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const schema='compound-eye-appearance-v1';
const models=['aegisEmber','aegisSoldier'];
const labels={mask:'バイザー・マスク',jet:'ロケット装置',decor:'装飾・肩装甲・金具・アンテナ',body:'本体・服・手足',heat:'発光パーツ（SOLDIERの赤〜黄）',visorBars:'バイザーの2本線・▲',chestMarks:'胸の棒線・三角マーク',gauges:'タコメーターの針'};
const groups=Object.keys(labels),clone=x=>JSON.parse(JSON.stringify(x));
const setting=(mode,colorA,colorB=colorA,brightness=1,axis='y')=>({mode,colorA,colorB,brightness,axis});
const baseGroups={mask:setting('solid','#b8b8b8'),jet:setting('original','#999999'),decor:setting('original','#999999'),body:setting('original','#16325c'),heat:setting('original','#ffe000','#ff250c'),visorBars:setting('solid','#ffffff'),chestMarks:setting('solid','#ffffff'),gauges:setting('original','#ffcc06')};
const defaults={schema,revision:'v58-20261111T2332',models:{aegisEmber:clone(baseGroups),aegisSoldier:clone(baseGroups)}};
const ranges={mask:{x:[-.10,.10],y:[1.07,1.26],z:[-.12,.15]},jet:{x:[-.15,.15],y:[.69,1.14],z:[-.28,-.08]},decor:{x:[-.36,.36],y:[0,1.29],z:[-.28,.28]},body:{x:[-.36,.36],y:[0,1.25],z:[-.20,.30]},heat:{x:[-.36,.36],y:[.17,1.19],z:[-.28,.28]},visorBars:{x:[-.065,.065],y:[1.173,1.180],z:[.134,.14]},chestMarks:{x:[-.095,.095],y:[.975,1.055],z:[.19,.215]},gauges:{x:[-.12,.12],y:[.89,.96],z:[-.27,-.25]}};
function groupFor(material,model){
 if(material.startsWith('visor_white_bar')||material==='visor_white_triangle')return 'visorBars';
 if(material==='Aegis_Ceramic_Plate'||material==='Aegis_Luminous_Trim')return 'chestMarks';
 if(material.startsWith('tachometer_needle'))return 'gauges';
 if(material.startsWith('tachometer_')||material.includes('camera_lenses')||material.includes('camera_reflections'))return null;
 if(model==='aegisSoldier'&&(material==='cables'||material==='jet_exhaust'))return 'heat';
 if(material==='visor'||material.startsWith('temple_camera_housing')||material.startsWith('temple_camera_rims'))return 'mask';
 if(material.startsWith('jet_')||material==='backpack')return 'jet';
 if(material==='cables'||material==='vest hardware'||material==='Aegis_Dark_Outline'||material==='leg_articulation_covers'||material.startsWith('temple_')||material.startsWith('shoulder_armor'))return 'decor';
 return 'body';
}
function validate(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.schema!==schema)throw Error('配色JSONの形式が違います');
 const allowed=new Set(['schema','revision','models']);for(const key of Object.keys(input))if(!allowed.has(key))throw Error('未対応の項目: '+key);
 if(!input.models||typeof input.models!=='object'||Array.isArray(input.models))throw Error('モデルの配色設定がありません');
 if(Object.keys(input.models).some(x=>!models.includes(x)))throw Error('未対応のモデルです');
 const out=clone(defaults);out.revision=typeof input.revision==='string'?input.revision.slice(0,80):'imported';
 for(const model of models){
  const source=input.models[model];if(source===undefined)continue;if(!source||typeof source!=='object'||Array.isArray(source))throw Error('モデル設定が不正です');
  for(const [group,value] of Object.entries(source)){
   if(!groups.includes(group))throw Error('未対応の部位: '+group);
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('配色値が不正です');
   if(Object.keys(value).some(x=>!['mode','colorA','colorB','brightness','axis'].includes(x)))throw Error('配色設定に未対応の項目があります');
   const v={...out.models[model][group],...value};
   if(!['original','solid','gradient'].includes(v.mode))throw Error('色の方式が不正です');
   for(const key of ['colorA','colorB']){if(typeof v[key]!=='string'||!/^#[0-9a-f]{6}$/i.test(v[key]))throw Error('色は #RRGGBB で指定してください');v[key]=v[key].toLowerCase();}
   if(typeof v.brightness!=='number'||!Number.isFinite(v.brightness)||v.brightness<.25||v.brightness>2)throw Error('明るさは25%〜200%です');
   if(!['x','y','z'].includes(v.axis))throw Error('グラデーション方向が不正です');
   out.models[model][group]=v;
  }
 }
 return out;
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
function uniformSpec(preset,model,material){
 if(!models.includes(model))return {mode:0,brightness:1,unlit:0,a:[1,1,1],b:[1,1,1],axis:1,range:[0,1],group:null};
 const group=groupFor(material,model);if(!group)return {mode:0,brightness:1,unlit:0,a:[1,1,1],b:[1,1,1],axis:1,range:[0,1],group:null};
 const s=preset.models[model][group];return {group,mode:s.mode==='original'?0:s.mode==='solid'?1:2,a:rgb(s.colorA),b:rgb(s.colorB),axis:['x','y','z'].indexOf(s.axis),range:ranges[group][s.axis],brightness:s.brightness,unlit:['visorBars','chestMarks','gauges','heat'].includes(group)?1:0};
}
return {schema,models,labels,groups,defaults,validate,clone,rgb,groupFor,uniformSpec};
});
