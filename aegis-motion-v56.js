/* AEGIS v56 motion: periodic curves, without framewise angle clipping. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisMotion56=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const TAU=2*Math.PI;
function fitPeriodic(values,harmonics=5){
 if(values.length<8||!values.every(Number.isFinite))throw Error('Invalid periodic samples');
 const N=values.length,H=Math.min(harmonics,Math.floor((N-1)/2));
 const mean=values.reduce((a,b)=>a+b,0)/N,cos=[],sin=[];
 for(let k=1;k<=H;k++){let a=0,b=0;for(let i=0;i<N;i++){const phase=TAU*k*i/N;a+=values[i]*Math.cos(phase);b+=values[i]*Math.sin(phase);}cos.push(2*a/N);sin.push(2*b/N);}
 return {mean,cos,sin,sampleCount:N,harmonics:H};
}
function evaluate(curve,phase,derivative=0){
 let value=derivative===0?curve.mean:0;
 for(let i=0;i<curve.cos.length;i++){const w=TAU*(i+1),a=phase*w;
  value+=derivative===0?curve.cos[i]*Math.cos(a)+curve.sin[i]*Math.sin(a):
   derivative===1?w*(-curve.cos[i]*Math.sin(a)+curve.sin[i]*Math.cos(a)):
   -w*w*(curve.cos[i]*Math.cos(a)+curve.sin[i]*Math.sin(a));}
 return value;
}
function range(curve){let min=Infinity,max=-Infinity;for(let i=0;i<2048;i++){const v=evaluate(curve,i/2048);min=Math.min(min,v);max=Math.max(max,v);}return {min,max};}
function fitToRange(values,low,high,harmonics=5){
 if(!(high>low))throw Error('Invalid range');const raw=fitPeriodic(values,harmonics),r=range(raw);
 const span=r.max-r.min;if(span<1e-9)throw Error('Source has no periodic motion');
 // One affine map for the WHOLE cycle: derivatives never become artificial plateaus.
 const gain=(high-low)*.98/span,mid=(r.min+r.max)/2;
 return {...raw,mean:(low+high)/2+(raw.mean-mid)*gain,cos:raw.cos.map(x=>x*gain),sin:raw.sin.map(x=>x*gain),sourceRange:r,targetRange:[low,high],gain,method:'periodic_Fourier_then_cyclewise_affine_range'};
}
function fitBounded(values,maxAbs,harmonics=4){const c=fitPeriodic(values,harmonics),r=range(c),gain=Math.min(1,maxAbs/Math.max(Math.abs(r.min),Math.abs(r.max),1e-9));return {...c,mean:c.mean*gain,cos:c.cos.map(x=>x*gain),sin:c.sin.map(x=>x*gain),gain};}
function unwrap(values){const out=[];for(const v of values){let x=v;if(out.length){while(x-out.at(-1)>Math.PI)x-=TAU;while(x-out.at(-1)<-Math.PI)x+=TAU;}out.push(x);}return out;}
function axisQuaternion(axis,angle){const n=Math.hypot(...axis);if(n<1e-10)throw Error('Invalid axis');const h=angle/2;return [...axis.map(x=>x/n*Math.sin(h)),Math.cos(h)];}
function accessoryAngle(animation,motion,time){
 if(!Number.isFinite(time))return 0;
 if(animation.kind==='visor_clockwise')return motion==='armor_idle2'?-TAU*time/4:0;
 if(animation.kind==='turbine')return TAU*1.5*time*(animation.direction||1);
 return 0;
}
return {fitPeriodic,evaluate,range,fitToRange,fitBounded,unwrap,axisQuaternion,accessoryAngle};
});
