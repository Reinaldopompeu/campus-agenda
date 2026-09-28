import {readFile,mkdir,writeFile} from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {indexedDB,IDBObjectStore} from 'fake-indexeddb';
const output=new URL('../outputs/local-tests/',import.meta.url);
await mkdir(output,{recursive:true});
for(const name of ['schedule','periods','local-model','local-store']){
  const source=await readFile(new URL(`../lib/${name}.ts`,import.meta.url),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace(/from ['"]\.\/(schedule|periods|local-model)['"]/g,(_,name)=>`from './${name}.mjs'`);
  await writeFile(new URL(`${name}.mjs`,output),js);
}
globalThis.indexedDB=indexedDB;
const session=new Map();
globalThis.sessionStorage={getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,value),removeItem:key=>session.delete(key)};
const {localRequest:request,exportLocalBackup,importLocalBackup}=await import(new URL('local-store.mjs',output));
const post=(body,path='/api/state')=>request(path,{method:'POST',body:JSON.stringify(body)});
assert.equal((await request('/api/state')).status,401);
assert.equal((await post({action:'setup',username:'testadmin',password:'test-password-only'},'/api/auth')).status,200);
const add=async(kind,nome,extra={})=>{const r=await post({action:'save_entity',kind,nome,...extra});assert.equal(r.status,200,await r.clone().text());return (await r.json()).id;};
const docente=await add('docentes','Professor A');
const docente2=await add('docentes','Professor B');
const disciplina=await add('disciplinas','Disciplina', {codigo:'C01',carga_horaria:60});
const sala=await add('salas','Sala A'),sala2=await add('salas','Sala B');
const semestre=await add('semestres','2026.2');
const weekly={disciplina_id:disciplina,semestre_id:semestre,semestre_curso:1,turma_id:null,slots:[{docente_id:docente,sala_id:sala,turno:'Manhã',dia_semana:1,hora_inicio:450,hora_fim:660}]};
assert.equal((await post({action:'save_weekly',data:weekly})).status,200);
assert.equal((await post({action:'save_weekly',data:{...weekly,slots:[{...weekly.slots[0],docente_id:docente2,sala_id:sala2}]}})).status,200);
const before=await exportLocalBackup();
assert.equal(before.data.aulas.length,2);
assert.ok(!JSON.stringify(before).includes('testadmin'));
assert.ok(!JSON.stringify(before).includes('test-password-only'));
// Conflict during replacement leaves the previous full distribution untouched.
assert.equal((await post({action:'save_weekly',data:{...weekly,slots:[{...weekly.slots[0],sala_id:sala2}]}})).status,409);
assert.deepEqual((await exportLocalBackup()).data,before.data);
assert.equal((await post({action:'save_weekly',data:{...weekly,slots:[{...weekly.slots[0],hora_fim:550}]}})).status,400);
assert.equal((await post({action:'delete_entity',kind:'docentes',id:docente})).status,400);
// Concurrent tabs do not replace one another's changes.
await Promise.all([add('salas','Concurrent A'),add('salas','Concurrent B')]);
assert.equal((await exportLocalBackup()).data.salas.length,4);
await assert.rejects(importLocalBackup({...before,version:2}));
const corrupt=structuredClone(before);corrupt.data.aulas[0].sala_id=99999;
await assert.rejects(importLocalBackup(corrupt));
assert.equal((await exportLocalBackup()).data.salas.length,4);
await importLocalBackup(before);
assert.deepEqual((await exportLocalBackup()).data,before.data);
// Storage failures must never produce a successful save or discard previous data.
const put=IDBObjectStore.prototype.put;
IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError');};
assert.equal((await post({action:'save_entity',kind:'salas',nome:'Must not save'})).status,503);
IDBObjectStore.prototype.put=put;
assert.deepEqual((await exportLocalBackup()).data,before.data);
// New module/tab reads persisted IndexedDB, but requires its own local login.
const fresh=await import(new URL('local-store.mjs?reload',output));
session.clear();
assert.equal((await fresh.localRequest('/api/state')).status,401);
assert.equal((await post({action:'login',username:'testadmin',password:'wrong'},'/api/auth')).status,401);
assert.equal((await post({action:'login',username:'testadmin',password:'test-password-only'},'/api/auth')).status,200);
assert.deepEqual((await fresh.exportLocalBackup()).data,before.data);
await post({action:'logout'},'/api/auth');
assert.equal((await request('/api/state')).status,401);
console.log('OK: login local, recarga, CRUD, 4 aulas/60h, conflitos, concorrência, quota, backup e restauração.');
