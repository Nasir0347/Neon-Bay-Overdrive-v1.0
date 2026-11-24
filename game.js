'use strict';
const mobileMode=navigator.maxTouchPoints>0||new URLSearchParams(location.search).has('mobile');
const touchInput={forward:0,turn:0,gas:0,nos:false},canvas=document.querySelector('#game'),map=document.querySelector('#map'),mc=map.getContext('2d'),$=s=>document.querySelector(s),keys=new Set();
const settings={quality:'low',difficulty:'normal',sensitivity:1,master:1,sound:0.65,music:0.45,reducedEffects:false,fpsCap:60,timeMode:'auto',weatherMode:'auto',freeRoamWanted:true};
let lookYaw=Math.PI;
let W=960,H=540,running=true,last=0,inCar=true,velocity=0,toastTime=0,ride='car',health=100,cash=500,jumpY=0,jumpVelocity=0,crashCooldown=0,wantedCooldown=0,wanted=false,playTime=0,transitionTime=0,saveClock=0,pausedRendered=false,nextMobileFrame=0,dragging=false,dragX=0;
const player={x:0,z:-20,yaw:Math.PI},car={x:0,z:-20,yaw:Math.PI,hp:100},bike={x:-10.3,z:-26,yaw:0,hp:100};
const sports={x:10.1,z:38,yaw:0,hp:100},muscle={x:-10.1,z:58,yaw:Math.PI,hp:100},pickup={x:-290.1,z:-28,yaw:0,hp:100},cruiser={x:36,z:-165,yaw:-Math.PI/2,hp:100,siren:false};
const supercar={x:10.1,z:-56,yaw:0,hp:100},suv={x:-10.1,z:-38,yaw:0,hp:100},superbike={x:18,z:420,yaw:-Math.PI/2,hp:100};
window.cityVehicleHome={car:{x:10.1,z:-20,yaw:Math.PI},bike:{x:-10.3,z:-26,yaw:0},sports:{x:10.1,z:38,yaw:0},muscle:{x:-10.1,z:58,yaw:Math.PI},pickup:{x:-290.1,z:-28,yaw:0},cruiser:{x:36,z:-165,yaw:-Math.PI/2},supercar:{x:10.1,z:-56,yaw:0},suv:{x:-10.1,z:-38,yaw:0},superbike:{x:18,z:420,yaw:-Math.PI/2}};
window.cityVehicles={car,bike,sports,muscle,pickup,cruiser,supercar,suv,superbike};
window.vehicleSpecs={
 car:{name:'Kuro Civic-X',max:50,accel:14,steer:1.6,drift:1.1,radius:1.05,halfW:0.90,halfL:2.22},
 bike:{name:'Kuro Pulse 250',max:52.7,accel:15.5,steer:1.95,drift:.65,radius:.52,halfW:0.32,halfL:1.02,isBike:true},
 sports:{name:'Solstice GT-R',max:65.2,accel:17,steer:1.75,drift:1.35,radius:1.05,halfW:0.91,halfL:2.28},
 muscle:{name:'Vanguard Stallion V8',max:60.5,accel:16.5,steer:1.62,drift:1.4,radius:1.05,halfW:0.91,halfL:2.26},
 pickup:{name:'Titan Hauler 4x4',max:47.2,accel:13,steer:1.4,drift:1.1,radius:1.12,halfW:0.97,halfL:2.32},
 cruiser:{name:'NBPD Interceptor',max:70.8,accel:18.5,steer:1.78,drift:1.2,radius:1.05,halfW:0.90,halfL:2.22},
 supercar:{name:'Vortex Veneno-X',max:86.1,accel:22,steer:1.88,drift:1.45,radius:1.08,halfW:0.95,halfL:2.30},
 suv:{name:'Monarch Executive SUV',max:56.9,accel:15,steer:1.52,drift:1.1,radius:1.14,halfW:1.00,halfL:2.38},
 superbike:{name:'Vortex Hayate 1000RR',max:88.8,accel:23,steer:2.1,drift:.85,radius:.55,halfW:0.34,halfL:1.06,isBike:true}
};
window.steerSmooth=0;window.driftVisualYaw=0;window.camOrbitOffset=0;
window.SHORE_Z=-912;window.onMarinaPier=(x,z)=>Math.abs(x)<=5.2&&z<=-908&&z>=-980;window.inVillaPool=(x,z)=>false;
window.swimming=false;window.doorTransition=null;window.nosCharge=100;window.nosActive=false;window.turboPopTime=0;window.prevGear=1;window.gearNow=1;
window._bootOrbitActive=true;window.cameraMode=0;
window.triggerCarDoor=(v,mode='enter')=>{if(!v)return;v.doorAnim={mode,t:0,dur:.72,slammed:false};v.doorAngle=.08;window.playDoorSound?.('open');};
window.wantedLevel=0;window.driftAmount=0;window.vehiclePitch=0;window.vehicleRoll=0;window.brakingNow=false;window.headlightsOn=null;
window.setWantedLevel=n=>{window.wantedLevel=Math.max(0,Math.min(5,Math.floor(n)));wanted=window.wantedLevel>0;return window.wantedLevel;};
window.clearWanted=reason=>{if(window.wantedLevel>0||wanted){window.wantedLevel=0;wanted=false;if(reason)toast(reason);}};

