/* AEGIS v60 visor: adjustable head-bound markings, with no shoulder armor. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisVisor60=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const models=['aegisEmber','aegisSoldier'];
const defaults=Object.freeze({triangleScale:1.5,barThickness:.6,leftAngle:0,rightAngle:0,barLength:1,barSpacing:1,triangleOffset:0});
const limits=Object.freeze({triangleScale:[.25,3],barThickness:[.2,1.5],leftAngle:[-60,60],rightAngle:[-60,60],barLength:[.5,1.5],barSpacing:[.6,1.5],triangleOffset:[-.023,.023]});
function validateSettings(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('バイザー形状の設定が不正です');
 const out={...defaults};for(const [key,value] of Object.entries(input)){
  if(!Object.hasOwn(limits,key))throw Error('未対応のバイザー項目: '+key);
  const [min,max]=limits[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('バイザー '+key+' は '+min+'〜'+max+' の数値です');
  out[key]=value;
 }return out;
}
function validateCollection(input){
 const out=Object.fromEntries(models.map(m=>[m,{...defaults}]));if(input===undefined)return out;
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('モデル別バイザー設定が不正です');
 for(const [model,spec] of Object.entries(input)){if(!models.includes(model))throw Error('未対応のバイザーモデルです');out[model]=validateSettings(spec);}return out;
}
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),scale=(a,s)=>a.map(v=>v*s),dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
function chestThickness(p){
 if(!p||p.length!==12||!Array.from(p).every(Number.isFinite))throw Error('invalid_chest_bar_quad');
 const v=Array.from({length:4},(_,i)=>Array.from(p.slice(i*3,i*3+3))),long=add(sub(v[1],v[0]),sub(v[2],v[3])),length=Math.hypot(...long);if(length<1e-9)throw Error('degenerate_chest_bar');
 const axis=scale(long,1/length),separation=scale(sub(add(v[0],v[1]),add(v[3],v[2])),.5),width=Math.hypot(...sub(separation,scale(axis,dot(separation,axis))));
 if(width<.002||width>.03)throw Error('unexpected_chest_bar_thickness');return width;
}
function enhance(existing,chestQuads){
 if(!Array.isArray(chestQuads)||chestQuads.length!==2)throw Error('expected_two_chest_bars');
 const measured=chestQuads.map(chestThickness),width=(measured[0]+measured[1])/2;
 // Start from v58 details only. No shoulder geometry is created, uploaded or rendered.
 const result=existing.filter(m=>!m.name.startsWith('shoulder_armor')).map(m=>{
  if(!m.name.startsWith('visor_white_bar_'))return m;
  const p=new Float32Array(m.p);let lo=Infinity,hi=-Infinity;for(let i=1;i<p.length;i+=3){lo=Math.min(lo,p[i]);hi=Math.max(hi,p[i]);}
  if(hi-lo<1e-9)throw Error('zero_height_visor_bar');const center=(lo+hi)/2;
  for(let i=1;i<p.length;i+=3)p[i]=center+(p[i]-center)*width/(hi-lo);
  return{...m,p,stroke_width_model_units:width,chest_reference_widths:measured};
 });
 const triangle={name:'visor_white_triangle',bone:2,p:[],tri:[],col:[],joints:[],weights:[],upright:true};
 const face=points=>{const b=triangle.p.length/3;for(const p of points){triangle.p.push(...p);triangle.col.push(1,1,1,1);triangle.joints.push(2,0,0,0);triangle.weights.push(1,0,0,0);}for(let i=1;i<points.length-1;i++)triangle.tri.push(b,b+i,b+i+1);};
 const cy=1.1765,h=.023,w=.025,a=[-w/2,cy-h/3,.139],b=[w/2,cy-h/3,.139],c=[0,cy+2*h/3,.139],rear=p=>[p[0],p[1],.137];
 face([a,b,c]);face([rear(c),rear(b),rear(a)]);for(const [p,q] of [[a,b],[b,c],[c,a]])face([p,rear(p),rear(q),q]);
 for(const key of ['p','col','joints','weights'])triangle[key]=Float32Array.from(triangle[key]);triangle.tri=Uint32Array.from(triangle.tri);
 return [...result,triangle];
}
function multiply(a,b){const out=new Float32Array(16);for(let column=0;column<4;column++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)out[column*4+row]+=a[k*4+row]*b[column*4+k];return out;}
function partTransform(material,spec){
 const s=validateSettings(spec);let pivot,target,sx,sy,angle;
 if(material==='visor_white_triangle'){pivot=[0,1.1765,.138];target=[0,1.1765+s.triangleOffset,.138];sx=sy=s.triangleScale;angle=0;}
 else if(/^visor_white_bar_(left|right)$/.test(material)){const left=material.endsWith('_left');pivot=[(left?-1:1)*.042,1.1765,.137];target=[pivot[0]*s.barSpacing,pivot[1],pivot[2]];sx=s.barLength;sy=s.barThickness;angle=-(left?s.leftAngle:s.rightAngle)*Math.PI/180;}
 else return null;
 const c=Math.cos(angle),r=Math.sin(angle),xx=c*sx,xy=r*sx,yx=-r*sy,yy=c*sy;
 return new Float32Array([xx,xy,0,0,yx,yy,0,0,0,0,1,0,target[0]-xx*pivot[0]-yx*pivot[1],target[1]-xy*pivot[0]-yy*pivot[1],target[2]-pivot[2],1]);
}
function updateDrawMatrices(md,spec){
 if(!md?.skin)return;
 const key=JSON.stringify(spec);if(md.v60VisorKey!==key){md.v60VisorKey=key;md.v60VisorTransforms=new Map();for(const m of md.geo){const matrix=partTransform(m.materialName,spec);if(matrix)md.v60VisorTransforms.set(m.materialName,matrix);}}
 for(const m of md.geo){const transform=md.v60VisorTransforms.get(m.materialName);if(!transform)continue;
  const slot=m.v57Bone??2;m.v60Bones??=new Float32Array(md.bones.length);m.v60Bones.set(md.bones);m.v60Bones.set(multiply(md.bones.slice(slot*16,slot*16+16),transform),slot*16);
 }
}
return{defaults,limits,models,validateSettings,validateCollection,chestThickness,enhance,partTransform,multiply,updateDrawMatrices,revision:'aegis-v60-adjustable-visor-no-shoulder-armor',metadata:{shoulder_armor:false,angle_reference:'clockwise positive viewed from avatar front',geometry_only:true,exclude_from_motion_score:true,exclude_from_marker_selection:true,exclude_from_skeleton_csv:true}};
});
