import {FACTIONS,TILES,PLANETS,TECHS,UNIT_DATA,OBJECTIVES,SECRETS,ACTION_CATALOGUE,STRATEGIES,COLORS,UNIT_TYPES,LIMITS,UPGRADE,preset,HOME_POS,ADJ,IMPLEMENTED_FACTIONS} from './data.js';
export const clone=x=>structuredClone(x);
const must=(v,m)=>{if(!v)throw Error(m);};
const integer=(n,min=0,max=1000)=>Number.isInteger(n)&&n>=min&&n<=max;
const pid=(s,p)=>{must(integer(p,0,s.players.length-1),'Invalid player');return s.players[p];};
export function random(s){let t=s.rng+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);s.rng>>>=0;return((t^t>>>14)>>>0)/4294967296;}
export const d10=s=>1+Math.floor(random(s)*10);
export function shuffle(s,a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function log(s,text){s.log.push({round:s.round,phase:s.phase,text});if(s.log.length>600)s.log.shift();}
export const key=(q,r)=>q+','+r;
export const ownedPlanets=(s,p)=>Object.values(s.planets).filter(x=>x.owner===p);
export const homeHeld=(s,p)=>TILES[s.systems[s.players[p].home].tile].planets.every(id=>s.planets[id].owner===p);
export const initiative=(s,p)=>s.players[p].faction==='naalu'?0:Math.min(...s.players[p].strategies,99);
export const initiativeOrder=s=>s.players.map((_,i)=>i).sort((a,b)=>initiative(s,a)-initiative(s,b)||a-b);
export function unit(s,p,type){
 const player=s.players[p],up=player.tech.includes(UPGRADE[type]);let u={...(UNIT_DATA[type+(up?'2':'')]||UNIT_DATA[type]||{})};
 u={cost:0,combatHitsOn:99,combatDieCount:1,capacityValue:0,moveValue:0,...u};
 if(type==='dreadnought'){u.bombard=5;u.bombardDice=1;}if(type==='warsun'){u.bombard=3;u.bombardDice=3;}
 if(player.faction==='sol'&&type==='carrier'){u.capacityValue=player.tech.includes('ac2')?8:6;u.moveValue=player.tech.includes('ac2')?2:1;u.sustainDamage=player.tech.includes('ac2');}
 if(player.faction==='sol'&&type==='infantry')u.combatHitsOn=player.tech.includes('so2')?6:7;
 if(player.faction==='sardakk'&&type==='dreadnought'){u.bombard=4;if(player.tech.includes('exo2'))u.moveValue=2;}
 if(type==='flagship'){
  const fs={sol:[5,12],hacan:[7,3],letnev:[5,3],jolnar:[6,3],sardakk:[6,3],xxcha:[7,3]};
  const [combat,capacity]=fs[player.faction]||[7,3];u.combatHitsOn=combat;u.capacityValue=capacity;
  if(player.faction==='letnev'){u.bombard=5;u.bombardDice=3;}if(player.faction==='xxcha'){u.spaceCannonHitsOn=5;u.spaceCannonDieCount=3;}
 }
 return u;
}
const addUnit=(s,type,owner)=>({id:'u'+s.nextUnit++,type,owner,damaged:false});
export function unitsOf(s,p,type){return Object.values(s.systems).flatMap(x=>x.ships).concat(Object.values(s.planets).flatMap(x=>x.ground)).filter(x=>x.owner===p&&(!type||x.type===type));}
export const spaceUnits=(s,sys,p)=>s.systems[sys].ships.filter(x=>x.owner===p&&x.type!=='infantry');
export const fleetLimit=(s,p)=>s.players[p].tokens.fleet+(s.players[p].faction==='letnev'?2:0);
export function capacity(s,sys,p){return spaceUnits(s,sys,p).reduce((n,x)=>n+unit(s,p,x.type).capacityValue,0);}
export function capacityExcess(s,sys,p){const us=s.systems[sys].ships.filter(x=>x.owner===p),cargo=us.filter(x=>['infantry','fighter'].includes(x.type)).length,cap=capacity(s,sys,p),dock=TILES[s.systems[sys].tile].planets.some(id=>s.planets[id].owner===p&&s.planets[id].dock)>0?3:0;return Math.max(0,cargo-cap-dock);}
function cleanupCapacity(s,sys,p){
 // Pending capacity loss is an explicit casualty decision; no unit disappears silently.
 const excess=capacityExcess(s,sys,p);if(!excess)return false;
 const independently=s.players[p].tech.includes('ff2')?s.systems[sys].ships.filter(x=>x.owner===p&&x.type==='fighter').length:0;
 const fleet=spaceUnits(s,sys,p).filter(x=>x.type!=='fighter').length;
 const spare=Math.max(0,fleetLimit(s,p)-fleet);
 return Math.max(0,excess-Math.min(spare,independently));
}
export function neighbors(s,sys,p=null){
 const a=s.systems[sys],tile=TILES[a.tile],ids=new Set(ADJ.map(([q,r])=>key(a.q+q,a.r+r)).filter(k=>s.systems[k]));
 for(const b of Object.values(s.systems))if(b.key!==sys&&(TILES[b.tile].wormholes||[]).some(w=>(tile.wormholes||[]).includes(w)))ids.add(b.key);
 return[...ids];
}
export function route(s,p,from,to,max){
 if(from===to)return[from];const queue=[[from]],seen=new Set([from]);
 while(queue.length){const path=queue.shift(),last=path.at(-1);if(path.length>max)continue;
  const src=TILES[s.systems[last].tile];if(last!==from&&src.isNebula)continue;
  for(const next of neighbors(s,last,p)){
   if(seen.has(next))continue;const tile=TILES[s.systems[next].tile];
   if(tile.isSupernova)continue;if(tile.isAsteroidField&&!s.players[p].tech.includes('amd'))continue;
   const hostile=spaceUnits(s,next,s.players.findIndex((_,i)=>i!==p)).length; // all opponents checked below
   if(next!==to&&s.systems[next].ships.some(x=>x.owner!==p&&x.type!=='infantry')&&!s.players[p].tech.includes('lwd'))continue;
   const out=[...path,next];if(next===to)return out;seen.add(next);queue.push(out);
  }
 }
 return null;
}
export function available(s,p,kind='resources'){return ownedPlanets(s,p).filter(x=>x.ready).reduce((n,x)=>n+PLANETS[x.id][kind],0)+s.players[p].tg;}
export function paymentPlan(s,p,cost,kind='resources'){
 const planets=ownedPlanets(s,p).filter(x=>x.ready&&PLANETS[x.id][kind]>0),memo=new Map([[0,[]]]);
 for(const pl of planets)for(const [sum,ids]of[...memo]){const n=sum+PLANETS[pl.id][kind];if(!memo.has(n)||memo.get(n).length>ids.length+1)memo.set(n,[...ids,pl.id]);}
 let best=null;for(const[sum,ids]of memo){const tg=Math.max(0,cost-sum);if(tg>s.players[p].tg)continue;const weight=Math.max(cost,sum)*100+tg*12+ids.length;if(!best||weight<best.weight)best={planets:ids,tg,weight};}return best;
}
export function pay(s,p,cost,kind='resources',payment=null){
 must(Number.isFinite(cost)&&cost>=0,'Invalid cost');if(cost===0)return;
 const chosen=payment||paymentPlan(s,p,cost,kind);must(chosen,'Insufficient '+kind);must(Array.isArray(chosen.planets)&&new Set(chosen.planets).size===chosen.planets.length,'Invalid payment');must(integer(chosen.tg,0,s.players[p].tg),'Invalid trade goods');
 let total=chosen.tg;for(const id of chosen.planets){const pl=s.planets[id];must(pl?.owner===p&&pl.ready,'A payment planet is unavailable');total+=PLANETS[id][kind];}
 must(total>=cost,'Payment does not cover cost');for(const id of chosen.planets)s.planets[id].ready=false;s.players[p].tg-=chosen.tg;
 log(s,`${name(s,p)} spends ${cost} ${kind} (${chosen.planets.map(x=>PLANETS[x].name).join(', ')||'no planets'}; ${chosen.tg} trade goods).`);
}
export const name=(s,p)=>FACTIONS[s.players[p].faction].factionName.replace(/^The /,'');
function draw(s,p,kind,count=1){
 const deck=kind==='secret'?'secretDeck':'actionDeck',hand=kind==='secret'?'secrets':'cards';
 for(let i=0;i<count;i++){if(!s[deck].length&&kind==='action'){s[deck]=shuffle(s,s.actionDiscard);s.actionDiscard=[];}if(s[deck].length)s.players[p][hand].push(s[deck].pop());}
}
function gainTokens(s,p,n,pool='tactic'){const pl=s.players[p],onboard=Object.values(s.systems).filter(x=>x.tokens.includes(p)).length,total=Object.values(pl.tokens).reduce((a,b)=>a+b,0)+onboard;pl.tokens[pool]+=Math.max(0,Math.min(n,16-total));}
export function createGame({count=3,faction='sol',opponents=[],difficulty='normal',target=10,seed=Date.now(),humans=[0]}={}){
 must(integer(count,3,6),'Choose 3 to 6 factions');must(IMPLEMENTED_FACTIONS.includes(faction),'This faction is in the reference catalogue but is not enabled in this preview');must(['easy','normal','hard'].includes(difficulty),'Choose an AI difficulty');must([10,14].includes(target),'Victory is 10 or 14 points');
 const s={format:'ti4-situation-room',version:1,rng:Number(seed)>>>0,nextUnit:1,round:1,phase:'strategy',speaker:0,active:0,difficulty,target,winner:null,players:[],systems:{},planets:{},pending:null,tactical:null,log:[],laws:[],custodians:true,publicDeck:[],public:[],secretDeck:[],actionDeck:[],actionDiscard:[],strategyGoods:{},statusIndex:0,agendaIndex:0,coverage:'preview'};
 const rivals=[...new Set(opponents.filter(x=>IMPLEMENTED_FACTIONS.includes(x)&&x!==faction))];for(const f of shuffle(s,IMPLEMENTED_FACTIONS.filter(x=>x!==faction&&!rivals.includes(x))))rivals.push(f);
 const fs=[faction,...rivals].slice(0,count);s.speaker=Math.floor(random(s)*count);s.active=s.speaker;
 for(const[i,f]of fs.entries())s.players.push({faction:f,color:COLORS[i],human:humans.includes(i),tg:count===5?([0,2,4,2,0][i]):0,commodities:0,tokens:{tactic:3,fleet:3,strategy:2},tech:FACTIONS[f].tech.map(x=>x==='md'?'md_base':x),techExhausted:[],strategies:[],used:[],passed:false,vp:0,scored:[],secrets:[],secretScored:[],cards:[],home:null,bonusActions:0});
 for(const cell of preset(count)){
  const index=HOME_POS[count].findIndex(([q,r])=>q===cell.q&&r===cell.r),tile=cell.tile==='H'?FACTIONS[fs[index]].homeSystem:cell.tile,k=key(cell.q,cell.r);
  s.systems[k]={...cell,key:k,tile,tokens:[],ships:[],home:index>=0?index:null};
  if(index>=0)s.players[index].home=k;
  for(const id of TILES[tile].planets)s.planets[id]={id,system:k,owner:index>=0?index:null,ready:index>=0,ground:[],pds:0,dock:0};
 }
 const short={cv:'carrier',cr:'cruiser',dd:'destroyer',dn:'dreadnought',ff:'fighter',inf:'infantry',sd:'spacedock',pds:'pds',ws:'warsun'};
 for(const[p,f]of fs.entries()){
  const home=TILES[FACTIONS[f].homeSystem].planets;
  for(const part of FACTIONS[f].startingFleet.split(',')){
   const m=part.trim().match(/^(\d+)?\s*(cv|cr|dd|dn|ff|inf|sd|pds|ws)(?:\s+(.*))?$/);if(!m)continue;const n=Number(m[1]||1),type=short[m[2]],abbr=m[3]?.trim();
   const planet=home.find(id=>id===({at:'archontau',ar:'archonren'}[abbr]))||home.find(id=>id.startsWith(abbr||'!')||PLANETS[id].name.toLowerCase().replace(/[^a-z0-9]/g,'').startsWith((abbr||'!').replace(/\s/g,'')))||home[0],pl=s.planets[planet];
   if(type==='pds')pl.pds+=n;else if(type==='spacedock')pl.dock+=n;else if(type==='infantry')for(let i=0;i<n;i++)pl.ground.push(addUnit(s,type,p));else for(let i=0;i<n;i++)s.systems[s.players[p].home].ships.push(addUnit(s,type,p));
  }
 }
 const obj=Object.entries(OBJECTIVES);s.publicDeck=[...shuffle(s,obj.filter(([,x])=>x.points===2).map(([id])=>id)).slice(0,5),...shuffle(s,obj.filter(([,x])=>x.points===1).map(([id])=>id)).slice(0,5)];s.public=[s.publicDeck.pop(),s.publicDeck.pop()];
 s.secretDeck=shuffle(s,Object.keys(SECRETS));s.actionDeck=shuffle(s,Object.keys(ACTION_CATALOGUE).filter(id=>!['veto3','veto4'].includes(id)));
 // Advanced setup: deal two and choose one, preserving the unchosen card's secrecy.
 s.setupSecrets=s.players.map(()=>[s.secretDeck.pop(),s.secretDeck.pop()]);s.pending={type:'setupSecret',player:0};
 log(s,'The galaxy is assembled from the official preset. Choose one of your two secret objectives.');return s;
}
export function decision(s){
 if(s.winner!==null)return{player:s.winner,type:'victory'};
 if(s.pending)return{player:s.pending.player,type:s.pending.type};
 return{player:s.active,type:s.phase};
}
export function canResearch(s,p,id,skip=[]){
 const t=TECHS[id],pl=s.players[p];if(!t||pl.tech.includes(id)||t.faction&&t.faction!==pl.faction)return false;
 const count={B:0,G:0,Y:0,R:0},type={PROPULSION:'B',BIOTIC:'G',CYBERNETIC:'Y',WARFARE:'R'};
 for(const k of pl.tech){const c=type[TECHS[k]?.types[0]];if(c)count[c]++;}
 for(const planet of skip){const x=s.planets[planet];if(!x||x.owner!==p||!x.ready)return false;for(const c of PLANETS[planet].specialty)if(type[c])count[type[c]]++;}
 const req={B:0,G:0,Y:0,R:0};for(const c of t.requires||'')req[c]++;
 return Object.keys(req).reduce((n,c)=>n+Math.max(0,req[c]-count[c]),0)<=(pl.faction==='jolnar'?1:0);
}
function research(s,p,id,skips=[]){must(canResearch(s,p,id,skips),'Technology prerequisites are not met');for(const id of skips)s.planets[id].ready=false;s.players[p].tech.push(id);log(s,`${name(s,p)} researches ${TECHS[id].name}.`);}
export function objectiveEligible(s,p,id){
 const ob=OBJECTIVES[id]||SECRETS[id],pl=s.players[p];if(!ob||pl.scored.includes(id)||pl.secretScored.includes(id))return false;
 if(OBJECTIVES[id]&&!homeHeld(s,p))return false;
 const ps=ownedPlanets(s,p),nonhome=ps.filter(x=>!PLANETS[x.id].home),ships=Object.values(s.systems).filter(x=>spaceUnits(s,x.key,p).length),traits={};for(const x of ps){const t=PLANETS[x.id].trait;traits[t]=(traits[t]||0)+1;}
 const techs=pl.tech.map(k=>TECHS[k]).filter(Boolean),colors={};for(const t of techs)if(t.types[0]!=='UNITUPGRADE')colors[t.types[0]]=(colors[t.types[0]]||0)+1;
 const upgrades=techs.filter(x=>x.types.includes('UNITUPGRADE')).length,special=ps.filter(x=>PLANETS[x.id].specialty.length).length;
 const cost={monument:['resources',8],golden_age:['resources',16],sway_council:['influence',8],manipulate_law:['influence',16]};if(cost[id])return available(s,p,cost[id][0])>=cost[id][1];
 if(id==='trade_routes')return pl.tg>=5;if(id==='centralize_trade')return pl.tg>=10;if(id==='lead'||id==='galvanize')return pl.tokens.tactic+pl.tokens.strategy>=(id==='lead'?3:6);
 if(id==='corner'||id==='unify_colonies')return Object.values(traits).some(x=>x>=(id==='corner'?4:6));if(id==='develop'||id==='revolutionize')return upgrades>=(id==='develop'?2:3);
 if(id==='diversify'||id==='master_science')return Object.values(colors).filter(x=>x>=2).length>=(id==='diversify'?2:4);
 if(id==='expand_borders'||id==='subdue')return nonhome.length>=(id==='subdue'?11:6);if(id==='research_outposts'||id==='brain_trust')return special>=(id==='research_outposts'?3:5);
 if(id==='intimidate')return ships.filter(x=>neighbors(s,'0,0').includes(x.key)).length>=2;if(id==='conquer')return ps.some(x=>{const owner=s.systems[x.system].home;return owner!==null&&owner!==p;});
 if(id==='ans')return techs.filter(x=>x.faction).length>=2;if(id==='btgk')return['ALPHA','BETA'].every(w=>ships.some(x=>TILES[x.tile].wormholes?.includes(w)));if(id==='ctr')return ships.length>=6;
 if(id==='csl')return ships.some(x=>TILES[x.tile].planets.some(i=>s.planets[i].owner!==p&&s.planets[i].dock));
 if(id==='eap')return ps.reduce((v,x)=>v+x.pds,0)>=4;if(id==='fwm')return ps.reduce((v,x)=>v+x.dock,0)>=3;if(id==='gamf')return unitsOf(s,p,'dreadnought').length>=5;
 if(id==='faa'||id==='mrm'||id==='mp')return(traits[{faa:'CULTURAL',mrm:'HAZARDOUS',mp:'INDUSTRIAL'}[id]]||0)>=4;
 if(id==='fsn')return pl.cards.length>=5;if(id==='mlp')return Object.values(colors).some(x=>x>=4);
 if(id==='ose')return s.planets.mr.owner===p&&spaceUnits(s,'0,0',p).length>=3;
 if(id==='te')return ships.some(x=>s.players.some((q,i)=>i!==p&&neighbors(s,q.home).includes(x.key)));
 if(id==='lsc')return ships.filter(x=>neighbors(s,x.key).some(k=>{const t=TILES[s.systems[k].tile];return t.isSupernova||t.isNebula||t.isAsteroidField||t.isGravityRift;})).length>=3;
 return !!s.events?.some(e=>e.player===p&&e.id===id&&e.round===s.round);
}
function point(s,p,n,why){s.players[p].vp+=n;log(s,`${name(s,p)} gains ${n} VP: ${why}.`);if(s.players[p].vp>=s.target){s.winner=p;s.phase='finished';s.pending=null;log(s,`${name(s,p)} claims the imperial throne.`);}}
function score(s,p,id,payment){
 must(objectiveEligible(s,p,id),'Objective requirements are not met');const pl=s.players[p],cost={monument:['resources',8],golden_age:['resources',16],sway_council:['influence',8],manipulate_law:['influence',16]};
 if(cost[id])pay(s,p,cost[id][1],cost[id][0],payment);if(id==='trade_routes'||id==='centralize_trade')pl.tg-=id==='trade_routes'?5:10;
 if(id==='lead'||id==='galvanize'){let n=id==='lead'?3:6;const t=Math.min(n,pl.tokens.tactic);pl.tokens.tactic-=t;pl.tokens.strategy-=n-t;}
 if(id==='fsn'){must(Array.isArray(payment?.cards)&&payment.cards.length===5&&new Set(payment.cards).size===5&&payment.cards.every(x=>pl.cards.includes(x)),'Choose five action cards to discard');for(const c of payment.cards){pl.cards.splice(pl.cards.indexOf(c),1);s.actionDiscard.push(c);}}
 if(OBJECTIVES[id])pl.scored.push(id);else{pl.secretScored.push(id);pl.secrets.splice(pl.secrets.indexOf(id),1);}point(s,p,(OBJECTIVES[id]||SECRETS[id]).points,(OBJECTIVES[id]||SECRETS[id]).name);
}
function endTurn(s){
 s.tactical=null;s.pending=null;if(s.winner!==null)return;
 const actor=s.active;s.turnActions=(s.turnActions||0)+1;if(s.players[actor].tech.includes('fl')&&s.turnActions===1&&!s.players[actor].passed){s.pending={type:'extraAction',player:actor};return;}
 const order=initiativeOrder(s),at=order.indexOf(actor);for(let i=1;i<=order.length;i++){const p=order[(at+i)%order.length];if(!s.players[p].passed){s.active=p;s.traded=[];s.turnActions=0;return;}}
 s.phase='status';s.statusOrder=order;s.statusIndex=0;s.active=order[0];s.pending={type:'statusScore',player:s.active,publicDone:false,secretDone:false};log(s,'All factions have passed. Score objectives in initiative order.');
}
function startRound(s){
 s.round++;s.phase='strategy';s.active=s.speaker;s.pending=null;s.strategyPicks=0;s.traded=[];s.turnActions=0;
 for(const p of s.players){p.strategies=[];p.used=[];p.passed=false;p.bonusActions=0;}log(s,'A new strategy phase begins. The speaker chooses first.');
}
function finishStatus(s){
 if(!s.publicDeck.length){const order=initiativeOrder(s);s.winner=order.reduce((a,p)=>s.players[p].vp>s.players[a].vp?p:a,order[0]);s.phase='finished';s.pending=null;log(s,'Imperium Rex: no public objective remains to reveal. Highest score wins, ties by initiative.');return;}
 s.public.push(s.publicDeck.pop());
 for(let p=0;p<s.players.length;p++){draw(s,p,'action',1+(s.players[p].tech.includes('nm')?1:0));for(const pl of ownedPlanets(s,p))pl.ready=true;for(const u of unitsOf(s,p))u.damaged=false;s.players[p].techExhausted=[];}
 for(const sys of Object.values(s.systems))sys.tokens=[];
 s.statusIndex=0;s.pending={type:'redistribute',player:s.statusOrder[0]};for(let p=0;p<s.players.length;p++)gainTokens(s,p,2+(s.players[p].faction==='sol'?1:0)+(s.players[p].tech.includes('hm')?1:0));
}
function afterRedistribution(s){
 if(s.custodians)startRound(s);else{s.phase='agenda';s.agendaIndex=0;s.pending={type:'agendaReveal',player:s.speaker};log(s,'The galactic council convenes for two agendas.');}
}
function secondaryQueue(s,card,owner){s.pending={type:'secondary',player:(owner+1)%s.players.length,card,owner,remaining:s.players.length-1};}
function finishSecondary(s){const q=s.pending;if(q.remaining<=1)endTurn(s);else s.pending={...q,remaining:q.remaining-1,player:(q.player+1)%s.players.length};}
function ready(s,p,ids){must(Array.isArray(ids)&&ids.length<=2&&new Set(ids).size===ids.length,'Choose up to two planets');for(const id of ids){must(s.planets[id]?.owner===p,'You do not control that planet');s.planets[id].ready=true;}}
function structure(s,p,id,type){const pl=s.planets[id];must(pl?.owner===p,'Structure needs a controlled planet');must(['pds','dock'].includes(type),'Choose a structure');const total=ownedPlanets(s,p).reduce((n,x)=>n+x[type],0);must(total<(type==='pds'?6:3),'No structure remains in reinforcements');must(pl[type]<(type==='pds'?2:1),'Planet structure limit reached');pl[type]++;}
function strategyResolve(s,p,card,args,secondary=false){
 const pl=s.players[p],free=card===1||secondary&&card===5&&(s.pending.free?.includes(p)||pl.faction==='hacan');
 if(secondary&&!free){must(pl.tokens.strategy>0,'No strategy token');pl.tokens.strategy--;}
 const owner=secondary?s.pending.owner:p;
 if(card===1){if(!secondary)gainTokens(s,p,3);const n=Number(args.buy||0);must(integer(n,0,10),'Choose a token count');pay(s,p,n*3,'influence',args.payment);gainTokens(s,p,n,args.pool||'tactic');}
 if(card===2){if(!secondary){const sys=s.systems[args.system];must(sys&&args.system!=='0,0'&&TILES[sys.tile].planets.some(id=>s.planets[id].owner===p),'Protect a system with a planet you control, other than Mecatol Rex');for(let i=0;i<s.players.length;i++)if(i!==p&&!sys.tokens.includes(i)){const total=Object.values(s.players[i].tokens).reduce((a,b)=>a+b,0)+Object.values(s.systems).filter(x=>x.tokens.includes(i)).length;if(total<16)sys.tokens.push(i);}}ready(s,p,args.planets||[]);
  if(pl.faction==='xxcha'&&args.accord){const x=s.planets[args.accord];must(x&&x.owner===null&&ownedPlanets(s,p).some(a=>a.system===x.system||neighbors(s,a.system).includes(x.system)),'Peace Accords requires an adjacent uncontrolled planet');x.owner=p;x.ready=false;}
 }
 if(card===3){if(!secondary){must(integer(args.speaker,0,s.players.length-1)&&args.speaker!==s.speaker,'Choose someone other than the current speaker');s.speaker=args.speaker;if(args.agendaOrder){must(Array.isArray(args.agendaOrder),'Invalid agenda arrangement');/* agenda catalogue is linked in the council */}}draw(s,p,'action',2);}
 if(card===4){must(Array.isArray(args.structures)&&args.structures.length<= (secondary?1:2),'Choose structures');if(!secondary&&args.structures.length===2)must(args.structures[1].type==='pds','The second Construction placement must be a PDS');for(const x of args.structures){structure(s,p,x.planet,x.type);if(secondary&&!s.systems[s.planets[x.planet].system].tokens.includes(p))s.systems[s.planets[x.planet].system].tokens.push(p);}}
 if(card===5){pl.commodities=FACTIONS[pl.faction].commodities;if(!secondary)pl.tg+=3;}
 if(card===6){if(!secondary){if(args.remove){must(s.systems[args.remove]?.tokens.includes(p),'That system has no activation token to remove');s.systems[args.remove].tokens=s.systems[args.remove].tokens.filter(x=>x!==p);}gainTokens(s,p,1);if(args.tokens)redistribute(s,p,args.tokens);}else{must(args.build,'Choose home production');produce(s,p,pl.home,args.build,args.payment,true);}}
 if(card===7){const brilliant=secondary&&pl.faction==='jolnar';if(secondary&&!brilliant)pay(s,p,4,'resources',args.payment);research(s,p,args.tech,args.skips||[]);if(args.tech2){must(!secondary||brilliant,'One technology only');pay(s,p,6,'resources',args.payment2);research(s,p,args.tech2,args.skips2||[]);}}
 if(card===8){if(!secondary){if(args.objective)score(s,p,args.objective,args.payment);if(s.winner!==null)return;if(s.planets.mr.owner===p)point(s,p,1,'Imperial control of Mecatol Rex');else draw(s,p,'secret');}else draw(s,p,'secret');}
 log(s,`${name(s,p)} resolves ${STRATEGIES[card].name} ${secondary?'secondary':'primary'}.`);
 if(s.winner!==null)return;if(secondary)finishSecondary(s);else{secondaryQueue(s,card,p);if(card===5)s.pending.free=args.free||[];}
}
function redistribute(s,p,tokens){const pl=s.players[p];must(tokens&&['tactic','fleet','strategy'].every(k=>integer(tokens[k],0,16)),'Invalid command-token allocation');must(Object.values(tokens).reduce((a,b)=>a+b,0)===Object.values(pl.tokens).reduce((a,b)=>a+b,0),'Keep the same total number of command tokens');must(Object.values(s.systems).every(x=>spaceUnits(s,x.key,p).filter(u=>u.type!=='fighter').length<=tokens.fleet+(pl.faction==='letnev'?2:0)),'Fleet allocation is below the size of a fleet');pl.tokens={tactic:tokens.tactic,fleet:tokens.fleet,strategy:tokens.strategy};}
export function productionLimit(s,p,sys){return TILES[s.systems[sys].tile].planets.reduce((n,id)=>n+(s.planets[id].owner===p?s.planets[id].dock*(PLANETS[id].resources+(s.players[p].tech.includes('sd2')?4:2)):0),0);}
export function buildCost(s,p,build){let cost=0;for(const type of Object.keys(build))cost+=['infantry','fighter'].includes(type)?Math.ceil(build[type]/2):unit(s,p,type).cost*build[type];return Math.max(0,cost-(s.players[p].tech.includes('st')?1:0));}
function produce(s,p,sys,build,payment,home=false){
 const types=Object.keys(build).filter(k=>build[k]>0);must(types.length,'Choose units to produce');must(types.every(t=>UNIT_TYPES.includes(t)&&!['pds','spacedock'].includes(t)&&integer(build[t],0,50)),'Invalid production');
 const dock=TILES[s.systems[sys].tile].planets.filter(id=>s.planets[id].owner===p&&s.planets[id].dock).sort((a,b)=>PLANETS[b].resources-PLANETS[a].resources)[0];must(dock,'No space dock in this system');const limit=home?PLANETS[dock].resources+(s.players[p].tech.includes('sd2')?4:2):productionLimit(s,p,sys);must(types.reduce((n,t)=>n+build[t],0)<=limit,'Production unit count exceeds capacity');
 must(!types.some(t=>t==='warsun'&&!s.players[p].tech.includes('ws')),'Research War Sun first');must(!types.some(t=>t!=='infantry')||!s.systems[sys].ships.some(x=>x.owner!==p&&x.type!=='infantry'),'Enemy ships blockade ship production');
 for(const type of types)must(unitsOf(s,p,type).length+build[type]<=LIMITS[type],'Not enough '+type+' reinforcements');
 pay(s,p,buildCost(s,p,build),'resources',payment);
 for(const type of types)for(let i=0;i<build[type];i++){const u=addUnit(s,type,p);if(type==='infantry')s.planets[dock].ground.push(u);else s.systems[sys].ships.push(u);}
 must(spaceUnits(s,sys,p).filter(x=>x.type!=='fighter').length<=fleetLimit(s,p),'Production exceeds fleet supply');must(!cleanupCapacity(s,sys,p),'Production exceeds transport/fighter capacity');log(s,`${name(s,p)} produces ${types.map(t=>build[t]+' '+t).join(', ')}.`);
}
function event(s,p,id){s.events??=[];s.events.push({round:s.round,player:p,id});}
function hitList(s,ctx,p){return ctx.kind==='ground'?s.planets[ctx.planet].ground.filter(u=>u.owner===p):s.systems[ctx.system].ships.filter(u=>u.owner===p&&u.type!=='infantry');}
function queueHits(s,queue,next){queue=queue.filter(x=>x.hits>0&&hitList(s,x,x.player).some(u=>(!x.fighters||u.type==='fighter')&&(!x.nonfighter||u.type!=='fighter')));if(!queue.length){continueStep(s,next);return;}const first=queue.shift();s.pending={type:'hits',...first,queue,next};}
function applyHit(s,p,id,sustain){const q=s.pending,units=hitList(s,q,p),u=units.find(u=>u.id===id);must(u&&(!q.fighters||u.type==='fighter'),'Choose an eligible casualty');const profile=unit(s,p,u.type);if(sustain){must(!q.nonfighter,'Assault Cannon destroys the unit; sustain damage cannot cancel it');must(profile.sustainDamage&&!u.damaged,'This unit cannot sustain damage');u.damaged=true;q.hits-=s.players[p].tech.includes('nes')?2:1;}else{const list=q.kind==='ground'?s.planets[q.planet].ground:s.systems[q.system].ships;list.splice(list.indexOf(u),1);q.hits--;log(s,`${name(s,p)} loses a ${u.type}.`);if(['flagship','warsun'].includes(u.type))event(s,q.attacker??s.tactical?.player,'dtgs');}
 if(q.hits<=0||!hitList(s,q,p).some(x=>(!q.fighters||x.type==='fighter')&&(!q.nonfighter||x.type!=='fighter')))queueHits(s,q.queue,q.next);
}
function rolls(s,p,units,kind='combat',mod=0){let hits=0,values=[];for(const u of units){const v=unit(s,p,u.type),n=kind==='afb'?v.afbDieCount||0:kind==='bombard'?v.bombardDice||0:v.combatDieCount,threshold=kind==='afb'?v.afbHitsOn:kind==='bombard'?v.bombard:v.combatHitsOn;if(!threshold)continue;for(let i=0;i<n;i++){let roll=d10(s);values.push(roll);const modifier=kind==='combat'?mod+(s.players[p].faction==='sardakk'?1:0)-(s.players[p].faction==='jolnar'?1:0):0;if(roll+modifier>=threshold)hits++;}}
 log(s,`${name(s,p)} ${kind}: [${values.join(', ')}] → ${hits} hit${hits===1?'':'s'}.`);return hits;
}
function combatPrompt(s,ctx){const human=[ctx.attacker,ctx.defender].find(p=>s.players[p].human);s.pending={type:'combat',player:human??ctx.attacker,...ctx};}
function spaceStart(s){const t=s.tactical,sys=s.systems[t.system],enemy=[...new Set(sys.ships.filter(x=>x.owner!==t.player&&x.type!=='infantry').map(x=>x.owner))][0];if(enemy===undefined||!spaceUnits(s,t.system,t.player).length){invasionPrompt(s);return;}
 const ctx={kind:'space',system:t.system,attacker:t.player,defender:enemy,round:1,retreats:{}};
 const a=spaceUnits(s,t.system,ctx.attacker),b=spaceUnits(s,t.system,ctx.defender),queue=[];
 if(s.players[ctx.attacker].tech.includes('asc')&&a.filter(u=>u.type!=='fighter').length>=3)queue.push({...ctx,player:ctx.defender,hits:1,nonfighter:true});
 if(s.players[ctx.defender].tech.includes('asc')&&b.filter(u=>u.type!=='fighter').length>=3)queue.push({...ctx,player:ctx.attacker,hits:1,nonfighter:true});
 const ah=rolls(s,ctx.attacker,a,'afb'),bh=rolls(s,ctx.defender,b,'afb');queue.push({...ctx,player:ctx.attacker,hits:bh,fighters:true},{...ctx,player:ctx.defender,hits:ah,fighters:true});queueHits(s,queue,{step:'combatNext',ctx});
}
function spaceCannons(s){const t=s.tactical,queue=[];for(let p=0;p<s.players.length;p++)if(p!==t.player){let dice=0,threshold=s.players[p].tech.includes('pds2')?5:6;for(const pl of ownedPlanets(s,p))if(pl.system===t.system||s.players[p].tech.includes('pds2')&&neighbors(s,pl.system).includes(t.system))dice+=pl.pds;if(dice&&s.players[p].tech.includes('ps'))dice++;let hits=0;for(let i=0;i<dice;i++)if(d10(s)-(s.players[t.player].tech.includes('amd')?1:0)>=threshold)hits++;if(dice)log(s,`${name(s,p)} fires space cannon: ${hits} hits.`);queue.push({kind:'space',system:t.system,player:t.player,attacker:p,hits});}queueHits(s,queue,{step:'spaceStart'});}
function invasionPrompt(s){const t=s.tactical;const enemy=s.systems[t.system].ships.some(u=>u.owner!==t.player&&u.type!=='infantry');s.pending={type:enemy?'production':'invasion',player:t.player,system:t.system};}
function combatRoll(s,args){const ctx={...s.pending};delete ctx.type;delete ctx.player;ctx.retreats=args.retreats||{};
 if(ctx.kind==='space')for(const[p,k]of Object.entries(ctx.retreats)){const n=Number(p);must([ctx.attacker,ctx.defender].includes(n)&&neighbors(s,ctx.system).includes(k),'Retreat into an adjacent system');must(!s.systems[k].ships.some(u=>u.owner!==n&&u.type!=='infantry'),'Cannot retreat into enemy ships');must(spaceUnits(s,k,n).length||TILES[s.systems[k].tile].planets.some(id=>s.planets[id].owner===n),'Retreat destination must contain your ships or controlled planet');}
 const a=hitList(s,ctx,ctx.attacker),b=hitList(s,ctx,ctx.defender);let am=0,bm=0;if(ctx.kind==='space'&&TILES[s.systems[ctx.system].tile].isNebula)bm++;
 const ah=rolls(s,ctx.attacker,a,'combat',am),bh=rolls(s,ctx.defender,b,'combat',bm);queueHits(s,[{...ctx,player:ctx.attacker,hits:bh},{...ctx,player:ctx.defender,hits:ah}],{step:'combatNext',ctx:{...ctx,round:ctx.round+1}});
}
function combatNext(s,ctx){
 if(ctx.kind==='space')for(const[p,k]of Object.entries(ctx.retreats||{})){const n=Number(p),us=s.systems[ctx.system].ships.filter(x=>x.owner===n);s.systems[ctx.system].ships=s.systems[ctx.system].ships.filter(x=>x.owner!==n);s.systems[k].ships.push(...us);if(!s.systems[k].tokens.includes(n))s.systems[k].tokens.push(n);log(s,`${name(s,n)} retreats.`);}
 const a=hitList(s,ctx,ctx.attacker),b=hitList(s,ctx,ctx.defender);
 if(a.length&&b.length){combatPrompt(s,ctx);return;}
 const winner=a.length?ctx.attacker:b.length?ctx.defender:null;
 if(winner!==null){log(s,`${name(s,winner)} wins ${ctx.kind} combat.`);if(s.players[ctx.defender].vp===Math.max(...s.players.map(p=>p.vp))&&winner===ctx.attacker||s.players[ctx.attacker].vp===Math.max(...s.players.map(p=>p.vp))&&winner===ctx.defender)event(s,winner,'sar');if(ctx.kind==='space'&&spaceUnits(s,ctx.system,winner).some(u=>u.type==='flagship'))event(s,winner,'uf');}
 if(ctx.kind==='ground'){if(winner===ctx.attacker){capture(s,ctx.attacker,ctx.planet);if(s.players[winner].tech.includes('dxa'))s.planets[ctx.planet].ground.push(addUnit(s,'infantry',winner));}nextGround(s);}
 else{for(const p of[ctx.attacker,ctx.defender]){const n=cleanupCapacity(s,ctx.system,p);if(n){s.pending={type:'capacity',player:p,system:ctx.system,excess:n,after:{step:'invasion'}};return;}}invasionPrompt(s);}
}
function capture(s,p,id){const pl=s.planets[id],old=pl.owner;pl.owner=p;pl.ready=false;if(old!==p){pl.pds=0;pl.dock=0;}log(s,`${name(s,p)} gains control of ${PLANETS[id].name}.`);}
function nextGround(s){const t=s.tactical;while(t.groundQueue?.length){const id=t.groundQueue.shift(),pl=s.planets[id],a=pl.ground.filter(x=>x.owner===t.player),d=pl.ground.filter(x=>x.owner!==t.player);if(!a.length)continue;if(!d.length){capture(s,t.player,id);continue;}combatPrompt(s,{kind:'ground',system:t.system,planet:id,attacker:t.player,defender:d[0].owner,round:1,retreats:{}});return;}s.pending={type:'production',player:t.player,system:t.system};}
function invade(s,p,lands,payment){const t=s.tactical,sys=s.systems[t.system];must(Array.isArray(lands),'Choose landing forces');must(new Set(lands.map(x=>x.planet)).size===lands.length,'Planet chosen twice');let total=0;
 for(const x of lands){must(TILES[sys.tile].planets.includes(x.planet)&&integer(x.count,0,100),'Invalid landing');total+=x.count;}
 const cargo=sys.ships.filter(u=>u.owner===p&&u.type==='infantry');must(total<=cargo.length,'Not enough transported infantry');must(!sys.ships.some(x=>x.owner!==p&&x.type!=='infantry'),'Enemy ships prevent invasion');
 const mr=lands.find(x=>x.planet==='mr'&&x.count>0);if(mr&&s.custodians){pay(s,p,6,'influence',payment);s.custodians=false;point(s,p,1,'removing the custodians token');if(s.winner!==null)return;}
 t.groundQueue=[];const usedBombard=new Set();const hits=[];
 for(const x of lands){if(!x.count)continue;const pl=s.planets[x.planet],enemy=pl.owner!==null&&pl.owner!==p,defender=pl.owner;let bombard=0;
  if(enemy){const bombers=sys.ships.filter(u=>u.owner===p&&unit(s,p,u.type).bombard&&(x.bombard||[]).includes(u.id));for(const u of bombers){must(!usedBombard.has(u.id),'Bombardment unit assigned twice');usedBombard.add(u.id);}const shield=pl.pds>0&&!sys.ships.some(u=>u.owner===p&&(u.type==='warsun'||u.type==='flagship'&&s.players[p].faction==='letnev'));if(!shield)bombard=rolls(s,p,bombers,'bombard');}
  const moved=sys.ships.filter(u=>u.owner===p&&u.type==='infantry').slice(0,x.count);for(const u of moved)sys.ships.splice(sys.ships.indexOf(u),1);pl.ground.push(...moved);t.groundQueue.push(x.planet);
  if(bombard)hits.push({kind:'ground',planet:x.planet,system:t.system,player:defender,attacker:p,hits:bombard});
  if(enemy&&pl.pds){let h=0;for(let i=0;i<pl.pds+(s.players[defender].tech.includes('ps')?1:0);i++)if(d10(s)>=unit(s,defender,'pds').spaceCannonHitsOn)h++;if(h)hits.push({kind:'ground',planet:x.planet,system:t.system,player:p,attacker:defender,hits:h});}
 }
 queueHits(s,hits,{step:'nextGround'});
}
function continueStep(s,n){if(n.step==='spaceStart')spaceStart(s);if(n.step==='combatNext')combatNext(s,n.ctx);if(n.step==='invasion')invasionPrompt(s);if(n.step==='nextGround')nextGround(s);}
function activate(s,p,args){const target=s.systems[args.system],pl=s.players[p];must(target,'Choose a system');must(pl.tokens.tactic>0,'No tactic token');must(!target.tokens.includes(p),'That system is already activated');must(!TILES[target.tile].isSupernova,'A supernova cannot be entered in this preview');
 const moves=args.moves||[],allIds=new Set();let gravityUsed=false;
 for(const m of moves){const src=s.systems[m.from];must(src&&m.from!==args.system,'Choose a different source system');must(!src.tokens.includes(p),'Ships cannot leave an activated system');must(Array.isArray(m.units)&&m.units.length&&new Set(m.units).size===m.units.length,'Choose units');let chosen=m.units.map(id=>src.ships.find(u=>u.id===id&&u.owner===p));must(chosen.every(Boolean),'A chosen unit is unavailable');for(const id of m.units){must(!allIds.has(id),'Unit selected twice');allIds.add(id);}
  must(chosen.some(u=>!['fighter','infantry'].includes(u.type))||pl.tech.includes('ff2')&&chosen.some(u=>u.type==='fighter'),'Transporting units requires ships');
  for(const[id,n]of Object.entries(m.load||{})){const planet=s.planets[id];must(planet?.owner===p&&planet.system===m.from&&integer(n,0,planet.ground.length),'Invalid infantry loading');const us=planet.ground.splice(0,n);chosen.push(...us);}
  const carriers=chosen.filter(x=>!['infantry','fighter'].includes(x.type)),carryCap=carriers.reduce((n,x)=>n+unit(s,p,x.type).capacityValue,0),independent=Math.max(0,chosen.filter(x=>['fighter','infantry'].includes(x.type)).length-carryCap);
  for(const u of [...carriers,...chosen.filter(x=>x.type==='fighter').slice(0,independent)]){let max=unit(s,p,u.type).moveValue;if(TILES[src.tile].isNebula)max=1;if(m.boost===u.id&&pl.tech.includes('gd')&&!gravityUsed){max++;gravityUsed=true;}must(route(s,p,m.from,args.system,max),'A ship cannot reach the active system');}
  const cap=chosen.filter(u=>!['fighter','infantry'].includes(u.type)).reduce((n,u)=>n+unit(s,p,u.type).capacityValue,0),cargo=chosen.filter(u=>['fighter','infantry'].includes(u.type)).length;must(cargo<=cap+(pl.tech.includes('ff2')?chosen.filter(u=>u.type==='fighter').length:0),'Selected force exceeds transport capacity');
  src.ships=src.ships.filter(u=>!m.units.includes(u.id));target.ships.push(...chosen);
 }
 must(spaceUnits(s,args.system,p).filter(u=>u.type!=='fighter').length<=fleetLimit(s,p),'Fleet supply exceeded');must(!cleanupCapacity(s,args.system,p),'Destination exceeds capacity');
 pl.tokens.tactic--;target.tokens.push(p);s.tactical={player:p,system:args.system};log(s,`${name(s,p)} activates ${TILES[target.tile].name}.`);spaceCannons(s);
}
export function transact(s,action){const next=clone(s);reduce(next,action);
 if(next.winner===null&&next.pending?.type!=='discard')for(let p=0;p<next.players.length;p++){
  const pl=next.players[p],kind=pl.cards.length>7?'action':pl.secrets.length+pl.secretScored.length>3?'secret':null;
  if(kind){next.pending={type:'discard',player:p,kind,resume:next.pending};break;}
 }
 validate(next);return next;}

function reduce(s,a){
 must(a&&typeof a.type==='string','Invalid action');must(s.winner===null,'The game has ended');const d=decision(s),p=a.player??d.player;must(p===d.player||a.type==='trade','It is another player’s decision');const pl=pid(s,p),q=s.pending,args=a.args||{};
 if(a.type==='discard'){must(q?.type==='discard','No discard required');const hand=pl[q.kind==='secret'?'secrets':'cards'];must(hand.includes(args.card),'Choose a card from your hand');hand.splice(hand.indexOf(args.card),1);if(q.kind==='action')s.actionDiscard.push(args.card);else s.secretDeck.unshift(args.card);if(q.kind==='action'?hand.length<=7:hand.length+pl.secretScored.length<=3)s.pending=q.resume;return;}
 if(a.type==='setupSecret'){must(q?.type==='setupSecret'&&s.setupSecrets[p].includes(args.card),'Choose one offered secret objective');pl.secrets=[args.card];s.secretDeck.push(...s.setupSecrets[p].filter(x=>x!==args.card));if(p+1<s.players.length)s.pending={type:'setupSecret',player:p+1};else{s.pending=null;s.secretDeck=shuffle(s,s.secretDeck);delete s.setupSecrets;}return;}
 if(a.type==='pick'){must(s.phase==='strategy'&&!q,'Strategy selection is not open');const card=Number(args.card);must(integer(card,1,8)&&!s.players.some(x=>x.strategies.includes(card)),'Strategy unavailable');pl.strategies.push(card);pl.tg+=s.strategyGoods[card]||0;s.strategyGoods[card]=0;s.strategyPicks=(s.strategyPicks||0)+1;log(s,`${name(s,p)} chooses ${STRATEGIES[card].name}.`);if(s.strategyPicks===s.players.length*(s.players.length<=4?2:1)){s.phase='action';s.active=initiativeOrder(s)[0];for(let c=1;c<=8;c++)if(!s.players.some(x=>x.strategies.includes(c)))s.strategyGoods[c]=(s.strategyGoods[c]||0)+1;}else s.active=(p+1)%s.players.length;return;}
 if(a.type==='primary'){must(s.phase==='action'&&!q,'Finish the current decision');const card=Number(args.card);must(pl.strategies.includes(card)&&!pl.used.includes(card),'Strategy already used or not yours');pl.used.push(card);strategyResolve(s,p,card,args);return;}
 if(a.type==='secondary'){must(q?.type==='secondary','No secondary ability');if(args.use)strategyResolve(s,p,q.card,args,true);else finishSecondary(s);return;}
 if(a.type==='activate'){must(s.phase==='action'&&!q,'Finish the current decision');activate(s,p,args);return;}
 if(a.type==='invade'){must(q?.type==='invasion','No invasion decision');invade(s,p,args.lands||[],args.payment);return;}
 if(a.type==='hit'){must(q?.type==='hits','No hits to assign');if(q.nonfighter)must(!hitList(s,q,p).find(x=>x.id===args.unit&&x.type==='fighter'),'Assault Cannon destroys a non-fighter ship');applyHit(s,p,args.unit,!!args.sustain);return;}
 if(a.type==='combatRoll'){must(q?.type==='combat','No combat to roll');combatRoll(s,args);return;}
 if(a.type==='capacity'){must(q?.type==='capacity','No capacity casualties');const sys=s.systems[q.system],u=sys.ships.find(x=>x.id===args.unit&&x.owner===p&&['fighter','infantry'].includes(x.type));must(u,'Choose excess cargo or fighters');sys.ships.splice(sys.ships.indexOf(u),1);q.excess--;if(q.excess<=0)continueStep(s,q.after);return;}
 if(a.type==='produce'){must(q?.type==='production','Production is not open');if(args.build&&Object.values(args.build).some(x=>x>0))produce(s,p,q.system,args.build,args.payment);endTurn(s);return;}
 if(a.type==='pass'){must(s.phase==='action'&&!q,'Finish the current decision');must(pl.strategies.every(c=>pl.used.includes(c)),'Use every strategy card before passing');pl.passed=true;log(s,`${name(s,p)} passes.`);endTurn(s);return;}
 if(a.type==='statusScore'){must(q?.type==='statusScore','Not scoring objectives');if(args.public){must(!q.publicDone&&s.public.includes(args.public),'Public scoring unavailable');score(s,p,args.public,args.payment);q.publicDone=true;}if(args.secret){must(!q.secretDone&&pl.secrets.includes(args.secret)&&SECRETS[args.secret].phase==='Status','Secret scoring unavailable');score(s,p,args.secret,args.payment);q.secretDone=true;}if(s.winner!==null)return;if(args.done){s.statusIndex++;if(s.statusIndex<s.players.length){s.active=s.statusOrder[s.statusIndex];s.pending={type:'statusScore',player:s.active,publicDone:false,secretDone:false};}else finishStatus(s);}return;}
 if(a.type==='redistribute'){must(q?.type==='redistribute','Not redistributing tokens');redistribute(s,p,args.tokens);s.statusIndex++;if(s.statusIndex<s.players.length)s.pending={type:'redistribute',player:s.statusOrder[s.statusIndex]};else afterRedistribution(s);return;}
 if(a.type==='orbitalDrop'){must(!q&&s.phase==='action'&&pl.faction==='sol','Orbital Drop unavailable');must(pl.tokens.strategy>0,'No strategy token');const planet=s.planets[args.planet];must(planet?.owner===p,'Choose a controlled planet');pl.tokens.strategy--;planet.ground.push(addUnit(s,'infantry',p),addUnit(s,'infantry',p));log(s,'Sol performs an Orbital Drop.');endTurn(s);return;}
 if(a.type==='extraAction'){must(q?.type==='extraAction','No extra action');s.pending=null;if(!args.use)endTurn(s);return;}
 if(a.type==='trade'){must(s.phase==='action'&&!s.pending&&s.active===p,'Trade on your own action-phase turn');const other=pid(s,args.to);must(args.to!==p,'Choose a trading partner');must(neighborPlayers(s,p,args.to)||pl.faction==='hacan'||other.faction==='hacan','Transactions require neighbors');must(!s.traded?.includes(args.to),'One transaction per neighbor during this turn');const give=Number(args.give||0),commodities=Number(args.commodities||0),receive=Number(args.receive||0),theirCommodities=Number(args.theirCommodities||0);must(integer(give,0,pl.tg)&&integer(commodities,0,pl.commodities)&&integer(receive,0,other.tg)&&integer(theirCommodities,0,other.commodities),'Invalid trade');must(other.human||receive+theirCommodities<=give+commodities,'The AI declines this offer');pl.tg+=receive+theirCommodities-give;other.tg+=give+commodities-receive;pl.commodities-=commodities;other.commodities-=theirCommodities;s.traded??=[];s.traded.push(args.to);log(s,`${name(s,p)} and ${name(s,args.to)} exchange resources.`);return;}
 if(a.type==='playCard'){must(pl.cards.includes(args.card),'Card not in hand');const card=ACTION_CATALOGUE[args.card];must(!q&&s.phase==='action'&&card.phase==='Action','This preview automates selected Action-timing cards on your turn');const id=args.card;
  if(id==='mining_initiative'){must(s.planets[args.planet]?.owner===p,'Choose a controlled planet');pl.tg+=PLANETS[args.planet].resources;}
  else if(id==='industrial_initiative')pl.tg+=ownedPlanets(s,p).filter(x=>PLANETS[x.id].trait==='INDUSTRIAL').length;
  else if(id==='economic_initiative'){for(const x of ownedPlanets(s,p))if(PLANETS[x.id].trait==='CULTURAL')x.ready=true;}
  else if(id==='f_deployment'){const x=s.planets[args.planet];must(x?.owner===p,'Choose your planet');x.ground.push(...Array.from({length:3},()=>addUnit(s,'infantry',p)));}
  else if(id==='summit')gainTokens(s,p,2);
  else if(id==='unexpected'){must(s.systems[args.system]?.tokens.includes(p),'Choose a system with your token');s.systems[args.system].tokens=s.systems[args.system].tokens.filter(x=>x!==p);}
  else if(id==='messiah'){for(const x of ownedPlanets(s,p))x.ground.push(addUnit(s,'infantry',p));}
  else if(id==='f_researched'){must(pl.tg>=4,'Need 4 trade goods');pl.tg-=4;research(s,p,args.tech,args.skips||[]);}
  else throw Error('This card is catalogued but its timing/effect is not automated in this preview. See the implementation status.');
  pl.cards.splice(pl.cards.indexOf(id),1);s.actionDiscard.push(id);log(s,`${name(s,p)} plays ${card.name}.`);endTurn(s);return;
 }
 if(a.type==='secretAction'){must(pl.secrets.includes(args.card)&&SECRETS[args.card].phase==='Action','Not an action-phase secret objective');score(s,p,args.card,args.payment);return;}
 // Council is an explicit assisted rules desk until all 50 agenda reducers exist.
 if(a.type==='agendaReveal'){must(q?.type==='agendaReveal','Agenda reveal unavailable');s.pending={type:'council',player:(s.speaker+1)%s.players.length,votes:{},index:s.agendaIndex,agenda:args.agenda||'Council session'};log(s,'Council session opened. Agenda-card effects currently require assisted adjudication.');return;}
 if(a.type==='vote'){must(q?.type==='council','No council vote');must(['for','against','abstain'].includes(args.outcome),'Choose a vote');const planets=args.planets||[];must(new Set(planets).size===planets.length,'Duplicate vote planet');let votes=0;for(const id of planets){must(s.planets[id]?.owner===p&&s.planets[id].ready,'Voting planet unavailable');votes+=PLANETS[id].influence;s.planets[id].ready=false;}q.votes[p]={outcome:args.outcome,votes};log(s,`${name(s,p)} votes ${votes} ${args.outcome}.`);if(Object.keys(q.votes).length===s.players.length)s.pending={type:'councilResolve',player:s.speaker,votes:q.votes,agenda:q.agenda};else q.player=(p+1)%s.players.length;return;}
 if(a.type==='councilResolve'){must(q?.type==='councilResolve','No council outcome');must(typeof args.note==='string'&&args.note.trim().length>3,'Record the agenda outcome and any effect still requiring adjudication');s.laws.push({name:q.agenda,note:args.note,votes:q.votes,round:s.round});log(s,'Council record: '+args.note);s.agendaIndex++;if(s.agendaIndex<2)s.pending={type:'agendaReveal',player:s.speaker};else{for(const pl of Object.values(s.planets))pl.ready=pl.owner!==null;startRound(s);}return;}
 throw Error('Action unavailable');
}
export function neighborPlayers(s,a,b){const sa=Object.values(s.systems).filter(x=>spaceUnits(s,x.key,a).length||TILES[x.tile].planets.some(p=>s.planets[p].owner===a)),sb=new Set(Object.values(s.systems).filter(x=>spaceUnits(s,x.key,b).length||TILES[x.tile].planets.some(p=>s.planets[p].owner===b)).map(x=>x.key));return sa.some(x=>sb.has(x.key)||neighbors(s,x.key).some(k=>sb.has(k)));}
export function validate(s){
 must(s?.format==='ti4-situation-room'&&s.version===1,'Unsupported save format');must(Array.isArray(s.players)&&s.players.length>=3&&s.players.length<=6,'Invalid player count');must(integer(s.round,1,1000)&&integer(s.rng,0,4294967295),'Invalid round or RNG');must(s.winner===null||integer(s.winner,0,s.players.length-1),'Invalid winner');must(['strategy','action','status','agenda','finished'].includes(s.phase),'Invalid phase');
 for(const p of s.players){must(IMPLEMENTED_FACTIONS.includes(p.faction),'Faction not enabled');must(integer(p.tg,0,10000)&&integer(p.commodities,0,FACTIONS[p.faction].commodities)&&integer(p.vp,0,1000),'Invalid resource values');must(['tactic','fleet','strategy'].every(k=>integer(p.tokens[k],0,16)),'Invalid command pools');must(p.tech.every(x=>TECHS[x]),'Unknown technology');must(p.cards.every(x=>ACTION_CATALOGUE[x])&&p.secrets.every(x=>SECRETS[x]),'Unknown cards');}
 const ids=new Set();for(const sys of Object.values(s.systems)){must(TILES[sys.tile]&&integer(sys.q,-5,5)&&integer(sys.r,-5,5),'Invalid system');must(sys.key===key(sys.q,sys.r),'System coordinate mismatch');for(const u of sys.ships){must(UNIT_TYPES.includes(u.type)&&integer(u.owner,0,s.players.length-1)&&typeof u.id==='string'&&!ids.has(u.id),'Invalid space unit');ids.add(u.id);}}
 for(const pl of Object.values(s.planets)){must(PLANETS[pl.id]&&s.systems[pl.system],'Invalid planet');must(pl.owner===null||integer(pl.owner,0,s.players.length-1),'Invalid controller');must(integer(pl.pds,0,2)&&integer(pl.dock,0,1),'Invalid structures');for(const u of pl.ground){must(u.type==='infantry'&&integer(u.owner,0,s.players.length-1)&&!ids.has(u.id),'Invalid ground forces');ids.add(u.id);}}
 must(integer(s.active,0,s.players.length-1)&&integer(s.speaker,0,s.players.length-1),'Invalid active player or speaker');
 must(Array.isArray(s.public)&&s.public.every(id=>OBJECTIVES[id])&&Array.isArray(s.publicDeck)&&s.publicDeck.every(id=>OBJECTIVES[id]),'Invalid objective deck');
 must(Array.isArray(s.actionDeck)&&s.actionDeck.every(id=>ACTION_CATALOGUE[id])&&Array.isArray(s.secretDeck)&&s.secretDeck.every(id=>SECRETS[id]),'Invalid card deck');
 if(s.pending){must(['setupSecret','secondary','invasion','production','combat','hits','capacity','statusScore','redistribute','discard','extraAction','agendaReveal','council','councilResolve'].includes(s.pending.type)&&integer(s.pending.player,0,s.players.length-1),'Invalid pending decision');}
 must(Array.isArray(s.log)&&s.log.every(x=>typeof x.text==='string'),'Invalid log');return true;
}