let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const buildings=[],people=[],palette=['#d8e2ec','#cad6e2','#e8dfd5','#c8dce4','#d5d2e4','#dce6ea'];
const buildingNames=['APEX CYBERNETICS','SOLARIS EXCHANGE','VEGA CUSTOMS','PALM STRIP LOUNGE','NEON ARCADE','BAYVIEW GALLERY','TITAN TRUST BANK','MIRAGE TECH'];
for(let x=-110;x<=110;x+=22)for(let z=-110;z<=110;z+=22){if(Math.abs(x)<18||Math.abs(z)<18||(x>=34&&x<=72&&z>=34&&z<=72))continue;buildings.push({x,z,w:17,d:17,h:12+rand()*18,color:palette[Math.floor(rand()*6)],name:buildingNames[Math.floor(rand()*buildingNames.length)]});}

// 48 Object-Pooled Articulated Pedestrians patrolling sidewalks & crosswalks across all 4 Districts
const skinTones=['#d8ab88','#c28c66','#9a6745','#ebd0b5'];
const outfitColors=['#00d4e6','#ff007f','#ffd166','#38f288','#a855f7','#f4f6fa','#ff6e24','#3f72af'];
const hairColors=['#1b1c22','#3b271c','#d6b364','#10141c'];
const pedRoutes=[
 ...Array.from({length:12},(_,i)=>[(i%2?1:-1)*10.8,-95+i*18,'z',100]),
 ...Array.from({length:8},(_,i)=>[-100+i*28,(i%2?1:-1)*10.8,'x',100]),
 [-290,-120,'z',110],[-310,120,'z',110],[310,-120,'z',110],[290,120,'z',110],
 [-120,-612,'x',110],[120,-588,'x',110],[-240,-835,'x',140],[240,-835,'x',140],
 [-80,-835,'x',70],[80,-835,'x',70],
 [-588,-120,'z',100],[-612,120,'z',100],[-588,120,'z',100],[-612,-120,'z',100],
 [-120,312,'x',100],[120,288,'x',100],[-14,420,'z',60],[14,588,'z',60],
 [-120,612,'x',110],[120,588,'x',110],[588,-120,'z',110],[612,120,'z',110],
 [310,600,'z',90],[-310,600,'z',90],[0,880,'x',120],[-180,-300,'x',80],[180,-300,'x',80],[-180,300,'x',80],[180,300,'x',80]
];
for(let i=0;i<48;i++){
 const r=pedRoutes[i%pedRoutes.length];
 const px=r[0]+(r[2]==='x'?rand()*18:0),pz=r[1]+(r[2]==='z'?rand()*18:0);
 people.push({
  x:px,z:pz,axis:r[2],homeX:r[0],homeZ:r[1],span:r[3],
  speed:(.75+rand()*.65)*(i%2?1:-1),curSpeed:.9,
  color:outfitColors[i%outfitColors.length],
  skinColor:skinTones[i%skinTones.length],
  hairColor:hairColors[i%hairColors.length],
  hp:100,down:0,anger:0,cooldown:0,flee:0,yaw:0
 });
}

