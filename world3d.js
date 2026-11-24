/* Procedural 3D City & Renderer for NEON BAY: OVERDRIVE. Three.js r160. */
const scene=new THREE.Scene();scene.background=new THREE.Color('#0a1222');scene.fog=new THREE.Fog('#0a1222',95,310);
const view=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,420);
let gl;
try{gl=new THREE.WebGLRenderer({canvas,antialias:!mobileMode,powerPreference:'high-performance'});}catch(error){throw error;}
gl.setPixelRatio(1);gl.setSize(W,H,false);gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.22;gl.shadowMap.enabled=!mobileMode;gl.shadowMap.type=THREE.PCFSoftShadowMap;
try{
 const ec=document.createElement('canvas');ec.width=256;ec.height=128;const x=ec.getContext('2d'),g=x.createLinearGradient(0,0,0,128);
 g.addColorStop(0,'#4b82b8');g.addColorStop(0.36,'#92bfe0');g.addColorStop(0.50,'#ffaa82');g.addColorStop(0.56,'#52c4db');g.addColorStop(1,'#3a4658');
 x.fillStyle=g;x.fillRect(0,0,256,128);
 const sunG=x.createRadialGradient(184,48,2,184,48,44);sunG.addColorStop(0,'rgba(255,248,225,0.98)');sunG.addColorStop(0.45,'rgba(255,205,145,0.55)');sunG.addColorStop(1,'rgba(255,190,140,0)');
 x.fillStyle=sunG;x.fillRect(0,0,256,128);
 const envTex=new THREE.CanvasTexture(ec);envTex.colorSpace=THREE.SRGBColorSpace;envTex.mapping=THREE.EquirectangularReflectionMapping;
 const pmrem=new THREE.PMREMGenerator(gl),envRT=pmrem.fromEquirectangular(envTex);
 scene.environment=envRT.texture;window.cityEnvMap=envRT.texture;window._initialEnvRT=envRT;
 envTex.dispose();pmrem.dispose();
}catch{}
scene.add(new THREE.HemisphereLight(0xcce4ff,0x626c7c,2.2));
const sun=new THREE.DirectionalLight(0xffdbad,3.2);sun.position.set(-35,50,-30);sun.castShadow=!mobileMode;sun.shadow.mapSize.set(mobileMode?512:1024,mobileMode?512:1024);Object.assign(sun.shadow.camera,{left:-48,right:48,top:48,bottom:-48,near:.5,far:160});sun.shadow.bias=-.001;sun.shadow.normalBias=.06;scene.add(sun,sun.target);
const world=new THREE.Group();scene.add(world);
const mats=new Map();function material(color,roughness=.8,metalness=0){const key=color+':'+roughness+':'+metalness;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return mats.get(key);}
const cube=new THREE.BoxGeometry(1,1,1);
function block(parent,x,y,z,w,h,d,mat){const o=new THREE.Mesh(cube,typeof mat==='string'?material(mat):mat);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cylinder(parent,x,y,z,r,h,mat,segments=12){const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,segments),typeof mat==='string'?material(mat):mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function texture(draw,w=256,h=256){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(4,gl.capabilities.getMaxAnisotropy?.()||4);return t;}
window.roadMaterials=window.roadMaterials||[];
const facadeCache=[];window.facadeMaterials=facadeCache;
function facade(index){
 if(facadeCache[index])return facadeCache[index];
 const lit=[];
 const tex=texture((c,w,h)=>{
  c.fillStyle=palette[index];c.fillRect(0,0,w,h);
  // Sleek limestone & glass curtain bays
  for(let y=18;y<h;y+=64){
   c.fillStyle='#aebcca';c.fillRect(0,y+44,w,6);
   for(let x=16;x<w;x+=60){
    const glow=((x*3+y*5+index*11)%10)<3;
    lit.push({x,y,glow});
    c.fillStyle='#2a3f54';c.fillRect(x-2,y-2,36,42);
    const g=c.createLinearGradient(x,y,x,y+38);
    if(glow){g.addColorStop(0,'#ffecc2');g.addColorStop(1,'#96b8cc');}
    else{g.addColorStop(0,'#5d84a6');g.addColorStop(1,'#385673');}
    c.fillStyle=g;c.fillRect(x,y,32,38);
    c.fillStyle='rgba(255,255,255,0.18)';c.fillRect(x+2,y+2,5,34);
    c.fillStyle='#4a6074';c.fillRect(x+15,y,2,38);c.fillRect(x,y+19,32,2);
   }
  }
 },256,256);
 const emit=texture((c,w,h)=>{
  c.fillStyle='#0a121c';c.fillRect(0,0,w,h);
  for(const wnd of lit){
   if(wnd.glow){
    c.fillStyle='#ffe2a8';c.fillRect(wnd.x+1,wnd.y+1,30,36);
    c.fillStyle='#4a5d6e';c.fillRect(wnd.x+15,wnd.y,2,38);c.fillRect(wnd.x,wnd.y+19,32,2);
   }
  }
 },256,256);
 return facadeCache[index]=new THREE.MeshStandardMaterial({map:tex,bumpMap:tex,bumpScale:.03,emissive:'#ffdfaa',emissiveMap:emit,emissiveIntensity:0.42,roughness:.36,metalness:.28});
}
function sign(parent,text,subText,x,y,z,width,rotation=0,color='#10243a'){
 const key=(text||'')+(subText||'')+(color||'');let hash=0;for(let i=0;i<key.length;i++)hash=(hash*31+key.charCodeAt(i))>>>0;
 const themes=[
  {bg1:'#140b2e',bg2:'#2d1046',glow:'#ff007f',accent:'#00f0ff',sub:'#ffd700',sun:'rgba(255,0,127,0.22)'},
  {bg1:'#091a30',bg2:'#123854',glow:'#00f0ff',accent:'#ff2a85',sub:'#7df9ff',sun:'rgba(0,240,255,0.2)'},
  {bg1:'#22102c',bg2:'#3d1638',glow:'#ff6b2b',accent:'#ffd700',sub:'#00f0ff',sun:'rgba(255,140,60,0.22)'},
  {bg1:'#0c202c',bg2:'#173644',glow:'#38f288',accent:'#00f0ff',sub:'#ffd700',sun:'rgba(56,242,136,0.18)'}
 ];
 const th=themes[hash%themes.length];
 const tex=texture((c,w,h)=>{
  const g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,th.bg1);g.addColorStop(.55,th.bg2);g.addColorStop(1,th.bg1);
  c.fillStyle=g;c.fillRect(0,0,w,h);
  // Subtle Miami sunset radial aura + retro Art-Deco scanlines
  const rg=c.createRadialGradient(w*.5,h*.85,8,w*.5,h*.85,w*.48);rg.addColorStop(0,th.sun);rg.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=rg;c.fillRect(0,0,w,h);
  c.fillStyle='rgba(255,255,255,0.035)';for(let sy=6;sy<h;sy+=8)c.fillRect(0,sy,w,2);
  // Double glowing neon border + Art-Deco corner brackets
  c.save();c.shadowColor=th.glow;c.shadowBlur=14;c.strokeStyle=th.glow;c.lineWidth=6;c.strokeRect(7,7,w-14,h-14);c.restore();
  c.strokeStyle=th.accent;c.lineWidth=2;c.strokeRect(14,14,w-28,h-28);
  c.fillStyle=th.sub;
  for(const [cx,cy]of [[14,14],[w-28,14],[14,h-28],[w-28,h-28]]){c.fillRect(cx,cy,14,4);c.fillRect(cx,cy,4,14);}
  // Eyebrow neon label + glowing divider bar + crisp glowing main title
  c.textAlign='center';c.save();
  c.shadowColor=th.accent;c.shadowBlur=10;c.fillStyle=th.sub;c.font='800 22px Segoe UI, sans-serif';
  c.fillText((subText||'NEON BAY').toUpperCase(),w/2,44);
  c.fillStyle=th.glow;c.fillRect(w*.24,54,w*.52,3);
  c.shadowColor=th.glow;c.shadowBlur=14;c.fillStyle='#ffffff';
  const mainSz=Math.min(34,Math.max(19,Math.floor(760/Math.max(1,(text||'NEON BAY').length))));
  c.font='900 '+mainSz+'px Segoe UI, sans-serif';
  c.fillText((text||'NEON BAY').toUpperCase(),w/2,100);
  c.restore();
 },512,128);
 const h=width/4;
 const grp=new THREE.Group();grp.position.set(x,y,z);grp.rotation.y=rotation;
 const frame=new THREE.Mesh(new THREE.BoxGeometry(width+.24,h+.24,.18),material('#121a26',.35,.75));
 frame.position.z=-.1;grp.add(frame);
 const o=new THREE.Mesh(new THREE.PlaneGeometry(width,h),new THREE.MeshBasicMaterial({map:tex,side:THREE.FrontSide}));
 grp.add(o);parent.add(grp);return grp;
}
const glassStoreTex=texture((c,w,h)=>{
 // Recessed double glass entrance doors + brass/chrome frame + warm interior lobby glow + OPEN/VIP neon window sign
 c.fillStyle='#192838';c.fillRect(0,0,w,h);
 const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#2b4c6b');g.addColorStop(0.45,'#1d3852');g.addColorStop(1,'#ffd296');
 c.fillStyle=g;c.fillRect(8,8,w-16,h-12);
 // Brass/chrome double door frame & vertical handles
 c.strokeStyle='#d4b678';c.lineWidth=4;c.strokeRect(10,10,w-20,h-14);
 c.fillStyle='#d4b678';c.fillRect(w/2-2,10,4,h-14);c.fillRect(w/2-12,h*.48,4,22);c.fillRect(w/2+8,h*.48,4,22);
 // Subtle glass reflection streak
 c.fillStyle='rgba(255,255,255,0.14)';c.fillRect(14,14,12,h-26);c.fillRect(w/2+14,14,10,h-26);
 // Glowing neon OPEN window badge
 c.save();c.strokeStyle='#ff007f';c.lineWidth=2.5;c.strokeRect(18,22,42,18);
 c.fillStyle='#00f0ff';c.font='900 11px Segoe UI, sans-serif';c.textAlign='center';c.fillText('OPEN',39,35);c.restore();
 // Glowing VIP / VALET badge on right pane
 c.save();c.strokeStyle='#00f0ff';c.lineWidth=2;c.strokeRect(w-58,22,40,18);
 c.fillStyle='#ffd700';c.font='900 10px Segoe UI, sans-serif';c.textAlign='center';c.fillText('VIP',w-38,35);c.restore();
},128,128);
const shutterMaterial=new THREE.MeshStandardMaterial({map:glassStoreTex,emissive:'#4a6d8c',emissiveIntensity:0.48,roughness:.18,metalness:.42});
const miamiVenues=['OCEAN VIEW HOTEL','CLUB STARLIGHT','BAYSIDE DINER','NEON CUSTOMS','24/7 SUPERMART','SUNSET PAWN','CORAL PALMS SPA','PALM BEACH MOTORS','BAYSIDE JEWELERS','TROPICAL LOUNGE'];
for(const [i,b]of buildings.entries()){if(b.landmark)continue;if(Math.abs(b.x)>120||Math.abs(b.z)>120)continue;const g=new THREE.Group();g.position.set(b.x,0,b.z);world.add(g);if(b.interior){CityLayout.walls(b).forEach(w=>block(g,w.x-b.x,w.h/2,w.z-b.z,w.w,w.h,w.d,'#d2d9e2'));block(g,0,3.8,0,b.w,.25,b.d,'#c8d4df');block(g,0,(3.9+b.h)/2,0,b.w,b.h-3.9,b.d,facade(i%6));block(g,0,.02,0,b.w,.06,b.d,'#8c9aa8');}else block(g,0,b.h/2,0,b.w,b.h,b.d,facade(i%6));block(g,0,b.h,0,b.w+.5,.3,b.d+.5,'#a8b6c6');block(g,0,b.h+.45,0,3.2,.7,2.4,'#526478');if(Math.abs(b.x)!==22&&Math.abs(b.z)!==22&&Math.min(...CityLayout.axes.map(a=>Math.abs(b.x-a)))>32)continue;
const front=new THREE.Group();g.add(front);if(Math.abs(b.x)===22||Math.abs(b.x)>120||Math.abs(b.z)>120){const nearest=CityLayout.axes.reduce((a,v)=>Math.abs(v-b.x)<Math.abs(a-b.x)?v:a,0),side=Math.sign(b.x-nearest);front.position.x=-side*(b.w/2+.05);front.rotation.y=-side*Math.PI/2;}else{front.position.z=-Math.sign(b.z)*8.55;front.rotation.y=b.z>0?Math.PI:0;}
const edgeCol=['#ff007f','#00f0ff','#ffd700'][i%3],edgeCol2=i%2?'#00f0ff':'#ff007f';
for(let a=-6;a<=6;a+=6){if(b.interior&&a===0)continue;block(front,a,1.45,.02,5.4,2.9,.16,shutterMaterial);block(front,a,.06,.45,4.2,.1,1.1,'#243242');block(front,a-2.8,1.6,.15,.24,3.2,.34,'#efe6d8');block(front,a,2.95,.75,5.5,.16,1.55,'#1d2c40');block(front,a,3.04,1.5,5.55,.09,.09,new THREE.MeshBasicMaterial({color:edgeCol}));block(front,a,2.87,1.49,5.55,.06,.07,new THREE.MeshBasicMaterial({color:edgeCol2}));}
sign(front,miamiVenues[i%miamiVenues.length],['OCEAN DRIVE','MIAMI NEON','VALET · OPEN 24H','PALM STRIP'][i%4],0,4.3,.46,11.6,0,i%3?'#12283e':'#341638');
for(let a=-5;a<=5;a+=5){block(front,a,6.5,.55,3.5,.12,1.1,'#8da0b2');block(front,a,7.0,.96,3.5,.06,.06,'#384c5e');}
block(g,3,b.h+.65,2,2.2,1.1,2.2,'#627386');
}
for(let z=-105;z<=105;z+=15)for(const side of [-1,1]){if(Math.abs(z)<14)continue;block(world,side*13,.12,z,4,.24,14.8,'#9ea9b5');block(world,side*11,.16,z,.2,.32,14.8,'#cfd8e2');if(z%30!==0){cylinder(world,side*13.8,3,z,.075,6,'#444c58');block(world,side*13.4,6,z,1,.13,.18,'#555c68');block(world,side*13,5.9,z,.7,.12,.3,'#ffe4b5');}}
const vehicle=sedan('#00f0ff',false,true);
function humanBase(color,officer=false){const g=new THREE.Group();scene.add(g);const body=new THREE.Mesh(new THREE.CylinderGeometry(.23,.29,.78,10),material(color));body.scale.z=.64;body.position.y=1.14;body.castShadow=true;g.add(body);block(g,0,1.38,.16,.025,.25,.02,'#8d816b');const head=new THREE.Mesh(new THREE.SphereGeometry(.19,10,8),material('#ad805d'));head.position.y=1.69;g.add(head);const hair=new THREE.Mesh(new THREE.SphereGeometry(.195,10,6,0,Math.PI*2,0,Math.PI/2),material('#30312c'));hair.position.y=1.72;g.add(hair);const limbs=[];for(const side of [-1,1]){const leg=cylinder(g,side*.13,.43,0,.095,.8,officer?'#343c32':color,8);limbs.push(leg);const arm=cylinder(g,side*.32,1.12,0,.07,.65,color,8);limbs.push(arm);block(g,side*.13,.08,.09,.19,.15,.35,'#393a32');}g.userData.limbs=limbs;return g;}
const rico=human('#1c2b3e',false,true);const walkers=people.map(()=>{const g=new THREE.Group();g.userData.limbs=Array.from({length:4},()=>new THREE.Object3D());return g;});
const marker=new THREE.Mesh(new THREE.TorusGeometry(1.7,.06,6,32),new THREE.MeshBasicMaterial({color:'#00f0ff'}));marker.rotation.x=Math.PI/2;scene.add(marker);
// Tall Glowing 3D Vertical Neon Sky Beacon + Floating Target Arrow (0 runtime allocations)
const skyBeacon=new THREE.Group();
const beaconBeam=new THREE.Mesh(new THREE.CylinderGeometry(.42,1.25,68,12,1,true),new THREE.MeshBasicMaterial({color:'#00f0ff',transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
beaconBeam.position.y=34;
const beaconArrow=new THREE.Mesh(new THREE.OctahedronGeometry(.85,0),new THREE.MeshBasicMaterial({color:'#ffd700',transparent:true,opacity:.92}));
beaconArrow.position.y=6.2;beaconArrow.scale.set(.85,1.55,.85);
skyBeacon.add(beaconBeam,beaconArrow);skyBeacon.visible=false;scene.add(skyBeacon);window.neonSkyBeacon=skyBeacon;
// Iconic Miami Art-Deco Overhead Arch Gate at Apex Core (z = 103)
const gateDeco=material('#efe6d8',.45,.15),gateDark=material('#19283c',.4,.55);
const gatePink=new THREE.MeshBasicMaterial({color:'#ff007f'}),gateCyan=new THREE.MeshBasicMaterial({color:'#00f0ff'}),gateGold=new THREE.MeshBasicMaterial({color:'#ffd700'});
for(const sx of [-14.4,14.4]){
 block(world,sx,.55,103,2.5,1.1,2.5,gateDark);
 block(world,sx,4.6,103,1.8,7.4,1.8,gateDeco);
 block(world,sx,8.8,103,2.3,1.1,2.3,gateDeco);
 block(world,sx,9.7,103,1.5,.85,1.5,gateDark);
 block(world,sx,10.3,103,.9,.45,.9,gateGold);
 // Glowing vertical Art-Deco neon tubes up both pillars
 for(const dz of [-.95,.95]){block(world,sx,4.6,103+dz,.22,7.0,.14,gateCyan);block(world,sx-Math.sign(sx)*.95,4.6,103+dz*.45,.14,7.0,.2,gatePink);}
}
block(world,0,8.4,103,30.2,1.6,1.6,gateDark);
block(world,0,9.45,103,26.4,.65,1.2,gateDeco);
block(world,0,10.0,103,16.4,.45,.9,gateGold);
for(const dz of [-.86,.86]){block(world,0,7.58,103+dz,29.6,.16,.14,gateCyan);block(world,0,9.2,103+dz,27.0,.18,.14,gatePink);}
sign(world,'APEX CORE','MIAMI NEON DISTRICT',0,8.45,102.05,15.5,Math.PI,'#140b2e');
sign(world,'APEX CORE','MIAMI NEON DISTRICT',0,8.45,103.95,15.5,0,'#140b2e');
// Batch static geometry by material to keep draw calls manageable on integrated GPUs.
world.updateMatrixWorld(true);const batches=new Map();world.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;let b=batches.get(key);if(!b)batches.set(key,b={mat:o.material,p:[],n:[],uv:[]});const geom=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());geom.applyMatrix4(o.matrixWorld);b.p.push(...geom.attributes.position.array);b.n.push(...geom.attributes.normal.array);b.uv.push(...geom.attributes.uv.array);geom.dispose();});scene.remove(world);for(const b of batches.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));const m=new THREE.Mesh(g,b.mat);m.castShadow=true;m.receiveShadow=true;scene.add(m);}
const camTarget=new THREE.Vector3();let frontView=false,camYaw=0;let firstFrame=true,lastRender=0,fpsFrames=0,fpsStart=0,lowMode=true;
window._camShake={t:0,dur:.28,amp:0,phase:0};
window.triggerCameraShake=(amp=.28,dur=.28)=>{const s=window._camShake;if(amp<=0||dur<=0)return;if(amp>=s.amp||s.t<=0){s.amp=amp;s.dur=dur;s.t=dur;}};
function fit(){const iw=Math.max(1,innerWidth||1),ih=Math.max(1,innerHeight||1),q=settings.quality||'low',dpr=Math.max(1,window.devicePixelRatio||1),aspect=iw/ih;W=mobileMode?(q==='ultra'?Math.min(1280,Math.round(iw*Math.min(dpr,1.4))):q==='high'?Math.min(1024,Math.round(iw*Math.min(dpr,1.15))):q==='medium'?Math.min(840,iw):Math.min(640,iw)):(q==='ultra'?Math.min(1920,Math.round(iw*Math.min(dpr,2))):q==='high'?Math.min(1600,Math.round(iw*Math.min(dpr,1.5))):q==='medium'?Math.min(1280,Math.round(iw*Math.min(dpr,1.25))):Math.min(960,iw));H=Math.max(1,Math.round(W*ih/iw));gl.setSize(W,H,false);window.NeonPerf?.onResize?.(W,H);window._portraitFovBonus=aspect<1?Math.round((10+Math.min(4,(1-aspect)*8))*10)/10:0;const baseFovNow=typeof inCar!=='undefined'&&inCar?Math.min(80,window.nosActive?80:60+Math.min(10,Math.abs(velocity)*.28)):60;view.aspect=aspect;view.fov=baseFovNow+window._portraitFovBonus;view.updateProjectionMatrix();}window.fitCamera=fit;addEventListener('resize',fit);fit();
addEventListener('keydown',e=>{if(e.code==='KeyC'&&!e.repeat&&running)toggleView();if(e.code==='KeyQ'&&running&&!e.repeat){const q=['low','medium','high'];setQuality(q[(q.indexOf(settings.quality||'low')+1)%q.length]);}});
function recenterCamera(){if(!running)return;lookYaw=player.yaw;frontView=false;firstFrame=true;window.sceneDirty=true;toast('Camera centered.');}
function toggleView(){if(!running)return;if(inCar){window.cameraMode=((window.cameraMode||0)+1)%3;firstFrame=true;window.sceneDirty=true;const names=['Chase camera','Hood camera','Cinematic wide camera'];toast(names[window.cameraMode]);return;}window.sceneDirty=true;frontView=!frontView;toast(frontView?'Front view':'Follow view');}
window.toggleCameraView=toggleView;
function render(t){const dt=Math.min(.05,Math.max(.001,(t-lastRender)/1000||.016));lastRender=t;vehicle.position.set(car.x,car.jumpY||0,car.z);vehicle.rotation.y=car.yaw;vehicle.rotation.x=(inCar&&ride==='car'?window.vehiclePitch:0)+(car.jumpPitch||0);rico.position.set(player.x,jumpY,player.z);rico.rotation.y=player.yaw;rico.visible=!inCar||ride==='bike'||ride==='superbike';rico.userData.limbs.forEach((limb,j)=>limb.rotation.x=running&&velocity?Math.sin(t*.008+j*Math.PI)*.28:0);
walkers.forEach((g,i)=>{const p=people[i];g.position.set(p.x,0,p.z);g.rotation.y=p.yaw||0;const walkSpd=p.curSpeed||Math.abs(p.speed)||0;const freq=p.flee>0?.018:.009;const amp=running&&walkSpd>.05?(p.flee>0?.65:.38):0;g.userData.limbs.forEach((limb,j)=>{const ph=t*freq+i*1.3+((j===1||j===2)?0:Math.PI);limb.rotation.x=Math.sin(ph)*amp;});});
const objectiveTarget=activeTargets()[0];marker.visible=!!objectiveTarget;skyBeacon.visible=!!objectiveTarget;if(marker.visible){marker.position.set(objectiveTarget.x,.13,objectiveTarget.z);skyBeacon.position.set(objectiveTarget.x,0,objectiveTarget.z);beaconArrow.position.y=6.2+Math.sin(t*.005)*.65;beaconArrow.rotation.y=t*.0025;}
const lookBack=inCar&&keys.has('KeyB'),jumpH=inCar?(currentRide()?.jumpY||0):0,pBonus=window._portraitFovBonus||0,baseFov=inCar?Math.min(80,window.nosActive?80:60+Math.min(10,Math.abs(velocity)*.28)+Math.min(5,jumpH*1.1)):60,targetFov=baseFov+pBonus;if(Math.abs(view.fov-targetFov)>.05){view.fov+=(targetFov-view.fov)*Math.min(1,dt*8);view.updateProjectionMatrix();}else if(view.fov!==targetFov){view.fov=targetFov;view.updateProjectionMatrix();}
const cMode=inCar?(window.cameraMode||0):0;
if(cMode===1&&!window._bootOrbitActive){
 const fwd=player.yaw+(lookBack?Math.PI:0);camYaw=fwd;
 view.position.set(player.x+Math.sin(fwd)*.75,1.68+jumpH,player.z+Math.cos(fwd)*.75);
 view.lookAt(player.x+Math.sin(fwd)*22,1.35+jumpH,player.z+Math.cos(fwd)*22);
}else{
 const indoor=!inCar&&window.isIndoorPoint?.(player.x,player.z);
 const bootSpin=window._bootOrbitActive&&inCar?Math.sin(t*.00045)*.65:0;
 const follow=window._bootOrbitActive?8.4:(cMode===2?11.2+Math.min(2,Math.abs(velocity)*.05):(inCar?7.2+Math.min(1.4,Math.abs(velocity)*.04):(indoor?3.1:4.2)));
 const camH=window._bootOrbitActive?3.0:(cMode===2?4.5+jumpH*.72:(inCar?3.15+jumpH*.72:(indoor?2.05:2.5)));
 const rawAngle=(inCar?player.yaw:lookYaw)+((frontView||lookBack)?Math.PI:0)+(inCar?(window.camOrbitOffset||0):0)+bootSpin;
 if(firstFrame||!inCar)camYaw=rawAngle;else camYaw+=Math.atan2(Math.sin(rawAngle-camYaw),Math.cos(rawAngle-camYaw))*Math.min(1,dt*7.5);
 const angle=camYaw;camTarget.set(player.x-Math.sin(angle)*follow,camH,player.z-Math.cos(angle)*follow);
 const safeCam=resolveCamera(camTarget);camTarget.set(safeCam.x,safeCam.y,safeCam.z);
 if(firstFrame||blocked(view.position.x,view.position.z,.2)){view.position.copy(camTarget);firstFrame=false;}else view.position.lerp(camTarget,1-Math.exp(-dt*9));
 const collisionSafe=resolveCamera(view.position);view.position.set(collisionSafe.x,collisionSafe.y,collisionSafe.z);
 if(window.NeonDrivingJuice?.cameraShake&&running){const off=window.NeonDrivingJuice.cameraShake.update(dt);view.position.x+=off.x;view.position.y+=off.y;}
 const sh=window._camShake;if(sh&&sh.t>0&&running){sh.t=Math.max(0,sh.t-dt);sh.phase+=dt*48;const dec=sh.dur>0?sh.t/sh.dur:0,m=sh.amp*dec*dec*(settings.reducedEffects?.45:1);view.position.x+=Math.sin(sh.phase)*m;view.position.y+=Math.cos(sh.phase*1.37)*m*.65;}else if(sh&&!running)sh.t=0;
 const turnShift=inCar?-(window.steerSmooth||0)*Math.min(1,Math.abs(velocity)/18)*.45:0;view.lookAt(player.x+Math.cos(angle)*turnShift,inCar?1.35+jumpH*.65:(indoor?1.32:1.25),player.z-Math.sin(angle)*turnShift);
}
if(window.photoModeActive&&window.NeonPhotoMode)window.NeonPhotoMode.applyCameraTo(view);
window.renderCity?.(t,dt);sun.position.set(player.x-35,55,player.z-35);sun.target.position.set(player.x,0,player.z);renderGameplay(playTime*1000,dt);window.renderPolish?.(playTime,dt);window.renderNeonSystems?.(playTime,dt);
if(window.NeonPerf?.bloom?.enabled){window.NeonPerf.bloom.render(gl,scene,view);}else{gl.render(scene,view);}
drawMap();fpsFrames++;if(t-fpsStart>1000){window.gameDiagnostics={fps:Math.round(fpsFrames*1000/(t-fpsStart)),calls:gl.info.render.calls,triangles:gl.info.render.triangles,mission:window.NeonMissions?.activeMission?.id||null,inCar};fpsStart=t;fpsFrames=0;}
}
window.gameReady=true;
function setQuality(value,save=true){const q=(value==='ultra'||value==='high'||value==='medium')?value:'low';lowMode=q==='low';settings.quality=q;document.body.classList.toggle('gfx-low',lowMode);const useShadows=!(mobileMode&&lowMode);gl.shadowMap.enabled=useShadows;sun.castShadow=useShadows;const sm=mobileMode?(q==='low'?512:q==='medium'?512:1024):(q==='low'?1024:q==='medium'?1024:2048);sun.shadow.mapSize.set(sm,sm);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}fit();window.NeonPerf?.onQualitySync?.(q,W,H);window.updateTouchUI?.();window.sceneDirty=true;if(save)persist();}

