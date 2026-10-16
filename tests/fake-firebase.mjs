import {readFile}from'node:fs/promises';
export async function fakeFirebase(moduleUrl){
  const data=new Map();let tail=Promise.resolve(),fail=false;
  const clone=v=>v===undefined?undefined:structuredClone(v);
  const snapshot=(id)=>({id:id.split('/').at(-1),exists:()=>data.has(id),data:()=>clone(data.get(id))});
  const put=(id,value,options)=>data.set(id,options?.merge?{...data.get(id),...clone(value)}:clone(value));
  const sdk={initializeApp(){},getAuth(){},getFirestore(){},GoogleAuthProvider:class{},signInWithPopup(){},createUserWithEmailAndPassword(){},signInWithEmailAndPassword(){},signOut(){},onAuthStateChanged(){},connectAuthEmulator(){},connectFirestoreEmulator(){},
    doc:(_, ...parts)=>parts.join('/'),collection:(_, ...parts)=>parts.join('/'),
    getDoc:async id=>snapshot(id),setDoc:async(id,value,options)=>put(id,value,options),
    getDocs:async path=>{const docs=[...data.keys()].filter(id=>id.startsWith(path+'/')&&id.split('/').length===path.split('/').length+1).sort().map(snapshot);return {docs,empty:!docs.length};},
    writeBatch:()=>{const writes=[];return {set:(...args)=>writes.push(['set',args]),delete:id=>writes.push(['delete',[id]]),commit:async()=>{if(fail){fail=false;throw new Error('indisponível');}for(const [kind,args]of writes)kind==='set'?put(...args):data.delete(args[0]);}};},
    runTransaction:async(_,action)=>{
      const task=tail.then(async()=>{let wrote=false;const writes=[];
        const result=await action({get:async id=>{if(wrote)throw new Error('leitura após escrita');return snapshot(id);},set:(...args)=>{wrote=true;writes.push(args);}});
        if(fail){fail=false;throw new Error('indisponível');}for(const args of writes)put(...args);return result;
      });tail=task.catch(()=>{});return task;
    }};
  const key='__sdk_'+crypto.randomUUID().replaceAll('-','');globalThis[key]=sdk;
  let code=await readFile(moduleUrl,'utf8');
  code=code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]https:[^'"]+['"];?/g,(_,names)=>`const {${names}}=globalThis.${key};`);
  code=code.replace(/from (['"])(\.\/[^'"]+)\1/g,(_,quote,path)=>'from '+JSON.stringify(new URL(path,moduleUrl).href));
  const api=await import('data:text/javascript,'+encodeURIComponent(code+'\n//'+key));
  return {api,data,failNext:()=>{fail=true;}};
}
