/* NEON BAY: OVERDRIVE — 2000m x 2000m 4-District 3D City, Instanced Architecture, Beachfront, Port, Airport & Landmarks */
const citySectors=[];
const instDummy=new THREE.Object3D();
const instCol=new THREE.Color();

// 1. Textured Ground Terrain, Multi-Lane Boulevards, Intersections, Zebra Crosswalks & Curbs
const ground=new THREE.Group();scene.add(ground);
const groundTex=texture((c,w,h)=>{
 c.fillStyle='#5c6670';c.fillRect(0,0,w,h);
 for(let i=0;i<3200;i++){c.fillStyle=rand()>.5?'#6a7480':'#4d5660';c.fillRect(rand()*w,rand()*h,2,2);}
 c.strokeStyle='rgba(255,255,255,0.05)';c.lineWidth=2;
 for(let g=0;g<w;g+=64){c.strokeRect(g,0,64,64);}
},256,256);
groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.repeat.set(90,90);

const roadLaneTex=texture((c,w,h)=>{
 c.fillStyle='#343c48';c.fillRect(0,0,w,h);
 for(let i=0;i<4200;i++){c.fillStyle=rand()>.5?'#434d5b':'#282f3a';c.fillRect(rand()*w,rand()*h,2,2);}
 // Subtle darker vehicle wheel tracks in all 4 lanes
 c.fillStyle='rgba(16,20,28,0.28)';
 for(const lx of [34,48,84,98,154,168,204,218])c.fillRect(lx,0,7,h);
 // Solid crisp white outer shoulder lines
 c.fillStyle='#dce6f2';c.fillRect(10,0,4,h);c.fillRect(w-14,0,4,h);
 // Double golden-yellow centerlines
 c.fillStyle='#f6c945';c.fillRect(123,0,3,h);c.fillRect(130,0,3,h);
 // Crisp white dashed inner lane dividers
 c.fillStyle='#e4eef8';
 for(const y of [14,142]){c.fillRect(65,y,3,88);c.fillRect(188,y,3,88);}
},256,256);
roadLaneTex.wrapS=roadLaneTex.wrapT=THREE.RepeatWrapping;roadLaneTex.repeat.set(1,118);

const interAsphaltTex=texture((c,w,h)=>{
 c.fillStyle='#343c48';c.fillRect(0,0,w,h);
 for(let i=0;i<1600;i++){c.fillStyle=rand()>.5?'#434d5b':'#282f3a';c.fillRect(rand()*w,rand()*h,2,2);}
},128,128);
interAsphaltTex.wrapS=interAsphaltTex.wrapT=THREE.RepeatWrapping;interAsphaltTex.repeat.set(2,2);

const roadMat=new THREE.MeshStandardMaterial({map:roadLaneTex,roughness:.84,metalness:.06});
window.roadMaterials=window.roadMaterials||[];window.roadMaterials.push(roadMat);

block(ground,0,-.26,0,2200,.2,2200,new THREE.MeshStandardMaterial({map:groundTex,roughness:.92}));
for(const a of CityLayout.axes){
 const rw=(a===0||Math.abs(a)===900||a===-600)?24:22;
 const ns=block(ground,a,-.02,0,rw,.04,1900,roadMat);ns.receiveShadow=true;
 const ew=block(ground,0,-.012,a,rw,.04,1900,roadMat);ew.rotation.y=Math.PI/2;ew.receiveShadow=true;
}
// Perimeter walls on East, West, North edges (South opens onto Palm Strip Beach & Ocean)
for(const side of [-1,1])block(ground,side*996,.7,40,1.4,1.4,1940,'#6e7a86');
block(ground,0,.7,996,1994,1.4,1.4,'#6e7a86');
citySectors.push({x:0,z:0,always:true,model:mergeStaticModel(ground)});

// Clean Asphalt Intersection Pads (mask centerlines across 7x7 crossings, 1 draw call)
const interPadInst=new THREE.InstancedMesh(new THREE.BoxGeometry(24.6,.03,24.6),new THREE.MeshStandardMaterial({map:interAsphaltTex,roughness:.86,metalness:.05}),CityLayout.nodes.length);
CityLayout.nodes.forEach((n,i)=>{
 instDummy.position.set(n.x,-.004,n.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(1,1,1);instDummy.updateMatrix();
 interPadInst.setMatrixAt(i,instDummy.matrix);
});
interPadInst.instanceMatrix.needsUpdate=true;
scene.add(interPadInst);

// Instanced White Zebra Crosswalks around major intersections (1 draw call)
const crosswalkList=[];
for(const ix of [-300,0,300]){
 for(const iz of [-600,-300,0,300,600]){
  for(let s=-9;s<=9;s+=3){
   crosswalkList.push([ix+s,iz+14.5,0],[ix+s,iz-14.5,0],[ix+14.5,iz+s,Math.PI/2],[ix-14.5,iz+s,Math.PI/2]);
  }
 }
}
const dashInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1.1,.02,3.4),new THREE.MeshBasicMaterial({color:'#e8f0fa'}),crosswalkList.length);
crosswalkList.forEach(([x,z,rot],i)=>{
 instDummy.position.set(x,.016,z);instDummy.rotation.set(0,rot,0);instDummy.scale.set(1,1,1);instDummy.updateMatrix();
 dashInst.setMatrixAt(i,instDummy.matrix);
});
dashInst.instanceMatrix.needsUpdate=true;
scene.add(dashInst);

// Instanced Concrete Sidewalks & Curbs flanking major boulevards (2 draw calls)
const sidewalkSegments=[];
for(const a of [-600,-300,0,300,600]){
 for(const c of [-750,-450,-150,150,450,750]){
  if(a===0&&Math.abs(c)<=150)continue;
  sidewalkSegments.push([a-14.4,c,0],[a+14.4,c,0],[c,a-14.4,Math.PI/2],[c,a+14.4,Math.PI/2]);
 }
}
const sidewalkInst=new THREE.InstancedMesh(new THREE.BoxGeometry(4.4,.18,266),new THREE.MeshStandardMaterial({color:'#9aa4b0',roughness:.88}),sidewalkSegments.length);
const curbInst=new THREE.InstancedMesh(new THREE.BoxGeometry(.32,.22,266),new THREE.MeshStandardMaterial({color:'#cfd6de',roughness:.78}),sidewalkSegments.length);
sidewalkSegments.forEach(([x,z,rot],i)=>{
 instDummy.position.set(x,.04,z);instDummy.rotation.set(0,rot,0);instDummy.scale.set(1,1,1);instDummy.updateMatrix();
 sidewalkInst.setMatrixAt(i,instDummy.matrix);
 const cx=rot===0?(x>Math.round(x/300)*300?x-2.1:x+2.1):x;
 const cz=rot!==0?(z>Math.round(z/300)*300?z-2.1:z+2.1):z;
 instDummy.position.set(cx,.06,cz);instDummy.updateMatrix();
 curbInst.setMatrixAt(i,instDummy.matrix);
});
sidewalkInst.instanceMatrix.needsUpdate=true;curbInst.instanceMatrix.needsUpdate=true;
scene.add(sidewalkInst,curbInst);

