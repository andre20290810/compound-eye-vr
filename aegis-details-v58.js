/* AEGIS v58 details: front-temple camera recesses, a single swept antenna, white markings.
   All animation is cosmetic. No skeleton nodes, joint measurements or marker scores are changed. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.__AegisDetails58=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const TAU=2*Math.PI,rad=d=>d*Math.PI/180;
const palette={grey:[.47,.47,.47,1],silver:[.68,.68,.68,1],dark:[.20,.20,.20,1],glass:[.12,.12,.12,1],white:[1,1,1,1],yellow:[1,.78,.025,1]};
const greyMaterials=new Set(['visor','vest hardware','backpack','Aegis_Ceramic_Plate','Aegis_Luminous_Trim','Aegis_Dark_Outline','leg_articulation_covers']);
function finish(material,model){
 if(model==='aegisSoldier'&&(material==='cables'||material==='jet_exhaust'))return 'preserve_soldier_heat';
 if(material.startsWith('visor_white_bar')||material==='Aegis_Ceramic_Plate'||material==='Aegis_Luminous_Trim')return 'white';
 if(material.startsWith('tachometer_needle'))return 'yellow';
 if(greyMaterials.has(material)||material==='cables'||/^(jet_|temple_|tachometer_|camera_)/.test(material))return 'grey';
 return 'body_navy';
}
function recolor(material,col){
 // Leave the original cables and exhaust bytes intact so SOLDIER retains its exact heat effect.
 if(material==='cables'||material==='jet_exhaust')return col;
 const type=finish(material,'aegisEmber');if(type==='body_navy')return col;
 const color=type==='white'?palette.white:type==='yellow'?palette.yellow:material==='visor'?[.70,.70,.70,1]:palette.grey;
 for(let i=0;i<col.length;i+=4){if(type==='yellow'||type==='white'){col.set(color,i);continue;}const v=material==='visor'?.70:Math.min(.73,Math.max(.28,(col[i]+col[i+1]+col[i+2])/3));col[i]=col[i+1]=col[i+2]=v;}
 return col;
}
function builder(name,bone=1,color=palette.grey,animation=null){return{name,bone,color,animation,p:[],tri:[],col:[],joints:[],weights:[]};}
function vertex(m,p){const i=m.p.length/3;m.p.push(...p);m.col.push(...m.color);m.joints.push(m.bone,0,0,0);m.weights.push(1,0,0,0);return i;}
function face(m,points){const b=m.p.length/3;points.forEach(p=>vertex(m,p));for(let i=1;i<points.length-1;i++)m.tri.push(b,b+i,b+i+1);}
function box(m,c,size){const v=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])v.push(c.map((n,k)=>n+[x,y,z][k]*size[k]/2));for(const q of [[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]])face(m,q.map(i=>v[i]));}
function plane(c,axis,r,a,d=0){const u=r*Math.cos(a),v=r*Math.sin(a);return axis==='x'?[c[0]+d,c[1]+u,c[2]+v]:axis==='y'?[c[0]+u,c[1]+d,c[2]+v]:[c[0]+u,c[1]+v,c[2]+d];}
function ring(m,c,inner,outer,depth,axis='z',N=32){
 for(let k=0;k<N;k++){const a=k*TAU/N,b=(k+1)*TAU/N,d=depth/2;
  for(const r of [inner,outer])face(m,[plane(c,axis,r,a,-d),plane(c,axis,r,b,-d),plane(c,axis,r,b,d),plane(c,axis,r,a,d)]);
  for(const dd of [-d,d])face(m,[plane(c,axis,inner,a,dd),plane(c,axis,outer,a,dd),plane(c,axis,outer,b,dd),plane(c,axis,inner,b,dd)]);
 }
}
function disc(m,c,r,axis='z',N=32){face(m,Array.from({length:N},(_,k)=>plane(c,axis,r,k*TAU/N)));}
function tube(m,start,end,r1,r2,N=12){
 const v=end.map((x,k)=>x-start[k]),length=Math.hypot(...v);if(length<1e-9)throw Error('zero_length_tube');
 const d=v.map(x=>x/length),ref=Math.abs(d[1])<.9?[0,1,0]:[1,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 let u=cross(d,ref);const len=Math.hypot(...u);u=u.map(x=>x/len);const w=cross(d,u),point=(p,r,a)=>p.map((x,k)=>x+r*(u[k]*Math.cos(a)+w[k]*Math.sin(a)));
 for(let k=0;k<N;k++){const a=k*TAU/N,b=(k+1)*TAU/N;face(m,[point(start,r1,a),point(start,r1,b),point(end,r2,b),point(end,r2,a)]);}
 face(m,Array.from({length:N},(_,k)=>point(start,r1,-k*TAU/N)));face(m,Array.from({length:N},(_,k)=>point(end,r2,k*TAU/N)));
}
function typed(m){return{...m,p:Float32Array.from(m.p),tri:Uint32Array.from(m.tri),col:Float32Array.from(m.col),joints:Float32Array.from(m.joints),weights:Float32Array.from(m.weights)};}
function antennaElevation(time,side=1){if(!Number.isFinite(time))return 45;return 45+7*Math.sin(TAU*2.1*time)+3*Math.sin(TAU*4.7*time);}
function gaugeLevel(time,side){if(!Number.isFinite(time))return .5;return .5+.27*Math.sin(TAU*time/3.8+(side<0?0:.8))+.16*Math.sin(TAU*time/1.7+(side<0?.2:1.1));}
function accessoryAngle(animation,motion,time){
 if(animation.kind==='antenna')return rad(antennaElevation(time,animation.side)-45);
 if(animation.kind==='tachometer')return rad(-130+260*gaugeLevel(time,animation.side));
 return 0;
}
function geometry(){
 const all=[],mounts=builder('temple_mounts',2,palette.grey);all.push(mounts);
 // Only the avatar's right temple has an antenna, swept backwards along the annotated blue line.
 const start=[.078,1.186,-.010],L=.115,end=[start[0],start[1]+L*Math.sin(rad(45)),start[2]-L*Math.cos(rad(45))];
 box(mounts,start,[.012,.015,.018]);
 const antenna=builder('temple_antenna_right',2,palette.silver,{kind:'antenna',side:1,pivot:start,axis:[1,0,0],base_elevation_deg:45,min_elevation_deg:35,max_elevation_deg:55});
 tube(antenna,start,end,.0038,.0016,10);all.push(antenna);
 // The lens cluster is recessed into the FORWARD visor corner, not into the rear ear box.
 for(const side of [-1,1]){
  const sideName=side<0?'left':'right',center=[side*.068,1.166,.086];
  const housing=builder('temple_camera_housing_'+sideName,2,palette.grey),rim=builder('temple_camera_rims_'+sideName,2,palette.silver),lens=builder('temple_camera_lenses_'+sideName,2,palette.glass),glass=builder('temple_camera_reflections_'+sideName,2,palette.silver);
  const outline=[[-.017,-.017],[.012,-.018],[.019,-.007],[.016,.015],[-.009,.019],[-.019,.007]];
  const outer=outline.map(([y,z])=>[.003,y,z]),inner=outline.map(([y,z])=>[-.003,y*.92,z*.92]);
  face(housing,outer);face(housing,inner.slice().reverse());for(let i=0;i<outer.length;i++)face(housing,[inner[i],inner[(i+1)%outer.length],outer[(i+1)%outer.length],outer[i]]);
  lens.camera_count=3;housing.camera_count=3;
  for(const [dy,dz] of [[.008,-.006],[-.007,-.006],[.000,.009]]){
   const c=[.0038,dy,dz];ring(rim,c,.0044,.0064,.002,'x',20);disc(lens,[.0052,dy,dz],.0044,'x',20);ring(glass,[.0056,dy,dz],.0025,.0029,.0004,'x',16);box(glass,[.0059,dy+.0014,dz-.0014],[.0005,.0011,.0011]);
  }
  for(const mesh of [housing,rim,lens,glass]){
   // Tilt outward-facing lenses 30 degrees toward the front of the visor.
   for(let i=0;i<mesh.p.length;i+=3){const d=mesh.p[i],y=mesh.p[i+1],z=mesh.p[i+2];mesh.p[i]=center[0]+side*(.8660254*d-.5*z);mesh.p[i+1]=center[1]+y;mesh.p[i+2]=center[2]+.5*d+.8660254*z;}
   mesh.camera_zone='front_visor_temple';mesh.camera_center=center;all.push(mesh);
  }
 }
 const rings=builder('jet_mechanical_rings',1,palette.silver),details=builder('jet_service_panels',1,palette.grey),casing=builder('jet_intake_housings',1,palette.grey);all.push(rings,details,casing);
 for(const [side,x] of [[-1,-.077],[1,.077]]){
  const sideName=side<0?'left':'right',c=[x,.923,-.258];
  ring(casing,[x,.923,-.233],.034,.047,.028);ring(rings,[x,.923,-.251],.035,.042,.008);
  const dial=builder('tachometer_face_'+sideName,1,palette.dark),ticks=builder('tachometer_ticks_'+sideName,1,palette.silver);
  disc(dial,c,.035);ring(ticks,[x,.923,-.259],.0318,.0324,.0008);
  // Fixed 260-degree scale; a single sweeping pointer is intentionally not a turbine/fan.
  for(let k=0;k<=12;k++){const a=rad(-130+260*k/12),r0=k%3===0?.024:.027,r1=.031;
   tube(ticks,[x+r0*Math.sin(a),.923+r0*Math.cos(a),-.261],[x+r1*Math.sin(a),.923+r1*Math.cos(a),-.261],k%3===0?.0009:.0006,k%3===0?.0009:.0006,6);
  }
  // Small seven-segment-like scale captions and rectangular display window.
  box(ticks,[x,.906,-.260],[.018,.001,.001]);box(ticks,[x,.901,-.260],[.018,.001,.001]);
  for(const xx of [-.009,.009])box(ticks,[x+xx,.9035,-.260],[.001,.006,.001]);
  for(const xx of [-.004,0,.004])box(ticks,[x+xx,.9035,-.261],[.001,.0035,.001]);
  const needle=builder('tachometer_needle_'+sideName,1,palette.yellow,{kind:'tachometer',side,pivot:[x,.923,-.264],axis:[0,0,1],decorative:true});
  face(needle,[[x-.0018,.918,-.264],[x+.0018,.918,-.264],[x+.001,.942,-.264],[x,.951,-.264],[x-.001,.942,-.264]]);disc(needle,[x,.923,-.265],.0032);
  all.push(dial,ticks,needle);
  for(const y of [.795,.812,.833,1.015,1.032])ring(rings,[x,y,-.177],.038,.044,.004,'y');
  for(let k=0;k<8;k++){const a=k*TAU/8;box(rings,[x+.043*Math.cos(a),.923+.043*Math.sin(a),-.253],[.0035,.0035,.005]);}
  for(let k=0;k<4;k++)box(details,[x+side*.039,.85+k*.016,-.176],[.013,.006,.062]);
  tube(casing,[x+side*.030,.80,-.19],[x+side*.030,1.02,-.19],.005,.005);box(details,[x,.872,-.224],[.033,.020,.008]);
  // Fixed nozzle throat replaces rotating exhaust vanes. Body geometry stays the existing rocket.
  ring(rings,[x,.699,-.177],.040,.049,.008,'y');
 }
 for(const side of [-1,1]){const bar=builder('visor_white_bar_'+(side<0?'left':'right'),2,palette.white);box(bar,[side*.042,1.1765,.137],[.037,.005,.002]);all.push(bar);}
 return all.map(typed);
}
function isOriginalVisorBar(material,p,joints){return material==='Aegis_Luminous_Trim'&&p.length===12&&joints&&Math.round(joints[0])===2&&p[1]>1.17;}
return{geometry,finish,recolor,palette,antennaElevation,gaugeLevel,accessoryAngle,isOriginalVisorBar,revision:'aegis-v58-forward-cameras-single-antenna-white-marks',cosmeticMetadata:{clock:'original_animation_seconds',antenna_count:1,antenna_side:'avatar_right',antenna_elevation_deg:[35,55],antenna_baseline_deg:45,antenna_angle_reference:'from horizontal in head-local sagittal plane',tachometer:'illustrative oscillating pointer; not measured engine RPM',exclude_from_motion_score:true,exclude_from_marker_selection:true,exclude_from_skeleton_csv:true,cameras_per_temple:3,camera_zone:'front_visor_temple'}};
});
