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
  
  const migrationsDir = path.resolve(__dirname, "../../drizzle");
  
  // Get all SQL files in the migrations directory, sorted alphabetically
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith(".sql"))
    .sort();
    
  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    console.log(` Applying migration: ${file}`);
    const sqlText = fs.readFileSync(filePath, "utf8");
    const statements = sqlText.split("--> statement-breakpoint");
    
    for (let statement of statements) {
      statement = statement.trim();
      if (statement) {
        await client.query(statement);
      }
    }
  }
  
  console.log(" All migrations applied successfully!");
  await client.end();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
}