// 2. Keep Open-Shop Interiors at Apex Core Center (from buildings Grid)
const interiorGroup=new THREE.Group();scene.add(interiorGroup);
for(const b of buildings.filter(b=>b.interior)){
 const left=b.x<0,lounge=left&&b.z===-44,mart=!left&&b.z===-44,fashion=left&&b.z===-22,salon=!left&&b.z===-22,garage=!left&&b.z===22;
 const trim=lounge?'#a85238':mart?'#2f7b6d':fashion?'#975b53':salon?'#527c78':garage?'#566e83':'#4d878e';
 block(interiorGroup,b.x,3.5,b.z,8,.08,.2,'#ffe4ad');
 block(interiorGroup,b.x+(left?-5:5),.55,b.z,1.2,1.1,5,trim);
 if(mart){
  for(const dz of [-5.5,5.5]){block(interiorGroup,b.x,1.15,b.z+dz,7.5,.1,1,'#788985');block(interiorGroup,b.x,1.85,b.z+dz,7.5,.1,1,'#788985');for(let j=-3;j<=3;j++)block(interiorGroup,b.x+j,1.4,b.z+dz,.55,.38,.55,['#d66d50','#6cb3a3','#e0bd65','#5b85b3'][Math.abs(j)%4]);}
 }else if(garage){
  for(const dz of [-5,5]){block(interiorGroup,b.x,1,b.z+dz,6,.12,1,'#77736a');for(let i=-2;i<=2;i++)block(interiorGroup,b.x+i,1.35,b.z+dz,.4,.6,.35,'#c5a66e');}
 }
 sign(interiorGroup,b.name,'APEX CORE',b.x,2.8,b.z+7.9,9,Math.PI,trim);
}
citySectors.push({x:0,z:0,model:mergeStaticModel(interiorGroup)});

// 3. Textured & Illuminated Sleek Modern Skyscrapers, Art-Deco Resorts, Villas, Plazas & Shipping Containers
const towerLit=[];
const towerGlassTex=texture((c,w,h)=>{
 const bg=c.createLinearGradient(0,0,0,h);
 bg.addColorStop(0,'#6f97bd');bg.addColorStop(0.55,'#4c7296');bg.addColorStop(1,'#365370');
 c.fillStyle=bg;c.fillRect(0,0,w,h);
 for(let row=0;row<16;row++){
  const y=row*32;
  c.fillStyle='#24384c';c.fillRect(0,y,w,7);
  c.fillStyle='rgba(255,255,255,0.14)';c.fillRect(0,y+7,w,2);
  for(let col=0;col<4;col++){
   const x=6+col*62,isLit=((row*5+col*11)%11)<3;
   towerLit.push({x,y:y+10,w:52,h:19,isLit,hue:(row+col)%2});
   const wg=c.createLinearGradient(x,y+10,x,y+29);
   if(isLit){wg.addColorStop(0,((row+col)%2)?'#fff2cc':'#cff4ff');wg.addColorStop(1,'#8eb2cc');}
   else{wg.addColorStop(0,'#7aa4c8');wg.addColorStop(1,'#466785');}
   c.fillStyle=wg;c.fillRect(x,y+10,52,19);
   c.fillStyle='rgba(255,255,255,0.2)';c.fillRect(x+2,y+10,9,19);
   c.fillStyle='#2e4459';c.fillRect(x+52,y+7,10,25);
  }
 }
},256,512);
towerGlassTex.wrapS=towerGlassTex.wrapT=THREE.RepeatWrapping;towerGlassTex.repeat.set(1,2);

const towerGlassEmit=texture((c,w,h)=>{
 c.fillStyle='#08101a';c.fillRect(0,0,w,h);
 for(const wnd of towerLit){
  c.fillStyle=wnd.isLit?(wnd.hue?'#ffe4a8':'#aceeff'):'#122234';
  c.fillRect(wnd.x+2,wnd.y+2,wnd.w-4,wnd.h-4);
 }
},256,512);
towerGlassEmit.wrapS=towerGlassEmit.wrapT=THREE.RepeatWrapping;towerGlassEmit.repeat.set(1,2);

const resortLit=[];
const resortTex=texture((c,w,h)=>{
 // Pastel Ocean Drive Art-Deco stucco facade with horizontal speedlines & glowing neon trim ledges
 c.fillStyle='#f4ebe1';c.fillRect(0,0,w,h);
 for(let y=12;y<h-16;y+=62){
  c.fillStyle='#ffffff';c.fillRect(0,y+39,w,7);
  c.fillStyle=(y%124===12)?'#ff4d9e':'#00e5ff';c.fillRect(0,y+46,w,4);
  for(let x=14;x<w-18;x+=60){
   const isLit=((x+y)%5)<2;
   resortLit.push({x,y,isLit,neon:(y%124===12)});
   c.fillStyle='#243b52';c.fillRect(x,y,46,36);
   c.fillStyle=isLit?'#ffe4ad':'#5b84a6';c.fillRect(x+2,y+2,42,32);
   c.fillStyle='#efe6dc';c.fillRect(x+22,y,2,36);
  }
 }
},256,256);
resortTex.wrapS=resortTex.wrapT=THREE.RepeatWrapping;resortTex.repeat.set(1,2);

const resortEmit=texture((c,w,h)=>{
 c.fillStyle='#0d131c';c.fillRect(0,0,w,h);
 for(let y=12;y<h-16;y+=62){
  c.fillStyle=(y%124===12)?'#ff2a85':'#00d8ff';c.fillRect(0,y+46,w,4);
 }
 for(const r of resortLit){
  c.fillStyle=r.isLit?'#ffd68a':'#1a2b3d';
  c.fillRect(r.x+2,r.y+2,42,32);
 }
},256,256);
resortEmit.wrapS=resortEmit.wrapT=THREE.RepeatWrapping;resortEmit.repeat.set(1,2);

const villaTex=texture((c,w,h)=>{
 // Hillside Bayview Villa: warm stucco, terracotta trim band & wide panoramic glass windows
 c.fillStyle='#f6efe6';c.fillRect(0,0,w,h);
 c.fillStyle='#c46542';c.fillRect(0,0,w,16);
 for(let y=28;y<h-28;y+=96){
  c.fillStyle='#d8c8b6';c.fillRect(0,y+56,w,8);
  for(let x=18;x<w-24;x+=114){
   c.fillStyle='#233344';c.fillRect(x-3,y-3,94,54);
   c.fillStyle='#ffe8b8';c.fillRect(x,y,88,48);
   c.fillStyle='#233344';c.fillRect(x+42,y,4,48);
  }
 }
},256,256);
villaTex.wrapS=villaTex.wrapT=THREE.RepeatWrapping;villaTex.repeat.set(1,1);

const villaEmit=texture((c,w,h)=>{
 c.fillStyle='#0e141d';c.fillRect(0,0,w,h);
 for(let y=28;y<h-28;y+=96){
  for(let x=18;x<w-24;x+=114){
   c.fillStyle='#ffd68a';c.fillRect(x+2,y+2,84,44);
  }
 }
},256,256);
villaEmit.wrapS=villaEmit.wrapT=THREE.RepeatWrapping;villaEmit.repeat.set(1,1);

