import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=join(import.meta.dirname,'..'),out=join(root,'dist');
await mkdir(out,{recursive:true});
for(const path of ['index.html','manifest.json','sw.js','js','css','icons'])await cp(join(root,path),join(out,path),{recursive:true});
for(const script of ['generate-config.js','mangle-names.js','minify.js']){
  const result=spawnSync(process.execPath,[join(root,'scripts',script)],{cwd:out,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
