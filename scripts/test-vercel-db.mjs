import { createClient } from '@libsql/client';
import { migrate } from './migrate-turso.mjs';
import { adaptDatabase } from '../db/vercel.ts';
import assert from 'node:assert/strict';
const client = createClient({url: ':memory:'});
try {
  await migrate(client);
  await migrate(client);
  const db = adaptDatabase(client);
  for (const kind of ['docentes','disciplinas','salas','semestres']) {
    await db.prepare(`INSERT INTO ${kind}(nome,chave) VALUES(?,?)`).bind('Teste','teste').run();
  }
  const insert = 'INSERT INTO aulas(docente_id,disciplina_id,sala_id,semestre_id,turno,dia_semana,hora_inicio,hora_fim,semestre_curso) VALUES(1,1,1,1,?,1,450,500,1)';
  const row = await db.prepare(insert).bind('Manhã').run();
  assert.equal(row.meta.changes,1);
  await assert.rejects(db.prepare(insert).bind('Manhã').run(), /SCHEDULE_CONFLICT/);
  await assert.rejects(db.batch([
    db.prepare('DELETE FROM aulas'),
    db.prepare(insert).bind('Manhã'),
    db.prepare(insert).bind('Manhã'),
  ]), /SCHEDULE_CONFLICT/);
  assert.equal((await db.prepare('SELECT id FROM aulas').first()).id,row.meta.last_row_id);
  assert.equal((await db.prepare('SELECT * FROM aulas').all()).results.length,1);
  console.log('OK: migrações repetíveis, persistência, conflitos e rollback atômico.');
} finally { client.close(); }