const containerTex=texture((c,w,h)=>{
 // Corrugated industrial steel + yellow/black hazard stripe + BAY 01 stencil
 c.fillStyle='#e6edf5';c.fillRect(0,0,w,h);
 for(let x=0;x<w;x+=12){c.fillStyle='#b2c0d0';c.fillRect(x,0,4,h);c.fillStyle='#ffffff';c.fillRect(x+4,0,3,h);}
 c.fillStyle='#f2b705';c.fillRect(0,h-20,w,18);
 c.fillStyle='#181c22';for(let hx=-16;hx<w+16;hx+=18){c.beginPath();c.moveTo(hx,h-20);c.lineTo(hx+9,h-20);c.lineTo(hx+2,h-2);c.lineTo(hx-7,h-2);c.closePath();c.fill();}
 c.fillStyle='#14202c';c.font='900 18px Segoe UI, sans-serif';c.textAlign='center';c.fillText('BAY 04',w/2,36);
 c.strokeStyle='#6e7e90';c.lineWidth=6;c.strokeRect(2,2,w-4,h-4);
},128,128);

// Single-source build: derive 100% of outer instanced visuals from the SAME `buildings` array used by collision!
const towerList=[],resortList=[],villaList=[],containerList=[],plazaList=[];
for(const b of buildings){
 if(b.landmark||(Math.abs(b.x)<=120&&Math.abs(b.z)<=120))continue;
 if(b.kind==='container'){
  for(const dx of [-4.5,4.5]){
   containerList.push({x:b.x+dx,y:1.5,z:b.z,w:5.5,h:3,d:15,col:b.color});
   if(Math.abs(b.x+b.z)%2===0)containerList.push({x:b.x+dx,y:4.5,z:b.z,w:5.5,h:3,d:15,col:b.accent||'#18b8d4'});
  }
  plazaList.push({x:b.x,z:b.z,w:b.w+6,d:b.d+6,col:'#7c8894'});
 }else if(b.kind==='villa'){
  villaList.push(b);
  plazaList.push({x:b.x,z:b.z,w:b.w+9,d:b.d+9,col:'#5d8f6e'});
 }else if(b.kind==='resort'){
  resortList.push(b);
  plazaList.push({x:b.x,z:b.z,w:b.w+8,d:b.d+8,col:'#8aa2ae'});
 }else{
  towerList.push(b);
  plazaList.push({x:b.x,z:b.z,w:b.w+8,d:b.d+8,col:'#748292'});
 }
}

const blockPlazaInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.9}),Math.max(1,plazaList.length));
plazaList.forEach((p,i)=>{
 instDummy.position.set(p.x,.015,p.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(p.w,.22,p.d);instDummy.updateMatrix();
 blockPlazaInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(p.col);blockPlazaInst.setColorAt(i,instCol);
});
blockPlazaInst.count=plazaList.length;blockPlazaInst.instanceMatrix.needsUpdate=true;
if(blockPlazaInst.instanceColor)blockPlazaInst.instanceColor.needsUpdate=true;
scene.add(blockPlazaInst);

const highRiseList=[...towerList,...resortList];
const podiumInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#d6dee8',map:villaTex,roughness:.58,metalness:.14}),Math.max(1,highRiseList.length));
const towerCrownInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#547494',roughness:.4,metalness:.26}),Math.max(1,highRiseList.length));
const towerNeonInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#ffffff'}),Math.max(1,highRiseList.length));
highRiseList.forEach((b,i)=>{
 instDummy.position.set(b.x,2.9,b.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(b.w,5.8,b.d);instDummy.updateMatrix();
 podiumInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(b.kind==='resort'?'#e8dfd4':'#cfd9e4');podiumInst.setColorAt(i,instCol);
 instDummy.position.set(b.x,b.h+2.0,b.z);instDummy.scale.set(b.w*.68,4.0,b.d*.68);instDummy.updateMatrix();
 towerCrownInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(b.kind==='resort'?'#f0e2d2':'#4e7296');towerCrownInst.setColorAt(i,instCol);
 instDummy.position.set(b.x,b.h-.35,b.z);instDummy.scale.set(b.w*.95,.55,b.d*.95);instDummy.updateMatrix();
 towerNeonInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(b.accent||'#00f0ff');towerNeonInst.setColorAt(i,instCol);
});
podiumInst.count=highRiseList.length;towerCrownInst.count=highRiseList.length;towerNeonInst.count=highRiseList.length;
podiumInst.instanceMatrix.needsUpdate=true;towerCrownInst.instanceMatrix.needsUpdate=true;towerNeonInst.instanceMatrix.needsUpdate=true;
if(podiumInst.instanceColor)podiumInst.instanceColor.needsUpdate=true;
if(towerCrownInst.instanceColor)towerCrownInst.instanceColor.needsUpdate=true;
if(towerNeonInst.instanceColor)towerNeonInst.instanceColor.needsUpdate=true;
scene.add(podiumInst,towerCrownInst,towerNeonInst);

const towerBodyMat=new THREE.MeshStandardMaterial({color:'#ffffff',map:towerGlassTex,emissive:'#ffdfad',emissiveMap:towerGlassEmit,emissiveIntensity:0.55,roughness:.32,metalness:.26});
const resortBodyMat=new THREE.MeshStandardMaterial({color:'#ffffff',map:resortTex,emissive:'#ffdfb0',emissiveMap:resortEmit,emissiveIntensity:0.46,roughness:.58,metalness:.08});
window.facadeMaterials=window.facadeMaterials||[];window.facadeMaterials.push(towerBodyMat,resortBodyMat);
const towerBodyInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),towerBodyMat,Math.max(1,towerList.length));
towerList.forEach((b,i)=>{
 const shaftH=Math.max(4,b.h-5.4);
 instDummy.position.set(b.x,5.4+shaftH/2,b.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(b.w*.92,shaftH,b.d*.92);instDummy.updateMatrix();
 towerBodyInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(b.color);towerBodyInst.setColorAt(i,instCol);
});
towerBodyInst.count=towerList.length;towerBodyInst.instanceMatrix.needsUpdate=true;
if(towerBodyInst.instanceColor)towerBodyInst.instanceColor.needsUpdate=true;
scene.add(towerBodyInst);

const resortBodyInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),resortBodyMat,Math.max(1,resortList.length));
resortList.forEach((b,i)=>{
 const shaftH=Math.max(4,b.h-5.4);
 instDummy.position.set(b.x,5.4+shaftH/2,b.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(b.w*.92,shaftH,b.d*.92);instDummy.updateMatrix();
 resortBodyInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(b.color);resortBodyInst.setColorAt(i,instCol);
});
resortBodyInst.count=resortList.length;resortBodyInst.instanceMatrix.needsUpdate=true;
if(resortBodyInst.instanceColor)resortBodyInst.instanceColor.needsUpdate=true;
scene.add(resortBodyInst);

const containerInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',map:containerTex,roughness:.58,metalness:.22}),Math.max(1,containerList.length));
containerList.forEach((c,i)=>{
 instDummy.position.set(c.x,c.y,c.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(c.w,c.h,c.d);instDummy.updateMatrix();
 containerInst.setMatrixAt(i,instDummy.matrix);
 instCol.set(c.col);containerInst.setColorAt(i,instCol);
});
containerInst.count=containerList.length;containerInst.instanceMatrix.needsUpdate=true;
if(containerInst.instanceColor)containerInst.instanceColor.needsUpdate=true;
scene.add(containerInst);

const villaMat=new THREE.MeshStandardMaterial({color:'#ffffff',map:villaTex,emissive:'#ffe0a8',emissiveMap:villaEmit,emissiveIntensity:.48,roughness:.68});
window.facadeMaterials.push(villaMat);
const villaBodyInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),villaMat,Math.max(1,villaList.length));
const villaRoofInst=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.5,metalness:.18}),Math.max(1,villaList.length));
villaList.forEach((v,i)=>{
 instDummy.position.set(v.x,v.h/2,v.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(v.w,v.h,v.d);instDummy.updateMatrix();
 villaBodyInst.setMatrixAt(i,instDummy.matrix);instCol.set(v.color||'#f2e6d0');villaBodyInst.setColorAt(i,instCol);
 instDummy.position.set(v.x,v.h+.42,v.z);instDummy.rotation.set(0,0,0);instDummy.scale.set(v.w*1.14,.85,v.d*1.14);instDummy.updateMatrix();
 villaRoofInst.setMatrixAt(i,instDummy.matrix);instCol.set(v.roofColor||'#3b4958');villaRoofInst.setColorAt(i,instCol);
});
villaBodyInst.count=villaList.length;villaRoofInst.count=villaList.length;
villaBodyInst.instanceMatrix.needsUpdate=true;villaRoofInst.instanceMatrix.needsUpdate=true;
if(villaBodyInst.instanceColor)villaBodyInst.instanceColor.needsUpdate=true;
if(villaRoofInst.instanceColor)villaRoofInst.instanceColor.needsUpdate=true;
scene.add(villaBodyInst,villaRoofInst);

// 4. Instanced Arched Tropical Palm Trees & Boulevard Streetlights (strictly outside ALL road corridors & aprons)
const isTreeSafe=(tx,tz)=>{
 // Never inside any North-South road corridor (-900..900 axes, road half-width 12m + 3.2m curb clearance)
 if(CityLayout.axes.some(a=>Math.abs(tx-a)<15.2))return false;
 // Never inside any East-West road corridor (-900..900 axes)
 if(CityLayout.axes.some(a=>Math.abs(tz-a)<15.2))return false;
 // Never on Airport runway/apron or Pier 99 boardwalk approach
 if(tx>=695&&tx<=805&&Math.abs(tz)<=340)return false;
 if(Math.abs(tx)<16&&tz<-820)return false;
 return true;
};
const palmCoords=[];
const pushSafePalm=(tx,tz)=>{if(isTreeSafe(tx,tz))palmCoords.push([tx,tz]);};
for(let x=-860;x<=860;x+=46){
 if(Math.abs(x)<18)continue;
 pushSafePalm(x,-840);
 pushSafePalm(x,-895);
 if(Math.abs(x%92)===0){pushSafePalm(x,-618);pushSafePalm(x,-582);}
}
for(let z=-540;z<=540;z+=60){
 if(Math.abs(z)<28)continue;
 pushSafePalm(-15.6,z);
 pushSafePalm(15.6,z);
}
// Build 6-frond arched tropical palm canopy BufferGeometry (zero cones!)
const leafPos=[],leafNorm=[];
for(let k=0;k<6;k++){
 const a=k*Math.PI/3,ca=Math.cos(a),sa=Math.sin(a),px=-sa,pz=ca;
 const arch=[[0,0,0],[ca*1.2-px*.35,.55,sa*1.2-pz*.35],[ca*1.2+px*.35,.55,sa*1.2+pz*.35],[ca*3.1,-.7,sa*3.1]];
 const tri=[[arch[0],arch[1],arch[2]],[arch[1],arch[3],arch[2]]];
 for(const [p0,p1,p2]of tri){
  leafPos.push(...p0,...p1,...p2);
  leafNorm.push(0,1,0,0,1,0,0,1,0);
 }
}
const palmCrownGeo=new THREE.BufferGeometry();
palmCrownGeo.setAttribute('position',new THREE.Float32BufferAttribute(leafPos,3));
palmCrownGeo.setAttribute('normal',new THREE.Float32BufferAttribute(leafNorm,3));
const palmTrunkInst=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.28,6.6,7),material('#8c6b47',.85),palmCoords.length);
const palmLeafInst=new THREE.InstancedMesh(palmCrownGeo,new THREE.MeshStandardMaterial({color:'#389c58',roughness:.66,side:THREE.DoubleSide}),palmCoords.length);
palmCoords.forEach(([x,z],i)=>{
 instDummy.position.set(x,3.3,z);instDummy.rotation.set(0,(i%5)*.3,((i%3)-1)*.04);instDummy.scale.set(1,1,1);instDummy.updateMatrix();
 palmTrunkInst.setMatrixAt(i,instDummy.matrix);
 instDummy.position.set(x,6.55,z);instDummy.rotation.set(0,i*.45,0);instDummy.updateMatrix();
 palmLeafInst.setMatrixAt(i,instDummy.matrix);
});
palmTrunkInst.instanceMatrix.needsUpdate=true;palmLeafInst.instanceMatrix.needsUpdate=true;
scene.add(palmTrunkInst,palmLeafInst);

