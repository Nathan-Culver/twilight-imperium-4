import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,transact,decision,validate,ownedPlanets,available,canResearch,objectiveEligible,route,pay,paymentPlan} from '../engine.js';
import {FACTIONS,TILES,PLANETS,TECHS,OBJECTIVES,SECRETS,preset,HOME_POS} from '../data.js';
import {aiAction} from '../ai.js';
function setup(opts={}){let s=createGame({seed:23,...opts});while(s.pending?.type==='setupSecret')s=transact(s,aiAction(s));return s;}
test('base component catalogue and all preset map sizes',()=>{assert.equal(Object.keys(FACTIONS).length,17);assert.equal(Object.keys(TILES).length,51);assert.equal(Object.keys(PLANETS).length,59);assert.equal(Object.keys(TECHS).length,59);assert.equal(Object.keys(OBJECTIVES).length,20);assert.equal(Object.keys(SECRETS).length,20);for(const n of[3,4,5,6]){const s=setup({count:n});assert.equal(Object.keys(s.systems).length,n===3?28:37);assert.equal(Object.values(s.systems).filter(x=>x.home!==null).length,n);assert.equal(new Set(Object.values(s.systems).map(x=>x.tile)).size,Object.keys(s.systems).length);assert(validate(s));}});
test('strategy picks two cards in 3/4-player games and one in 5/6',()=>{for(const n of[3,4,5,6]){let s=setup({count:n});let actions=0;while(s.phase==='strategy'){s=transact(s,aiAction(s));assert(++actions<13);}assert(s.players.every(x=>x.strategies.length===(n<=4?2:1)));assert.equal(s.active,s.players.map((_,i)=>i).sort((a,b)=>Math.min(...s.players[a].strategies)-Math.min(...s.players[b].strategies))[0]);}});
test('whole planets pay resources or influence, cannot double spend',()=>{const s=setup();const p=0;assert.equal(available(s,p),4);assert.equal(available(s,p,'influence'),2);const plan=paymentPlan(s,p,3);assert.deepEqual(plan.planets,['jord']);pay(s,p,3);assert.equal(s.planets.jord.ready,false);assert.equal(available(s,p),0);assert.throws(()=>pay(s,p,1));});
test('technology prerequisites, faction restrictions and Jol-Nar Analytical',()=>{const s=setup();assert(canResearch(s,0,'gd'));assert(!canResearch(s,0,'dn2'));assert(!canResearch(s,0,'exo2'));const j=s.players.findIndex(p=>p.faction==='jolnar');if(j>=0){assert(canResearch(s,j,'hm'));}});
test('invalid actions are transactional and save state is serializable',()=>{const s=setup();const before=JSON.stringify(s);assert.throws(()=>transact(s,{type:'activate',args:{system:'99,99'}}));assert.equal(JSON.stringify(s),before);assert(validate(JSON.parse(before)));});
test('public objectives require all home planets and exact spend thresholds',()=>{const s=setup();s.public=['monument'];s.players[0].tg=4;assert(objectiveEligible(s,0,'monument'));s.planets.jord.owner=1;assert(!objectiveEligible(s,0,'monument'));});
test('a seeded all-AI campaign progresses through strategic and tactical decisions',()=>{let s=setup({humans:[]});let actions=0;while(actions<1000&&s.phase!=='agenda'&&s.winner===null){const a=aiAction(s);assert(a,'AI must propose an action');try{s=transact(s,a);}catch(e){throw Error(JSON.stringify({actions,round:s.round,phase:s.phase,pending:s.pending,action:a})+' '+e.message);}actions++;}assert(actions>25);assert(s.round>1||s.phase==='agenda'||s.winner!==null);});

