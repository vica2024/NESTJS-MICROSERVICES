// 本地铺测试数据用，跑 seed.sql 里现成的 INSERT（内容是标准 SQL，Postgres/CockroachDB 兼容）
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL 没设置');
  process.exit(1);
}

const sql = readFileSync(join(root, 'seed.sql'), 'utf8');
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query(sql);
  console.log('seed 完成');
} finally {
  await client.end();
}