const lightCoords=[];
for(const z of [-840,-750,-600,-450,-300,-150,150,300,450,600,750,880]){
 lightCoords.push([-13.5,z],[13.5,z],[-313,z],[-287,z],[287,z],[313,z]);
}
for(const x of [-750,-600,-450,-150,150,450]){
 lightCoords.push([x,-313],[x,-287],[x,287],[x,313],[x,-613],[x,-587]);
}
const poleInst=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.12,6.2,6),material('#3b4a58',.55,.45),lightCoords.length);
const bulbInst=new THREE.InstancedMesh(new THREE.BoxGeometry(.9,.18,.38),new THREE.MeshBasicMaterial({color:'#ffe4a8'}),lightCoords.length);
lightCoords.forEach(([x,z],i)=>{
 instDummy.position.set(x,3.1,z);instDummy.rotation.set(0,0,0);instDummy.scale.set(1,1,1);instDummy.updateMatrix();
 poleInst.setMatrixAt(i,instDummy.matrix);
 instDummy.position.set(x,6.2,z);instDummy.updateMatrix();
 bulbInst.setMatrixAt(i,instDummy.matrix);
});
poleInst.instanceMatrix.needsUpdate=true;bulbInst.instanceMatrix.needsUpdate=true;
scene.add(poleInst,bulbInst);

// 5. 7 Walk-In Landmark Interiors (100% Aligned w/ CityLayout.walls), Shadow Alley, Cranes, Airport & Causeway
const landmarkGroup=new THREE.Group();scene.add(landmarkGroup);
const neonCyanMat=new THREE.MeshBasicMaterial({color:'#00f0ff'});
const neonPinkMat=new THREE.MeshBasicMaterial({color:'#ff007f'});
const neonGoldMat=new THREE.MeshBasicMaterial({color:'#ffd700'});
const ceilLightMat=new THREE.MeshBasicMaterial({color:'#fff2d2'});
const neonGlassMat=new THREE.MeshStandardMaterial({color:'#5aa6e8',map:towerGlassTex,emissive:'#78d8ff',emissiveMap:towerGlassEmit,emissiveIntensity:.75,metalness:.25,roughness:.24});
const bankWallMat=new THREE.MeshStandardMaterial({color:'#e5dcc8',map:villaTex,emissive:'#ffe8bd',emissiveMap:villaEmit,emissiveIntensity:.4,roughness:.68});
const policeWallMat=new THREE.MeshStandardMaterial({color:'#5b7fa6',map:towerGlassTex,emissive:'#86d6ff',emissiveMap:towerGlassEmit,emissiveIntensity:.65,roughness:.42});
const garageWallMat=new THREE.MeshStandardMaterial({color:'#6a7e94',map:villaTex,emissive:'#ffe2aa',emissiveMap:villaEmit,emissiveIntensity:.4,roughness:.62});
const garageBayMat=new THREE.MeshStandardMaterial({color:'#2c6e94',emissive:'#1d5678',emissiveIntensity:.85,roughness:.3});
const loungeWallMat=new THREE.MeshStandardMaterial({color:'#f2dfd6',map:resortTex,emissive:'#ffd6a8',emissiveMap:resortEmit,emissiveIntensity:.45,roughness:.55});

