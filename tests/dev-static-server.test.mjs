import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { get } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

async function freePort() {
  const probe=createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);});
  const port=probe.address().port;
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
  return port;
}

function request(port,path) {
  // http.get preserva o caminho codificado; não normaliza a tentativa
  // de traversal como uma construção prévia com URL/fetch poderia fazer.
  return new Promise((resolve,reject)=>{
    const call=get({hostname:'127.0.0.1',port,path},response=>{
      const chunks=[];response.on('data',chunk=>chunks.push(chunk));
      response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString('utf8')}));
      response.on('error',reject);
    });
    call.setTimeout(4000,()=>call.destroy(new Error('Timeout da requisição HTTP local.')));
    call.on('error',reject);
  });
}

test('servidor real serve raiz com query/assets e recusa traversal/encoding inválido', {timeout:30000}, async t=>{
  const port=await freePort();
  const root=fileURLToPath(new URL('../',import.meta.url));
  const child=spawn(process.execPath,['scripts/dev-static-server.js'],{
    cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe'],windowsHide:true,
  });
  let output='',errors='';
  child.stderr.on('data',chunk=>{errors=(errors+chunk.toString()).slice(-4000);});
  t.after(async()=>{
    if(!child.pid || child.exitCode!==null || child.signalCode!==null)return;
    await new Promise((resolve,reject)=>{
      let force;
      const deadline=setTimeout(()=>reject(new Error('O processo de teste não terminou.')),5000);
      child.once('exit',()=>{clearTimeout(force);clearTimeout(deadline);resolve();});
      child.kill();
      force=setTimeout(()=>child.kill('SIGKILL'),2000);
    });
    assert.ok(child.exitCode!==null || child.signalCode!==null,'o próprio servidor de teste deve estar encerrado');
  });
  await new Promise((resolve,reject)=>{
    const deadline=setTimeout(()=>reject(new Error('Servidor de teste não iniciou: '+errors)),10000);
    child.once('error',error=>{clearTimeout(deadline);reject(error);});
    child.once('exit',code=>{clearTimeout(deadline);reject(new Error(`Servidor terminou antes de ficar pronto (${code}): ${errors}`));});
    child.stdout.on('data',chunk=>{
      output+=chunk.toString();
      if(output.includes(`localhost:${port}`)){clearTimeout(deadline);resolve();}
    });
  });
  const page=await request(port,'/?demo=1');
  assert.equal(page.status,200);assert.match(page.headers['content-type'],/text\/html/);
  assert.match(page.body,/<html\b/i);assert.match(page.body,/js\/main\.js/);
  const asset=await request(port,'/js/demo.js?fixture=1');
  assert.equal(asset.status,200);assert.match(asset.headers['content-type'],/javascript/);
  assert.match(asset.body,/export const demo(?:Movies|Games)/);
  assert.equal((await request(port,'/..%2f..%2foutside.txt')).status,403);
  assert.equal((await request(port,'/%E0%A4%A')).status,400);
});