function isIndoorPoint(x,z,r=0){return buildings.some(b=>b.interior&&Math.abs(x-b.x)<b.w/2+r-0.35&&Math.abs(z-b.z)<b.d/2+r-0.35);}
window.isIndoorPoint=isIndoorPoint;window.currentInteriorBuilding=null;window._lastInteriorLandmark=null;
const collisionBoxes=CityLayout.prepare(buildings);const collisionNear=CityLayout.index(collisionBoxes);
function blocked(x,z,r=.45){return !Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>990-r||z>990-r||z<-1040+r||collisionNear(x,z,r).some(b=>b.active!==false&&Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r)||(r>.5&&isIndoorPoint(x,z,r));}
function moveSlide(obj,dx,dz,r=.45){
 const dist=Math.hypot(dx,dz);
 const steps=Math.max(1,Math.min(16,Math.ceil(dist/.85)));
 const sx=dx/steps,sz=dz/steps;
 let hitX=false,hitZ=false;
 // Gently unstick if already overlapping a collider edge across cardinals + diagonals
 if(blocked(obj.x,obj.z,r)){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[0.707,0.707],[-0.707,0.707],[0.707,-0.707],[-0.707,-0.707]];
  outer:for(const d of [1.2,2.4,4.0]){
   for(const [ux,uz] of dirs){
    if(!blocked(obj.x+ux*d,obj.z+uz*d,r)){obj.x+=ux*d;obj.z+=uz*d;break outer;}
   }
  }
 }
 for(let i=0;i<steps;i++){
  if(!blocked(obj.x+sx,obj.z,r))obj.x+=sx;else hitX=true;
  if(!blocked(obj.x,obj.z+sz,r))obj.z+=sz;else hitZ=true;
 }
 return {hitX,hitZ};
}
function move(obj,dx,dz,r=.45){const h=moveSlide(obj,dx,dz,r);return h.hitX||h.hitZ;}
window.obbOverlap=(a,b)=>{
 if(!a||!b)return null;
 const aW=a.halfW||0.90,aL=a.halfL||2.20,bW=b.halfW||0.90,bL=b.halfL||2.20;
 const maxR=aW+aL+bW+bL;
 const dx=a.x-b.x,dz=a.z-b.z;
 if(Math.abs(dx)>maxR||Math.abs(dz)>maxR)return null;
 const yA=a.yaw||0,yB=b.yaw||0;
 const faX=Math.sin(yA),faZ=Math.cos(yA),raX=faZ,raZ=-faX;
 const fbX=Math.sin(yB),fbZ=Math.cos(yB),rbX=fbZ,rbZ=-fbX;
 let minPen=Infinity,nx=0,nz=0;
 const axes=[[raX,raZ],[faX,faZ],[rbX,rbZ],[fbX,fbZ]];
 for(let i=0;i<4;i++){
  const ux=axes[i][0],uz=axes[i][1];
  const pA=aW*Math.abs(raX*ux+raZ*uz)+aL*Math.abs(faX*ux+faZ*uz);
  const pB=bW*Math.abs(rbX*ux+rbZ*uz)+bL*Math.abs(fbX*ux+fbZ*uz);
  const d=dx*ux+dz*uz;
  const pen=(pA+pB)-Math.abs(d);
  if(pen<=0)return null;
  if(pen<minPen){minPen=pen;const s=d<0?-1:1;nx=ux*s;nz=uz*s;}
 }
 return {pen:minPen,nx,nz};
};
window.parkOtherHeroVehiclesClearOf=(activeKey,x,z,prevKey=null)=>{
 const cv=window.cityVehicles||{},homes=window.cityVehicleHome||{};
 const fallbacks=[{x:10.1,z:-76,yaw:0},{x:-10.1,z:-76,yaw:0},{x:10.1,z:76,yaw:0},{x:-10.1,z:76,yaw:Math.PI}];
 const clearSpot=(px,pz,skipK)=>Math.hypot(px-x,pz-z)>=7.5&&!window.landBlocked(px,pz,1.2)&&!Object.entries(cv).some(([ok,ov])=>ok!==activeKey&&ok!==skipK&&Math.hypot(ov.x-px,ov.z-pz)<5.5);
 for(const [k,ov] of Object.entries(cv)){
  if(!ov||k===activeKey)continue;
  if(k!==prevKey&&Math.hypot(ov.x-x,ov.z-z)>=7.5)continue;
  const hm=homes[k];
  const spot=(hm&&clearSpot(hm.x,hm.z,k))?hm:(fallbacks.find(c=>clearSpot(c.x,c.z,k))||hm||{x:10.1,z:-76,yaw:0});
  ov.x=spot.x;ov.z=spot.z;if(spot.yaw!==undefined)ov.yaw=spot.yaw;
 }
};
window.inWaterOrPool=(x,z)=>z<-910;
window.landBlocked=(x,z,r=.45)=>blocked(x,z,r)||window.inWaterOrPool(x,z);
window.moveLand=(obj,dx,dz,r=.45)=>{let hitX=false,hitZ=false;if(!window.landBlocked(obj.x+dx,obj.z,r))obj.x+=dx;else hitX=true;if(!window.landBlocked(obj.x,obj.z+dz,r))obj.z+=dz;else hitZ=true;return {hitX,hitZ};};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),currentRide=()=>window.cityVehicles[ride]||car,nearestRide=()=>Object.entries(window.cityVehicles).reduce((a,b)=>distance(player,b[1])<distance(player,a[1])?b:a)[0];
function toast(t){const el=$('#toast');if(!el)return;el.textContent=t;el.style.display='block';toastTime=4;}
function clearControls(){window.resetTouch?.();keys.clear();touchInput.forward=touchInput.turn=touchInput.gas=0;touchInput.nos=false;window.steerSmooth=0;window.NeonInput?.reset?.();}
function persist(){if(window.NeonSave&&typeof cash==='number'){const cur=window.NeonSave.getData().cash;if(cur!==cash)window.NeonSave.save({cash});}}
function activeTargets(){return [];}
function recoverVehicle(preferred=null){
 const key=preferred||ride||'car';
 const v=window.cityVehicles[key]||car;
 v.doorAnim=null;v.doorAngle=0;v.jumpY=1.5;v.jumpVy=0;v.jumpPitch=0;v.airborne=true;v.onRamp=null;window.nosActive=false;
 const options=[];
 for(const radius of [3,5,8,12])for(let k=0;k<8;k++){const a=k*Math.PI/4;options.push({x:player.x+Math.cos(a)*radius,z:player.z+Math.sin(a)*radius});}
 const roadCands=[];for(const axis of CityLayout.axes)roadCands.push({x:axis,z:player.z},{x:player.x,z:axis});
 roadCands.sort((a,b)=>distance(player,a)-distance(player,b));
 options.push(...roadCands,{x:0,z:-20});
 const p=options.find(c=>!window.landBlocked(c.x,c.z,1.3)&&c.z>=-900)||{x:0,z:-20};
 v.x=p.x;v.z=p.z;v.yaw=player.yaw;
 inCar=true;ride=key;player.x=v.x;player.z=v.z;player.yaw=v.yaw;window.swimming=false;velocity=0;clearControls();persist();
 toast('Vehicle recovered onto road!');
}
window.flipCar=()=>{
 if(!running||transitionTime>0)return false;
 if(!inCar){recoverVehicle();return true;}
 const v=currentRide(),spec=window.vehicleSpecs[ride]||window.vehicleSpecs.car;
 v.roll=0;v.pitch=0;v.jumpPitch=0;v.onRamp=null;v.doorAnim=null;v.doorAngle=0;
 v.jumpY=1.5;v.jumpVy=0;v.airborne=true;
 window.vehiclePitch=0;window.vehicleRoll=0;window.driftVisualYaw=0;window.nosActive=false;velocity=0;
 let relocated=false;
 if(window.landBlocked(v.x,v.z,spec.radius)){
  const cands=[];
  for(const radius of [3,5.5,8,12,18])for(let k=0;k<8;k++){const a=k*Math.PI/4;cands.push({x:v.x+Math.cos(a)*radius,z:v.z+Math.sin(a)*radius});}
  for(const axis of CityLayout.axes)cands.push({x:axis,z:v.z},{x:v.x,z:axis});
  cands.sort((a,b)=>distance(v,a)-distance(v,b));
  const safe=cands.find(c=>!window.landBlocked(c.x,c.z,Math.max(1.2,spec.radius)));
  if(safe){v.x=safe.x;v.z=safe.z;relocated=true;}
 }
 player.x=v.x;player.z=v.z;player.yaw=v.yaw;clearControls();firstFrame=true;window.sceneDirty=true;persist();
 toast(relocated?'Vehicle flipped onto road!':'Vehicle flipped upright!');
 return true;
};
function interactVehicle(){
 if(!running||transitionTime>0)return false;
 if(inCar){
  if(Math.abs(velocity)>9.0){toast('Slow down to exit vehicle.');return false;}
  velocity=0;const v=currentRide(),spec=window.vehicleSpecs[ride];
  const exitCandidates=[
   ...[2.4,-2.4,3.2,-3.2].map(d=>({x:v.x+d*Math.cos(v.yaw),z:v.z-d*Math.sin(v.yaw)})),
   ...[-3.4,3.4,-4.4,4.4].map(f=>({x:v.x+f*Math.sin(v.yaw),z:v.z+f*Math.cos(v.yaw)}))
  ];
  const p=exitCandidates.find(q=>!blocked(q.x,q.z,.5));
  if(!p){toast('Door is blocked. Move slightly forward.');return false;}
  v.jumpY=v.jumpVy=v.jumpPitch=0;v.airborne=false;v.onRamp=null;window.nosActive=false;
  if(!spec?.isBike){window.triggerCarDoor(v,'exit');window.doorTransition={mode:'exit',v,t:0,dur:.28,toX:p.x,toZ:p.z};}
  inCar=false;Object.assign(player,p);window.swimming=(player.z<window.SHORE_Z&&!window.onMarinaPier(player.x,player.z));
  lookYaw=player.yaw;velocity=0;clearControls();transitionTime=.25;toast('Rico Vega · On Foot');window.updateHUD?.();window.updateTouchUI?.();persist();return true;
 }
 const chosen=nearestRide(),heroV=window.cityVehicles[chosen],heroD=heroV?distance(player,heroV):Infinity;
 if(heroD<5.5){
  const prevX=player.x,prevZ=player.z;ride=chosen;
  if(!window.vehicleSpecs[ride]?.isBike){window.triggerCarDoor(heroV,'enter');window.doorTransition={mode:'enter',v:heroV,t:0,dur:.34,fromX:prevX,fromZ:prevZ};}
  inCar=true;window.swimming=false;window.currentInteriorBuilding=null;window._lastInteriorLandmark=null;frontView=false;firstFrame=true;player.x=heroV.x;player.z=heroV.z;player.yaw=heroV.yaw;lookYaw=heroV.yaw;velocity=0;window.camOrbitOffset=0;clearControls();
  toast(window.vehicleSpecs[ride]?.name||'Vehicle');transitionTime=.25;window.updateHUD?.();window.updateTouchUI?.();persist();return true;
 }
 toast('Move closer to a vehicle (or press R to call car).');return false;
}
window.interactVehicle=interactVehicle;
window.triggerPlayerJump=()=>{if(!inCar&&running&&jumpY===0&&!window.swimming)jumpVelocity=5.4*(window._jumpMultiplier??1);};
window.getNearbyVehicle=()=>{const k=nearestRide(),v=window.cityVehicles[k];return v&&distance(player,v)<5.5?{key:k,vehicle:v,name:window.vehicleSpecs[k]?.name||'Vehicle',dist:distance(player,v)}:null;};
window.adjustLookYaw=delta=>{lookYaw-=delta;};
window.toggleVehicleLights=()=>{
 if(!running)return;
 if(inCar&&ride==='cruiser'){
  const v=window.cityVehicles[ride];v.siren=!v.siren;toast('Police siren '+(v.siren?'ON':'OFF'));
 }else{
  const autoNight=(window.currentDusk||0)>.5;
  const next=window.headlightsOn===null?!autoNight:!window.headlightsOn;
  window.headlightsOn=next;toast(next?'Headlights ON':'Headlights OFF');
 }
 window.updateTouchUI?.();
};
function escalatePolice(minStars=1){
 if(wantedCooldown>0&&window.wantedLevel>=minStars)return;
 const next=window.wantedLevel>0?Math.min(5,Math.max(minStars,window.wantedLevel+1)):minStars;
 wantedCooldown=4;window.setWantedLevel(next);
}
window.escalatePolice=escalatePolice;
function lineClear(a,b){for(const box of collisionBoxes){if(box.active===false)continue;const minX=box.x-box.w/2-.25,maxX=box.x+box.w/2+.25,minZ=box.z-box.d/2-.25,maxZ=box.z+box.d/2+.25;let lo=0,hi=1;for(const [p,d,min,max]of [[a.x,b.x-a.x,minX,maxX],[a.z,b.z-a.z,minZ,maxZ]]){if(Math.abs(d)<1e-6){if(p<min||p>max){lo=2;break;}}else{let t1=(min-p)/d,t2=(max-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);}}if(lo<=hi&&lo<1&&hi>0)return false;}return true;}
function resolveCamera(desired){const a={x:player.x,y:1.6,z:player.z};let ratio=1;for(const b of collisionBoxes){if(b.active===false||a.y>b.h)continue;let lo=0,hi=1;for(const [p,d,min,max]of [[a.x,desired.x-a.x,b.x-b.w/2-.35,b.x+b.w/2+.35],[a.z,desired.z-a.z,b.z-b.d/2-.35,b.z+b.d/2+.35]]){if(Math.abs(d)<1e-6){if(p<min||p>max){lo=2;break;}}else{let t1=(min-p)/d,t2=(max-p)/d;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);}}if(lo<=hi&&lo>=0&&lo<ratio)ratio=Math.max(.12,lo-.07);}return {x:a.x+(desired.x-a.x)*ratio,y:a.y+(desired.y-a.y)*ratio,z:a.z+(desired.z-a.z)*ratio};}

