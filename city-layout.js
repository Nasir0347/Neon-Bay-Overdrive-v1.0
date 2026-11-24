/* Shared 2000m x 2000m road graph, landmarks, and collision index for NEON BAY: OVERDRIVE. */
(function(root){
const axes=[-900,-600,-300,0,300,600,900],roads=[];
for(const v of axes){
 const w=(v===0||Math.abs(v)===900||v===-600)?24:22;
 roads.push({x:v,z:0,w,d:1900,name:v===0?'Oceanic Boulevard':Math.abs(v)===900?'Skyline Expressway':(v===-600?'Iron Docks Avenue':'Bay Avenue')});
 roads.push({x:0,z:v,w:1900,d:w,name:v===-600?'Sunset Strip':Math.abs(v)===900?'Skyline Expressway':(v===0?'Central Boulevard':'Crosstown Avenue')});
}
const nodes=axes.flatMap(x=>axes.map(z=>({x,z})));
const districts=[
 [0,0,'APEX CORE'],
 [0,-680,'PALM STRIP'],
 [-650,0,'IRON DOCKS'],
 [0,620,'BAYVIEW HEIGHTS'],
 [750,0,'AIRPORT']
];
const landmarks={
 solarisTower:{x:52,z:52,district:'Apex Core',label:'Solaris Tower'},
 titanBank:{x:-42,z:260,district:'Apex Core',label:'Titan National Bank'},
 policeHQ:{x:52,z:-165,district:'Apex Core',label:'NBPD Police HQ'},
 pier99:{x:0,z:-910,district:'Palm Strip',label:'Pier 99 Marina'},
 pier99Lounge:{x:24,z:-875,district:'Palm Strip',label:'Pier 99 Waterfront Lounge'},
 palmBeach:{x:0,z:-865,district:'Palm Strip',label:'Palm Strip Beach'},
 ferrisWheel:{x:-210,z:-875,district:'Palm Strip',label:'Neon Wheel'},
 ironDocksYard:{x:-600,z:0,district:'Iron Docks',label:'Iron Docks Terminal'},
 docksWarehouse:{x:-626,z:-36,district:'Iron Docks',label:'Iron Docks Sanctuary'},
 tunnelVault:{x:-900,z:-300,district:'Iron Docks',label:'Hidden Tunnel Vault'},
 vegaGarage:{x:36,z:420,district:'Bayview Heights',label:"Vega's Garage"},
 skylineConstruction:{x:0,z:600,district:'Bayview Heights',label:'Skyline Construction Site'},
 airportTower:{x:665,z:-36,district:'Bayview Heights',label:'Neon Bay Airport VIP Terminal'},
 airportRunway:{x:750,z:0,district:'Bayview Heights',label:'Neon Bay International Airport'},
 airportJet:{x:750,z:-260,district:'Bayview Heights',label:'Airport Private Jet'},
 bayviewCauseway:{x:0,z:960,district:'Bayview Heights',label:'Bayview Causeway'}
};
function walls(b){
 const t=0.45,h=b.wallH||4.6;
 const side=b.doorSide||(b.x>0?'west':'east');
 const span=(side==='west'||side==='east')?b.d:b.w;
 const doorW=Math.min(b.doorWidth||5.8,span-3.0);
 if(side==='west'||side==='east'){
  const backX=b.x+(side==='west'?b.w/2:-b.w/2);
  const frontX=b.x+(side==='west'?-b.w/2:b.w/2);
  const segD=Math.max(1.2,(b.d-doorW)/2);
  return [
   {x:backX,z:b.z,w:t,d:b.d,h},
   ...[-1,1].map(q=>({x:b.x,z:b.z+q*b.d/2,w:b.w,d:t,h})),
   ...[-1,1].map(q=>({x:frontX,z:b.z+q*(doorW/2+segD/2),w:t,d:segD,h}))
  ];
 }
 const backZ=b.z+(side==='south'?b.d/2:-b.d/2);
 const frontZ=b.z+(side==='south'?-b.d/2:b.d/2);
 const segW=Math.max(1.2,(b.w-doorW)/2);
 return [
  {x:b.x,z:backZ,w:b.w,d:t,h},
  ...[-1,1].map(q=>({x:b.x+q*b.w/2,z:b.z,w:t,d:b.d,h})),
  ...[-1,1].map(q=>({x:b.x+q*(doorW/2+segW/2),z:frontZ,w:segW,d:t,h}))
 ];
}
function isProtectedOpenZone(x,z){
 if(z<-780)return true; // Palm Strip beach, Pier 99 Lounge & oceanfront
 if(x>575&&z>-360&&z<360)return true; // Neon Bay International Airport runway, apron & terminal
 if(Math.abs(x)<68&&z>205&&z<315)return true; // Titan National Bank Plaza (M11)
 if(Math.abs(x)<68&&z>375&&z<465)return true; // Vega's Garage apron
 if(Math.abs(x)<62&&z>535&&z<780)return true; // Skyline Construction mega-ramp + landing zone (M12)
 if(Math.abs(x-52)<34&&Math.abs(z-52)<34)return true; // Solaris Tower Plaza
 if(Math.abs(x-52)<34&&Math.abs(z+165)<34)return true; // NBPD Police HQ
 if(Math.abs(x+626)<42&&Math.abs(z+36)<42)return true; // Iron Docks Sanctuary apron
 if(axes.some(a=>Math.abs(x-a)<32||Math.abs(z-a)<32))return true; // Keep all 7x7 road corridors wide clear
 return false;
}
function prepare(buildings){
 for(const b of buildings)if(!b.landmark&&Math.abs(b.x)===22&&(Math.abs(b.z)===22||b.z===-44)){b.interior=true;b.wallH=b.wallH||3.8;b.doorWidth=b.doorWidth||6.2;}
 // Single-source outer district skyline blocks across 2000m x 2000m grid cleanly off roads and mission zones
 for(const x of [-750,-450,-150,150,450,750]){
  for(const z of [-720,-450,-150,150,450,750]){
   if(Math.abs(x)<=120&&Math.abs(z)<=120)continue;
   for(const [ox,oz] of [[-55,-55],[55,-55],[-55,55],[55,55]]){
    const bx=x+ox,bz=z+oz;
    if(Math.abs(bx)>860||Math.abs(bz)>860||isProtectedOpenZone(bx,bz))continue;
    if(buildings.some(b=>Math.abs(b.x-bx)<30&&Math.abs(b.z-bz)<30))continue;
    const isDocks=bx<-360&&bz>-380&&bz<380;
    const isSuburb=bz>360;
    const isResort=!isDocks&&!isSuburb&&bz<-360;
    const kind=isDocks?'container':isSuburb?'villa':isResort?'resort':'tower';
    const w=isDocks?16:isSuburb?18:22;
    const d=isDocks?18:isSuburb?16:22;
    const h=isDocks?6.2:isSuburb?(7+((Math.abs(bx+bz)%4)*1.5)):isResort?(24+((Math.abs(bx+bz)%4)*8)):(34+((Math.abs(bx*3+bz)%5)*12));
    const col=isDocks
     ? ['#ff6b2b','#18b8d4','#e63946','#f4b942','#2ec4b6','#4a76a8'][Math.abs(bx+bz)%6]
     : isSuburb
      ? ['#f2e6d0','#ead7be','#d7ece8','#f5d8dc'][Math.abs(bx+bz)%4]
      : isResort
       ? ['#ebd8de','#cfe8ec','#efe2cc','#ded6ee'][Math.abs(bx+bz)%4]
       : ['#668fb8','#78a2c8','#5c84a8','#84adc9'][Math.abs(bx+bz)%4];
    const accent=(bx+bz)%2?'#00f0ff':'#ff007f';
    const roofColor=['#3b4958','#2f4c58','#4c415c'][Math.abs(bx)%3];
    const name=isDocks?'IRON DOCKS DEPOT':isSuburb?'BAYVIEW VILLA':isResort?'PALM STRIP RESORT':'NEON BAY TOWER';
    buildings.push({x:bx,z:bz,w,d,h,color:col,accent,roofColor,kind,name});
   }
  }
 }
 // 7 Walk-In Landmark Hero Buildings with open ground-floor interiors + aligned door colliders
 buildings.push({x:52,z:52,w:22,d:22,h:74,wallH:5.2,interior:true,doorSide:'west',doorWidth:6.4,color:'#2b4a68',name:'SOLARIS TOWER',landmark:'solarisTower'});
 buildings.push({x:-42,z:260,w:26,d:22,h:26,wallH:5.6,interior:true,doorSide:'east',doorWidth:6.8,color:'#e2d9c8',name:'TITAN NATIONAL BANK',landmark:'titanBank'});
 buildings.push({x:52,z:-165,w:22,d:20,h:18,wallH:4.8,interior:true,doorSide:'west',doorWidth:6.0,color:'#3b5878',name:'NBPD POLICE HQ',landmark:'policeHQ'});
 buildings.push({x:36,z:420,w:20,d:18,h:8.5,wallH:4.8,interior:true,doorSide:'west',doorWidth:7.4,color:'#45586e',name:"VEGA'S GARAGE",landmark:'vegaGarage'});
 buildings.push({x:24,z:-875,w:18,d:16,h:7.5,wallH:4.4,interior:true,doorSide:'west',doorWidth:6.2,color:'#f0e4d8',name:'PIER 99 LOUNGE',landmark:'pier99Lounge'});
 buildings.push({x:665,z:-36,w:18,d:24,h:28,wallH:5.0,interior:true,doorSide:'east',doorWidth:6.8,color:'#405d7a',name:'NEON BAY AIRPORT TERMINAL',landmark:'airportTower'});
 buildings.push({x:-626,z:-36,w:20,d:20,h:10,wallH:5.0,interior:true,doorSide:'east',doorWidth:7.0,color:'#4a5a68',name:'IRON DOCKS SANCTUARY',landmark:'docksWarehouse'});

 const boxes=buildings.flatMap(b=>b.interior?walls(b):[b]);
 for(const b of buildings.filter(b=>b.interior&&!b.landmark))boxes.push({x:b.x+(b.x<0?-5:5),z:b.z,w:1.2,d:5,h:1.1});
 return boxes;
}
function index(boxes){const cells=new Map(),size=40;for(const b of boxes)for(let x=Math.floor((b.x-b.w/2)/size);x<=Math.floor((b.x+b.w/2)/size);x++)for(let z=Math.floor((b.z-b.d/2)/size);z<=Math.floor((b.z+b.d/2)/size);z++){const k=x+','+z;if(!cells.has(k))cells.set(k,[]);cells.get(k).push(b);}return (x,z,r=1)=>{const out=new Set();for(let a=Math.floor((x-r)/size);a<=Math.floor((x+r)/size);a++)for(let b=Math.floor((z-r)/size);b<=Math.floor((z+r)/size);b++)for(const box of cells.get(a+','+b)||[])out.add(box);return [...out];};}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const interiorAprons=[
 landmarks.solarisTower,
 landmarks.titanBank,
 landmarks.policeHQ,
 landmarks.vegaGarage,
 landmarks.pier99Lounge,
 landmarks.airportTower,
 landmarks.docksWarehouse
];
function isOnRoad(x,z){
 if(!Number.isFinite(x)||!Number.isFinite(z))return false;
 if(x>=710&&x<=790&&z>=-320&&z<=320)return true; // Airport runway
 if(z>=-912&&z<=-832&&Math.abs(x)<=900)return true; // Palm Strip coastal sand
 if(Math.abs(x)<=5.2&&z<=-908&&z>=-980)return true; // Pier 99 boardwalk
 if(interiorAprons.some(lm=>Math.hypot(x-lm.x,z-lm.z)<=22))return true; // Walk-in landmark interiors & aprons
 return axes.some(a=>Math.abs(x-a)<=14||Math.abs(z-a)<=14);
}
function project(p){let best=null;for(const a of axes)for(const q of [{x:a,z:p.z},{x:p.x,z:a}]){const d=dist(p,q);if(!best||d<best.d)best={...q,d};}return best;}
function route(a,b){const src=project(a),dst=project(b),all=[...nodes,src,dst],n=all.length,D=Array(n).fill(Infinity),prev=Array(n).fill(-1),seen=new Set();D[n-2]=0;
 for(let k=0;k<n;k++){let u=-1;for(let i=0;i<n;i++)if(!seen.has(i)&&(u<0||D[i]<D[u]))u=i;if(u<0||!Number.isFinite(D[u]))break;seen.add(u);for(let v=0;v<n;v++)if(!seen.has(v)&&((all[u].x===all[v].x&&axes.includes(all[u].x))||(all[u].z===all[v].z&&axes.includes(all[u].z)))){const d=D[u]+dist(all[u],all[v]);if(d<D[v]){D[v]=d;prev[v]=u;}}}
 const path=[];for(let u=n-1;u!==-1;u=prev[u])path.unshift(all[u]);return [a,...path,b].filter((p,i,arr)=>i===0||dist(p,arr[i-1])>.1);}
const api={axes,roads,nodes,districts,landmarks,walls,prepare,index,route,isOnRoad};root.CityLayout=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
