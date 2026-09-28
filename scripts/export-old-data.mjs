import { DatabaseSync } from 'node:sqlite';
import {writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
const [source,destination]=process.argv.slice(2);
if(!source||!destination)throw Error('Uso: node scripts/export-old-data.mjs caminho.sqlite backup.json');
const db=new DatabaseSync(source,{readOnly:true});
try{
  const data={};
  for(const kind of ['docentes','disciplinas','turmas','salas','semestres','aulas'])data[kind]=db.prepare(`SELECT * FROM ${kind}`).all();
  await mkdir(path.dirname(path.resolve(destination)),{recursive:true});
  await writeFile(destination,JSON.stringify({format:'campus-local',version:1,exportedAt:new Date().toISOString(),data},null,2),{flag:'wx'});
  console.log(`Backup criado: ${data.aulas.length} horários. Usuários e sessões não foram exportados.`);
}finally{db.close();}
