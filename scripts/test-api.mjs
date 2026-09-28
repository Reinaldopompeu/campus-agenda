import assert from 'node:assert/strict';
const base='http://localhost:5173/api/state';const created={aulas:[],docentes:[],disciplinas:[],turmas:[],salas:[],semestres:[]};let passed=0;
async function post(body){const r=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,...await r.json()}}
async function save(data,status=200){const r=await post({action:'save_aula',data});assert.equal(r.status,status,JSON.stringify(r));if(status===200&&!data.id)created.aulas.push(r.id);return r}
function pass(label){passed++;console.log('PASS '+label)}
try{
for(const kind of ['docentes','disciplinas','turmas','salas','semestres']){for(let i=1;i<=4;i++){const r=await post({action:'save_entity',kind,nome:kind==='semestres'?`${2080+i}.1`:`Teste QA ${kind} ${i}`});assert.equal(r.status,200,JSON.stringify(r));created[kind].push(r.id)}}
const a={docente_id:created.docentes[0],disciplina_id:created.disciplinas[0],turma_id:created.turmas[0],sala_id:created.salas[0],semestre_id:created.semestres[0],turno:'Manhã',dia_semana:1,hora_inicio:480,hora_fim:600};const first=await save(a);pass('criação e persistência');
for(const [field,type] of [['docente_id','Docente'],['sala_id','Sala'],['turma_id','Turma']]){const candidate={...a,docente_id:created.docentes[1],turma_id:created.turmas[1],sala_id:created.salas[1],hora_inicio:540,hora_fim:660,[field]:a[field]};const r=await save(candidate,409);assert.deepEqual(r.conflicts[0].tipos,[type]);pass(`conflito isolado: ${type}`)}
for(const [start,end,label] of [[470,520,'parcial à esquerda'],[550,650,'parcial à direita'],[500,550,'contido'],[450,650,'total'],[480,600,'horários iguais']]){const r=await save({...a,hora_inicio:start,hora_fim:end},409);assert.equal(r.conflicts[0].tipos.length,3);pass(label+' e múltiplos tipos')}
await save({...a,hora_inicio:600,hora_fim:660});await save({...a,hora_inicio:420,hora_fim:480});pass('horários consecutivos dos dois lados');
await save({...a,dia_semana:2});pass('dia diferente');await save({...a,semestre_id:created.semestres[1]});pass('semestre diferente');
await save({...a,id:first.id});pass('edição ignora próprio registro');
await save({...a,id:first.id,hora_fim:630},409);let current=await (await fetch(base)).json();assert.equal(current.aulas.find(x=>x.id===first.id).hora_fim,600);pass('edição conflitante preserva original');
await save({...a,docente_id:created.docentes[1],sala_id:created.salas[1],turma_id:created.turmas[1]});pass('recursos diferentes no mesmo horário');
const multi={...a,dia_semana:3};await save(multi);await save({...multi,docente_id:created.docentes[1],sala_id:created.salas[1],turma_id:created.turmas[1]});await save({...multi,docente_id:created.docentes[2],sala_id:created.salas[2],turma_id:created.turmas[2]});const mr=await save({...multi,sala_id:created.salas[1],turma_id:created.turmas[2]},409);assert.equal(mr.conflicts.length,3);pass('três conflitos em três aulas diferentes');
await save({...a,dia_semana:6,hora_inicio:450,hora_fim:550});pass('sábado e horários fracionados');
await save({...a,dia_semana:0},400);await save({...a,hora_inicio:600,hora_fim:500},400);await save({...a,hora_inicio:400},400);await save({...a,docente_id:999999},400);pass('validação de campos, limites e referências');
const race={...a,dia_semana:5};const both=await Promise.all([post({action:'save_aula',data:race}),post({action:'save_aula',data:race})]);assert.deepEqual(both.map(r=>r.status).sort(),[200,409]);created.aulas.push(both.find(r=>r.status===200).id);pass('concorrência: somente uma gravação aceita');
const blocked=await post({action:'delete_entity',kind:'docentes',id:a.docente_id});assert.equal(blocked.status,409);pass('cadastro vinculado não pode ser excluído');
await post({action:'delete_aula',id:first.id});await save(a);pass('exclusão libera horário');
const badOrigin=await fetch(base,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://outro-site.test'},body:JSON.stringify({action:'save_aula',data:a})});assert.equal(badOrigin.status,403);pass('proteção de origem');
console.log(`RESULTADO: ${passed} testes passaram.`);
}finally{for(const id of created.aulas)await post({action:'delete_aula',id});for(const kind of ['docentes','disciplinas','turmas','salas','semestres'])for(const id of created[kind])await post({action:'delete_entity',kind,id});console.log('Dados de teste removidos.');}
