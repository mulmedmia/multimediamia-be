import fs from "fs";
import path from "path";
import pkg from "pg";
const { Client } = pkg;
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function backupDatabase() {
  console.log(" Initiating database backup...");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is missing.");
  }

  const isProduction = process.env.NODE_ENV === "production";
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL?.includes("sslmode=require") || isProduction
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();

  try {
    // 1. Ambil seluruh nama tabel publik (kecuali tabel internal migrasi)
    const tableRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tableRes.rows
      .map((r) => r.table_name)
      .filter((name) => !name.startsWith("__"));

    console.log(` Found ${tables.length} tables to backup: ${tables.join(", ")}`);

    const backupPayload = {
      meta: {
        createdAt: new Date().toISOString(),
        database: "PostgreSQL (Neon Serverless)",
        totalTables: tables.length,
      },
      tables: {},
    };

    let totalRows = 0;

    // 2. Ekstrak data setiap tabel
    for (const tableName of tables) {
      const dataRes = await client.query(`SELECT * FROM "${tableName}";`);
      backupPayload.tables[tableName] = {
        rowCount: dataRes.rows.length,
        rows: dataRes.rows,
      };
      totalRows += dataRes.rows.length;
      console.log(`  - Table "${tableName}": ${dataRes.rows.length} rows exported.`);
    }

    backupPayload.meta.totalRows = totalRows;

    // 3. Simpan ke direktori backups/
    const backupsDir = path.resolve(__dirname, "../../backups");
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    const now = new Date();
    const timestampStr = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `backup_${timestampStr}.json`;
    const targetPath = path.join(backupsDir, fileName);

    fs.writeFileSync(targetPath, JSON.stringify(backupPayload, null, 2), "utf8");

    console.log(`\n Database backup completed successfully!`);
    console.log(` File saved: backups/${fileName}`);
    console.log(` Total rows exported: ${totalRows}`);

    return targetPath;
  } finally {
    await client.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  backupDatabase().catch((err) => {
    console.error("❌ Database backup failed:", err);
    process.exit(1);
  });
}