const entryMatTex=texture((c,w,h)=>{
 c.fillStyle='#0c1a2a';c.fillRect(0,0,w,h);
 c.strokeStyle='#00f0ff';c.lineWidth=6;c.strokeRect(4,4,w-8,h-8);
 c.strokeStyle='#ffd700';c.lineWidth=8;c.lineCap='round';c.lineJoin='round';
 for(const cy of [34,74]){c.beginPath();c.moveTo(w*.24,cy+14);c.lineTo(w*.5,cy-10);c.lineTo(w*.76,cy+14);c.stroke();}
 c.fillStyle='#ffffff';c.font='900 18px Segoe UI, sans-serif';c.textAlign='center';c.fillText('ENTER',w/2,114);
},128,128);
const entryMatMaterial=new THREE.MeshBasicMaterial({map:entryMatTex,transparent:true,opacity:.92});
const helipadTex=texture((c,w,h)=>{
 c.fillStyle='#1f2c3c';c.fillRect(0,0,w,h);
 c.strokeStyle='#ffd700';c.lineWidth=10;c.beginPath();c.arc(w/2,h/2,w*.42,0,Math.PI*2);c.stroke();
 c.fillStyle='#ffffff';c.font='900 68px Segoe UI, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('H',w/2,h/2+3);
},128,128);
const barrierStripeTex=texture((c,w,h)=>{
 for(let x=0;x<w;x+=24){c.fillStyle=(x/24)%2===0?'#e62020':'#f6f8fa';c.fillRect(x,0,24,h);}
},128,16);
const barrierStripeMat=new THREE.MeshStandardMaterial({map:barrierStripeTex,roughness:.35,metalness:.25});
function buildSecurityGate(parent,{x,z,rotY=0,span=28,height=9.2,title,sub,accent=neonCyanMat,altAccent=neonPinkMat,boothSide=1}){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotY;parent.add(g);
 const half=span/2;
 for(const sx of [-half,half]){
  block(g,sx,.6,0,2.8,1.2,2.8,'#182538');
  block(g,sx,height*.52,0,1.9,height-.6,1.9,'#efe6d8');
  block(g,sx,height+.35,0,2.5,.9,2.5,'#182538');
  block(g,sx,height+1.1,0,1.4,.7,1.4,altAccent);
  for(const dz of [-1.02,1.02])block(g,sx,height*.52,dz,.24,height-1.4,.14,accent);
 }
 block(g,0,height-.2,0,span+2.4,1.9,1.8,'#162436');
 block(g,0,height+1.0,0,span-3.2,.65,1.3,'#efe6d8');
 for(const dz of [-.98,.98]){
  block(g,0,height-1.2,dz,span+1.6,.18,.14,accent);
  block(g,0,height+.82,dz,span-2.4,.18,.14,altAccent);
 }
 const sw=Math.min(span-4,20);
 sign(g,title,sub,0,height-.15,-1.06,sw,Math.PI,'#140b2e');
 sign(g,title,sub,0,height-.15,1.06,sw,0,'#140b2e');
 const bx=boothSide*(half+2.5);
 block(g,bx,1.5,0,2.4,3.0,2.8,'#efe6d8');
 block(g,bx,2.1,0,2.52,.95,2.4,new THREE.MeshStandardMaterial({color:'#1c405c',emissive:'#ffcf7a',emissiveIntensity:.38,roughness:.12,metalness:.5}));
 block(g,bx,3.15,0,2.8,.3,3.2,'#182538');
 block(g,bx,3.34,0,2.86,.1,3.26,accent);
 block(g,boothSide*(half-1.0),.65,.85,.45,1.3,.45,'#263242');
 const arm=block(g,boothSide*(half-2.1),3.2,.85,5.8,.16,.12,barrierStripeMat);
 arm.rotation.z=boothSide*1.18;
}
function buildLandmarkShell(lmId,wallMat,floorColor,roofColor,portalMat=neonCyanMat){
 const b=buildings.find(x=>x.landmark===lmId);
 if(!b)return null;
 CityLayout.walls(b).forEach(w=>block(landmarkGroup,w.x,w.h/2,w.z,w.w,w.h,w.d,wallMat));
 block(landmarkGroup,b.x,.04,b.z,b.w,.08,b.d,floorColor);
 block(landmarkGroup,b.x,b.wallH+.15,b.z,b.w+.4,.3,b.d+.4,roofColor);
 block(landmarkGroup,b.x,b.wallH-.06,b.z,b.w*.55,.08,b.d*.35,ceilLightMat);
 const side=b.doorSide||'west';
 const doorW=b.doorWidth||6;
 const frameH=Math.min(b.wallH-.25,3.8);
 if(side==='west'||side==='east'){
  const dx=b.x+(side==='west'?-b.w/2:b.w/2),outS=side==='west'?-1:1;
  for(const s of [-1,1])block(landmarkGroup,dx,frameH/2,b.z+s*(doorW/2),0.55,frameH,0.55,portalMat);
  block(landmarkGroup,dx,frameH,b.z,0.7,0.35,doorW+.6,portalMat);
  block(landmarkGroup,dx+outS*1.3,frameH+.15,b.z,2.6,.22,doorW+1.2,'#182638');
  block(landmarkGroup,dx+outS*2.6,frameH+.15,b.z,.12,.14,doorW+1.3,portalMat);
  const matMesh=new THREE.Mesh(new THREE.PlaneGeometry(3.2,doorW-.4),entryMatMaterial);
  matMesh.rotation.x=-Math.PI/2;matMesh.rotation.z=outS<0?-Math.PI/2:Math.PI/2;
  matMesh.position.set(dx+outS*1.4,.07,b.z);landmarkGroup.add(matMesh);
 }else{
  const dz=b.z+(side==='south'?-b.d/2:b.d/2),outS=side==='south'?-1:1;
  for(const s of [-1,1])block(landmarkGroup,b.x+s*(doorW/2),frameH/2,dz,0.55,frameH,0.55,portalMat);
  block(landmarkGroup,b.x,frameH,dz,doorW+.6,0.35,0.7,portalMat);
  block(landmarkGroup,b.x,frameH+.15,dz+outS*1.3,doorW+1.2,.22,2.6,'#182638');
  block(landmarkGroup,b.x,frameH+.15,dz+outS*2.6,doorW+1.3,.14,.12,portalMat);
  const matMesh=new THREE.Mesh(new THREE.PlaneGeometry(doorW-.4,3.2),entryMatMaterial);
  matMesh.rotation.x=-Math.PI/2;matMesh.rotation.z=outS<0?0:Math.PI;
  matMesh.position.set(b.x,.07,dz+outS*1.4);landmarkGroup.add(matMesh);
 }
 return b;
}

