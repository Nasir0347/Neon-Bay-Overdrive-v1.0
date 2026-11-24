/* Environment polish, 11-part articulated instanced pedestrians, and GPS route markers for NEON BAY: OVERDRIVE. */
const skyMaterial=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{dusk:{value:0},time:{value:0}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;uniform float dusk;uniform float time;float h2(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float a=fract(sin(dot(i,vec2(127.1,311.7)))*43758.5453),b=fract(sin(dot(i+vec2(1.,0.),vec2(127.1,311.7)))*43758.5453),c=fract(sin(dot(i+vec2(0.,1.),vec2(127.1,311.7)))*43758.5453),d=fract(sin(dot(i+vec2(1.,1.),vec2(127.1,311.7)))*43758.5453);return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}void main(){vec3 dir=normalize(v);float h=clamp(dir.y*.8+.15,0.,1.);vec3 day=mix(vec3(.98,.72,.48),vec3(.18,.48,.68),h);vec3 night=mix(vec3(.52,.22,.42),vec3(.07,.08,.24),h);vec3 col=mix(day,night,dusk);float sunset=smoothstep(0.,.52,dusk)*(1.-smoothstep(.52,.98,dusk));col+=vec3(.46,.14,.28)*sunset*pow(1.-h,2.0);col+=vec3(.22,.08,.18)*(1.-h)*(1.-h)*dusk;vec3 sunDir=normalize(vec3(-.55,max(.04,.38-dusk*.28),-.74));float sdot=max(0.,dot(dir,sunDir));col+=vec3(1.,.74,.44)*(pow(sdot,44.)*.95+pow(sdot,5.)*.28)*(1.-dusk*.82);vec3 moonDir=normalize(vec3(.45,.52,-.72));float mdot=max(0.,dot(dir,moonDir));col+=vec3(.88,.93,1.)*smoothstep(.9986,.9993,mdot)*smoothstep(.3,.85,dusk);if(dusk>.42&&dir.y>.05){vec3 stCell=floor(dir*195.);vec3 stF=fract(dir*195.)-.5;float n=h2(stCell);if(n>.991&&length(stF)<.14){float tw=.65+.35*sin(time*3.+n*60.);float pt=smoothstep(.14,.02,length(stF));col+=vec3(.92,.95,1.)*tw*pt*smoothstep(.42,.9,dusk)*smoothstep(.05,.25,dir.y);}}if(dir.y>.04){vec2 cuv=dir.xz/(dir.y+.24)*1.9+vec2(time*.012,time*.005);float cl=vn(cuv)*.65+vn(cuv*2.15+3.7)*.35;float cMask=smoothstep(.54,.84,cl)*smoothstep(.04,.22,dir.y);vec3 cCol=mix(mix(vec3(.99,.97,.94),vec3(1.,.62,.58),sunset),vec3(.24,.22,.40),smoothstep(.45,1.,dusk));col=mix(col,cCol,cMask*(.58-.24*dusk));}gl_FragColor=vec4(col,1.);}'});
const skyDome=new THREE.Mesh(new THREE.SphereGeometry(380,22,14),skyMaterial);scene.add(skyDome);
function mergeStaticModel(root){root.updateMatrixWorld(true);const data=new Map();root.traverse(o=>{if(!o.isMesh)return;const key=o.material.uuid;if(!data.has(key))data.set(key,{mat:o.material,p:[],n:[],uv:[]});const b=data.get(key),g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.p.push(...g.attributes.position.array);b.n.push(...g.attributes.normal.array);b.uv.push(...(g.attributes.uv?g.attributes.uv.array:new Float32Array(g.attributes.position.count*2)));g.dispose();});const group=new THREE.Group();for(const b of data.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(b.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(b.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(b.uv,2));const mesh=new THREE.Mesh(g,b.mat);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);}root.removeFromParent();scene.add(group);return group;}

// 11-Part Articulated Humanoid Instanced Pedestrians (zero blocky boxes, joint-pivoted limbs)
const pedLegGeo=new THREE.CylinderGeometry(.082,.064,.76,8);pedLegGeo.translate(0,-.38,0);
const pedShoeGeo=new THREE.BoxGeometry(.15,.11,.26);pedShoeGeo.translate(0,-.79,.04);
const pedArmGeo=new THREE.CylinderGeometry(.066,.050,.56,8);pedArmGeo.translate(0,-.28,0);
const crowdParts=[
 {geo:new THREE.CylinderGeometry(.21,.18,.58,10),pos:[0,1.16,0],scale:[1,1,.66],colorKey:'color'},
 {geo:new THREE.CylinderGeometry(.17,.19,.20,10),pos:[0,.86,0],scale:[1,1,.7],mat:material('#1a232e')},
 {geo:new THREE.SphereGeometry(.16,10,8),pos:[0,1.62,0],scale:[.92,1.1,.95],colorKey:'skinColor'},
 {geo:new THREE.SphereGeometry(.168,10,6,0,Math.PI*2,0,Math.PI*.56),pos:[0,1.66,-.01],scale:[.95,1.02,.98],colorKey:'hairColor'},
 {geo:new THREE.BoxGeometry(.24,.065,.06),pos:[0,1.64,.14],mat:material('#0d121a',.25,.6)},
 {geo:pedLegGeo,pos:[-.10,.84,0],limb:0,mat:material('#22303e')},
 {geo:pedLegGeo,pos:[.10,.84,0],limb:2,mat:material('#22303e')},
 {geo:pedShoeGeo,pos:[-.10,.84,0],limb:0,mat:material('#10141a')},
 {geo:pedShoeGeo,pos:[.10,.84,0],limb:2,mat:material('#10141a')},
 {geo:pedArmGeo,pos:[-.26,1.40,0],limb:1,colorKey:'color'},
 {geo:pedArmGeo,pos:[.26,1.40,0],limb:3,colorKey:'color'}
];
const instanceDummy=new THREE.Object3D(),instanceMatrix=new THREE.Matrix4();
for(const part of crowdParts){
 part.mesh=new THREE.InstancedMesh(part.geo,part.mat||material('#ffffff',.82,.05),people.length);
 part.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 part.mesh.castShadow=true;
 part.mesh.frustumCulled=false;
 if(part.colorKey){
  people.forEach((p,i)=>part.mesh.setColorAt(i,new THREE.Color(p[part.colorKey]||p.color||'#d8ab88')));
  if(part.mesh.instanceColor)part.mesh.instanceColor.needsUpdate=true;
 }
 scene.add(part.mesh);
}
window.pedestrianPoolStats={count:people.length,articulatedParts:crowdParts.length,hasLimbs:true,hasFleeAI:true};

const decor=new THREE.Group();scene.add(decor);
for(const z of [-25,-22,-19]){cylinder(decor,-13,.9,z,.035,1.8,'#3c5558',6);block(decor,-12.8,1.55,z,.3,.4,.42,['#00f0ff','#ff007f','#ffd700'][Math.round((z+25)/3)]);}
cylinder(decor,13,1.2,-20,.13,2.4,'#ded8bf',12);for(let i=0;i<6;i++)cylinder(decor,13,.3+i*.35,-20,.135,.12,i%2?'#00f0ff':'#ff007f',12);
sign(decor,'NEON BAY PLAZA','OVERDRIVE',0,5.7,108,13,Math.PI,'#10243a');
mergeStaticModel(decor);

const routeGeometry=new THREE.ConeGeometry(.28,.75,3),routeMaterial=new THREE.MeshBasicMaterial({color:'#00f0ff'}),route=new THREE.InstancedMesh(routeGeometry,routeMaterial,28);route.instanceMatrix.setUsage(THREE.DynamicDrawUsage);route.frustumCulled=false;route.count=0;scene.add(route);
let routeClock=0;const markerMaterial=marker.material;
function updateRoute(){if(window.cityRoute)return window.cityRoute();const t=activeTargets()[0];if(!t){route.count=0;return;}const src={x:player.x,z:player.z},nodes=[src];if(!(Math.abs(src.x)<14&&Math.abs(t.x)<14)&&!(Math.abs(src.z)<14&&Math.abs(t.z)<14)){nodes.push({x:0,z:src.z},{x:0,z:t.z});}nodes.push(t);let count=0;for(let n=0;n<nodes.length-1&&count<28;n++){const a=nodes[n],b=nodes[n+1],d=distance(a,b);for(let step=4;step<d&&count<28;step+=6){instanceDummy.position.set(a.x+(b.x-a.x)*step/d,.09,a.z+(b.z-a.z)*step/d);instanceDummy.rotation.set(Math.PI/2,0,-Math.atan2(b.x-a.x,b.z-a.z));instanceDummy.scale.set(1,1,1);instanceDummy.updateMatrix();route.setMatrixAt(count++,instanceDummy.matrix);}}route.count=count;route.instanceMatrix.needsUpdate=true;}

const shadowCasters=[];for(const root of [rico,vehicle,motorcycle,...crowdParts.map(p=>p.mesh)])root.traverse(o=>{if(o.isMesh)shadowCasters.push({object:o,original:o.castShadow});});
const lampPositions=[];for(let z=-105;z<=105;z+=15)if(Math.abs(z)>=14&&z%30!==0)for(const side of [-1,1])lampPositions.push([side*12.2,z]);
const lampGlowTex=texture((c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(255,216,140,1)');g.addColorStop(.5,'rgba(255,196,105,.35)');g.addColorStop(1,'rgba(255,180,90,0)');c.fillStyle=g;c.fillRect(0,0,w,h);},64,64);
const lampGlowMat=new THREE.MeshBasicMaterial({map:lampGlowTex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending});
const lampGlowMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(7.2,7.2),lampGlowMat,lampPositions.length);
lampPositions.forEach(([x,z],idx)=>{instanceDummy.position.set(x,.065,z);instanceDummy.rotation.set(-Math.PI/2,0,0);instanceDummy.scale.set(1,1,1);instanceDummy.updateMatrix();lampGlowMesh.setMatrixAt(idx,instanceDummy.matrix);});lampGlowMesh.visible=false;lampGlowMesh.frustumCulled=false;scene.add(lampGlowMesh);
const contactShadow=new THREE.InstancedMesh(new THREE.CircleGeometry(1,16),new THREE.MeshBasicMaterial({color:'#10272b',transparent:true,opacity:.2,depthWrite:false}),people.length+36);contactShadow.frustumCulled=false;contactShadow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(contactShadow);
let lastShadowMode=null,lastShadowX=Infinity,lastShadowZ=Infinity;
function updateLowShadows(){const cheap=mobileMode&&lowMode;if(lastShadowMode!==cheap){lastShadowMode=cheap;for(const entry of shadowCasters)entry.object.castShadow=cheap?false:entry.original;gl.shadowMap.autoUpdate=!cheap;gl.shadowMap.needsUpdate=true;lastShadowX=Infinity;}
 if(!cheap){contactShadow.count=0;return;}if(Math.hypot(player.x-lastShadowX,player.z-lastShadowZ)>7||window.sceneDirty){gl.shadowMap.needsUpdate=true;lastShadowX=player.x;lastShadowZ=player.z;}
 let index=0;const maxShadow=contactShadow.instanceMatrix.count,place=(x,z,w,d,yaw=0)=>{if(index>=maxShadow)return;instanceDummy.position.set(x,.055,z);instanceDummy.rotation.set(-Math.PI/2,0,yaw);instanceDummy.scale.set(w,d,1);instanceDummy.updateMatrix();contactShadow.setMatrixAt(index++,instanceDummy.matrix);};
 if(!inCar)place(player.x,player.z,.45,.28);place(car.x,car.z,1.05,2.05,car.yaw);place(bike.x,bike.z,.4,1.2,bike.yaw);for(const [k,v]of Object.entries(window.cityVehicles||{}))if(k!=='car'&&k!=='bike')place(v.x,v.z,k==='superbike'?.42:1.05,k==='superbike'?1.25:2.05,v.yaw);for(const p of people)place(p.x,p.z,.35,.23);contactShadow.count=index;contactShadow.instanceMatrix.needsUpdate=true;
}
const hemiLight=scene.children.find(o=>o.isHemisphereLight);
window.skyControl={skyMaterial,sun,hemiLight,lampGlowMesh,lampGlowMat,skyDome};
function renderPolish(time,dt){updateLowShadows();for(const part of crowdParts){for(let i=0;i<people.length;i++){const g=walkers[i];g.updateMatrix();instanceDummy.position.set(...part.pos);instanceDummy.rotation.set(part.limb===undefined?0:g.userData.limbs[part.limb].rotation.x,0,0);instanceDummy.scale.set(...(part.scale||[1,1,1]));instanceDummy.updateMatrix();instanceMatrix.multiplyMatrices(g.matrix,instanceDummy.matrix);part.mesh.setMatrixAt(i,instanceMatrix);}part.mesh.instanceMatrix.needsUpdate=true;}
let rain=0,lightning=0,dusk=.56,festive=.56;if(window.computeAtmosphere){const atm=window.computeAtmosphere(0.56,0.56);festive=atm.nightAlpha??0.56;dusk=atm.dusk??0.56;rain=atm.rainIntensity||0;lightning=atm.lightningFlash||0;}skyMaterial.uniforms.dusk.value=dusk;skyMaterial.uniforms.time.value=time;window.currentDusk=dusk;const glow=Math.max(0.28,(dusk-.22)*1.55);for(const fm of window.facadeMaterials||[])if(fm)fm.emissiveIntensity=Math.max(.32,glow);lampGlowMesh.visible=glow>.06;lampGlowMat.opacity=Math.min(.55,glow*.48);sun.intensity=Math.max(1.05,(3.2-festive*1.55)*(1-rain*.4)+lightning*1.8);if(hemiLight){hemiLight.intensity=Math.max(1.45,(2.25-festive*.7)*(1-rain*.2)+lightning*.9);hemiLight.color.setRGB(.75+(1-festive)*.2,.84+(1-festive)*.1,.98);hemiLight.groundColor.setRGB(.32+(1-festive)*.18,.36+(1-festive)*.14,.46+(1-festive)*.08);}sun.color.setRGB(1-rain*.16,.88-festive*.10-rain*.06,.74+festive*.08+rain*.12);skyDome.position.copy(view.position);scene.fog.color.setRGB(Math.max(.16,.76-festive*.32-rain*.12),Math.max(.18,.78-festive*.32-rain*.12),Math.max(.26,.82-festive*.24-rain*.08));scene.fog.near=95-rain*20;scene.fog.far=330-rain*55;markerMaterial.color.set('#00f0ff');marker.rotation.z=time*.4;
routeClock-=dt;if(routeClock<=0||window.sceneDirty){routeClock=.4;updateRoute();}window.visualStats={crowdCalls:crowdParts.length,npcs:people.length};
}
window.renderPolish=renderPolish;
