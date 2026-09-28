import { createClient, type Client, type InValue, type ResultSet } from '@libsql/client';

function result<T>(value: ResultSet) {
  return { results: value.rows.map(row => ({ ...row })) as T[],
    meta: { changes: value.rowsAffected, last_row_id: Number(value.lastInsertRowid ?? 0) } };
}

export class Statement {
  readonly client: Client;
  readonly sql: string;
  readonly args: InValue[];
  constructor(client: Client, sql: string, args: InValue[] = []) {
    this.client = client; this.sql = sql; this.args = args;
  }
  bind(...args: InValue[]) { return new Statement(this.client, this.sql, args); }
  async all<T = Record<string, unknown>>() {
    return result<T>(await this.client.execute({ sql: this.sql, args: this.args }));
  }
  async first<T = Record<string, unknown>>() { return (await this.all<T>()).results[0] ?? null; }
  async run() { return this.all(); }
}

export function adaptDatabase(client: Client) {
  return {
    prepare(sql: string) { return new Statement(client, sql); },
    async batch(statements: Statement[]) {
      if (!statements.length) return [];
      const values = await client.batch(statements.map(({ sql, args }) => ({ sql, args })), 'write');
      return values.map(value => result<Record<string, unknown>>(value));
    },
  };
}

let connection: ReturnType<typeof adaptDatabase> | undefined;
export function database() {
  if (!connection) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url || (process.env.VERCEL && (!authToken || !/^(libsql|https):\/\//.test(url)))) {
      throw new Error('Configure TURSO_DATABASE_URL e TURSO_AUTH_TOKEN no servidor.');
    }
    connection = adaptDatabase(createClient({ url, authToken }));
  }
  return connection;
}
