# Dokumentasi Teknis: Migrasi Database & Skrip SQL Role Finance (IMPROVE-04)

> **Modul**: Finance Role & Payment Verification  
> **Target Lingkungan**: Staging, Production, Local Development  
> **Status di Database**: **SUDAH DITERAPKAN (VERIFIED & ACTIVE)**  
> **File Migrasi Drizzle**: `drizzle/0023_add_finance_role_and_verification.sql`

---

## 1. Status Eksekusi Terkini

Berdasarkan pemeriksaan langsung pada database PostgreSQL (`neondb`), seluruh skrip SQL migrasi Finance **sudah berhasil dieksekusi dan aktif**:

- ✅ **Enum `Role`**: Telah memiliki nilai `'FINANCE'` (bersama `USER`, `ADMIN`, `JURI`).
- ✅ **Kolom Baru di Tabel `Registration`**:
  - `is_verified_finance` (`boolean`, default `false`, `NOT NULL`)
  - `verified_finance_at` (`timestamp`, nullable)
  - `verified_finance_by` (`text`, Foreign Key merujuk ke `"User"("users_id")`)
  - `finance_notes` (`text`, nullable)
- ✅ **Indeks Database**: `idx_registration_is_verified_finance` telah dibuat untuk optimasi performa filtering data pendaftar oleh tim Finance.

---

## 2. Skrip Raw SQL (Untuk Eksekusi Manual / Database Client)

Jika tim DBA atau DevOps ingin mengeksekusi ulang secara manual di database staging/production terpisah (misalnya via pgAdmin, DBeaver, Neon Console, atau `psql`), gunakan skrip idempotensial (*aman dijalankan berulang kali*) berikut:

```sql
-- =========================================================================
-- MIGRASI 0023: PENAMBAHAN ROLE FINANCE DAN KOLOM VERIFIKASI PEMBAYARAN
-- =========================================================================

-- 1. Tambahkan nilai 'FINANCE' ke dalam enum Role (Idempotent)
DO $$ BEGIN
  ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FINANCE';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Tambahkan kolom status verifikasi pembayaran oleh Finance
ALTER TABLE "Registration" 
  ADD COLUMN IF NOT EXISTS "is_verified_finance" boolean DEFAULT false NOT NULL;

-- 3. Tambahkan kolom waktu verifikasi pembayaran
ALTER TABLE "Registration" 
  ADD COLUMN IF NOT EXISTS "verified_finance_at" timestamp;

-- 4. Tambahkan kolom pencatat admin/finance yang memverifikasi (Foreign Key ke User)
DO $$ BEGIN
  ALTER TABLE "Registration" 
    ADD COLUMN IF NOT EXISTS "verified_finance_by" text REFERENCES "User"("users_id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- 5. Tambahkan kolom catatan pembayaran dari tim Finance
ALTER TABLE "Registration" 
  ADD COLUMN IF NOT EXISTS "finance_notes" text;

-- 6. Buat indeks untuk mempercepat query dashboard Finance
CREATE INDEX IF NOT EXISTS "idx_registration_is_verified_finance" 
  ON "Registration" ("is_verified_finance");
```

---

## 3. Skrip Verifikasi Database

Untuk memverifikasi apakah kolom dan enum sudah terpasang dengan benar di PostgreSQL:

```sql
-- Cek enum Role
SELECT enumlabel 
FROM pg_enum 
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
WHERE pg_type.typname = 'Role';
-- Output yang diharapkan: USER, ADMIN, JURI, FINANCE

-- Cek kolom baru pada tabel Registration
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Registration' 
  AND column_name IN ('is_verified_finance', 'verified_finance_at', 'verified_finance_by', 'finance_notes');

-- Cek indeks
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'Registration' 
  AND indexname = 'idx_registration_is_verified_finance';
```

---

## 4. Cara Membuat Akun Tim Finance (Custom Email & Password)

Tersedia 3 metode fleksibel untuk membuat atau mengubah akun tim Finance sesuai kebutuhan Anda:

### 🟢 Metode 1: Menggunakan Perintah CLI Langsung (Paling Praktis)
Anda dapat langsung menentukan email, password, dan nama melalui argumen baris perintah di terminal backend:

```bash
# Format: node src/db/seed-finance.js <EMAIL> <PASSWORD> "<NAMA>"

# Contoh:
node src/db/seed-finance.js finance.official@mia2026.com PasswordKuat123# "Bendahara MIA 2026"
```
*Jika akun dengan email tersebut belum ada, akun baru akan dibuat.*  
*Jika email sudah terdaftar, password dan nama akun tersebut akan diperbarui secara otomatis.*

---

### 🟡 Metode 2: Menggunakan Konfigurasi `.env`
Tambahkan konfigurasi variabel lingkungan berikut ke dalam file `.env` di backend:

```env
# Konfigurasi Akun Finance Custom
FINANCE_NAME="Finance Team MIA 2026"
FINANCE_EMAIL="finance.mia2026@gmail.com"
FINANCE_PASSWORD="PasswordCustomAnda123"
```

Lalu jalankan salah satu perintah berikut:
```bash
# Menjalankan khusus seed finance saja:
npm run seed:finance

# Atau menjalankan seed menyeluruh (admin, finance & kategori):
npm run seed
```

---

### 🔵 Metode 3: Skrip Raw SQL Langsung (Via Neon Console / pgAdmin / DBeaver)
Jika Anda ingin menyuntikkan akun langsung melalui antarmuka query database tanpa menyentuh terminal backend:

```sql
-- Ganti email, nama, dan hash password sesuai kebutuhan.
-- Catatan: Password wajib di-hash menggunakan algoritma bcrypt (10 rounds).
-- Contoh di bawah ini password-nya adalah: Finance123
INSERT INTO "User" (
  "users_id",
  "name",
  "email",
  "password",
  "role",
  "is_verified",
  "created_at",
  "updated_at"
) VALUES (
  'fin_' || substr(md5(random()::text), 1, 16),
  'Petugas Finance MIA 2026',
  'finance.custom@mia2026.com',
  '$2b$10$tZ2cK.M8Vb1QnJ3Tz8HhSe0eQ1N9z1j.0oH9d7B4q1w4sY1c7E.iG', -- Hash dari 'Finance123'
  'FINANCE',
  true,
  NOW(),
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "name" = EXCLUDED."name",
  "password" = EXCLUDED."password",
  "role" = 'FINANCE',
  "is_verified" = true,
  "updated_at" = NOW();
```

---

## 5. Skrip Rollback (Hanya Jika Terpaksa Dibatalkan)

> ⚠️ **PERINGATAN**: Jangan jalankan skrip ini jika sudah ada data transaksi riil yang diverifikasi oleh tim Finance.

```sql
-- Hapus indeks
DROP INDEX IF EXISTS "idx_registration_is_verified_finance";

-- Hapus kolom-kolom Finance
ALTER TABLE "Registration" 
  DROP COLUMN IF EXISTS "finance_notes",
  DROP COLUMN IF EXISTS "verified_finance_by",
  DROP COLUMN IF EXISTS "verified_finance_at",
  DROP COLUMN IF EXISTS "is_verified_finance";

-- Catatan: PostgreSQL tidak mendukung DROP VALUE dari ENUM secara langsung tanpa me-recreate tipe enum.
```
