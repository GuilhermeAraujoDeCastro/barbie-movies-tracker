import test from'node:test';import assert from'node:assert/strict';
import {normalizeProgress,changedMovies,setWatchPriority,setWatchedDay,watchedByMonth,validDay}from'../js/collection.js';
import {toggleWatched}from'../js/storage-local.js';
import {exportProgressPayload,parseImportedProgress,exportCollectionCsv}from'../js/backup.js';
import {createPendingReviews}from'../js/pending-reviews.js';
import {fakeFirebase}from'./fake-firebase.mjs';
const moduleUrl=new URL('../js/firebase-app.js',import.meta.url);
test('P10: dois aparelhos alteram filmes e campos distintos sem apagar o outro',async()=>{
 const {api,data}=await fakeFirebase(moduleUrl);const initial=normalizeProgress();
 const a={...initial,watched:[1],ratings:{1:5}},b={...initial,reviews:{1:'resenha B'},watched:[2]};
 await Promise.all([api.saveProgressPatch({},'alice',changedMovies(initial,a)),api.saveProgressPatch({},'alice',changedMovies(initial,b))]);
 assert.deepEqual(data.get('progress/alice/movies/1'),{watched:true,rating:5,review:'resenha B',watchPriority:0,watchedAt:null});
 assert.equal(data.get('progress/alice/movies/2').watched,true);
});
test('migração preserva documento legado e não sobrescreve filme já migrado',async()=>{
 const {api,data}=await fakeFirebase(moduleUrl);data.set('progress/alice',{watched:[1],ratings:{1:5},reviews:{1:'legado'}});
 data.set('progress/alice/movies/1',{watched:true,rating:4,review:'novo',watchPriority:0,watchedAt:null});
 assert.equal((await api.loadUserProgress({},'alice')).ratings[1],4);assert.equal(data.get('progress/alice').ratings[1],5);
 await api.loadUserProgress({},'alice');assert.equal(data.get('progress/alice/movies/1').review,'novo');
});
test('P09: ativar, sincronizar e rotacionar publica cópia em token novo',async()=>{
 const {api,data}=await fakeFirebase(moduleUrl);await api.saveProgressPatch({},'alice',{1:{watched:true}});
 const first=await api.publishShare({},'alice');assert.equal(data.get(`shares/${first}/movies/1`).watched,true);
 await api.saveProgressPatch({},'alice',{1:{rating:5}});assert.equal(data.get(`shares/${first}/movies/1`).rating,5);
 const second=await api.publishShare({},'alice');assert.notEqual(first,second);assert.equal(data.get('progress/alice').shareToken,second);
 await api.revokeShare({},'alice');assert.equal(data.get('progress/alice').shareEnabled,false);
});
test('P11: cancelar pendência impede resenha de alcançar outra sessão',async()=>{
 const saves=[];const pending=createPendingReviews((...args)=>saves.push(args),5);pending.schedule('alice',1,'rascunho');pending.cancel();
 pending.schedule('bob',2,'texto Bob');await new Promise(r=>setTimeout(r,20));assert.deepEqual(saves,[['bob',2,'texto Bob']]);
});
test('M04: prioridade não marca filme assistido e sobrevive ao backup',()=>{
 const p=setWatchPriority(normalizeProgress(),1,3);assert.deepEqual(p.watched,[]);assert.deepEqual(parseImportedProgress(JSON.stringify(exportProgressPayload({name:'Exemplo'},p))),p);
});
test('M05: diário acompanha data editada; legado não recebe data inventada',()=>{
 const old=normalizeProgress({watched:[1],ratings:{1:5}});assert.deepEqual(watchedByMonth(old),{});
 const p=setWatchedDay(old,1,'2024-02-29');assert.deepEqual(watchedByMonth(p),{'2024-02':1});assert.equal(validDay('2023-02-29'),false);assert.equal(validDay('2024-99-99'),false);
 assert.throws(()=>setWatchedDay(p,1,'2999-01-01'));assert.ok(toggleWatched(normalizeProgress(),1).watchedAt[1]);
});
test('M06: CSV preserva acentos, aspas e bloqueia fórmulas em resenha/título',()=>{
 const csv=exportCollectionCsv([{id:1,title:'=HYPERLINK("x")',year:2001}],normalizeProgress({watched:[1],reviews:{1:'  @SUM(1)\nOlá, "mundo"'}}));
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));assert.ok(csv.includes("'  @SUM"));assert.ok(csv.includes('Olá, ""mundo""'));
});
test('erro de transação não grava parcialmente',async()=>{const {api,data,failNext}=await fakeFirebase(moduleUrl);failNext();await assert.rejects(api.saveProgressPatch({},'alice',{1:{watched:true}}));assert.equal(data.size,0);});
