// 这个 CockroachDB 数据库是跟别的项目共用的，所以不用 `prisma migrate`（它会对整个库做 drift
// 检测，遇到不认识的表会要求 reset）。这里自己维护一张 payrank_schema_migrations 表，
// 按文件名顺序把 migrations/*.sql 里没跑过的应用一遍，只碰 payrank_ 前缀的表。
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'migrations');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 没设置');
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS payrank_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows: appliedRows } = await client.query('SELECT name FROM payrank_schema_migrations');
  const applied = new Set(appliedRows.map((r) => r.name));

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    console.log(`应用迁移: ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO payrank_schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  console.log('迁移完成');
} finally {
  await client.end();
}