// A. Solaris Tower (52, 52) — Walk-In Lobby (door west x=41) + 68m Stepped Glass Spire + Rooftop Helipad
const lmSolaris=buildLandmarkShell('solarisTower',neonGlassMat,'#dce5ef','#546e88',neonCyanMat);
if(lmSolaris){
 block(landmarkGroup,57,0.6,52,2.4,1.1,6.5,'#26384c');
 block(landmarkGroup,57,1.2,52,2.6,.12,6.7,neonCyanMat);
 block(landmarkGroup,60.5,1.8,52,1.4,2.4,2.6,'#18283a');
 block(landmarkGroup,59.7,2.2,52,.15,1.1,1.8,neonPinkMat);
 block(landmarkGroup,52,5.2+31,52,20,62,20,neonGlassMat);
 block(landmarkGroup,52,70,52,13,6,13,'#466484');
 const pad=new THREE.Mesh(new THREE.PlaneGeometry(11,11),new THREE.MeshBasicMaterial({map:helipadTex}));
 pad.rotation.x=-Math.PI/2;pad.position.set(52,73.12,52);landmarkGroup.add(pad);
 sign(landmarkGroup,'SOLARIS','TOWER',45.3,70,52,11,-Math.PI/2,'#091a30');
 cylinder(landmarkGroup,52,78,52,.4,10,neonCyanMat,8);
 block(landmarkGroup,52,20,41.6,18,.35,.35,neonCyanMat);
 block(landmarkGroup,52,46,41.6,18,.35,.35,neonPinkMat);
 sign(landmarkGroup,'SOLARIS TOWER','ENTER LOBBY · VAULT RELAY',40.6,4.5,52,14,-Math.PI/2,'#0d1e36');
}

// B. Titan National Bank (-42, 260) — Walk-In Banking Hall + Steel Vault (door east x=-29)
const lmBank=buildLandmarkShell('titanBank',bankWallMat,'#e4dcc8','#cfc4ae',neonGoldMat);
if(lmBank){
 block(landmarkGroup,-42,0.55,251.5,14,1.1,1.6,'#6e563e');
 block(landmarkGroup,-42,0.55,268.5,14,1.1,1.6,'#6e563e');
 block(landmarkGroup,-53.5,2.2,260,1.2,3.8,6,'#525d6b');
 cylinder(landmarkGroup,-52.7,2.2,260,1.6,.35,'#98a6b5',16).rotation.z=Math.PI/2;
 block(landmarkGroup,-50.5,0.65,256,2.2,1.1,2.2,neonGoldMat);
 block(landmarkGroup,-42,5.6+10,260,24,20,20,bankWallMat);
 block(landmarkGroup,-42,26.2,260,26,1.2,22,'#ece4d0');
 for(const pz of [250,254,266,270])cylinder(landmarkGroup,-27.8,10,pz,.65,20,'#f2ead8',10);
 block(landmarkGroup,-28.3,15.5,260,.3,1.1,21,neonGoldMat);
 sign(landmarkGroup,'TITAN NATIONAL BANK','WALK IN · FEDERAL VAULT',-28.4,4.8,260,15,Math.PI/2,'#18263a');
}

// C. NBPD Police HQ (52, -165) — Walk-In Precinct Lobby (door west x=41)
const lmPolice=buildLandmarkShell('policeHQ',policeWallMat,'#cfd9e4','#344a62',neonCyanMat);
if(lmPolice){
 block(landmarkGroup,58,0.6,-165,2.4,1.1,6,'#1f344d');
 block(landmarkGroup,52,1.3,-173.5,8,2.6,1.4,'#3c4e62');
 block(landmarkGroup,52,4.8+6,-165,20,12,18,policeWallMat);
 block(landmarkGroup,52,17.2,-165,21,.6,19,neonCyanMat);
 block(landmarkGroup,46,17.9,-165,4,.9,1.2,'#ff2a2a');
 block(landmarkGroup,58,17.9,-165,4,.9,1.2,'#009dff');
 sign(landmarkGroup,'NBPD POLICE HQ','ENTER PRECINCT',40.6,4.2,-165,13,-Math.PI/2,'#0f223d');
}

// D. Shadow Alley Miami Art-Deco Overhead Neon Arches along x = -300 (M3 route)
for(const sz of [-240,-120,0,120]){
 const archNeon=sz%240===0?neonPinkMat:neonCyanMat,archAlt=sz%240===0?neonCyanMat:neonPinkMat;
 for(const sx of [-312.5,-287.5]){
  block(landmarkGroup,sx,.5,sz,2.0,1.0,2.0,'#1b293b');
  block(landmarkGroup,sx,5.2,sz,1.3,9.2,1.3,'#efe6d8');
  block(landmarkGroup,sx,10.1,sz,1.8,.8,1.8,'#1b293b');
  block(landmarkGroup,sx,5.2,sz+.7,.22,8.4,.14,archNeon);
  block(landmarkGroup,sx,5.2,sz-.7,.22,8.4,.14,archNeon);
 }
 block(landmarkGroup,-300,10.2,sz,26.8,1.0,1.4,'#19283c');
 block(landmarkGroup,-300,9.62,sz,26.0,.18,1.52,archNeon);
 block(landmarkGroup,-300,10.82,sz,22.0,.22,1.2,archAlt);
}

// E. Vega's Garage Landmark (36, 420) — Walk-In Repair & Custom Bay (door west x=26)
const lmGarage=buildLandmarkShell('vegaGarage',garageWallMat,'#8c96a2','#2b3b4e',neonCyanMat);
if(lmGarage){
 block(landmarkGroup,36,0.2,413.5,7,.3,3.5,'#223244');
 block(landmarkGroup,32.5,1.5,413.5,.5,3.0,.5,'#ff6b2b');
 block(landmarkGroup,39.5,1.5,413.5,.5,3.0,.5,'#ff6b2b');
 block(landmarkGroup,43,0.65,420,2.2,1.2,6,'#324254');
 block(landmarkGroup,36,4.8+1.8,420,18,3.4,16,garageWallMat);
 block(landmarkGroup,26.6,8.4,420,.3,1.0,16,neonCyanMat);
 sign(landmarkGroup,"VEGA'S GARAGE — CUSTOMS & TUNING",'DRIVE / WALK IN TO REPAIR',25.6,4.2,420,14,-Math.PI/2,'#14243e');
 // Vega's Garage driveway security kiosk & raised barrier arm
 block(landmarkGroup,23.2,1.3,430,2.2,2.6,2.2,'#efe6d8');
 block(landmarkGroup,23.2,2.75,430,2.5,.28,2.5,'#182538');
 const vgArm=block(landmarkGroup,23.2,2.6,427.6,.12,.14,4.2,barrierStripeMat);vgArm.rotation.x=-1.15;
}

// E2. Pier 99 Waterfront Lounge (24, -875) — Walk-In Miami Beach Club (door west x=15)
const lmLounge=buildLandmarkShell('pier99Lounge',loungeWallMat,'#f4eadc','#e0c8d2',neonPinkMat);
if(lmLounge){
 block(landmarkGroup,29.5,0.65,-875,2.2,1.2,7,'#2c1836');
 block(landmarkGroup,29.5,1.3,-875,2.4,.12,7.2,neonPinkMat);
 block(landmarkGroup,24,0.5,-869.5,5,.9,2.2,'#ff007f');
 block(landmarkGroup,24,0.5,-880.5,5,.9,2.2,'#00f0ff');
 block(landmarkGroup,24,4.4+1.5,-875,18,2.8,16,loungeWallMat);
 block(landmarkGroup,14.8,7.4,-875,.3,.7,16,neonPinkMat);
 sign(landmarkGroup,'PIER 99 — VIP MARINA & LOUNGE','VALET · PARK & WALK INSIDE',14.6,4.1,-875,13.5,-Math.PI/2,'#261032');
}

