import fs from "fs";
import path from "path";
import pkg from "pg";
const { Client } = pkg;
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  console.log(" Running database migrations...");
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  
  // Pastikan tabel tracking migrasi ada
  await client.query(`
    CREATE TABLE IF NOT EXISTS "__applied_migrations" (
      id serial PRIMARY KEY,
      name text UNIQUE NOT NULL,
      applied_at timestamp DEFAULT now() NOT NULL
    );
  `);

  // Jika tabel User sudah ada dari inisialisasi awal, tandai 0000_neat_mandrill.sql sudah diaplikasikan
  const userTableCheck = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'User';
  `);
  if (userTableCheck.rows.length > 0) {
    await client.query(`
      INSERT INTO "__applied_migrations" (name) 
      VALUES ('0000_neat_mandrill.sql') 
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  // Ambil daftar migrasi yang sudah pernah dijalankan
  const appliedRes = await client.query(`SELECT name FROM "__applied_migrations";`);
  const appliedFiles = new Set(appliedRes.rows.map(r => r.name));

  const migrationsDir = path.resolve(__dirname, "../../drizzle");
  
  // Get all SQL files in the migrations directory, sorted alphabetically
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith(".sql"))
    .sort();
    
  for (const file of files) {
    if (appliedFiles.has(file)) {
      console.log(` Skipping already applied migration: ${file}`);
      continue;
    }

    console.log(` Applying migration: ${file}`);
    const sqlText = fs.readFileSync(filePath(migrationsDir, file), "utf8");
    const statements = sqlText.split("--> statement-breakpoint");
    
    for (let statement of statements) {
      statement = statement.trim();
      if (statement) {
        await client.query(statement);
      }
    }

    await client.query(`INSERT INTO "__applied_migrations" (name) VALUES ($1);`, [file]);
    console.log(` Migration ${file} applied and recorded.`);
  }
  
  console.log(" All migrations applied successfully!");
  await client.end();
}

function filePath(dir, file) {
  return path.join(dir, file);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
}
