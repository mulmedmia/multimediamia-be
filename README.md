# multimedia-backend

Backend API KSM Multimedia
Repositori ini berisi API backend untuk aplikasi KSM Multimedia, yang mengelola blog, autentikasi pengguna dengan verifikasi OTP, dan unggahan gambar.

Persyaratan
Node.js (v18 atau lebih baru)
PostgreSQL
npm atau yarn
Instalasi
Ikuti langkah-langkah berikut untuk menyiapkan proyek di komputer lokal Anda:

1. Clone repositori

2. Instal dependensi
   npm install
   # atau jika Anda menggunakan yarn
   yarn install
   
3. Pengaturan Lingkungan
   Buat file .env di direktori root

4. Pengaturan Database
   Siapkan database menggunakan Prisma:
   # Generate Prisma client
   npx prisma generate
   # Buat database dan jalankan migrasi
   npx prisma migrate dev --name init
   
6. Menjalankan Aplikasi
   Mode pengembangan
   npm run dev
   # atau
   yarn dev
   
   Mode produksi
   npm start
   # atau
   yarn start

Endpoint API

Autentikasi
POST /api/v1/auth/request-otp - Meminta OTP untuk pendaftaran
POST /api/v1/auth/register - Mendaftarkan pengguna baru dengan verifikasi OTP
POST /api/v1/auth/login - Login dengan email dan password

Blog
GET /api/v1/blogs - Mendapatkan semua blog (dengan opsi filter)
GET /api/v1/blogs/:id - Mendapatkan blog tertentu
POST /api/v1/blogs - Membuat blog baru
PUT /api/v1/blogs/:id - Memperbarui blog yang ada
DELETE /api/v1/blogs/:id - Menghapus blog
POST /api/v1/blogs/upload-thumbnail - Mengunggah thumbnail blog
