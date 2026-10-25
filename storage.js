import {validate} from './engine.js?v=0.1.1';
const PREFIX='ti4-situation-room:';
export function saveLocal(state,slot='autosave'){localStorage.setItem(PREFIX+slot,JSON.stringify({savedAt:new Date().toISOString(),state}));}
export function readLocal(slot='autosave'){const raw=localStorage.getItem(PREFIX+slot);if(!raw)return null;const x=JSON.parse(raw);validate(x.state);return x;}
export function slots(){return['autosave','checkpoint-1','checkpoint-2','checkpoint-3'].map(id=>{try{const x=readLocal(id);return{id,...(x?{savedAt:x.savedAt,round:x.state.round,phase:x.state.phase}: {})};}catch{return{id,error:true};}});}
export function exportSave(state){validate(state);const blob=new Blob([JSON.stringify({format:'ti4-save',version:1,savedAt:new Date().toISOString(),state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='twilight-imperium-round-'+state.round+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
export function importSave(text){if(typeof text!=='string'||text.length>6_000_000)throw Error('Choose a TI4 save file smaller than 6 MB.');const parsed=JSON.parse(text),state=parsed.state;if(parsed.format!=='ti4-save'||parsed.version!==1)throw Error('This is not a supported Twilight Imperium save.');validate(state);return state;}
