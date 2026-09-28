import { createClient } from '@libsql/client';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export async function migrate(client) {
  await client.execute('CREATE TABLE IF NOT EXISTS campus_migrations (name TEXT PRIMARY KEY)');
  const directory = new URL('../drizzle/', import.meta.url);
  for (const name of (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort()) {
    const tx = await client.transaction('write');
    try {
      const done = await tx.execute({ sql: 'SELECT name FROM campus_migrations WHERE name=?', args: [name] });
      if (!done.rows.length) {
        await tx.executeMultiple(await readFile(new URL(name, directory), 'utf8'));
        await tx.execute({ sql: 'INSERT INTO campus_migrations(name) VALUES(?)', args: [name] });
      }
      await tx.commit();
    } catch (error) { await tx.rollback(); throw error; }
    finally { tx.close(); }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.TURSO_DATABASE_URL) throw new Error('Defina TURSO_DATABASE_URL e TURSO_AUTH_TOKEN.');
  const client = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});
  try { await migrate(client); console.log('Banco preparado.'); } finally { client.close(); }
}
