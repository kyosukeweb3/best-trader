import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcile,modifiedDietz,performance,type Position} from '../lib/tracker/engine.ts';
import {openStore} from '../lib/tracker/store.ts';
import {traders} from '../lib/tracker/traders.ts';
import type {LiveTrader} from '../lib/tracker/live.ts';
const p=(size=1,roe=0):Position=>({coin:'BTC',size,roe,entry:100,mark:110,notional:Math.abs(size)*110,pnl:10,leverage:2});
test('initial observations do not invent opens',()=>assert.deepEqual(reconcile(null,[p()],1),[]));
test('open add reduce close and reversal',()=>{
 assert.deepEqual(reconcile([],[p()],1).map(e=>e.type),['OPEN']);
 assert.deepEqual(reconcile([p()],[p(2)],2).map(e=>e.type),['ADD']);
 assert.deepEqual(reconcile([p(2)],[p()],3).map(e=>e.type),['REDUCE']);
 assert.deepEqual(reconcile([p()],[],4).map(e=>e.type),['CLOSE']);
 assert.deepEqual(reconcile([p()],[p(-1)],5).map(e=>e.type),['CLOSE','OPEN']);
});
test('PnL cooldown does not suppress close',()=>{
 assert.equal(reconcile([p()],[p(1,.1)],2000000).length,1);
 assert.equal(reconcile([p()],[p(1,.1)],2000000,{BTC:1999999}).length,0);
 assert.equal(reconcile([p()],[],2000000,{BTC:1999999})[0].type,'CLOSE');
});
test('Dietz adjusts deposits and rejects unverified flow scope',()=>{
 assert.equal(modifiedDietz(100,220,0,10,[{time:5,amount:100}],true),20/150);
 assert.equal(modifiedDietz(100,220,0,10,[],false),null);
 assert.equal(modifiedDietz(0,100,0,10,[],true),null);
});
test('portfolio proxy remains review and stale history is excluded',()=>{
 const day=86400000,raw=[['week',{accountValueHistory:[[0,100],[7*day,120]],pnlHistory:[[0,0],[7*day,20]]}]];
 assert.equal(performance(raw,'week',7*day).returnProxy,20/110);
 assert.equal(performance(raw,'week',10*day).returnProxy,null);
 assert.equal(performance(raw,'week',7*day).quality,'REVIEW');
});
test('transactional persistence is idempotent and ignores incomplete state',()=>{
 const s=openStore(':memory:');
 const base={trader:traders[0],updatedAt:1,positions:[],positionsComplete:true,performance:{},lastActivity:null,errors:[],fills:[]} as unknown as LiveTrader;
 s.save(base);s.save({...base,updatedAt:2,positions:[p()]});s.save({...base,updatedAt:2,positions:[p()]});
 s.save({...base,updatedAt:3,positionsComplete:false});
 assert.equal(s.read(traders[0].id).events.length,1);
 assert.equal(s.read(traders[0].id).positions.length,1);
 assert.equal(s.read(traders[0].id).history.length,2);s.close();
});
test('fixed roster contains exactly six unique addresses',()=>{assert.equal(traders.length,6);assert.equal(new Set(traders.map(t=>t.address)).size,6)});
