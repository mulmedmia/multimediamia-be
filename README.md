# 📦 multimedia-backend

**Backend API untuk Aplikasi KSM Multimedia**
Repositori ini berisi backend API untuk mengelola fitur blog, autentikasi pengguna dengan verifikasi OTP, dan unggahan gambar.

## 🔧 Persyaratan

* Node.js v18 atau lebih baru
* PostgreSQL
* npm atau yarn

---

## 🚀 Instalasi

Ikuti langkah-langkah berikut untuk menyiapkan proyek di komputer lokal Anda:

### 1. Clone Repositori

```bash
git clone https://github.com/KSMMultimedia/multimedia-backend.git
cd multimedia-backend
```

### 2. Instal Dependensi

```bash
npm install
# atau jika menggunakan yarn
yarn install
```

### 3. Pengaturan Lingkungan

Buat file `.env` di direktori root, lalu isi dengan konfigurasi lingkungan yang sesuai.

### 4. Pengaturan Database

Siapkan database dengan Prisma:

```bash
# Generate Prisma client
npx prisma generate

# Buat database dan jalankan migrasi awal
npx prisma migrate dev --name init
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

## 🧑‍💻 Kontribusi
   Team Pengembang