test('tactical transport, landing, exhausted control and activation locks',()=>{
 let s=setup();s.phase='action';s.active=0;s.pending=null;const home=s.players[0].home,carrier=s.systems[home].ships.find(u=>u.type==='carrier');
 s=transact(s,{type:'activate',args:{system:'-2,0',moves:[{from:home,units:[carrier.id],load:{jord:2}}]}});
 assert.equal(s.pending.type,'invasion');assert(s.systems['-2,0'].tokens.includes(0));assert.equal(s.players[0].tokens.tactic,2);assert.equal(s.planets.jord.ground.length,3);
 const planets=TILES[s.systems['-2,0'].tile].planets;s=transact(s,{type:'invade',args:{lands:planets.map(planet=>({planet,count:1}))}});
 assert(planets.every(id=>s.planets[id].owner===0&&!s.planets[id].ready));assert.equal(s.pending.type,'production');
 s=transact(s,{type:'produce',args:{}});s.active=0;s.pending=null;
 assert.throws(()=>transact(s,{type:'activate',args:{system:'-2,0'}}),/already activated/);
});
test('transport capacity rejects infantry without enough selected carriers',()=>{
 const s=setup();s.phase='action';s.pending=null;s.active=0;const home=s.players[0].home,dd=s.systems[home].ships.find(u=>u.type==='destroyer');assert.throws(()=>transact(s,{type:'activate',args:{system:'-2,0',moves:[{from:home,units:[dd.id],load:{jord:1}}]}}),/capacity/);
});
test('sustain damage cancels one hit, repeated damage requires another unit or destruction',()=>{
 let s=setup();s.phase='action';s.active=0;const sys=s.players[0].home,u={id:'test-dread',type:'dreadnought',owner:0,damaged:false};s.systems[sys].ships.push(u);s.tactical={player:0,system:sys};s.pending={type:'hits',player:0,kind:'space',system:sys,hits:2,queue:[],next:{step:'invasion'}};
 s=transact(s,{type:'hit',args:{unit:u.id,sustain:true}});assert.equal(s.pending.hits,1);assert(s.systems[sys].ships.find(x=>x.id===u.id).damaged);assert.throws(()=>transact(s,{type:'hit',args:{unit:u.id,sustain:true}}),/cannot sustain/);s=transact(s,{type:'hit',args:{unit:u.id}});assert(!s.systems[sys].ships.some(x=>x.id===u.id));
});
test('base action deck contains 80 cards and seven-card limit interrupts decisions',()=>{
 let s=setup();assert.equal(s.actionDeck.length,80);s.players[0].cards=s.actionDeck.splice(0,8);s=transact(s,{type:'pick',player:s.active,args:{card:1}});assert.equal(s.pending.type,'discard');assert.equal(s.pending.player,0);s=transact(s,{type:'discard',args:{card:s.players[0].cards[0]}});assert.equal(s.players[0].cards.length,7);assert.equal(s.actionDiscard.length,1);
});
test('victory is immediate on reaching target through Imperial, without waiting for status',()=>{
 let s=setup();s.phase='action';s.pending=null;s.active=0;s.players[0].strategies=[8];s.players[0].vp=9;s.planets.mr.owner=0;s=transact(s,{type:'primary',args:{card:8}});assert.equal(s.winner,0);assert.equal(s.phase,'finished');assert.equal(s.players[0].vp,10);
});
test('Mining Initiative uses the chosen planet resource value and Summit is not an Action card',()=>{let s=setup({faction:'hacan'});s.phase='action';s.active=0;s.pending=null;s.players[0].cards=['mining_initiative','summit'];s=transact(s,{type:'playCard',args:{card:'mining_initiative',planet:'kamdorn'}});assert.equal(s.players[0].tg,0);s.active=0;s.pending=null;assert.throws(()=>transact(s,{type:'playCard',args:{card:'summit'}}),/Action-timing/);});
test('all six enabled factions place starting ground forces and structures on the correct home planets',()=>{
 const expected={sol:{jord:[5,0,1]},hacan:{arretze:[1,0,1],hercant:[2,0,0],kamdorn:[1,0,0]},letnev:{arcprime:[0,0,1],wrenterra:[3,0,0]},jolnar:{jol:[2,1,0],nar:[0,1,1]},sardakk:{quinarra:[3,0,1],trenlak:[2,1,0]},xxcha:{archonren:[2,0,1],archontau:[2,1,0]}};
 for(const[faction,planets]of Object.entries(expected)){const s=setup({faction});for(const[id,n]of Object.entries(planets))assert.deepEqual([s.planets[id].ground.length,s.planets[id].pds,s.planets[id].dock],n,faction+'/'+id);}
});
