import * as D from './data.js';
import {aiAction} from './ai.js?v=0.1.1';

const reasons={
income:'Collect this round’s income from controlled regions before preparing movement orders.',
roll:'Roll the current combat dice before assigning hits.',
combatRoll:'Roll the current combat round before assigning hits.',
extraAction:'Use the available extra action to retain another opportunity this turn.',
agendaReveal:'Reveal the agenda so the council can consider it.',
escort:'Assign an eligible escort to the interception.',
garrisonRoll:'Roll the defending garrison’s dice before assigning losses.',
garrisonHit:'Assign a garrison hit to an eligible lower-value target.',
bombRoll:'Roll the strategic bombing dice before choosing damage.',
bombHit:'The AI prefers available unit targets, then infrastructure and resources.',
subEscape:'The AI keeps the escaping submarine in its current sea region.',
convoyAssign:'Target the convoy cluster with the most ships.',
convoyRoll:'Roll the assigned convoy raid before choosing damage.',
convoyWild:'Target cargo with the largest remaining shipment.',
refitDone:'The AI completes refit without further command reorganization.',
hug:'Ground hugging improves this unit’s protection against fire.',
fire:'The AI prioritizes legal shots using firing strength, target value and the target’s condition.',
react:'The AI selects an available reaction shot during the enemy movement window.',
rally:'Recovering a pinned or suppressed unit restores its ability to act.',
move:'The AI favors progress toward useful positions while weighing resistance and exposure.',
pass:'The AI has no further action it prefers under its current policy and resource limits.',
decline:'The AI found no reaction shot to take.',
combat:'Resolve the current combat before issuing another order.',
'smoke-place':'The AI selects a legal smoke location to influence visibility and protect movement.',
smoke:'Smoke can block enemy fire against exposed friendly troops.',
fallback:'The AI estimates its force is too weak to continue this assault safely.',
replace:'Replacing a lost platoon commander restores command support.',
skill:'The AI uses an available specialist ability before routine movement or fire.',
'command-refresh':'No command resources remain; refresh them before taking another action.',
'order-pass':'Pass this order window so the pending action can continue.',
'program-resolve':'Resolve the pending program, using an eligible counter-hacker if available.',
'resume-action':'Complete the interrupted action before selecting another one.',
rout:'Resolve the queued rout before normal actions resume.',
firefight:'The AI chooses an eligible responding shooter, or declines if none is available.',
event:'Resolve the event against an eligible target before continuing.',
begin:'The AI compares affordable actions with expansion, technology, fleet and upkeep needs.',
colonize:'Population increases production; the AI balances income needs against science and materials.',
research:'The AI selects an affordable technology according to its technology priorities.',
build:'The AI builds an affordable unit or structure to improve its position.',
explore:'Exploration opens new sectors and potential resources or points.',
claim:'The AI claims an eligible sector when it judges the upkeep affordable.',
refresh:'Refresh colony ships so more population can be deployed.',
finish:'This action is exhausted or the AI has no preferred legal follow-up.',
refit:'Improve the ship design using available parts and technology.',
place:'The AI compares legal tile placements by points, population, discoveries and opposition.',
discovery:'The AI chooses between keeping the discovery for points and using its reward.',
techDiscovery:'Choose a discovery technology using the AI’s technology priorities.',
reputation:'Keep the highest reputation tile, replacing a lower tile when worthwhile.',
assign:'The AI favors valuable targets and damage that can finish an enemy ship.',
bombard:'Resolve bombardment to remove opposing population before conquest.',
skipConquest:'Avoid taking on additional sector upkeep.',
trade:'Exchange available resources to improve what the AI can use next.',
abandon:'Shed a low-value sector to cover an upkeep deficit.',
upkeep:'Income covers the current upkeep, so the AI proceeds.',
collapse:'The AI cannot cover the deficit with available trades or sectors.',
aiPlan:'The AI ranks legal destinations by strategic value, enemy strength and progress toward targets, then selects orders within its command limit. The oil bid follows the difficulty setting.',
aiPurchase:'The AI budgets resources across useful units and eligible factories, buying civilian goods when morale needs them.',
seal:'The AI has prepared its orders and would seal them for resolution.',
productionSeal:'The AI has prepared its production plan and would seal it.',
stance:'The AI weighs enemy air and surface forces, durability and escort needs.',
stancesReady:'The AI’s preferred combat stances are already selected.',
hit:'The AI allocates this hit according to its combat target or casualty priorities.',
rank:'Take the first available initiative slot.',
hotspot:'Prioritize an available battle region with high strategic value.',
repair:'Repair damage, spending from the most plentiful resource when required.',
capture:'Assign captured territory and the corresponding medals to an eligible nation.',
land:'Seek a legal landing site near the front while avoiding hostile forces.',
deploy:'Deploy the completed unit, preferring a safer port for naval production.',
deployLoss:'Lose a lower-value unit when deployment capacity is insufficient.',
morale:'Spend available medals and civilian goods to cancel stress or recover morale.',
penaltyPay:'Pay the penalty from the most plentiful resource.',
desert:'Remove a low-value unit to satisfy the unpaid penalty.',
pick:'Choose an available strategy card according to the round, command needs and scoring opportunities.',
primary:'Use a remaining strategy card to gain its primary benefit.',
secondary:'The AI checks whether the secondary benefit is useful and affordable before spending strategy resources.',
activate:'Select a tactical activation for expansion, a favorable attack or affordable production.',
produce:'Choose an affordable fleet and ground-force mix within production limits.',
invade:'Land available infantry on eligible planets, reserving infantry as each landing is assigned.',
statusScore:'Score an eligible objective, or finish scoring when none remains.',
secretAction:'Score an eligible action-phase secret objective.',
redistribute:'Keep enough fleet tokens for existing fleets, reserve strategy tokens and assign the rest to tactics.',
setupSecret:'The AI favors a status-phase secret objective from the offered cards.',
discard:'The AI discards the last card in its applicable hand.',
playCard:'Use an economic action card before spending tactical commands.',
vote:'The AI’s current council policy abstains rather than spending influence.',
capacity:'Remove a fighter or infantry unit to satisfy transport capacity.',
priority:'Adopt the AI’s preferred economic program before spending command actions.',
initiative:'Bid fuel and choose an initiative slot according to the standing AI policy.',
load:'Embark reserves so the fleet can invade defended worlds.',
'civilian-relief':'Reduce war stress before pursuing more expansion.',
'raid-convoy':'Raid a valuable hostile supply route when expansion is unattractive.'
};
const words=x=>String(x).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[-_]/g,' ');
function label(s,value){
 if(value===null)return 'none';
 if(typeof value!=='string')return String(value);
 const pools=[s.units,s.decoys,Object.values(s.sectors||{}).flatMap(x=>x.ships||[]),s.sectors,s.players,s.factions,s.commands,s.planets,s.systems,...Object.values(D).filter(x=>x&&typeof x==='object')];
 for(const pool of pools){const item=Array.isArray(pool)?pool.find(x=>x?.id===value):pool?.[value];if(item&&typeof item==='object')return item.name||item.title||item.label||(item.type?(D.TYPES?.[item.type]?.name||D.SHIPS?.[item.type]?.name||words(item.type))+' ('+value+')':value);}
 return value;
}
function describe(s,value){
 if(Array.isArray(value))return value.map(x=>describe(s,x)).join('; ')||'none';
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>words(k)+': '+(['player','owner'].includes(k)&&s.players?.[v]?s.players[v].name||s.players[v].faction||String(v):describe(s,v))).join(', ');
 return label(s,value);
}
export function explain(s,action){
 if(!action)return {action:null,title:'No automated move available',why:'The AI has no automated choice for this position. Resolve any required manual decision first.',details:[]};
 let why=reasons[action.type]||'This is the next step selected by the game’s AI for the current phase.';if(action.type==='begin')why=reasons[action.action]||why;if(action.type==='fire'){const target=s.units?.find(u=>u.id===action.target);why+=' This uses '+action.ids.length+' firer(s)'+(target?' against a '+target.status+' target':'')+'.';}if(action.type==='rally'){const u=s.units?.find(u=>u.id===action.id);if(u)why+=' This unit is currently '+u.status+'.';}return {action,title:({aiPlan:'Prepare movement orders',aiPurchase:'Prepare production plan',begin:'Begin '+words(action.action),pick:'Choose a strategy card',setupSecret:'Choose a secret objective',activate:'Activate a system'})[action.type]||words(action.type),why,details:Object.entries(action).filter(([k])=>!['type','score','value'].includes(k)).map(([k,v])=>words(k)+': '+(['player','owner'].includes(k)&&s.players?.[v]?s.players[v].name||s.players[v].faction||String(v):describe(s,v)))};
}
const escapeHint=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function hintHTML(hint){return '<p>What the AI would do next in this position:</p><h3>'+escapeHint(hint.title.charAt(0).toUpperCase()+hint.title.slice(1))+'</h3><ul>'+hint.details.map(x=>'<li>'+escapeHint(x)+'</li>').join('')+'</ul><p><strong>Why:</strong> '+escapeHint(hint.why)+'</p><p>Advice only. No move has been played. This follows the current AI policy and difficulty; it is not a guarantee of the best move.</p>';}
export function bindHint(read,show){document.addEventListener('click',event=>{if(!event.target.closest('[data-hint-show]'))return;event.preventDefault();event.stopImmediatePropagation();try{show('AI Hint',hintHTML(getHint(read())));}catch{show('AI Hint','<p>A hint is unavailable for this position. Complete the pending manual decision and try again.</p>');}},true);}

export function getHint(state){if(!state)return explain({},null);const copy=structuredClone(state);if(copy.result||copy.phase==='ended'||(copy.winner!==null&&copy.winner!==undefined))return {...explain(copy,null),title:'Game over',why:'The game is complete; there is no next move.'};return explain(copy,aiAction(copy));}
