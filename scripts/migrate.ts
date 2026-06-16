import { Client } from 'pg'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL manquant dans .env.local')
  console.error('   → Supabase Dashboard → Settings → Database → Connection string → URI')
  process.exit(1)
}

const MIGRATIONS_DIR = join(process.cwd(), 'supabase/migrations')

async function run() {
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅  Connecté à Supabase')

  // Table de suivi des migrations
  await client.query(`
    create table if not exists _migrations (
      filename text primary key,
      applied_at timestamptz default now()
    )
  `)

  const { rows: applied } = await client.query('select filename from _migrations')
  const appliedSet = new Set(applied.map((r: { filename: string }) => r.filename))

  const migrations = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let ran = 0
  for (const filename of migrations) {
    if (appliedSet.has(filename)) {
      console.log(`⏭️   ${filename} (déjà appliquée)`)
      continue
    }

    const sql = readFileSync(join(MIGRATIONS_DIR, filename), 'utf8')
    await client.query(sql)
    await client.query('insert into _migrations (filename) values ($1)', [filename])
    console.log(`✅  ${filename}`)
    ran++
  }

  if (ran === 0) {
    console.log('✨  Aucune nouvelle migration à appliquer')
  } else {
    console.log(`\n🚀  ${ran} migration(s) appliquée(s)`)
  }

  await client.end()
}

run().catch((err) => {
  console.error('❌  Erreur migration :', err.message)
  process.exit(1)
})