function update(dt){
 if(!running)return;
 playTime+=dt;saveClock+=dt;toastTime-=dt;transitionTime=Math.max(0,transitionTime-dt);crashCooldown=Math.max(0,crashCooldown-dt);wantedCooldown=Math.max(0,wantedCooldown-dt);window.turboPopTime=Math.max(0,(window.turboPopTime||0)-dt);
 jumpVelocity-=12*(window._gravityScale??1)*dt;jumpY=Math.max(0,jumpY+jumpVelocity*dt);if(jumpY===0)jumpVelocity=0;

 const slowScale=window.NeonDrivingJuice?.slowMo?.update?.(dt)??1;
 const effDt=dt*slowScale;

 const inputState=window.NeonInput?.getState?.()||null;
 if(window.NeonInput?.consumeFlip?.()&&!window._gpFlipHeld)window.flipCar?.();
 window._gpFlipHeld=!!inputState?.flip;

 const held=(a,b)=>keys.has(a)||keys.has(b);
 const kbTurn=(held('ArrowRight','KeyD')?1:0)-(held('ArrowLeft','KeyA')?1:0);
 const kbForward=(held('ArrowUp','KeyW')?1:0)-(held('ArrowDown','KeyS')?1:0);
 const turn=inputState
  ? Math.max(-1,Math.min(1,inputState.steering||kbTurn+touchInput.turn))
  : Math.max(-1,Math.min(1,kbTurn+touchInput.turn));

 const noBrakes=!!window._missionDisableBrakes;
 let forward=inputState && (inputState.throttle>0||inputState.reverse>0)
  ? Math.max(-1,Math.min(1,inputState.throttle-inputState.reverse))
  : (inCar&&touchInput.gas?touchInput.gas:Math.max(-1,Math.min(1,kbForward+touchInput.forward)));
 // Smart Brake-to-Reverse for compact 3-pedal touch layout when car is nearly stopped
 if(inCar&&!noBrakes&&inputState&&inputState.brake>0&&inputState.throttle===0&&inputState.reverse===0&&velocity<=0.6){
  forward=-1;
 }

 if(window._bootOrbitActive&&(Math.abs(turn)>.05||Math.abs(forward)>.05||inputState?.nitro)){
  window.dismissBootOverlay?.();
 }

 if(transitionTime<=0){
  if(inCar){
   const v=currentRide(),spec=window.vehicleSpecs[ride]||window.vehicleSpecs.car;
   const turboLv=window.NeonActiveVisuals?.turboLv||0;
   const inBeachSand=noBrakes&&v.z<=-840,driveInput=noBrakes?(inBeachSand?0:Math.max(.35,forward)):forward,opposing=!noBrakes&&driveInput!==0&&Math.abs(velocity)>.5&&Math.sign(driveInput)!==Math.sign(velocity),handbrake=!noBrakes&&(keys.has('Space')||(!!inputState?.handbrake&&forward>=0));
   window._missionBrakeAttempted=noBrakes&&(forward<0||keys.has('Space')||!!inputState?.handbrake);
   const nosWanted=(keys.has('KeyX')||keys.has('ShiftLeft')||keys.has('ShiftRight')||!!touchInput.nos||!!inputState?.nitro)&&driveInput>=0&&!handbrake;
   if(nosWanted&&window.nosCharge>2){if(!window.nosActive)window.playNosBurst?.();window.nosActive=true;window.nosCharge=Math.max(0,window.nosCharge-31*effDt);}
   else{window.nosActive=false;window.nosCharge=Math.min(100,window.nosCharge+(window.driftAmount>.2?30:18)*effDt);}
   const max=spec.max*(1+turboLv*.04)+(window.nosActive?14:0),driveForward=window.nosActive?Math.max(driveInput,1):driveInput;
   window.steerSmooth+=(turn-window.steerSmooth)*Math.min(1,effDt*(Math.abs(turn)>.05?13:11));
   const drifting=handbrake&&Math.abs(window.steerSmooth)>.22&&Math.abs(velocity)>9;
   window.driftAmount=drifting?Math.min(1,window.driftAmount+effDt*4.5):Math.max(0,window.driftAmount-effDt*6);
   window.brakingNow=handbrake||opposing||velocity<-.5;
   const speedRatio=Math.min(1,Math.abs(velocity)/max),torque=opposing?24:(spec.accel*(1+turboLv*.06)+(window.nosActive?26:0))*(1.22-.42*speedRatio);
   velocity+=driveForward*torque*effDt;velocity=Math.max(-9,Math.min(max,velocity));
   const drag=inBeachSand?28:(handbrake?(drifting?6.2:22):(driveForward===0?3.4:.8+speedRatio*1.4));
   velocity=Math.sign(velocity)*Math.max(0,Math.abs(velocity)-drag*effDt);
   const wetSlip=1+(window.worldClock?.rainIntensity||0)*.14;
   const steerDir=Math.abs(velocity)>0.15?Math.sign(velocity):Math.sign(driveForward||1);
   const steerFactor=(driveForward===0&&Math.abs(velocity)<0.05)?0:Math.min(1,Math.max(Math.abs(velocity)/1.1,Math.abs(driveForward)>0.05?0.28:0));
   v.yaw-=window.steerSmooth*steerDir*steerFactor*effDt*spec.steer*(1+.48*spec.drift*wetSlip*window.driftAmount)*(1-.38*speedRatio);
   const spdNow=Math.abs(velocity),gearNow=spdNow>26?5:spdNow>18?4:spdNow>11?3:spdNow>4?2:1;
   window.gearNow=gearNow;
   if(turboLv>0&&gearNow>(window.prevGear||1)&&velocity>4){window.turboPopTime=.22;window.playTurboPop?.();}
   window.prevGear=gearNow;
   const targetSlip=drifting?-Math.sign(window.steerSmooth)*window.driftAmount*.22:0;
   window.driftVisualYaw+=(targetSlip-window.driftVisualYaw)*Math.min(1,effDt*8);
   const targetPitch=Math.max(-.055,Math.min(.055,(opposing||handbrake?.04:driveForward>0?-.025:0)*Math.min(1,Math.abs(velocity)/10)));
   const targetRoll=Math.max(-.06,Math.min(.06,window.steerSmooth*Math.min(1,Math.abs(velocity)/12)*.045*(1+window.driftAmount*.5)));
   window.vehiclePitch+=(targetPitch-window.vehiclePitch)*Math.min(1,effDt*10);
   window.vehicleRoll+=(targetRoll-window.vehicleRoll)*Math.min(1,effDt*10);
   if(!window.camOrbitHold)window.camOrbitOffset*=Math.max(0,1-dt*3.5);
   const travel=velocity*effDt;
   const subSteps=Math.max(1,Math.min(4,Math.ceil(Math.abs(travel)/1.6)));
   const trafficPool=window.NeonTraffic?.pool||[];
   const activeCops=window.NeonPolice?.getActivePoliceCoords?.()||[];
   const myHW=spec.halfW||0.90,myHL=spec.halfL||2.20;
   const pBox={x:v.x,z:v.z,yaw:v.yaw,halfW:myHW,halfL:myHL};
   const oBox={x:0,z:0,yaw:0,halfW:0.90,halfL:2.20};
   let wallHit=false,dampedThisTick=false;
   const applyObbPair=(ox,oz,oyaw,ohw,ohl,movableObj,kind,iter)=>{
    oBox.x=ox;oBox.z=oz;oBox.yaw=oyaw||0;oBox.halfW=ohw;oBox.halfL=ohl;
    pBox.x=v.x;pBox.z=v.z;
    const mtv=window.obbOverlap(pBox,oBox);
    if(!mtv)return;
    const sep=mtv.pen+0.03;
    const vx=Math.sin(v.yaw)*velocity,vz=Math.cos(v.yaw)*velocity;
    const closingInto=-(vx*mtv.nx+vz*mtv.nz);
    let pPush=sep;
    if(movableObj){
     const oPush=sep*0.55+(closingInto>6?Math.min(0.35,closingInto*0.015):0);
     const tox=movableObj.x-mtv.nx*oPush,toz=movableObj.z-mtv.nz*oPush;
     let movedO=0;
     if(!window.landBlocked(tox,toz,1.05)){movableObj.x=tox;movableObj.z=toz;movedO=oPush;}
     else{
      if(!window.landBlocked(tox,movableObj.z,1.05)){movableObj.x=tox;movedO+=oPush*0.4;}
      if(!window.landBlocked(movableObj.x,toz,1.05)){movableObj.z=toz;movedO+=oPush*0.4;}
     }
     pPush=Math.max(sep*0.45,sep-movedO);
    }
    moveSlide(v,mtv.nx*pPush,mtv.nz*pPush,spec.radius);
    if(!dampedThisTick&&iter===0&&closingInto>0){
     const spd=Math.abs(velocity);
     if(spd>0.05){
      const impactFrac=Math.min(1,closingInto/spd);
      if(impactFrac<0.28){
       velocity*=0.96;
      }else if(impactFrac<0.70){
       velocity*=Math.max(0.62,1-0.45*impactFrac);
       if(closingInto>11&&crashCooldown<=0){const imp=Math.min(1,closingInto/24);window.playCrash?.(imp*.6);window.triggerCameraShake?.(.12+imp*.16,.2);v.hp=Math.max(0,(v.hp??100)-6);crashCooldown=.9;}
      }else{
       if(kind==='police'&&closingInto>7){
        if(crashCooldown<=0){window.playCrash?.(.75);window.triggerCameraShake?.(.36,.28);v.hp=Math.max(0,(v.hp??100)-12);crashCooldown=1;escalatePolice(2);}
        velocity*=0.45;
       }else if(kind!=='police'&&closingInto>10){
        const imp=Math.min(1,closingInto/24);
        if(crashCooldown<=0){window.playCrash?.(imp);window.triggerCameraShake?.(.14+imp*.24,.24);v.hp=Math.max(0,(v.hp??100)-10);crashCooldown=.9;}
        velocity*=0.48;
       }else{
        velocity*=0.55;
       }
      }
      dampedThisTick=true;
     }
    }
   };
   for(let ss=0;ss<subSteps;ss++){
    const sd=(velocity*effDt)/subSteps;
    const dx=Math.sin(v.yaw)*sd,dz=Math.cos(v.yaw)*sd;
    if(v.z+dz<-908&&!window.onMarinaPier(v.x+dx,v.z+dz)){
     if(!blocked(v.x+dx,v.z,spec.radius))v.x+=dx;
     v.z=Math.max(-908,v.z);if(!wallHit){velocity*=.4;wallHit=true;}
    }else if(window.onMarinaPier(v.x,v.z)&&v.z+dz<-976){
     v.z=-976;if(!wallHit){velocity*=.2;wallHit=true;}
    }else{
     const hit=moveSlide(v,dx,dz,spec.radius);
     if(hit.hitX&&hit.hitZ){
      if(!wallHit){
       if(Math.abs(velocity)>13){const imp=Math.min(1,Math.abs(velocity)/24);window.playCrash?.(imp);window.triggerCameraShake?.(.16+imp*.26,.25);if(crashCooldown<=0){v.hp=Math.max(0,(v.hp??100)-14);crashCooldown=1;}}
       velocity*=.35;wallHit=true;
      }
     }else if((hit.hitX||hit.hitZ)&&!wallHit){velocity*=.93;wallHit=true;}
    }
    if((v.jumpY||0)<1.8){
     for(let iter=0;iter<2;iter++){
      for(let i=0;i<trafficPool.length;i++){
       const t=trafficPool[i];
       if(t.active)applyObbPair(t.x,t.z,t.yaw,t.halfW||0.92,t.halfL||2.18,t,'traffic',iter);
      }
      for(const hk in window.cityVehicles){
       if(hk===ride)continue;
       const ov=window.cityVehicles[hk],hs=window.vehicleSpecs[hk];
       if(ov)applyObbPair(ov.x,ov.z,ov.yaw,hs?.halfW||0.90,hs?.halfL||2.20,null,'hero',iter);
      }
      for(let i=0;i<activeCops.length;i++){
       const cp=activeCops[i];
       applyObbPair(cp.x,cp.z,cp.yaw||0,cp.halfW||0.90,cp.halfL||2.22,cp.unit||null,'police',iter);
      }
     }
    }
   }
   const wRad=ride==='pickup'?.46:.41;
   v.wheelSpin=(v.wheelSpin||0)+velocity*effDt/wRad;
   window.updateVehicleJump?.(v,effDt,velocity,window.landBlocked);
   player.x=v.x;player.z=v.z;player.yaw=v.yaw;window.swimming=false;
   window.currentInteriorBuilding=null;window._lastInteriorLandmark=null;
  }else{
   window.nosActive=false;window.prevGear=1;window.driftAmount=window.vehiclePitch=window.vehicleRoll=window.steerSmooth=window.driftVisualYaw=window.camOrbitOffset=0;window.brakingNow=false;
   const camSpin=(keys.has('BracketRight')||keys.has('Period')?1:0)-(keys.has('BracketLeft')||keys.has('Comma')?1:0);
   if(camSpin)lookYaw-=camSpin*1.8*dt*settings.sensitivity;
   const walkYaw=lookYaw+(frontView?Math.PI:0),magnitude=Math.min(1,Math.hypot(turn,forward)),norm=Math.hypot(turn,forward)||1,dx=(Math.sin(walkYaw)*forward-Math.cos(walkYaw)*turn)/norm,dz=(Math.cos(walkYaw)*forward+Math.sin(walkYaw)*turn)/norm;
   window.swimming=(player.z<window.SHORE_Z&&!window.onMarinaPier(player.x,player.z));
   const fast=keys.has('ShiftLeft')||keys.has('ShiftRight')||!!inputState?.nitro||!!touchInput.nos;
   const walkBase=window.swimming?(fast?4.4:2.7):(fast?6.8:3.8);
   velocity=magnitude*walkBase;
   if(window.swimming){jumpY=0;jumpVelocity=0;}
   if(magnitude>.03){const desired=Math.atan2(dx,dz);player.yaw+=Math.atan2(Math.sin(desired-player.yaw),Math.cos(desired-player.yaw))*Math.min(1,dt*14);}
   move(player,dx*velocity*dt,dz*velocity*dt);
   window.swimming=(player.z<window.SHORE_Z&&!window.onMarinaPier(player.x,player.z));
   const insideB=buildings.find(b=>b.landmark&&b.interior&&Math.abs(player.x-b.x)<b.w/2-0.35&&Math.abs(player.z-b.z)<b.d/2-0.35)||null;
   if((insideB?.landmark||null)!==window._lastInteriorLandmark){
    window._lastInteriorLandmark=insideB?.landmark||null;
    window.currentInteriorBuilding=insideB;
    if(insideB){
     if(insideB.landmark==='vegaGarage'){
      const rv=currentRide();
      if(rv){rv.hp=100;rv.wrecked=false;window.NeonVehicleDamage?.repair?.(rv);}
      toast("VEGA'S GARAGE: VEHICLE REPAIRED!");
     }else{
      toast('ENTERED '+insideB.name);
     }
    }
   }
  }
 }

 // Articulated Pedestrians with Speed-Synced Walk & Vehicle-Dodge Flee AI
 for(const p of people){
  p.cooldown=Math.max(0,p.cooldown-dt);p.flee=Math.max(0,(p.flee||0)-dt);
  if(p.hp<=0){p.down-=dt;if(p.down<=0){p.hp=100;p.anger=0;p.flee=0;p.x=p.homeX;p.z=p.homeZ??(-95+rand()*190);}continue;}
  const pDist=distance(p,player);
  if(inCar&&pDist>0.01&&pDist<2.75){const nxP=player.x+((p.x-player.x)/pDist)*2.85,nzP=player.z+((p.z-player.z)/pDist)*2.85;if(!window.landBlocked(nxP,nzP,.45)){p.x=nxP;p.z=nzP;}}
  if(inCar&&Math.abs(velocity)>6&&pDist<14){p.flee=2.8;}
  if(p.flee>0&&pDist<22&&pDist>0.05){
   const fx=(p.x-player.x)/pDist,fz=(p.z-player.z)/pDist,fleeSpd=3.9;
   if(!window.landBlocked(p.x+fx*fleeSpd*dt,p.z+fz*fleeSpd*dt,.45)){p.x+=fx*fleeSpd*dt;p.z+=fz*fleeSpd*dt;}
   p.yaw=Math.atan2(fx,fz);p.curSpeed=fleeSpd;continue;
  }
  const close=pDist<3.2&&inCar;
  if(!close){
   p.curSpeed=Math.abs(p.speed);
   if(p.axis==='x'){const nx=p.x+p.speed*dt;if(!window.landBlocked(nx,p.z,.45))p.x=nx;else p.speed*=-1;p.yaw=p.speed>0?Math.PI/2:-Math.PI/2;if(Math.abs(p.x-p.homeX)>p.span)p.speed*=-1;}
   else{const nz=p.z+p.speed*dt;if(!window.landBlocked(p.x,nz,.45))p.z=nz;else p.speed*=-1;p.yaw=p.speed>0?0:Math.PI;if(Math.abs(p.z-(p.homeZ??0))>p.span)p.speed*=-1;}
  }else{p.curSpeed=0;}
 }

 window.updateNeonSystems?.(dt);
 if(saveClock>5){saveClock=0;persist();}
 if(toastTime<=0){const el=$('#toast');if(el)el.style.display='none';}
 window.updateHUD?.();
 window.updateTouchUI?.();
}

