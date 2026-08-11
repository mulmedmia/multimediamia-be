# 📦 multimedia-backend.

**Backend APIs untuk Aplikasi KSM Multimedia**
Repositori ini berisi backend API untuk mengelola fitur blog, autentikasi pengguna dengan verifikasi OTP, dan unggahan gambar.

## 🔧 Persyaratan

- Node.js v18 atau lebih baru
- PostgreSQL
- npm atau yarn

---

## 🚀 Instalasi

Ikuti langkah-langkah berikut untuk menyiapkan proyek di komputer lokal Anda:

### 1. Clone Repositori

```bash
git clone https://github.com/mulmedmia/multimediamia-be.git
cd multimediamia-be
```

### 2. Instal Dependensi

```bash
npm install
# atau jika menggunakan yarn
yarn install
```

### 3. Pengaturan Lingkungan (Environment Variables)

Salin file `env.example` menjadi `.env`:

```bash
cp env.example .env
```

Isi variabel di file `.env` sesuai dengan konfigurasi lokal Anda:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/mia_db
PORT=5000
JWT_SECRET=supersecretkey_mia2026
JWT_EXPIRATION=1d

# ImageKit (Opsional untuk upload gambar)
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=your_url_endpoint

# Email SMTP Configuration (Opsional untuk OTP)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Admin Initial Seed
ADMIN_NAME=Admin MIA
ADMIN_EMAIL=admin@mia.com
ADMIN_PASSWORD=admin123456
```

### 4. Pengaturan Database (Drizzle ORM & PostgreSQL)

Pastikan service **PostgreSQL** sudah berjalan dan database (misal: `mia_db`) sudah dibuat.

Jalankan perintah berikut untuk menyinkronkan struktur tabel dan mengisi data awal (seeding):

```bash
# Push skema Drizzle ke database
npm run db:push

# (Opsional) Jalankan migrasi SQL jika ada perubahan skema lanjutan
npm run db:migrate

# Jalankan seeder untuk membuat akun Admin utama
npm run seed
```

---

## 🏁 Menjalankan Aplikasi

### Mode Pengembangan

```bash
npm run dev
# atau
yarn dev
```

### Mode Produksi

```bash
npm start
# atau
yarn start
```

---

## 📡 Endpoint API

### 🔐 Autentikasi

| Method | Endpoint                   | Deskripsi                             |
| ------ | -------------------------- | ------------------------------------- |
| POST   | `/api/v1/auth/request-otp` | Meminta OTP untuk pendaftaran         |
| POST   | `/api/v1/auth/register`    | Mendaftarkan pengguna baru dengan OTP |
| POST   | `/api/v1/auth/login`       | Login dengan email dan password       |

---

### 📝 Blog

| Method | Endpoint                         | Deskripsi                              |
| ------ | -------------------------------- | -------------------------------------- |
| GET    | `/api/v1/blogs`                  | Mendapatkan semua blog (dengan filter) |
| GET    | `/api/v1/blogs/:id`              | Mendapatkan detail blog tertentu       |
| POST   | `/api/v1/blogs`                  | Membuat blog baru                      |
| PUT    | `/api/v1/blogs/:id`              | Memperbarui blog yang ada              |
| DELETE | `/api/v1/blogs/:id`              | Menghapus blog                         |
| POST   | `/api/v1/blogs/upload-thumbnail` | Mengunggah thumbnail untuk blog        |

---

## 🌿 Git & GitHub Workflow

1. **Branch Strategy**: Gunakan branch `dev` untuk pengujian dan branch `feature/nama-fitur` untuk pengerjaan fitur baru.
2. **Commit Standard**: Gunakan prefix `feat:`, `fix:`, `docs:`, `style:`.
3. **Pull Request**: Buat PR dari `feature/nama-fitur` ke `dev` atau `main` dan minta code review dari anggota tim sebelum merge.

---

## 🧑‍💻 Kontribusi

Tim Pengembang Multimedia In Action (MIA 2026)