// F. Skyline Construction Site Tower Crane + Overhead Hard Hat Zone Gate at (0, 560)
buildSecurityGate(landmarkGroup,{x:0,z:560,rotY:0,span:28,height:9.6,title:'SKYLINE CONSTRUCTION — HARD HAT ZONE',sub:'M12 MEGA-RAMP AHEAD',accent:neonGoldMat,altAccent:neonPinkMat,boothSide:1});
block(landmarkGroup,24,22,605,3.2,44,3.2,'#f2a930');
block(landmarkGroup,10,43,605,34,2.4,2.4,'#f2a930');
block(landmarkGroup,24,1.2,585,4,2.4,12,neonPinkMat);
sign(landmarkGroup,'SKYLINE CONSTRUCTION','HARD HAT ZONE · MEGA-RAMP',22,6,595,12,Math.PI,'#2b1a14');

// G. Iron Docks Restricted Port Access Gate (-575, 0) + Gantry Cranes + Sanctuary Warehouse
buildSecurityGate(landmarkGroup,{x:-575,z:0,rotY:Math.PI/2,span:28,height:9.6,title:'IRON DOCKS — RESTRICTED PORT ACCESS',sub:'BAY 01 — BAY 08 · CARGO TERMINAL',accent:neonGoldMat,altAccent:neonCyanMat,boothSide:1});
for(const [cx,cz] of [[-520,-120],[-700,80],[-840,-160]]){
 for(const dx of [-6,6])block(landmarkGroup,cx+dx,13,cz,1.8,26,1.8,'#de8c2e');
 block(landmarkGroup,cx,26.5,cz,28,2.2,3.4,'#f09c32');
}
const lmDocks=buildLandmarkShell('docksWarehouse',garageWallMat,'#7b8894','#455666',neonGoldMat);
if(lmDocks){
 block(landmarkGroup,-632,1.2,-36,3.2,2.2,6,'#ff6b2b');
 block(landmarkGroup,-626,1.1,-43,5,2.0,2.6,'#18b8d4');
 block(landmarkGroup,-626,5.0+2.5,-36,20,5.0,20,'#546676');
 sign(landmarkGroup,'IRON DOCKS SANCTUARY','ENTER WAREHOUSE',-615.6,4.3,-36,14,Math.PI/2,'#18202c');
}
block(landmarkGroup,-914,3.5,-300,4,7,18,'#687684');
sign(landmarkGroup,'TUNNEL VAULT BAY','IRON DOCKS',-911.5,5.5,-300,12,Math.PI/2,'#18202c');

// H. Neon Bay International Airport Gate (635, 0) + Runway + Walk-In Terminal + Private Jet!
buildSecurityGate(landmarkGroup,{x:635,z:0,rotY:Math.PI/2,span:28,height:9.8,title:'NEON BAY INTL AIRPORT — TERMINAL 1',sub:'DEPARTURES · VIP RUNWAY 01',accent:neonCyanMat,altAccent:neonGoldMat,boothSide:1});
block(landmarkGroup,750,-.02,0,58,.05,640,'#39424d');
for(let rz=-290;rz<=290;rz+=24){
 block(landmarkGroup,750,.015,rz,.9,.02,12,'#f2f5fa');
 block(landmarkGroup,723,.08,rz,.4,.16,.4,neonCyanMat);
 block(landmarkGroup,777,.08,rz,.4,.16,.4,neonGoldMat);
}
const lmAirport=buildLandmarkShell('airportTower',policeWallMat,'#d4e0ec','#344a62',neonCyanMat);
if(lmAirport){
 block(landmarkGroup,659,0.65,-36,2.2,1.2,7,'#1d314a');
 block(landmarkGroup,665,2.4,-45.5,7,2.4,.5,neonCyanMat);
 block(landmarkGroup,665,15,-36,12,20,14,policeWallMat);
 block(landmarkGroup,665,26.8,-36,20,3.6,22,garageBayMat);
 sign(landmarkGroup,'AIRPORT VIP TERMINAL','WALK IN · RUNWAY 01',674.4,4.3,-36,14,Math.PI/2,'#0d2038');
}
// Private Jet at (750, -280)
block(landmarkGroup,750,2.4,-280,2.6,2.4,18,'#f4f7fc');
block(landmarkGroup,750,2.2,-280,22,.32,4.2,'#dce4ee');
block(landmarkGroup,750,5.0,-288,.45,3.8,3.2,'#00f0ff');
block(landmarkGroup,750,1.1,-280,2.6,.2,12,neonGoldMat);

// I. Bayview Causeway Grand Miami Art-Deco Arch Gate at (0, 960) -> Mirage Valley City 2 Hook!
buildSecurityGate(landmarkGroup,{x:0,z:960,rotY:0,span:29,height:13.2,title:'BRIDGE TO MIRAGE VALLEY — CLOSED (COMPLETE M20)',sub:'BAYVIEW CAUSEWAY · CITY 2',accent:neonGoldMat,altAccent:neonPinkMat,boothSide:1});

// Skyline Miami Neon Billboards across Apex Core (with metallic truss frames & neon top/bottom bars)
for(const [bx,by,bz,rot,t1,t2,bg] of [
 [-24,8.5,-135,Math.PI,'VORTEX VENENO-X','HYPERCAR SHOWROOM','#141638'],
 [24,8.5,135,0,'NEON BAY NIGHTS','OVERDRIVE V1.0','#2c1238'],
 [-24,8.5,135,0,'PIER 99 MARINA','PALM STRIP COAST','#102e42'],
 [24,8.5,-135,Math.PI,'99.5 NEON FM','SYNTHWAVE LIVE','#22183a']
]){
 block(landmarkGroup,bx,by-2.2,bz,.65,6.4,.65,'#263242');
 block(landmarkGroup,bx,by-5.2,bz,1.8,.6,1.8,'#182230');
 block(landmarkGroup,bx,by+3.1,bz,11.2,.22,.36,neonPinkMat);
 block(landmarkGroup,bx,by-.1,bz,11.2,.22,.36,neonCyanMat);
 sign(landmarkGroup,t1,t2,bx,by+1.5,bz,10.8,rot,bg);
}
citySectors.push({x:0,z:0,always:true,model:mergeStaticModel(landmarkGroup)});

