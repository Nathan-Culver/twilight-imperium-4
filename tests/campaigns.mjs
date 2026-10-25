import fs from 'node:fs';
import {createGame,transact,decision} from '../engine.js';import {aiAction} from '../ai.js';
const results=[];
for(const count of[3,4,5,6])for(const difficulty of['easy','normal','hard']){
 let s=createGame({count,difficulty,seed:33+count,humans:[]}),steps=0,error=null;
 try{while(s.winner===null&&steps<4500){let a=aiAction(s);if(decision(s).type==='councilResolve')a={type:'councilResolve',args:{note:'Harness exercises phase transitions only; agenda effects are not adjudicated.'}};if(!a)throw Error('AI has no action: '+decision(s).type);try{s=transact(s,a);}catch(e){throw Error(JSON.stringify(a)+' '+e.message);}steps++;}}catch(e){error=e.message;}
 const result={count,difficulty,steps,round:s.round,winner:s.winner,scores:s.players.map(p=>p.vp),error};results.push(result);console.log(JSON.stringify(result));if(error){console.log('pending',s.pending);break;}
}

fs.writeFileSync('docs/AI-FLOW-RESULTS.json',JSON.stringify({note:'Phase-flow smoke tests only. Agenda effects are intentionally not adjudicated. Not a full rules-fidelity test.',results},null,2));if(results.some(x=>x.error||x.winner===null))process.exitCode=1;
