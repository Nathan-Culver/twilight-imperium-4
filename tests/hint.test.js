import test from 'node:test';import assert from 'node:assert/strict';
import * as E from '../engine.js';
import {getHint,hintHTML,explain,bindHint} from '../hint.js';
import {aiAction} from '../ai.js';
const fresh=()=>E.createGame({seed:23});
function expected(state){return aiAction(structuredClone(state));}
test('hint follows the existing AI without changing state or RNG',()=>{const s=fresh(),before=structuredClone(s),want=expected(s),h=getHint(s);assert.deepEqual(s,before);assert.deepEqual(h.action,want);assert.ok(h.why.length>20);assert.deepEqual(getHint(s),h);assert.deepEqual(s,before);});
test('completed games have no suggested move',()=>{const s=fresh();s.winner='done';assert.equal(getHint(s).action,null);assert.equal(getHint(s).title,'Game over');});
test('hint dialog escapes imported text',()=>{const html=hintHTML(explain({units:[{id:'u',name:'<img src=x onerror=alert(1)>'}]},{type:'rally',id:'u'}));assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img'));assert.ok(html.includes('Why:'));});
test('button opens advice and consumes the click',()=>{let listener;const old=globalThis.document;globalThis.document={addEventListener:(type,fn,capture)=>{assert.equal(type,'click');assert.equal(capture,true);listener=fn;}};try{let shown;bindHint(fresh,(...args)=>shown=args);let prevented=false,stopped=false;listener({target:{closest:()=>true},preventDefault:()=>prevented=true,stopImmediatePropagation:()=>stopped=true});assert.equal(shown[0],'AI Hint');assert.ok(shown[1].includes('Why:'));assert.ok(prevented&&stopped);}finally{globalThis.document=old;}});
