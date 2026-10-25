import {FACTIONS,TILES,PLANETS,TECHS,OBJECTIVES,SECRETS,UNIT_TYPES,LIMITS} from './data.js';
import {decision,objectiveEligible,ownedPlanets,available,unit,spaceUnits,route,capacity,productionLimit,buildCost,unitsOf,fleetLimit,canResearch,neighbors,initiativeOrder,neighborPlayers} from './engine.js';
const action=(s,type,args={})=>({type,player:decision(s).player,args});
const rankTech=['gd','st','nm','amd','cv2','ac2','inf2','so2','hm','ps','dd2','dn2','exo2','cr2','ff2','pds2','sd2'];
export function chooseTech(s,p){return rankTech.find(id=>canResearch(s,p,id))||Object.keys(TECHS).find(id=>canResearch(s,p,id)&&['PROPULSION','BIOTIC','CYBERNETIC','WARFARE','UNITUPGRADE'].some(c=>TECHS[id].types.includes(c)));}
export function force(s,units,p){return units.reduce((n,u)=>{const v=unit(s,p,u.type);return n+(11-v.combatHitsOn)*v.combatDieCount+(v.sustainDamage&&!u.damaged?3:0);},0);}
function structures(s,p,count){const a=[],ps=ownedPlanets(s,p).sort((a,b)=>PLANETS[b.id].resources-PLANETS[a.id].resources),docks=ps.reduce((n,x)=>n+x.dock,0),pds=ps.reduce((n,x)=>n+x.pds,0);if(count&&docks<3){const x=ps.find(x=>!x.dock);if(x)a.push({planet:x.id,type:'dock'});}if(a.length<count&&pds<6){const x=ps.find(x=>x.pds<2);if(x)a.push({planet:x.id,type:'pds'});}return a;}
export function chooseBuild(s,p,sys,budget=available(s,p),singleDock=false){
 const build={},pl=s.players[p],limit=singleDock?Math.max(0,...TILES[s.systems[sys].tile].planets.filter(id=>s.planets[id].owner===p&&s.planets[id].dock).map(id=>PLANETS[id].resources+(s.players[p].tech.includes('sd2')?4:2))):productionLimit(s,p,sys);if(!limit)return{};
 const tryAdd=(type,n)=>{const next={...build,[type]:(build[type]||0)+n},count=Object.values(next).reduce((a,b)=>a+b,0),nonfighters=spaceUnits(s,sys,p).filter(u=>u.type!=='fighter').length+Object.entries(next).filter(([t])=>!['fighter','infantry'].includes(t)).reduce((v,[,n])=>v+n,0);if(count<=limit&&buildCost(s,p,next)<=budget&&unitsOf(s,p,type).length+(next[type]||0)<=LIMITS[type]&&nonfighters<=fleetLimit(s,p))Object.assign(build,next);};
 const local=s.systems[sys].ships.filter(u=>u.owner===p),carrier=local.some(u=>u.type==='carrier'),blocked=s.systems[sys].ships.some(u=>u.owner!==p&&u.type!=='infantry');
 if(!blocked&&!carrier)tryAdd('carrier',1);if(!blocked&&carrier&&spaceUnits(s,sys,p).filter(u=>u.type!=='fighter').length<fleetLimit(s,p))tryAdd('dreadnought',1);
 const ground=TILES[s.systems[sys].tile].planets.reduce((n,id)=>n+s.planets[id].ground.filter(u=>u.owner===p).length,0);
 if(ground<5)tryAdd('infantry',Math.min(4,Math.max(2,6-ground)));
 const cap=capacity(s,sys,p)+Object.entries(build).reduce((n,[t,v])=>n+unit(s,p,t).capacityValue*v,0)+3,current=local.filter(u=>u.type==='fighter'||u.type==='infantry').length;
 if(!blocked&&current<cap)tryAdd('fighter',Math.min(2,cap-current));return build;
}
function strategyArgs(s,p,c,secondary=false){const pl=s.players[p],ps=ownedPlanets(s,p),exhausted=ps.filter(x=>!x.ready).sort((a,b)=>PLANETS[b.id].resources+PLANETS[b.id].influence-PLANETS[a.id].resources-PLANETS[a.id].influence).slice(0,2).map(x=>x.id);let args={card:c};
 if(c===1)args.buy=Math.min(3,Math.floor(available(s,p,'influence')/3));
 if(c===2){args.system=ps.find(x=>x.system===pl.home)?.system||ps.find(x=>x.system!=='0,0')?.system;args.planets=exhausted;}
 if(c===3)args.speaker=s.speaker!==p?p:(p+1)%s.players.length;
 if(c===4)args.structures=structures(s,p,secondary?1:2);
 if(c===5)args.free=s.players.map((_,i)=>i).filter(i=>i!==p);
 if(c===6){if(secondary)args.build=chooseBuild(s,p,pl.home,available(s,p),true);else args.remove=Object.values(s.systems).filter(x=>x.tokens.includes(p)).sort((a,b)=>spaceUnits(s,b.key,p).length-spaceUnits(s,a.key,p).length)[0]?.key;}
 if(c===7)args.tech=chooseTech(s,p);
 if(c===8)args.objective=s.public.find(id=>objectiveEligible(s,p,id));return args;
}
function moveOptions(s,p){let options=[];for(const src of Object.values(s.systems)){
 if(src.tokens.includes(p))continue;const fleet=src.ships.filter(u=>u.owner===p),ships=fleet.filter(u=>!['infantry','fighter'].includes(u.type));if(!ships.length)continue;
 for(const target of Object.values(s.systems)){
  if(target.key===src.key||target.tokens.includes(p)||TILES[target.tile].isSupernova||TILES[target.tile].isGravityRift)continue;
  const boost=s.players[p].tech.includes('gd')?ships.filter(u=>!route(s,p,src.key,target.key,unit(s,p,u.type).moveValue)).map(u=>u.id):[];if(boost.length>1)continue;
  if(!ships.every(u=>route(s,p,src.key,target.key,unit(s,p,u.type).moveValue+(boost.includes(u.id)?1:0))))continue;
  if(spaceUnits(s,target.key,p).filter(u=>u.type!=='fighter').length+ships.length>fleetLimit(s,p))continue;
  const opponents=target.ships.filter(u=>u.owner!==p&&u.type!=='infantry'),strength=force(s,ships,p);if(opponents.length&&s.difficulty!=='hard'&&force(s,opponents,opponents[0].owner)>strength*.8)continue;
  if(opponents.length&&force(s,opponents,opponents[0].owner)>strength*1.2)continue;
  const cap=ships.reduce((n,u)=>n+unit(s,p,u.type).capacityValue,0),cargo=fleet.filter(u=>u.type==='infantry'),fighters=fleet.filter(u=>u.type==='fighter').slice(0,Math.max(0,cap-cargo.length)),load={};let room=cap-cargo.length-fighters.length;
  for(const id of TILES[src.tile].planets){const x=s.planets[id];if(x.owner===p&&room>0){const take=Math.min(room,Math.max(0,x.ground.length-(src.home!==null?1:0)));if(take){load[id]=take;room-=take;}}}
  const infantry=cargo.length+Object.values(load).reduce((a,b)=>a+b,0),planets=TILES[target.tile].planets.filter(id=>s.planets[id].owner!==p),landable=planets.filter(id=>s.planets[id].owner===null||s.planets[id].ground.length<infantry);
  if(!infantry&&planets.length&&!opponents.length)continue;
  if(target.key==='0,0'&&s.custodians&&available(s,p,'influence')<6)continue;
  let score=landable.reduce((n,id)=>n+5+PLANETS[id].resources+PLANETS[id].influence*.4+(PLANETS[id].specialty.length?2:0),0);
  if(target.key==='0,0'&&infantry)score+=s.difficulty==='hard'?17:11;
  if(opponents.length)score+=s.difficulty==='hard'?3:-3;if(!planets.length&&!opponents.length)score-=10;if(target.home===p)score-=5;
  if(s.difficulty==='easy')score+=(Math.sin((src.q*31+target.r*7+s.round)*7)+1)*4;
  if(score>0)options.push({score,args:{system:target.key,moves:[{from:src.key,units:[...ships,...fighters,...cargo].map(u=>u.id),load,boost:boost[0]}]}});
 }
 }return options.sort((a,b)=>b.score-a.score);
}
export function aiAction(s){
 const d=decision(s),p=d.player,pl=s.players[p],q=s.pending;
 if(d.type==='victory')return null;
 if(d.type==='setupSecret'){const options=s.setupSecrets[p];return action(s,'setupSecret',{card:options.find(x=>SECRETS[x].phase==='Status')||options[0]});}
 if(d.type==='strategy'){
  const used=s.players.flatMap(x=>x.strategies),ps=ownedPlanets(s,p);let prefs=pl.tokens.tactic<2?[1,7,5,6,8,4,3,2]:[7,5,1,6,4,3,2,8];if(s.planets.mr.owner===p||s.public.some(x=>objectiveEligible(s,p,x)))prefs=[8,...prefs];
  if(s.round===1)prefs=[1,7,5,4,6,3,2,8];if(s.difficulty==='easy')prefs=[5,4,1,7,3,2,6,8];return action(s,'pick',{card:prefs.find(x=>!used.includes(x))});
 }
 if(d.type==='secondary'){
  const c=q.card,can=pl.tokens.strategy>0||c===1||c===5&&(q.free?.includes(p)||pl.faction==='hacan');let use=can;
  if(c===1)use=available(s,p,'influence')>=3&&Object.values(pl.tokens).reduce((a,b)=>a+b,0)<12;
  if(c===2)use=can&&ownedPlanets(s,p).filter(x=>!x.ready).length>=2;
  if(c===4)use=can&&structures(s,p,1).length>0;
  if(c===5)use=can&&pl.commodities<FACTIONS[pl.faction].commodities;
  if(c===6)use=can&&productionLimit(s,p,pl.home)>0&&Object.keys(chooseBuild(s,p,pl.home,available(s,p),true)).length>0;
  if(c===7)use=can&&!!chooseTech(s,p)&&(pl.faction==='jolnar'||available(s,p)>=4);
  if(c===8)use=can&&pl.secrets.length+pl.secretScored.length<3;
  return action(s,'secondary',{...strategyArgs(s,p,c,true),use});
 }
 if(d.type==='hits'){const list=q.kind==='ground'?s.planets[q.planet].ground:s.systems[q.system].ships,us=list.filter(u=>u.owner===p&&u.type!=='infantry'=== (q.kind!=='ground')&&(!q.fighters||u.type==='fighter')&&(!q.nonfighter||u.type!=='fighter'));
  const sustain=us.find(u=>unit(s,p,u.type).sustainDamage&&!u.damaged);if(sustain)return action(s,'hit',{unit:sustain.id,sustain:true});const cheapest=us.sort((a,b)=>unit(s,p,a.type).cost-unit(s,p,b.type).cost)[0];return action(s,'hit',{unit:cheapest?.id});
 }
 if(d.type==='combat')return action(s,'combatRoll');
 if(d.type==='capacity'){const u=s.systems[q.system].ships.find(u=>u.owner===p&&u.type==='fighter')||s.systems[q.system].ships.find(u=>u.owner===p&&u.type==='infantry');return action(s,'capacity',{unit:u.id});}
 if(d.type==='invasion'){
  const sys=s.systems[q.system];let cargo=sys.ships.filter(u=>u.owner===p&&u.type==='infantry').length;const lands=[],bombers=sys.ships.filter(u=>u.owner===p&&unit(s,p,u.type).bombard).map(u=>u.id);
  if(!sys.ships.some(u=>u.owner!==p&&u.type!=='infantry'))for(const id of TILES[sys.tile].planets){const x=s.planets[id];if(x.owner===p||!cargo)continue;if(id==='mr'&&s.custodians&&available(s,p,'influence')<6)continue;const n=x.owner===null?1:cargo;lands.push({planet:id,count:Math.min(cargo,n),bombard:lands.length?[]:bombers});cargo-=Math.min(cargo,n);}
  return action(s,'invade',{lands});
 }
 if(d.type==='production')return action(s,'produce',{build:chooseBuild(s,p,q.system)});
 if(d.type==='statusScore'){const pub=!q.publicDone&&s.public.find(id=>objectiveEligible(s,p,id)),secret=!q.secretDone&&pl.secrets.find(id=>SECRETS[id].phase==='Status'&&objectiveEligible(s,p,id));if(pub)return action(s,'statusScore',{public:pub});if(secret)return action(s,'statusScore',{secret,payment:secret==='fsn'?{cards:pl.cards.slice(0,5)}:undefined});return action(s,'statusScore',{done:true});}
 if(d.type==='redistribute'){
  const total=Object.values(pl.tokens).reduce((a,b)=>a+b,0),maxFleet=Math.max(1,...Object.values(s.systems).map(x=>spaceUnits(s,x.key,p).filter(u=>u.type!=='fighter').length-(pl.faction==='letnev'?2:0))),fleet=Math.min(total,Math.max(maxFleet,Math.min(4,pl.tokens.fleet))),strategy=Math.min(Math.max(0,total-fleet),2);return action(s,'redistribute',{tokens:{fleet,strategy,tactic:total-fleet-strategy}});
 }
 if(d.type==='discard')return action(s,'discard',{card:pl[q.kind==='secret'?'secrets':'cards'].at(-1)});
 if(d.type==='extraAction')return action(s,'extraAction',{use:true});
 if(d.type==='agendaReveal')return action(s,'agendaReveal');
 if(d.type==='council')return action(s,'vote',{outcome:'abstain',planets:[]});
 // Unautomated council effects must be reviewed by a human, not silently skipped.
 if(d.type==='councilResolve')return null;
 if(d.type==='action'){
  const card=pl.cards.find(id=>['mining_initiative','industrial_initiative','economic_initiative','messiah'].includes(id));
  if(card&&!(card==='economic_initiative'&&!ownedPlanets(s,p).some(x=>!x.ready&&PLANETS[x.id].trait==='CULTURAL')))return action(s,'playCard',{card,planet:card==='mining_initiative'?ownedPlanets(s,p).sort((a,b)=>PLANETS[b.id].resources-PLANETS[a.id].resources)[0]?.id:undefined});

  const eligible=pl.secrets.find(id=>SECRETS[id].phase==='Action'&&objectiveEligible(s,p,id));if(eligible)return action(s,'secretAction',{card:eligible});
  const trade=s.players.findIndex((x,i)=>i!==p&&!x.human&&!s.traded?.includes(i)&&x.commodities&&pl.commodities&&(neighborPlayers(s,p,i)||pl.faction==='hacan'||x.faction==='hacan'));
  if(trade>=0)return action(s,'trade',{to:trade,commodities:Math.min(pl.commodities,s.players[trade].commodities),theirCommodities:Math.min(pl.commodities,s.players[trade].commodities)});
  const unused=pl.strategies.filter(c=>!pl.used.includes(c));if(unused.length){let c=unused.find(c=>c===1&&pl.tokens.tactic<=2)||unused.find(c=>c===8&&(s.planets.mr.owner===p||s.public.some(id=>objectiveEligible(s,p,id))))||unused.find(c=>c===7&&chooseTech(s,p))||unused.find(c=>c===5);if(c)return action(s,'primary',strategyArgs(s,p,c));}
  if(pl.tokens.tactic){const move=moveOptions(s,p)[0];if(move)return action(s,'activate',move.args);
   const dock=Object.values(s.systems).filter(x=>!x.tokens.includes(p)&&productionLimit(s,p,x.key)>0).find(x=>Object.keys(chooseBuild(s,p,x.key)).length>0);if(dock)return action(s,'activate',{system:dock.key});}
  if(unused.length)return action(s,'primary',strategyArgs(s,p,unused[0]));return action(s,'pass');
 }
 return null;
}