function drawMap(){if(window.drawCityMap)return window.drawCityMap();}

window.sceneDirty=true;
addEventListener('resize',()=>window.sceneDirty=true);
addEventListener('keydown',e=>{
 if(e.code==='Escape'){
  e.preventDefault();if(e.repeat)return;
  if(window.NeonPhotoMode?.active){window.NeonPhotoMode.exit();return;}
  if(window.NeonPhone?.isOpen){window.NeonPhone.close();return;}
  if(window.NeonMinimap?.fullMapOpen){window.NeonMinimap.toggleFullMap(false);return;}
  window.togglePauseMenu?.();
  return;
 }
 if(!running||e.target?.matches?.('input,select,textarea'))return;
 if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
 keys.add(e.code);
 if(e.repeat)return;
 if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){window.dismissBootOverlay?.();}
 if(e.code==='KeyE'||e.code==='KeyF')interactVehicle();
 if(e.code==='KeyR')(inCar?window.flipCar:recoverVehicle)();
 if(e.code==='KeyV'||e.code==='KeyH'){window.horn?.();window.NeonTraffic?.reactToHorn?.(player);}
 if(e.code==='KeyN'){if(e.shiftKey)window.cycleRadio?.();else window.toggleVehicleLights();}
 if(e.code==='KeyT')window.cycleRadio?.();
 if(e.code==='Space'&&!inCar&&jumpY===0)window.triggerPlayerJump();
});
addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('pointerdown',e=>{if(running&&!mobileMode&&e.button===0){dragging=true;dragX=e.clientX;}});
addEventListener('pointermove',e=>{if(!running||inCar)return;if(document.pointerLockElement===canvas)lookYaw-=e.movementX*.003*settings.sensitivity;else if(dragging&&!mobileMode){lookYaw-=(e.clientX-dragX)*.005*settings.sensitivity;dragX=e.clientX;}});
addEventListener('pointerup',()=>dragging=false);
addEventListener('pointercancel',()=>dragging=false);
const flipBtn=$('#flipCarBtn');
if(flipBtn){flipBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.flipCar?.();});}

function frame(t){
 requestAnimationFrame(frame);
 if(document.hidden)return;
 if(mobileMode&&settings.fpsCap!==60){if(!nextMobileFrame||t-nextMobileFrame>100)nextMobileFrame=t;if(t+.5<nextMobileFrame)return;nextMobileFrame+=1000/30;}
 const dt=Math.max(0,Math.min((t-last)/1000,.08));last=t;
 update(dt);
 window.updateTouchUI?.();
 if(!running&&!window.photoModeActive&&pausedRendered&&!window.sceneDirty)return;
 render(t);
 pausedRendered=!running;
 window.sceneDirty=false;
}