// Motorcycle and gameplay visuals use a small shared geometry budget.
const motorcycle=new THREE.Group();scene.add(motorcycle);
const bikeMetal=material('#cfd7db',.2,.9),bikePaint=window.makeCarPaintMat('#00f0ff',{metalness:.76,roughness:.16}),bikeWheels=[],bikeHeadMat=new THREE.MeshStandardMaterial({color:'#f4fbff',emissive:'#d4f0ff',emissiveIntensity:.35,roughness:.12}),bikeBrakeMat=new THREE.MeshStandardMaterial({color:'#c41c1c',emissive:'#000000',roughness:.18});
for(const z of [-.82,.86]){const w=new THREE.Group();w.position.set(0,.4,z);motorcycle.add(w);bikeWheels.push(w);const wheel=cylinder(w,0,0,0,.39,.18,'#151a1f',22);wheel.rotation.z=Math.PI/2;for(const side of [-1,1]){const rim=cylinder(w,side*.095,0,0,.28,.018,bikeMetal,16);rim.rotation.z=Math.PI/2;cylinder(w,side*.102,0,0,.18,.01,material('#8f9aa3',.3,.88),14).rotation.z=Math.PI/2;}}
window.addCarContactShadow?.(motorcycle,1.1,2.45);
block(motorcycle,0,.72,0,.18,.12,1.6,bikeMetal);block(motorcycle,0,.77,.16,.42,.42,.5,'#444c4a');block(motorcycle,0,1.08,.22,.52,.29,.65,bikePaint);block(motorcycle,0,1.12,-.43,.48,.15,.68,'#282d2b');
for(const side of [-1,1]){const fork=cylinder(motorcycle,side*.14,.8,.82,.035,.87,bikeMetal,8);fork.rotation.x=-.16;block(motorcycle,side*.26,.48,-.3,.1,.12,1.1,bikeMetal);block(motorcycle,side*.38,1.38,.7,.3,.06,.06,'#242b2a');cylinder(motorcycle,side*.42,1.53,.7,.025,.3,bikeMetal,6);block(motorcycle,side*.44,1.7,.7,.17,.12,.04,'#829ba0');}
block(motorcycle,0,1.4,.7,.8,.06,.06,bikeMetal);block(motorcycle,0,1.17,.95,.34,.27,.09,bikeHeadMat);block(motorcycle,0,.94,-.86,.28,.12,.08,bikeBrakeMat);
const bikeBeam=new THREE.Mesh(new THREE.PlaneGeometry(2.0,9.5),new THREE.MeshBasicMaterial({map:window.createHeadlightBeamTex(),color:'#fff4d2',transparent:true,opacity:.4,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));bikeBeam.rotation.x=-Math.PI/2;bikeBeam.position.set(0,.08,5.7);bikeBeam.visible=false;motorcycle.add(bikeBeam);motorcycle.userData={wheels:bikeWheels,headMat:bikeHeadMat,brakeMat:bikeBrakeMat,beams:[bikeBeam]};
window.setCarPaint=color=>{vehicle.userData.paint.color.set(color);window.sceneDirty=true;};
function renderGameplay(t,dt=.016){const steerInput=window.steerSmooth||0,onBike=inCar&&(ride==='bike'||ride==='superbike'),swim=!inCar&&window.swimming;motorcycle.position.set(bike.x,bike.jumpY||0,bike.z);motorcycle.rotation.y=bike.yaw;motorcycle.rotation.x=bike.jumpPitch||0;motorcycle.rotation.z=inCar&&ride==='bike'?steerInput*.15*Math.min(1,Math.abs(velocity)/5):0;
rico.rotation.x=inCar&&ride==='superbike'?.22:swim?.95:0;rico.userData.limbs.forEach(l=>l.position.z=0);if(onBike){rico.position.y=(ride==='superbike'?.46:.5)+(currentRide()?.jumpY||0);rico.userData.limbs.forEach((l,i)=>{l.rotation.x=i%2?-1.15:.7;});}else if(swim){rico.position.y=-.68+Math.sin(t*.004)*.05;const ph=t*.008;rico.userData.limbs[0].rotation.x=Math.sin(ph)*.5;rico.userData.limbs[2].rotation.x=-Math.sin(ph)*.5;rico.userData.limbs[1].rotation.x=-1.6+Math.sin(ph)*.85;rico.userData.limbs[3].rotation.x=-1.6-Math.sin(ph)*.85;}
if(!inCar&&!swim&&window.onMarinaPier?.(player.x,player.z))rico.position.y=.57+jumpY;
if(window.doorTransition){const tr=window.doorTransition;if(running)tr.t+=dt;const u=Math.min(1,tr.t/tr.dur),doorX=tr.v.x+Math.cos(tr.v.yaw)*1.3,doorZ=tr.v.z-Math.sin(tr.v.yaw)*1.3;if(tr.mode==='enter'){rico.visible=true;if(u<.45){const s=u/.45;rico.position.set(tr.fromX+(doorX-tr.fromX)*s,0,tr.fromZ+(doorZ-tr.fromZ)*s);}else{const s=(u-.45)/.55;rico.position.set(doorX+(tr.v.x-doorX)*s,-.18*s,doorZ+(tr.v.z-doorZ)*s);rico.rotation.y=tr.v.yaw;}}else{const sideSign=((tr.toX-tr.v.x)*Math.cos(tr.v.yaw)-(tr.toZ-tr.v.z)*Math.sin(tr.v.yaw))>=0?1:-1,d0X=tr.v.x+Math.cos(tr.v.yaw)*.85*sideSign,d0Z=tr.v.z-Math.sin(tr.v.yaw)*.85*sideSign;rico.position.set(d0X+(tr.toX-d0X)*u,Math.sin(u*Math.PI)*.08,d0Z+(tr.toZ-d0Z)*u);}if(tr.t>=tr.dur)window.doorTransition=null;}
walkers.forEach((g,i)=>{const p=people[i];g.rotation.z=p.hp<=0?Math.PI/2:0;g.position.y=p.hp<=0?.25:0;g.rotation.y=p.yaw||0;});
const moving=running&&!inCar&&Math.abs(velocity)>.1,phase=t*(Math.abs(velocity)>4?.012:.008);
rico.userData.knees.forEach((k,i)=>k.rotation.x=onBike?1.1:swim?.4+Math.max(0,Math.sin(t*.008+i*Math.PI))*.5:moving?Math.max(0,Math.sin(phase+i*Math.PI))*.55:.04);
rico.userData.elbows.forEach((e)=>e.rotation.x=onBike?-.35:-.2);
if(moving&&!swim){rico.userData.limbs.forEach((l,j)=>l.rotation.x=Math.sin(phase+(j<2?0:Math.PI))*(j%2?-.38:.4));rico.position.y+=Math.abs(Math.sin(phase))*.025;}
const wSteer=window.steerSmooth||0;
const bikeSpin=bike.wheelSpin||0,nightAuto=(window.currentDusk||0)>.5||(window.worldClock?.rainIntensity||0)>.35,lightsOn=!window._missionBlackoutActive&&(window.headlightsOn===null?nightAuto:!!window.headlightsOn);
motorcycle.userData.wheels.forEach((w,i)=>{w.rotation.x=bikeSpin;w.rotation.y=i===1&&inCar&&ride==='bike'?-wSteer*.32:0;});
motorcycle.userData.headMat.emissiveIntensity=lightsOn?1.1:.2;
motorcycle.userData.brakeMat.emissive.set(inCar&&ride==='bike'&&window.brakingNow?'#ff2a1f':lightsOn?'#550908':'#000000');
motorcycle.userData.beams.forEach(b=>b.visible=lightsOn&&inCar&&ride==='bike'&&!(mobileMode&&lowMode));
vehicle.userData.wheels.forEach((w,i)=>{w.rotation.x=car.wheelSpin||0;w.rotation.y=i%2===1&&inCar&&ride==='car'?-wSteer*.25:0;});
}
vehicle.visible=true;rico.visible=true;
requestAnimationFrame(frame);
