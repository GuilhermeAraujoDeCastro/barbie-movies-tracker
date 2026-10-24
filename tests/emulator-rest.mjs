import {readFile}from'node:fs/promises';
import assert from'node:assert/strict';
export const project='demo-auditoria-tracker';
const host=process.env.FIRESTORE_EMULATOR_HOST||'127.0.0.1:8180';
const authHost=process.env.FIREBASE_AUTH_EMULATOR_HOST||'127.0.0.1:9199';
if(!/^127\.0\.0\.1:\d+$/.test(host)||!/^127\.0\.0\.1:\d+$/.test(authHost))throw new Error('Testes aceitam somente emuladores 127.0.0.1.');
const base=`http://${host}/v1/projects/${project}/databases/(default)/documents`;
export const path=id=>`projects/${project}/databases/(default)/documents/${id}`;
function value(v){if(v===null)return{nullValue:null};if(typeof v==='boolean')return{booleanValue:v};if(typeof v==='string')return{stringValue:v};if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};if(Array.isArray(v))return{arrayValue:{values:v.map(value)}};return{mapValue:{fields:fields(v)}};}
function fields(v){return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,value(x)]));}
export const put=(id,v,merge=false)=>({update:{name:path(id),fields:fields(v)},...(merge?{updateMask:{fieldPaths:Object.keys(v)}}:{})});
export const del=id=>({delete:path(id)});
export async function commit(token,writes,expected=200){const response=await fetch(base+':commit',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({writes})});const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;}
export async function get(id,token=null,expected=200){const response=await fetch(base+'/'+id,{headers:token?{Authorization:`Bearer ${token}`}:{}});const body=await response.json();assert.equal(response.status,expected,JSON.stringify(body));return body;}
export async function account(){const response=await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:`qa-${crypto.randomUUID()}@example.invalid`,password:'Fixture-Only-123!',returnSecureToken:true})});assert.equal(response.status,200);const data=await response.json();return{uid:data.localId,token:data.idToken};}
export async function rules(url){const content=await readFile(url,'utf8');const response=await fetch(`http://${host}/emulator/v1/projects/${project}:securityRules`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({rules:{files:[{name:'firestore.rules',content}]}})});const body=await response.text();assert.equal(response.status,200,body);}