// 6. Palm Strip Ocean Shader, Sand Beach, Boardwalk, Pier 99 & Rotating Ferris Wheel
const seaMat=new THREE.ShaderMaterial({
 uniforms:{time:{value:0},dusk:{value:0}},
 vertexShader:'varying vec3 vPos;void main(){vec4 wp=modelMatrix*vec4(position,1.);vPos=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}',
 fragmentShader:`varying vec3 vPos;uniform float time;uniform float dusk;
  void main(){
   float dist=max(0.,-912.0-vPos.z);
   float w1=sin(vPos.x*.14+time*1.85+cos(vPos.z*.14+time*1.2));
   float w2=cos(vPos.x*.34-time*2.1+vPos.z*.28)*.5;
   float wave=(w1+w2)*.5;
   vec3 shallow=mix(vec3(.18,.63,.68),vec3(.07,.24,.34),dusk);
   vec3 deep=mix(vec3(.05,.25,.42),vec3(.02,.09,.19),dusk);
   vec3 col=mix(shallow,deep,clamp(dist/85.,0.,1.));
   col+=vec3(.08,.18,.22)*smoothstep(.35,.95,wave)*(1.-dusk*.65);
   float foam=smoothstep(5.0,0.,dist+wave*2.4);
   col=mix(col,vec3(.88,.96,.97)*(1.-dusk*.45),foam*.74);
   gl_FragColor=vec4(col,1.);
  }`
});
const seaMesh=new THREE.Mesh(new THREE.PlaneGeometry(2400,600,1,1),seaMat);
seaMesh.rotation.x=-Math.PI/2;seaMesh.position.set(0,-.18,-1212);scene.add(seaMesh);

const beachGroup=new THREE.Group();scene.add(beachGroup);
const sandMat=material('#dec591',.95),wetSandMat=material('#b79b65',.65),woodMat=material('#8c6643',.85),darkWood=material('#65472d',.9);
block(beachGroup,0,-.18,-875,2000,.2,76,sandMat);
block(beachGroup,0,-.14,-911,2000,.12,6,wetSandMat);
block(beachGroup,0,.04,-836,1960,.26,6,'#c8bca0');
// Pier 99 Boardwalk extending into the ocean at (0, -910..-980)
block(beachGroup,0,.48,-945,10.2,.2,72,woodMat);
const ramp=block(beachGroup,0,.22,-909,10.2,.18,6,woodMat);ramp.rotation.x=-.1;
for(const px of [-4.6,4.6])for(let pz=-916;pz>=-976;pz-=12){
 cylinder(beachGroup,px,-.15,pz,.24,1.7,darkWood,8);
 cylinder(beachGroup,px,.82,pz,.16,.55,'#543b24',8);
}
// Glowing Miami Tropical Art-Deco Pier 99 Entrance Archway
for(const px of [-4.9,4.9]){
 block(beachGroup,px,.4,-912,1.1,.8,1.1,'#182638');
 block(beachGroup,px,2.8,-912,.7,4.2,.7,'#efe6d8');
 block(beachGroup,px,5.1,-912,1.0,.5,1.0,'#182638');
 block(beachGroup,px,2.8,-911.6,.14,3.8,.12,neonPinkMat);
}
block(beachGroup,0,4.85,-912,10.8,.95,.75,'#182638');
block(beachGroup,0,4.3,-911.58,10.2,.12,.1,neonCyanMat);
block(beachGroup,0,5.42,-911.58,9.4,.14,.1,neonPinkMat);
sign(beachGroup,'PIER 99 — VIP MARINA & LOUNGE','PALM STRIP COAST · VALET',0,4.85,-911.45,10.2,0,'#140b2e');
// Beach Umbrellas
for(const [ux,uz,col]of [[-90,-875,'#ff007f'],[-40,-868,'#00f0ff'],[52,-872,'#ffd700'],[110,-876,'#38f288'],[-140,-868,'#ff007f'],[170,-870,'#00f0ff']]){
 cylinder(beachGroup,ux,1.2,uz,.07,2.4,'#cfd4d0',6);
 const dome=new THREE.Mesh(new THREE.ConeGeometry(2.1,.75,8),material(col,.7));dome.position.set(ux,2.4,uz);beachGroup.add(dome);
}
citySectors.push({x:0,z:-880,always:true,model:mergeStaticModel(beachGroup)});

// Marina Ferris Wheel at (-210, -875)
const ferrisPos={x:-210,z:-875},hubY=16.5,wheelR=13;
const ferrisBase=new THREE.Group();ferrisBase.position.set(ferrisPos.x,0,ferrisPos.z);scene.add(ferrisBase);
const steel=material('#7c8c90',.35,.75);
block(ferrisBase,0,.15,0,16,.32,11,'#9e957e');
for(const sz of [-2.6,2.6])for(const side of [-1,1]){const leg=block(ferrisBase,side*4.8,hubY/2,sz,.45,hubY+1.6,.45,steel);leg.rotation.z=side*.3;}
cylinder(ferrisBase,0,hubY,0,.6,6,steel,10).rotation.x=Math.PI/2;
citySectors.push({x:ferrisPos.x,z:ferrisPos.z,model:mergeStaticModel(ferrisBase)});

const wheelSpinRaw=new THREE.Group();
const rimMat=new THREE.MeshStandardMaterial({color:'#ffd369',emissive:'#ff007f',emissiveIntensity:.85,roughness:.3});
const podCols=['#ff007f','#00f0ff','#ffd700','#a855f7'];
wheelSpinRaw.add(new THREE.Mesh(new THREE.TorusGeometry(wheelR,.24,6,24),rimMat));
for(let i=0;i<8;i++){
 const a=i*Math.PI/4;
 const sp=block(wheelSpinRaw,Math.cos(a)*wheelR/2,Math.sin(a)*wheelR/2,0,.16,wheelR,.16,steel);
 sp.rotation.z=a+Math.PI/2;
 block(wheelSpinRaw,Math.cos(a)*wheelR,Math.sin(a)*wheelR,0,1.6,1.6,2,material(podCols[i%podCols.length],.45,.2));
}
const wheelMesh=mergeStaticModel(wheelSpinRaw);
wheelMesh.position.set(ferrisPos.x,hubY,ferrisPos.z);
window.ferrisWheel=wheelMesh;

window.cityInstancedStats={
 towers:towerList.length,
 resorts:resortList.length,
 containers:containerList.length,
 villas:villaList.length,
 plazas:plazaList.length,
 palms:palmCoords.length,
 streetlights:lightCoords.length,
 roadDashes:crosswalkList.length,
 syncedWithLayout:true,
 instancedMeshes:16
};

window.renderCity=(t,dt)=>{
 for(const s of citySectors)s.model.visible=s.always||Math.hypot(s.x-player.x,s.z-player.z)<420;
 seaMesh.visible=player.z<-420;
 if(seaMesh.visible){seaMat.uniforms.time.value=t*.001;seaMat.uniforms.dusk.value=window.currentDusk||0;}
 const dusk=window.currentDusk||0;
 wheelMesh.visible=distance(player,ferrisPos)<420;
 if(wheelMesh.visible){wheelMesh.rotation.z=t*.00025;rimMat.emissiveIntensity=.45+dusk*.95;}
};

window.cityRoute=()=>{const target=activeTargets()[0];if(!target){route.count=0;return;}const seaRoute=target.z<-910&&player.z<-900;const nodes=(seaRoute||(distance(player,target)<55&&lineClear(player,target)))?[player,target]:CityLayout.route(player,target);let count=0;
 for(let n=0;n<nodes.length-1&&count<28;n++){const a=nodes[n],b=nodes[n+1],d=distance(a,b);for(let step=4;step<d&&count<28;step+=6){instanceDummy.position.set(a.x+(b.x-a.x)*step/d,.12,a.z+(b.z-a.z)*step/d);instanceDummy.rotation.set(Math.PI/2,0,-Math.atan2(b.x-a.x,b.z-a.z));instanceDummy.scale.set(1,1,1);instanceDummy.updateMatrix();route.setMatrixAt(count++,instanceDummy.matrix);}}
 route.count=count;route.instanceMatrix.needsUpdate=true;
};
