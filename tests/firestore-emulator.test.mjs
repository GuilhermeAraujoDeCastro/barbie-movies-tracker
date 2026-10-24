import test from'node:test';import assert from'node:assert/strict';
import {account,rules,put,commit,get}from'./emulator-rest.mjs';
test('Firestore Barbie: baseline, privacidade, token, revogação e validação',async t=>{
 const a=await account(),b=await account(),root=`progress/${a.uid}`;
 await rules(new URL('fixtures/firestore-before.rules',import.meta.url));
 await commit('owner',[put(root,{watched:[1],ratings:{1:5},reviews:{1:'legado'}})]);
 await t.test('P09 baseline: documento legado era legível sem autenticação',async()=>{await get(root);});
 await rules(new URL('../firestore.rules',import.meta.url));
 await t.test('P09 novo: coleção privada só pode ser lida pelo dono',async()=>{await get(root,null,403);await get(root,b.token,403);await get(root,a.token);});
 const record={watched:true,rating:5,review:'Exemplo fictício',watchPriority:2,watchedAt:'2024-02-29'};
 await commit(a.token,[put(root,{schemaVersion:2,shareEnabled:false,shareToken:null,movieIds:['1']},true),put(`${root}/movies/1`,record)]);
 const token=crypto.randomUUID();
 await t.test('publicar token e filme na mesma transação funciona',async()=>{await commit(a.token,[put(`shares/${token}`,{owner:a.uid,createdAt:Date.now()}),put(`shares/${token}/movies/1`,record),put(root,{shareEnabled:true,shareToken:token},true)]);await get(`shares/${token}/movies/1`);});
 await t.test('outro UID não escreve filme privado ou resumo',async()=>{await commit(b.token,[put(`${root}/movies/1`,record)],403);await commit(b.token,[put(`shares/${token}/movies/1`,record)],403);});
 await t.test('tipos, campos extras e resenha excessiva são recusados em create/update',async()=>{for(const invalid of [{...record,rating:'5'},{...record,extra:'x'},{...record,review:'x'.repeat(501)}]){await commit(a.token,[put(`${root}/movies/1`,invalid)],403);await commit(a.token,[put(`${root}/movies/2`,invalid)],403);}});
 await t.test('revogação impede nova leitura do token anterior',async()=>{await commit(a.token,[put(root,{shareEnabled:false,shareToken:null},true)]);await get(`shares/${token}/movies/1`,null,403);assert.equal((await get(root,a.token)).fields.ratings.mapValue.fields['1'].integerValue,'5');});
});
