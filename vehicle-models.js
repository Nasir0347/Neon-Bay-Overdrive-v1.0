/* NEON BAY: OVERDRIVE — 3D Vehicle Models, Underglow, Nitro/Turbo Flames, Drift Smoke & Skid Decals */
(function(){
 function addBeams(root,zFront=2.35,single=false){
  const beamMat=new THREE.MeshBasicMaterial({map:window.createHeadlightBeamTex(),color:'#fff6d6',transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
  root.userData.beams=(single?[0]:[-1,1]).map(side=>{
   const m=new THREE.Mesh(new THREE.PlaneGeometry(single?2.6:2.3,11),beamMat);
   m.rotation.x=-Math.PI/2;m.position.set(side*.54,.09,zFront+5.35);m.visible=false;root.add(m);return m;
  });
 }
 function bakeBody(root,bodyGroup){const baked=mergeStaticModel(bodyGroup);root.add(baked);}
 function bakeWheel(w){w.updateMatrixWorld(true);const b=new Map();w.traverse(o=>{if(!o.isMesh)return;const k=o.material.uuid;if(!b.has(k))b.set(k,{m:o.material,p:[],n:[],u:[]});const e=b.get(k),g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrix);e.p.push(...g.attributes.position.array);e.n.push(...g.attributes.normal.array);e.u.push(...(g.attributes.uv?g.attributes.uv.array:new Float32Array(g.attributes.position.count*2)));g.dispose();});w.clear();for(const e of b.values()){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(e.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(e.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(e.u,2));const m=new THREE.Mesh(g,e.m);m.castShadow=true;m.receiveShadow=true;w.add(m);}}
 window.bakeSubgroup=bakeWheel;

 function makePlate(parent,text,x,y,z,rotY=0,bg='#0a1220',top='#00f0ff'){
  const tex=texture((c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=top;c.fillRect(0,0,w,16);c.textAlign='center';c.fillStyle='#f4faff';c.font='bold 29px Segoe UI';c.fillText(text,w/2,51);},256,64);
  const p=new THREE.Mesh(new THREE.PlaneGeometry(.52,.13),new THREE.MeshBasicMaterial({map:tex}));
  p.position.set(x,y,z);p.rotation.y=rotY;parent.add(p);
 }

 function makeSportsCoupe(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const paint=window.makeCarPaintMat('#ff007f',{metalness:.76,roughness:.17});
  const stripe=material('#00f0ff',.25,.55),black=material('#14191f',.55,.28),carbon=material('#10141a',.32,.46),glass=window.makeCarGlassMat('#0e2230'),chrome=material('#d2dadd',.16,.94);
  const headMat=new THREE.MeshStandardMaterial({color:'#f2fbff',emissive:'#cceeff',emissiveIntensity:.35,roughness:.12});
  const drlMat=new THREE.MeshStandardMaterial({color:'#e8fbff',emissive:'#00f0ff',emissiveIntensity:.55,roughness:.1});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#b51a1a',emissive:'#000000',roughness:.18});
  const s=new THREE.Shape();
  s.moveTo(-2.32,.36);s.lineTo(-2.32,.78);s.lineTo(-1.35,.94);s.lineTo(-.68,1.32);s.lineTo(.45,1.34);s.lineTo(1.12,.92);s.lineTo(2.12,.76);s.quadraticCurveTo(2.34,.7,2.34,.36);
  s.lineTo(1.88,.36);s.absarc(1.42,.38,.45,0,Math.PI,false);s.lineTo(-.96,.36);s.absarc(-1.42,.38,.45,0,Math.PI,false);s.lineTo(-2.32,.36);
  const geo=new THREE.ExtrudeGeometry(s,{depth:1.78,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:3,curveSegments:14,steps:1});
  geo.translate(0,0,-.89);geo.rotateY(-Math.PI/2);const shell=new THREE.Mesh(geo,paint);shell.castShadow=true;shell.receiveShadow=true;body.add(shell);
  block(body,0,1.35,-.1,1.34,.08,1.08,carbon);
  // Racing stripes + hood heat-extractor louvers
  for(const sx of [-.14,.14]){block(body,sx,.85,1.62,.14,.018,1.25,stripe);block(body,sx,1.39,-.1,.14,.015,1.04,stripe);block(body,sx,.92,-1.92,.14,.018,.7,stripe);}
  for(const sx of [-.42,.42])for(const hz of [1.28,1.5,1.72])block(body,sx,.87,hz,.22,.02,.08,carbon);
  modelPanel(body,[[-.66,1.37,.44],[.66,1.37,.44],[.82,.98,1.18],[-.82,.98,1.18]],glass);
  modelPanel(body,[[-.66,1.38,-.63],[-.82,.98,-1.38],[.82,.98,-1.38],[.66,1.38,-.63]],glass);
  for(const side of [-1,1]){
   if(side===-1)modelPanel(body,[[side*.91,.96,-1.28],[side*.73,1.34,-.62],[side*.73,1.34,.4],[side*.91,.96,1.05]],glass);
   else modelPanel(body,[[side*.91,.96,-1.28],[side*.73,1.34,-.62],[side*.73,1.34,-.22],[side*.91,.96,-.22]],glass);
   modelLine(body,[[side*.92,.96,-.15],[side*.74,1.34,-.15]],'#1b2226',.03);
   if(side!==1){block(body,side*.98,.98,.75,.2,.11,.24,paint);block(body,side*.99,.98,.64,.16,.07,.02,glass);}
   block(body,side*.95,.34,0,.09,.08,1.84,carbon);
   // Front bumper aero canards & GT wing endplates
   block(body,side*.93,.48,2.24,.12,.03,.24,carbon);
   block(body,side*.91,1.1,-2.08,.04,.22,.38,carbon);
  }
  block(body,0,.33,2.37,1.86,.07,.2,carbon);block(body,0,.56,2.36,.92,.22,.05,black);
  block(body,0,.37,-2.35,1.78,.11,.16,carbon);
  for(const fx of [-.48,-.24,0,.24,.48])block(body,fx,.34,-2.39,.035,.12,.14,carbon);
  block(body,0,1.12,-2.08,1.82,.055,.36,carbon);
  for(const sx of [-.55,.55])block(body,sx,.99,-2.06,.08,.24,.14,carbon);
  for(const sx of [-.44,-.28,.28,.44]){cylinder(body,sx,.38,-2.4,.06,.16,chrome,10).rotation.x=Math.PI/2;}
  makePlate(body,'APEX 07',0,.5,2.39,0);makePlate(body,'APEX 07',0,.56,-2.38,Math.PI);
  bakeBody(root,body);
  for(const side of [-1,1]){
   window.addProLightCluster(root,side,.66,.69,2.34,true,{headMat,drlMat,brakeMat});
   window.addProLightCluster(root,side,.65,.76,-2.35,false,{headMat,drlMat,brakeMat});
  }
  block(root,0,.76,-2.34,1.02,.045,.04,brakeMat);
  block(root,0,1.34,-.65,.42,.026,.04,brakeMat);
  window.addCarCockpit(root,{y:.88,zDash:.58,zSeat:-.24,w:1.22});
  const wheels=[];
  for(const side of [-1,1]){
   for(const z of [-1.42,1.42]){
    const w=window.buildProWheel(root,side*.91,.39,z,side,{r:.39,w:.26,spokes:6,caliper:'#ff1e38',rim:'#d8e0e4',rubber:black});
    bakeWheel(w);wheels.push(w);
   }
  }
  const dp=window.attachCarDoor(root,{x:.925,hingeZ:.84,len:1.06,y0:.4,y1:.95,winH:.36,winTilt:.16,paint,glass,trim:black,chrome,mirrorY:.98});bakeWheel(dp);
  window.addCarContactShadow(root,2.4,5.15);
  root.userData={wheels,paint,headMat,brakeMat,doorPivot:dp,doorType:'hinge'};addBeams(root,2.35);return root;
 }

 function makeSupercar(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const paint=window.makeCarPaintMat('#ffd700',{metalness:.84,roughness:.14,envMapIntensity:1.85});
  const black=material('#14181e',.55,.32),carbon=material('#0e1218',.28,.5),glass=window.makeCarGlassMat('#0c1e2c'),chrome=material('#d4dce0',.14,.96),goldTrim=material('#e5b43c',.2,.88);
  const headMat=new THREE.MeshStandardMaterial({color:'#f4fbff',emissive:'#d4f2ff',emissiveIntensity:.38,roughness:.1});
  const drlMat=new THREE.MeshStandardMaterial({color:'#ffffff',emissive:'#00f0ff',emissiveIntensity:.7,roughness:.08});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#cc1616',emissive:'#000000',roughness:.16});
  const s=new THREE.Shape();
  s.moveTo(-2.35,.32);s.lineTo(-2.35,.82);s.lineTo(-1.3,.92);s.lineTo(-.35,1.22);s.lineTo(.42,1.22);s.lineTo(1.25,.82);s.lineTo(2.26,.58);s.quadraticCurveTo(2.38,.48,2.36,.32);
  s.lineTo(1.89,.32);s.absarc(1.44,.39,.45,0,Math.PI,false);s.lineTo(-.96,.32);s.absarc(-1.42,.4,.46,0,Math.PI,false);s.lineTo(-2.35,.32);
  const geo=new THREE.ExtrudeGeometry(s,{depth:1.86,bevelEnabled:true,bevelThickness:.045,bevelSize:.035,bevelSegments:3,curveSegments:14,steps:1});
  geo.translate(0,0,-.93);geo.rotateY(-Math.PI/2);const shell=new THREE.Mesh(geo,paint);shell.castShadow=true;shell.receiveShadow=true;body.add(shell);
  block(body,0,1.24,.04,1.32,.06,.76,carbon);
  // Roof scoop & exposed mid-engine V10 manifold detail under rear louvers
  block(body,0,1.29,-.18,.34,.08,.42,carbon);
  for(const sx of [-.22,.22])block(body,sx,.88,-1.56,.16,.08,.76,goldTrim);
  modelPanel(body,[[-.65,1.27,.41],[.65,1.27,.41],[.82,.88,1.26],[-.82,.88,1.26]],glass);
  modelPanel(body,[[-.63,1.28,-.36],[-.78,.93,-1.3],[.78,.93,-1.3],[.63,1.28,-.36]],glass);
  for(let lz=-1.4;lz>=-2.15;lz-=.18)block(body,0,.92,lz,.96,.04,.07,carbon);
  for(const side of [-1,1]){
   if(side===-1)modelPanel(body,[[side*.95,.88,-.92],[side*.71,1.26,-.34],[side*.71,1.26,.38],[side*.95,.88,1.12]],glass);
   else modelPanel(body,[[side*.95,.88,-.92],[side*.71,1.26,-.34],[side*.71,1.26,-.26],[side*.95,.88,-.26]],glass);
   block(body,side*.98,.6,-.68,.09,.26,.72,carbon);
   if(side!==1)block(body,side*.99,.89,.88,.22,.09,.2,paint);
   block(body,side*.98,.31,0,.09,.07,1.92,carbon);
   block(body,side*.96,1.1,-2.16,.04,.22,.4,carbon);
  }
  block(body,0,.3,2.39,1.94,.06,.22,carbon);block(body,0,.36,-2.37,1.88,.14,.18,carbon);
  for(const fx of [-.58,-.29,0,.29,.58])block(body,fx,.33,-2.42,.038,.14,.16,carbon);
  block(body,0,1.1,-2.16,1.92,.05,.38,carbon);
  for(const sx of [-.62,.62])block(body,sx,.96,-2.16,.08,.26,.14,carbon);
  for(const sx of [-.24,-.08,.08,.24])cylinder(body,sx,.42,-2.42,.055,.18,chrome,10).rotation.x=Math.PI/2;
  makePlate(body,'VORTEX',0,.48,2.41,0);makePlate(body,'VORTEX',0,.56,-2.4,Math.PI);
  bakeBody(root,body);
  for(const side of [-1,1]){
   window.addProLightCluster(root,side,.69,.62,2.31,true,{headMat,drlMat,brakeMat});
   window.addProLightCluster(root,side,.66,.76,-2.37,false,{headMat,drlMat,brakeMat});
  }
  block(root,0,.76,-2.36,.92,.042,.04,brakeMat);
  block(root,0,1.22,-.38,.44,.026,.04,brakeMat);
  window.addCarCockpit(root,{y:.78,zDash:.54,zSeat:-.12,w:1.24});
  const wheels=[];
  for(const side of [-1,1]){
   for(const z of [-1.42,1.44]){
    const w=window.buildProWheel(root,side*.94,.39,z,side,{r:.4,w:.29,spokes:6,caliper:'#ffd700',rim:'#e0c164',rubber:black});
    bakeWheel(w);wheels.push(w);
   }
  }
  const dp=window.attachCarDoor(root,{x:.955,hingeZ:.86,len:1.12,y0:.36,y1:.88,winH:.34,winTilt:.2,paint,glass,trim:black,chrome,mirrorY:.89,scissor:true});bakeWheel(dp);
  window.addCarContactShadow(root,2.52,5.3);
  root.userData={wheels,paint,headMat,brakeMat,doorPivot:dp,doorType:'scissor'};addBeams(root,2.35);return root;
 }

 function makeMuscleCoupe(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const paint=window.makeCarPaintMat('#ff5500',{metalness:.76,roughness:.17});
  const black=material('#14191e',.55,.28),carbon=material('#10141a',.32,.42),glass=window.makeCarGlassMat('#0f2230'),chrome=material('#d4dcdf',.15,.94);
  const headMat=new THREE.MeshStandardMaterial({color:'#f2fbff',emissive:'#cceeff',emissiveIntensity:.35,roughness:.12});
  const drlMat=new THREE.MeshStandardMaterial({color:'#fff3d6',emissive:'#ffaa33',emissiveIntensity:.55,roughness:.1});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#b51a1a',emissive:'#000000',roughness:.18});
  const s=new THREE.Shape();
  s.moveTo(-2.28,.4);s.lineTo(-2.28,.86);s.lineTo(-1.35,.98);s.lineTo(-.62,1.38);s.lineTo(.48,1.38);s.lineTo(1.18,.96);s.lineTo(2.14,.84);s.quadraticCurveTo(2.34,.76,2.34,.4);
  s.lineTo(1.84,.4);s.absarc(1.38,.4,.45,0,Math.PI,false);s.lineTo(-.9,.4);s.absarc(-1.36,.4,.45,0,Math.PI,false);s.lineTo(-2.28,.4);
  const geo=new THREE.ExtrudeGeometry(s,{depth:1.78,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:3,curveSegments:14,steps:1});
  geo.translate(0,0,-.89);geo.rotateY(-Math.PI/2);const shell=new THREE.Mesh(geo,paint);shell.castShadow=true;shell.receiveShadow=true;body.add(shell);
  block(body,0,1.4,-.08,1.34,.07,1.06,paint);
  // Sculpted V8 power-dome hood & twin intake vents
  block(body,0,.98,1.58,.76,.07,.98,paint);
  for(const sx of [-.22,.22])block(body,sx,1.02,1.98,.16,.045,.22,carbon);
  modelPanel(body,[[-.66,1.4,.45],[.66,1.4,.45],[.82,1.0,1.18],[-.82,1.0,1.18]],glass);
  modelPanel(body,[[-.66,1.4,-.6],[-.82,.99,-1.35],[.82,.99,-1.35],[.66,1.4,-.6]],glass);
  for(const side of [-1,1]){
   if(side===-1)modelPanel(body,[[side*.91,.99,-1.24],[side*.73,1.38,-.58],[side*.73,1.38,.42],[side*.91,.99,1.08]],glass);
   else modelPanel(body,[[side*.91,.99,-1.24],[side*.73,1.38,-.58],[side*.73,1.38,-.2],[side*.91,.99,-.2]],glass);
   modelLine(body,[[side*.92,.99,-.1],[side*.74,1.38,-.1]],'#1b2226',.03);
   if(side!==1)block(body,side*.99,1.02,.76,.2,.11,.22,paint);
   block(body,side*.94,.38,0,.07,.08,1.8,carbon);
   block(body,side*.17,.68,2.35,.3,.24,.06,chrome);block(body,side*.17,.68,2.37,.24,.18,.05,black);
  }
  block(body,0,.38,2.37,1.82,.08,.16,carbon);block(body,0,.97,-2.18,1.68,.06,.18,carbon);
  block(body,0,.4,-2.34,1.76,.1,.14,carbon);
  for(const sx of [-.66,-.52,.52,.66])cylinder(body,sx,.42,-2.37,.052,.17,chrome,10).rotation.x=Math.PI/2;
  makePlate(body,'V8 500',0,.5,2.39,0);makePlate(body,'V8 500',0,.62,-2.34,Math.PI);
  bakeBody(root,body);
  for(const side of [-1,1]){
   window.addProLightCluster(root,side,.66,.72,2.34,true,{headMat,drlMat,brakeMat});
   // Iconic muscle recessed tri-bar LED taillights
   block(root,side*.66,.78,-2.31,.5,.19,.06,material('#0b0e14',.35,.5));
   for(const tx of [-.14,0,.14])block(root,side*.66+tx,.78,-2.345,.09,.15,.045,brakeMat);
  }
  block(root,0,1.37,-.62,.42,.026,.04,brakeMat);
  window.addCarCockpit(root,{y:.94,zDash:.6,zSeat:-.22,w:1.22});
  const wheels=[];
  for(const side of [-1,1]){
   for(const z of [-1.36,1.38]){
    const w=window.buildProWheel(root,side*.9,.4,z,side,{r:.4,w:.27,spokes:5,caliper:'#ff2424',rim:'#cfd8dc',rubber:black});
    bakeWheel(w);wheels.push(w);
   }
  }
  const dp=window.attachCarDoor(root,{x:.925,hingeZ:.84,len:1.04,y0:.43,y1:.98,winH:.38,winTilt:.16,paint,glass,trim:black,chrome,mirrorY:1.02});bakeWheel(dp);
  window.addCarContactShadow(root,2.38,5.15);
  root.userData={wheels,paint,headMat,brakeMat,doorPivot:dp,doorType:'hinge'};addBeams(root,2.35);return root;
 }

 function makeSuperbike(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const dark=material('#14191e',.65,.32),crimson=window.makeCarPaintMat('#ff007f',{metalness:.78,roughness:.16}),alloy=material('#cfd7db',.2,.9),goldFork=material('#e0b03b',.22,.88),glass=window.makeCarGlassMat('#0d1f2d');
  const headMat=new THREE.MeshStandardMaterial({color:'#f4fbff',emissive:'#d4f0ff',emissiveIntensity:.4,roughness:.1});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#cc1616',emissive:'#000000',roughness:.18});
  block(body,0,.64,0,.44,.42,1.12,dark);
  block(body,0,.44,.12,.38,.18,.92,crimson);
  block(body,0,.92,.58,.58,.46,.76,crimson);
  block(body,0,1.08,.12,.48,.24,.64,crimson);
  block(body,0,1.02,-.42,.38,.12,.56,dark);
  block(body,0,1.09,-.78,.32,.18,.68,crimson);
  const screen=block(body,0,1.26,.7,.44,.32,.04,glass);screen.rotation.x=-.62;
  for(const side of [-1,1]){
   const fork=cylinder(body,side*.13,.76,.72,.04,.92,goldFork,10);fork.rotation.x=-.28;
   block(body,side*.24,1.2,.46,.32,.05,.05,alloy);
   block(body,side*.24,.62,.28,.09,.46,.56,dark);
   const pipe=cylinder(body,side*.22,.56,-.58,.055,.78,alloy,10);pipe.rotation.x=Math.PI/2-.18;
  }
  bakeBody(root,body);
  for(const side of [-1,1])block(root,side*.12,1.02,.97,.18,.11,.06,headMat);
  block(root,0,1.08,-1.13,.24,.1,.06,brakeMat);
  const wheels=[];
  for(const [z,thick]of [[-.82,.24],[.88,.18]]){
   const w=new THREE.Group();w.position.set(0,.39,z);root.add(w);wheels.push(w);
   cylinder(w,0,0,0,.39,thick,dark,22).rotation.z=Math.PI/2;
   for(const side of [-1,1]){
    cylinder(w,side*(thick*.5+.008),0,0,.27,.02,alloy,16).rotation.z=Math.PI/2;
    cylinder(w,side*(thick*.5+.014),0,0,.19,.012,material('#8e9aa3',.3,.88),14).rotation.z=Math.PI/2;
   }
  }
  window.addCarContactShadow(root,1.15,2.55);
  root.userData={wheels,paint:crimson,headMat,brakeMat};addBeams(root,.98,true);return root;
 }

 function makePickupTruck(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const paint=window.makeCarPaintMat('#6e7d62',{metalness:.52,roughness:.24}),trim=material('#161c20',.65,.25),chrome=material('#cfd7da',.18,.92),glass=window.makeCarGlassMat('#102332');
  const headMat=new THREE.MeshStandardMaterial({color:'#f2fbff',emissive:'#cceeff',emissiveIntensity:.35,roughness:.12});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#b51a1a',emissive:'#000000',roughness:.18});
  block(body,0,.76,1.18,1.94,.64,2.15,paint);
  block(body,0,.58,-1.15,1.94,.3,2.24,paint);
  block(body,0,.78,-1.2,1.66,.1,2.08,trim);
  for(const sx of [-.87,.87])block(body,sx,.96,-1.2,.2,.54,2.24,paint);
  block(body,0,.96,-2.26,1.92,.54,.14,paint);
  block(body,0,1.12,.45,1.84,.48,1.55,paint);
  block(body,-.04,1.38,.47,1.76,.42,1.42,glass);
  for(const sx of [-.89,.89])for(const pz of [-.24,.45,1.14])block(body,sx,1.38,pz,.06,.44,.08,trim);
  block(body,0,1.64,.42,1.82,.11,1.6,paint);
  for(const sx of [-1.02,1.02]){if(sx<0)block(body,sx,1.22,.9,.18,.14,.16,trim);block(body,sx,.98,0,.08,.08,1.5,trim);block(body,sx,.42,0,.1,.08,1.8,trim);}
  // Bold horizontal chrome grille + steel bullbar + dual rear exhausts
  block(body,0,.86,2.27,1.06,.3,.05,trim);
  for(let gy=.76;gy<=.96;gy+=.065)block(body,0,gy,2.3,1.0,.022,.02,chrome);
  block(body,0,.64,2.38,1.86,.26,.14,trim);
  block(body,0,.92,2.42,1.14,.08,.08,trim);
  for(const sx of [-.52,.52])block(body,sx,.78,2.42,.08,.36,.08,trim);
  block(body,0,.52,-2.35,1.94,.14,.12,trim);
  for(const sx of [-.52,.52])cylinder(body,sx,.44,-2.42,.06,.18,chrome,10).rotation.x=Math.PI/2;
  for(const sx of [-.84,.84])block(body,sx,1.42,-.42,.08,.7,.08,chrome);
  block(body,0,1.76,-.42,1.76,.08,.08,chrome);
  for(const sx of [-.42,0,.42])block(body,sx,1.86,-.42,.22,.13,.12,new THREE.MeshStandardMaterial({color:'#fff3c4',emissive:'#ffcf5c',emissiveIntensity:.55,roughness:.15}));
  makePlate(body,'TITAN 4X4',0,.56,2.45,0);makePlate(body,'TITAN 4X4',0,.56,-2.42,Math.PI);
  bakeBody(root,body);
  for(const side of [-1,1]){
   block(root,side*.68,.88,2.27,.38,.18,.06,headMat);
   block(root,side*.78,.94,-2.34,.3,.22,.06,brakeMat);
  }
  const wheels=[];
  for(const side of [-1,1]){
   for(const z of [-1.42,1.42]){
    const w=window.buildProWheel(root,side*.96,.46,z,side,{r:.46,w:.31,spokes:6,caliper:'#ff4500',rim:'#c6cfd4',rubber:trim});
    bakeWheel(w);wheels.push(w);
   }
  }
  const dp=window.attachCarDoor(root,{x:.945,hingeZ:1.12,len:1.02,y0:.6,y1:1.18,winH:.4,winTilt:.03,paint,glass,trim,chrome,mirrorY:1.22});bakeWheel(dp);
  window.addCarContactShadow(root,2.6,5.55);
  root.userData={wheels,paint,headMat,brakeMat,doorPivot:dp,doorType:'hinge'};addBeams(root,2.32);return root;
 }

 function makeExecutiveSuv(){
  const root=new THREE.Group();root.rotation.order='YXZ';scene.add(root);
  const body=new THREE.Group();
  const paint=window.makeCarPaintMat('#18202c',{metalness:.72,roughness:.17});
  const trim=material('#0f141c',.6,.3),chrome=material('#d4dcdf',.15,.94),glass=window.makeCarGlassMat('#0c1e2a');
  const headMat=new THREE.MeshStandardMaterial({color:'#f4fbff',emissive:'#d4f0ff',emissiveIntensity:.35,roughness:.12});
  const drlMat=new THREE.MeshStandardMaterial({color:'#e8fbff',emissive:'#00f0ff',emissiveIntensity:.5,roughness:.1});
  const brakeMat=new THREE.MeshStandardMaterial({color:'#b51a1a',emissive:'#000000',roughness:.18});
  // Sculpted beveled luxury SUV silhouette
  const s=new THREE.Shape();
  s.moveTo(-2.42,.44);s.lineTo(-2.42,1.12);s.lineTo(-1.92,1.68);s.lineTo(.92,1.68);s.lineTo(1.36,1.16);s.lineTo(2.3,1.06);s.quadraticCurveTo(2.44,.98,2.44,.44);
  s.lineTo(1.98,.44);s.absarc(1.52,.44,.47,0,Math.PI,false);s.lineTo(-1.05,.44);s.absarc(-1.52,.44,.47,0,Math.PI,false);s.lineTo(-2.42,.44);
  const geo=new THREE.ExtrudeGeometry(s,{depth:1.96,bevelEnabled:true,bevelThickness:.05,bevelSize:.04,bevelSegments:3,curveSegments:12,steps:1});
  geo.translate(0,0,-.98);geo.rotateY(-Math.PI/2);const shell=new THREE.Mesh(geo,paint);shell.castShadow=true;shell.receiveShadow=true;body.add(shell);
  // Tinted panoramic greenhouse, roof rails, side steps & vertical chrome luxury grille
  modelPanel(body,[[-.84,1.66,.88],[.84,1.66,.88],[.92,1.16,1.38],[-.92,1.16,1.38]],glass);
  modelPanel(body,[[-.84,1.66,-1.88],[-.92,1.14,-2.38],[.92,1.14,-2.38],[.84,1.66,-1.88]],glass);
  for(const side of [-1,1]){
   if(side===-1)modelPanel(body,[[side*1.0,1.15,-2.12],[side*.88,1.64,-1.84],[side*.88,1.64,.82],[side*1.0,1.15,1.26]],glass);
   else modelPanel(body,[[side*1.0,1.15,-2.12],[side*.88,1.64,-1.84],[side*.88,1.64,-.12],[side*1.0,1.15,-.12]],glass);
   block(body,side*.76,1.74,-.52,.06,.07,2.4,chrome);
   block(body,side*1.04,.4,0,.11,.08,2.05,trim);
   if(side!==1)block(body,side*1.06,1.2,.92,.18,.12,.2,paint);
  }
  block(body,0,.86,2.44,1.16,.38,.05,trim);
  for(let gx=-.48;gx<=.48;gx+=.12)block(body,gx,.86,2.47,.035,.34,.02,chrome);
  block(body,0,.46,2.45,2.0,.18,.14,trim);
  block(body,0,.46,-2.45,2.0,.18,.14,trim);
  for(const sx of [-.66,-.48,.48,.66])cylinder(body,sx,.42,-2.48,.052,.16,chrome,10).rotation.x=Math.PI/2;
  makePlate(body,'EXEC V8',0,.54,2.48,0);makePlate(body,'EXEC V8',0,.54,-2.48,Math.PI);
  const baked=mergeStaticModel(body);root.add(baked);
  for(const side of [-1,1]){
   window.addProLightCluster(root,side,.72,.9,2.44,true,{headMat,drlMat,brakeMat});
   window.addProLightCluster(root,side,.76,.96,-2.44,false,{headMat,drlMat,brakeMat});
  }
  block(root,0,.96,-2.43,1.24,.045,.04,brakeMat);
  block(root,0,1.65,-1.92,.54,.03,.04,brakeMat);
  window.addCarCockpit(root,{y:1.08,zDash:.82,zSeat:-.18,w:1.42});
  const wheels=[];
  for(const side of [-1,1])for(const z of [-1.52,1.52]){
   const w=window.buildProWheel(root,side*.96,.44,z,side,{r:.44,w:.29,spokes:6,caliper:'#d62020',rim:'#dce4e8',rubber:trim});
   bakeWheel(w);wheels.push(w);
  }
  const dp=window.attachCarDoor(root,{x:.98,hingeZ:.95,len:1.05,y0:.52,y1:1.15,winH:.46,winTilt:.04,paint,glass,trim,chrome,mirrorY:1.2});
  bakeWheel(dp);
  window.addCarContactShadow(root,2.58,5.45);
  root.userData={wheels,paint,headMat,brakeMat,doorPivot:dp,doorType:'hinge'};addBeams(root,2.42);return root;
 }

 const heroMeshes={
  car:vehicle,
  sports:makeSportsCoupe(),
  muscle:makeMuscleCoupe(),
  pickup:makePickupTruck(),
  cruiser:sedan('#f4f6fa',true,true),
  supercar:makeSupercar(),
  suv:makeExecutiveSuv(),
  superbike:makeSuperbike()
 };
 for(const m of [vehicle,heroMeshes.cruiser]){
  if(m?.userData?.doorPivot)bakeWheel(m.userData.doorPivot);
  m?.userData?.wheels?.forEach(w=>bakeWheel(w));
 }
 vehicle.rotation.order='YXZ';

 // Neon Underglow & Twin NOS/Turbo Exhaust Flame Meshes
 const neonColors={off:null,cyan:'#00f0ff',magenta:'#ff007f',purple:'#b100ff',gold:'#ffd700',red:'#ff2a2a',green:'#38f288',lime:'#38f288'};
 const underglowTex=texture((c,w,h)=>{
  c.clearRect(0,0,w,h);
  const g=c.createRadialGradient(w/2,h/2,3,w/2,h/2,w/2);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.62,'rgba(255,255,255,.72)');g.addColorStop(.86,'rgba(255,255,255,.22)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,w,h);
 },64,64);
 const underglowGeo=new THREE.PlaneGeometry(3.5,5.9);underglowGeo.rotateX(-Math.PI/2);
 const underglowMat=new THREE.MeshBasicMaterial({map:underglowTex,color:'#00f0ff',transparent:true,opacity:.88,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
 const underglowMesh=new THREE.Mesh(underglowGeo,underglowMat);
 underglowMesh.visible=false;scene.add(underglowMesh);

 const flameGeo=new THREE.ConeGeometry(.12,.85,6);flameGeo.rotateX(-Math.PI/2);
 const flameMesh=new THREE.InstancedMesh(flameGeo,new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending}),2);
 flameMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);flameMesh.frustumCulled=false;flameMesh.visible=false;scene.add(flameMesh);
 const flameDummy=new THREE.Object3D(),nosCol=new THREE.Color('#00f0ff'),turboCol=new THREE.Color('#ff8e29');

 function stepDoor(v,mesh,dt){
  if(!v)return;
  if(v.doorAnim){
   const a=v.doorAnim;if(running)a.t+=dt;
   const maxA=1.04,closeStart=a.dur-.26;
   if(a.t>=a.dur){v.doorAngle=0;v.doorAnim=null;}
   else if(a.t<.18)v.doorAngle=maxA*(a.t/.18);
   else if(a.t<closeStart)v.doorAngle=maxA;
   else{
    v.doorAngle=maxA*Math.max(0,1-(a.t-closeStart)/.26);
    if(a.t>=a.dur-.04&&!a.slammed){
     a.slammed=true;window.playDoorSound?.('slam');
     if(inCar&&currentRide()===v)window.vehicleRoll=(window.vehicleRoll||0)+.028;
    }
   }
  }else v.doorAngle=0;
  const dp=mesh?.userData?.doorPivot;if(!dp)return;
  const ang=v.doorAngle||0;
  if(mesh.userData.doorType==='scissor'){dp.rotation.y=-ang*.36;dp.rotation.x=ang*.78;}
  else{dp.rotation.y=-ang;dp.rotation.x=0;}
 }

 // Pooled smoke particles & tire skid decals (2 draw calls total)
 const smokeDummy=new THREE.Object3D(),smokeCount=64,skidCount=80;
 const tireSmokeCol=new THREE.Color('#eef2ef'),darkSmokeCol=new THREE.Color('#303538');
 const smokeMesh=new THREE.InstancedMesh(new THREE.SphereGeometry(.4,6,4),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.38,depthWrite:false}),smokeCount);
 smokeMesh.frustumCulled=false;smokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);smokeMesh.count=0;scene.add(smokeMesh);
 const smokeItems=[];let smokeCursor=0,emitClock=0;
 function spawnSmoke(x,y,z,scale,vy,life,isDark=false){
  const item=smokeItems[smokeCursor]||(smokeItems[smokeCursor]={});
  item.x=x;item.y=y;item.z=z;item.s=scale;item.vy=vy;item.life=life;item.max=life;item.dark=isDark;
  smokeCursor=(smokeCursor+1)%smokeCount;
 }
 const skidMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.32,1.2),new THREE.MeshBasicMaterial({color:'#1d2324',transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide}),skidCount);
 skidMesh.frustumCulled=false;skidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);skidMesh.count=0;scene.add(skidMesh);
 const skidItems=[];let skidCursor=0;
 function spawnSkid(x,z,yaw){
  const item=skidItems[skidCursor]||(skidItems[skidCursor]={});
  item.x=x;item.z=z;item.yaw=yaw;item.life=7;
  skidCursor=(skidCursor+1)%skidCount;
 }

 function renderVehicles(time,dt){
  const blackout=!!window._missionBlackoutActive;
  const nightAuto=(window.currentDusk||0)>.5||(window.worldClock?.rainIntensity||0)>.35;
  const lightsOn=!blackout&&(window.headlightsOn===null?nightAuto:!!window.headlightsOn);
  const steerInput=window.steerSmooth||0;

  for(const [id,mesh]of Object.entries(heroMeshes)){
   const v=window.cityVehicles?.[id];if(!v)continue;
   stepDoor(v,mesh,dt);
   const active=inCar&&ride===id;
   mesh.visible=id==='car'||active||distance(player,v)<95;
   if(!mesh.visible)continue;
   mesh.position.set(v.x,v.jumpY||0,v.z);
   mesh.rotation.y=v.yaw+(active&&id!=='superbike'?(window.driftVisualYaw||0):0);
   mesh.rotation.x=(active?window.vehiclePitch:0)+(v.jumpPitch||0);
   mesh.rotation.z=id==='superbike'?(active?steerInput*.24*Math.min(1,Math.abs(velocity)/6):0):(active?-window.vehicleRoll:0);
   if(mesh.userData.headMat)mesh.userData.headMat.emissiveIntensity=lightsOn?1.1:.2;
   if(mesh.userData.brakeMat)mesh.userData.brakeMat.emissive.set(active&&window.brakingNow?'#ff2a1f':lightsOn?'#550908':'#000000');
   if(mesh.userData.beams){const showBeam=lightsOn&&(active||(id==='cruiser'&&v.siren))&&!(mobileMode&&lowMode);for(const b of mesh.userData.beams)b.visible=showBeam;}
   if(id!=='car'&&mesh.userData.wheels){
    mesh.userData.wheels.forEach((w,i)=>{
     w.rotation.x=v.wheelSpin||0;
     w.rotation.y=id==='superbike'?(i===1&&active?-steerInput*.32:0):(i%2===1&&active?-steerInput*.25:0);
    });
   }
  }

  // Police Cruiser lightbar flash
  const cruiserVeh=window.cityVehicles?.cruiser,cruiserMesh=heroMeshes.cruiser;
  if(cruiserVeh&&cruiserMesh?.userData?.red){
   const flash=cruiserVeh.siren||(inCar&&ride==='cruiser'&&wanted);
   cruiserMesh.userData.red.material.emissive.set(flash&&Math.sin(time*20)>0?'#ff2100':'#000000');
   cruiserMesh.userData.blue.material.emissive.set(flash&&Math.sin(time*20)<0?'#003cff':'#000000');
  }

  // Active Neon Underglow
  const nId=window.NeonActiveVisuals?.neon||'off';
  const nHex=neonColors[nId]||(nId&&nId.startsWith('#')?nId:null);
  const activeVeh=inCar?currentRide():null;
  const activeSpec=window.vehicleSpecs?.[ride];
  underglowMesh.visible=!!(nHex&&activeVeh);
  if(underglowMesh.visible){
   underglowMat.color.set(nHex);
   underglowMat.opacity=(.84+Math.sin(time*4)*.08)*((window.currentDusk||0)>.35||(window.worldClock?.rainIntensity||0)>.3?1:.78);
   underglowMesh.position.set(activeVeh.x,(activeVeh.jumpY||0)+.085,activeVeh.z);
   underglowMesh.rotation.y=activeVeh.yaw+(window.driftVisualYaw||0);
   const sx=activeSpec?.isBike?.52:1,sz=activeSpec?.isBike?.58:1;
   underglowMesh.scale.set(sx,1,sz);
  }

  // Twin NOS / Turbo Exhaust Flames
  const nosOn=inCar&&(!!window.nosActive||(window.turboPopTime||0)>0);
  flameMesh.visible=nosOn;
  if(nosOn&&activeVeh){
   const yaw=activeVeh.yaw+(activeSpec?.isBike?0:(window.driftVisualYaw||0)),backOff=activeSpec?.isBike?-1.25:-2.5;
   const sides=activeSpec?.isBike?[0]:[-.32,.32],col=window.nosActive?nosCol:turboCol,len=window.nosActive?(1.05+Math.sin(time*45)*.22):.65;
   for(let i=0;i<2;i++){
    const side=sides[Math.min(i,sides.length-1)];
    flameDummy.position.set(activeVeh.x+Math.sin(yaw)*backOff+Math.cos(yaw)*side,.4+(activeVeh.jumpY||0),activeVeh.z+Math.cos(yaw)*backOff-Math.sin(yaw)*side);
    flameDummy.rotation.set(0,yaw,0);
    flameDummy.scale.set(window.nosActive?1.1:.8,window.nosActive?1.1:.8,i>=sides.length?.01:len);
    flameDummy.updateMatrix();
    flameMesh.setMatrixAt(i,flameDummy.matrix);
    flameMesh.setColorAt(i,col);
   }
   flameMesh.count=sides.length;flameMesh.instanceMatrix.needsUpdate=true;
   if(flameMesh.instanceColor)flameMesh.instanceColor.needsUpdate=true;
  }

  // Drift Tire Smoke & Skid Decals
  if(running&&inCar&&activeVeh){
   emitClock+=dt;
   const stepInterval=(mobileMode&&lowMode)?.07:.035;
   if(emitClock>=stepInterval){
    emitClock=0;
    if(window.driftAmount>.22&&!activeSpec?.isBike){
     for(const side of [-.75,.75]){
      const wx=activeVeh.x+Math.cos(activeVeh.yaw)*side-Math.sin(activeVeh.yaw)*1.3,wz=activeVeh.z-Math.sin(activeVeh.yaw)*side-Math.cos(activeVeh.yaw)*1.3;
      spawnSmoke(wx,.25,wz,.45,1.2,.55);
      spawnSkid(wx,wz,activeVeh.yaw);
     }
    }
    if(window.nosActive){
     spawnSmoke(activeVeh.x-Math.sin(activeVeh.yaw)*2.45,.42+(activeVeh.jumpY||0),activeVeh.z-Math.cos(activeVeh.yaw)*2.45,.34,.55,.32,false);
    }
    if((activeVeh.hp??100)<55){
     spawnSmoke(activeVeh.x+Math.sin(activeVeh.yaw)*1.6,1.1,activeVeh.z+Math.cos(activeVeh.yaw)*1.6,.5,1.6,.8,true);
    }
   }
  }
  let sc=0;
  for(const item of smokeItems){
   if(!item||item.life<=0)continue;
   if(running){item.life-=dt;item.y+=item.vy*dt;item.s+=dt*1.3;}
   if(item.life<=0)continue;
   const alpha=Math.max(.01,item.life/item.max);
   smokeDummy.position.set(item.x,item.y,item.z);smokeDummy.rotation.set(0,0,0);smokeDummy.scale.setScalar(item.s*alpha);smokeDummy.updateMatrix();
   smokeMesh.setMatrixAt(sc,smokeDummy.matrix);
   smokeMesh.setColorAt(sc,item.dark?darkSmokeCol:tireSmokeCol);
   sc++;
  }
  smokeMesh.count=sc;if(sc>0){smokeMesh.instanceMatrix.needsUpdate=true;if(smokeMesh.instanceColor)smokeMesh.instanceColor.needsUpdate=true;}
  let skc=0;
  for(const sk of skidItems){
   if(!sk||sk.life<=0)continue;
   if(running)sk.life-=dt;
   if(sk.life<=0)continue;
   smokeDummy.position.set(sk.x,.045,sk.z);smokeDummy.rotation.set(-Math.PI/2,0,sk.yaw);smokeDummy.scale.set(1,1,1);smokeDummy.updateMatrix();
   skidMesh.setMatrixAt(skc++,smokeDummy.matrix);
  }
  skidMesh.count=skc;if(skc>0)skidMesh.instanceMatrix.needsUpdate=true;
 }

 window.NeonVehicles={heroMeshes,smokeMesh,skidMesh,underglowMesh,flameMesh,bakeSubgroup:bakeWheel,renderVehicles};
})();
