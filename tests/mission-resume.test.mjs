
import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveManager,SAVE_KEY} from '../src/core/SaveManager.js';
import {MissionManager} from '../src/missions/MissionManager.js';
import {STORY_MISSIONS} from '../src/missions/missionsConfig.js';
import {EventBus} from '../src/core/EventBus.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('Mission snapshot preserves partial mechanics and clears on completion/abort',()=>{
 const st=storage(),save=new SaveManager({storage:st,eventBus:new EventBus()});
 const mgr=new MissionManager({missions:STORY_MISSIONS,saveManager:save});mgr.startMission('M6');
 for(let i=0;i<4;i++)mgr.update(.25,{player:{...mgr.mechanicState.targetPos},velocity:i===3?20:0});
 mgr.saveProgress();const stored=save.getLastMission();assert.ok(stored.state.mechanicState.targetHp<100);
 const reload=new SaveManager({storage:st,eventBus:new EventBus()}),next=new MissionManager({missions:STORY_MISSIONS,saveManager:reload});
 assert.equal(next.resumeMission(stored.id,stored.state).ok,true);assert.equal(next.mechanicState.targetHp,mgr.mechanicState.targetHp);assert.equal(next.remainingTimeSec,mgr.remainingTimeSec);
 next.abortMission();assert.equal(reload.getLastMission(),null);next.startMission('M1');next.completeMission();assert.equal(reload.getLastMission(),null);
});
test('Old/corrupt saves and unavailable storage are safe',()=>{
 const st=storage();st.setItem(SAVE_KEY,JSON.stringify({schemaVersion:1,lastMissionId:'M999',lastMissionState:{version:1,state:'ACTIVE',remainingTimeSec:30}}));
 const save=new SaveManager({storage:st,eventBus:new EventBus()});assert.equal(save.getLastMission(),null);
 const mem=new SaveManager({storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}},eventBus:new EventBus()});
 const mgr=new MissionManager({missions:STORY_MISSIONS,saveManager:mem});mgr.startMission('M1');mgr.saveProgress();assert.equal(mem.getLastMission().id,'M1');
 const cp=mem.getLastMission();cp.state.checkpointIndex=-1;assert.equal(mgr.resumeMission(cp.id,cp.state).ok,false);assert.equal(mem.getLastMission(),null);
});
