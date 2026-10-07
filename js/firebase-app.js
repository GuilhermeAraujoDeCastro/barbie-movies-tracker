import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, onAuthStateChanged, connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, runTransaction, connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';
import { normalizeProgress, movieIds, movieRecord, progressFromRecords } from './collection.js';

export function initFirebase(config, emulator=null) {
  if(emulator && (!['localhost','127.0.0.1'].includes(location.hostname) || !config.projectId.startsWith('demo-'))) throw new Error('Emulador exige host local e projeto demo-.');
  const app=initializeApp(config),auth=getAuth(app),db=getFirestore(app);
  if(emulator){connectAuthEmulator(auth,`http://127.0.0.1:${emulator.authPort}`,{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',emulator.firestorePort);}
  return {app,auth,db};
}
export async function loginWithGoogle(auth){return (await signInWithPopup(auth,new GoogleAuthProvider())).user;}
export async function signUpWithEmail(auth,email,password){return (await createUserWithEmailAndPassword(auth,email,password)).user;}
export async function loginWithEmail(auth,email,password){return (await signInWithEmailAndPassword(auth,email,password)).user;}
export function logout(auth){return signOut(auth);}
export function watchAuthState(auth,callback){return onAuthStateChanged(auth,callback);}
const parent=(db,uid)=>doc(db,'progress',uid);
const movies=(db,uid)=>collection(db,'progress',uid,'movies');
const movie=(db,uid,id)=>doc(db,'progress',uid,'movies',String(id));
const sharedMovie=(db,token,id)=>doc(db,'shares',token,'movies',String(id));

// Migração idempotente: campos legados permanecem no documento original.
export async function loadUserProgress(db,uid) {
  const root=await getDoc(parent(db,uid));
  if(root.exists() && root.data().schemaVersion!==2){
    const legacy=normalizeProgress(root.data()),ids=movieIds(legacy);
    if(ids.length>200)throw new Error('Coleção legada excede o limite de migração. Exporte um backup.');
    await runTransaction(db,async tx=>{
      const latest=await tx.get(parent(db,uid));
      if(latest.exists() && latest.data().schemaVersion===2)return;
      const snapshots=await Promise.all(ids.map(id=>tx.get(movie(db,uid,id))));
      ids.forEach((id,index)=>{if(!snapshots[index].exists())tx.set(movie(db,uid,id),movieRecord(legacy,id));});
      tx.set(parent(db,uid),{schemaVersion:2,shareEnabled:false,shareToken:null,movieIds:ids.map(String)},{merge:true});
    });
  }
  const snapshot=await getDocs(movies(db,uid));
  return progressFromRecords(snapshot.docs.map(s=>({id:s.id,data:s.data()})));
}
export async function saveProgressPatch(db,uid,patches) {
  const ids=Object.keys(patches);
  if(ids.length>200)throw new Error('Coleção excede o limite de 200 filmes.');
  await runTransaction(db,async tx=>{
    const root=await tx.get(parent(db,uid)),meta=root.exists()?root.data():{};
    const current=await Promise.all(ids.map(id=>tx.get(movie(db,uid,id))));
    ids.forEach((id,index)=>{
      const base=current[index].exists()?current[index].data():movieRecord({},id);
      const record={...base,...patches[id]};
      tx.set(movie(db,uid,id),record);
      if(meta.shareEnabled && meta.shareToken)tx.set(sharedMovie(db,meta.shareToken,id),record);
    });
    const allIds=[...new Set([...(meta.movieIds||[]).map(String),...ids])];
    if(allIds.length>200)throw new Error('Coleção excede o limite de 200 filmes.');
    tx.set(parent(db,uid),{schemaVersion:2,movieIds:allIds},{merge:true});
  });
}
export async function getShareSettings(db,uid){const s=await getDoc(parent(db,uid));return s.exists()?{enabled:s.data().shareEnabled===true,token:s.data().shareToken??null}:{enabled:false,token:null};}
// A regra consulta o token atual do dono em toda leitura pública.
export async function publishShare(db,uid) {
  const token=crypto.randomUUID(),snapshot=await getDocs(movies(db,uid)),ids=snapshot.docs.map(s=>s.id);
  if(ids.length>200)throw new Error('Coleção excede o limite de compartilhamento.');
  await runTransaction(db,async tx=>{
    const root=await tx.get(parent(db,uid));
    const allIds=root.exists()?(root.data().movieIds||ids):ids;
    const records=await Promise.all(allIds.map(id=>tx.get(movie(db,uid,id))));
    tx.set(doc(db,'shares',token),{owner:uid,createdAt:Date.now()});
    allIds.forEach((id,i)=>{if(records[i].exists())tx.set(sharedMovie(db,token,id),records[i].data());});
    tx.set(parent(db,uid),{schemaVersion:2,shareEnabled:true,shareToken:token},{merge:true});
  });
  return token;
}
export async function revokeShare(db,uid){await setDoc(parent(db,uid),{shareEnabled:false,shareToken:null},{merge:true});}
export async function loadSharedProgress(db,token){
  const snapshot=await getDocs(collection(db,'shares',token,'movies'));
  return progressFromRecords(snapshot.docs.map(s=>({id:s.id,data:s.data()})));
}
export async function savePushSubscription(db,uid,subscription){await setDoc(doc(db,'pushSubscriptions',uid),{subscription,savedAt:Date.now()});}
