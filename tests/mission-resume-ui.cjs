
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});const errors=[],checks=[];try{
for(const [w,h] of [[360,640],[844,390],[768,1024],[1280,720]]){
const p=await b.newPage({viewport:{width:w,height:h},hasTouch:w<1000,isMobile:w<1000});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await p.goto('file:///'+path.resolve('www/index.html').replace(/\\/g,'/'));await p.waitForFunction(()=>window.gameReady);
await p.evaluate(()=>{window.dismissBootOverlay?.();window.NeonSave.save({starRatings:{M1:3,M2:2}});});
for(const mode of ['clear','glass','solid']){
await p.evaluate(mode=>window.setHudOpacity(mode),mode);
const badge=await p.locator('#missionStarBadge').evaluate(el=>{const r=el.getBoundingClientRect();let op=1;for(let e=el;e;e=e.parentElement)op*=Number(getComputedStyle(e).opacity);return {text:el.textContent,op,inside:r.x>=0&&r.y>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,w:r.width};});
const overlaps=await p.locator('#missionStarBadge').evaluate(el=>{const a=el.getBoundingClientRect();return [...document.querySelectorAll('#touchTop button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&Math.min(a.right,r.right)>Math.max(a.left,r.left)&&Math.min(a.bottom,r.bottom)>Math.max(a.top,r.top)}).length;});assert.equal(overlaps,0);
assert.equal(badge.text,'⭐ 5');assert.equal(badge.op,1);assert.ok(badge.inside&&badge.w>0,JSON.stringify({w,h,mode,badge}));
await p.evaluate(()=>window.NeonPhone.open('home'));await p.locator('#phoneScreen .mission-star').waitFor({state:'visible'});assert.equal(await p.locator('#phoneScreen .mission-star').textContent(),'⭐ 5');await p.evaluate(()=>window.NeonPhone.close());checks.push(w+'x'+h+' '+mode);
}
await p.evaluate(()=>window.togglePauseMenu(true));
await p.locator('#pauseMissionStarBadge').waitFor({state:'visible'});assert.equal(await p.locator('#pauseMissionStarBadge').textContent(),'⭐ 5');
assert.equal(await p.locator('#pauseMissionStarBadge').evaluate(el=>getComputedStyle(el).opacity),'1');
await p.evaluate(()=>window.togglePauseMenu(false));checks.push(w+'x'+h+' pause badge');
if(w===1280){
await p.evaluate(()=>{window.NeonMissions.startMission('M1');const cp=window.NeonMissions.activeMission.checkpoints[0];Object.assign(player,{x:cp.x,z:cp.z,yaw:Math.PI});Object.assign(currentRide(),player);velocity=0;window.NeonMissions.update(.1,{player,inCar:true,vehicleHp:100});window.NeonMissions.saveProgress();});
const before=await p.evaluate(()=>window.NeonSave.getLastMission());assert.equal(before.state.checkpointIndex,1);
await p.reload();await p.waitForFunction(()=>window.gameReady);const after=await p.evaluate(()=>({id:window.NeonMissions.activeMission?.id,cp:window.NeonMissions.checkpointIndex,time:window.NeonMissions.remainingTimeSec,p:{x:player.x,z:player.z}}));assert.equal(after.id,'M1');assert.equal(after.cp,1);assert.ok(Math.abs(after.time-before.state.remainingTimeSec)<3);assert.ok(Math.hypot(after.p.x-before.state.runtime.player.x,after.p.z-before.state.runtime.player.z)<3);checks.push('reload restores mission checkpoint, timer and position');
await p.evaluate(()=>{window.NeonMissions.completeMission();});assert.equal(await p.evaluate(()=>window.NeonSave.getLastMission()),null);await p.reload();await p.waitForFunction(()=>window.gameReady);assert.equal(await p.evaluate(()=>window.NeonMissions.isActive()),false);checks.push('completed mission never auto-resumes');
}
await p.screenshot({path:'tests/mission-badge-'+w+'.png'});await p.close();}
assert.deepEqual(errors,[]);fs.writeFileSync('tests/mission-resume-ui-results.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('PASS '+checks.length+' checks, zero console errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
