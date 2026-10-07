# Dokumentasi Teknis: Analisis Akar Masalah & Solusi Standar Industri untuk Statistik & Verifikasi Pendaftaran

> **Target Pembaca**: AI Agent, Software Engineer, Tech Lead, dan Tim Pengembang MIA 2026.  
> **Tujuan Dokumen**: Menyediakan panduan arsitektur lengkap, alasan teknis (*rationale*), mitigasi keamanan, dan panduan kode langkah-demi-langkah (*step-by-step*) untuk menyelesaikan inkonsistensi statistik pendaftaran secara permanen di branch `dev`.

---

## 1. Ringkasan Eksekutif & Konteks Masalah

### 1.1 Gejala Masalah di Production (Sebelum Hotfix)
Pada panel admin **Kelola Pendaftaran Peserta** (`/admin/pendaftar`), terdapat 4 kartu statistik di bagian atas layar:
* **Total Pendaftar**: Menampilkan angka database asli (misal: **232**).
* **Terverifikasi**: Menampilkan angka **86**.
* **Menunggu Verifikasi**: Menampilkan angka **14**.
* **Pendaftar Tim**: Menampilkan angka **100**.

### 1.2 Kejanggalan Matematis
$$86 \text{ (Terverifikasi)} + 14 \text{ (Menunggu Verifikasi)} = 100 \neq 232 \text{ (Total)}$$
Secara matematis, angka ini **tidak sinkron**. Selain itu, kartu *Pendaftar Tim* tepat bernilai **100**.

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

Masalah ini bersumber dari **perbedaan cara perhitungan antara angka Total dan angka Status**:

### A. Di Frontend (`multimediamia-fe/src/app/admin/pendaftar/page.jsx`)
Sebelumnya, FE memanggil data untuk statistik dengan parameter `limit: 1000`:
```javascript
const { data: statsData } = useQuery({
  queryKey: ["admin-registrations-overall-stats"],
  queryFn: () => getAllRegistrations({ page: 1, limit: 1000 }), // Berharap mendapatkan 1000 data
});
```
Lalu FE menghitung angka status menggunakan JavaScript `.filter()` di memori browser:
```javascript
const total = statsData?.meta?.total ?? totalItems; // Diambil dari count(*) DB (232) -> BENAR
const verified = allList.filter((r) => r.is_verified).length; // Dihitung dari array yang diterima
const notVerified = allList.filter((r) => !r.is_verified).length; // Dihitung dari array yang diterima
const team = allList.filter((r) => !!r.team_name).length; // Dihitung dari array yang diterima
```

### B. Di Backend (`multimediamia-be/src/services/registration.service.js`)
Backend memiliki batas keamanan (*hard-cap limit*) di baris 14:
```javascript
const safeLimit = Math.min(100, Math.max(1, parseInt(filters.limit, 10) || 10));
```
Meskipun FE meminta `limit: 1000`, Backend memotongnya secara sepihak menjadi maksimal **100 baris**.

### Kesimpulan Akar Masalah:
* Backend hanya mengembalikan **100 pendaftar terbaru** (diurutkan `created_at DESC`).
* Dari 100 data tersebut, kebetulan **86 sudah diverifikasi** dan **14 belum diverifikasi** (86 + 14 = 100).
* Sisa **132 pendaftar lama sama sekali tidak ikut dihitung** oleh FE.
* Seluruh 100 data teratas kebetulan berupa tim, sehingga kartu *Pendaftar Tim* mentok di angka **100**.

---

## 3. Analisis Kritis Hotfix Terkini di Branch `dev` (Commit PR #41 & #88)

Tim sempat melakukan *hotfix* cepat dengan menaikkan limit dari `100` ke `500`:
* Di BE (`registration.service.js`): Diubah menjadi `Math.min(500, ...)`.
* Di FE (`admin/pendaftar/page.jsx`): Diubah menjadi `limit: 500`.

### Mengapa Solusi "Limit 500" Ini Bersifat "Plester Sementara" (*Band-Aid*)?

1. **Bug Akan Pecah Kembali Saat Data > 500**:
   Jika pendaftar mencapai **501**, data ke-501 akan dibuang oleh limit. Angka terverifikasi dan belum verifikasi akan kembali mentok di penjumlahan 500, sementara Total akan menampilkan 501.
2. **Pemborosan Bandwidth & Memori Server/Client (*Performance Anti-Pattern*)**:
   Hanya untuk menampilkan 3 angka kecil di kartu, server harus melakukan *query* dengan 4 *left-joins* (`User`, `Category`, `creatorUser`, `updaterUser`), men-serialize **500 objek JSON besar** (~300 KB – 800 KB), mengirimnya lewat internet, lalu browser klien harus me-loop array ratusan data tersebut.
3. **Export Excel Masih Rawan Terpotong**:
   Di fungsi `handleExportExcel` ([page.jsx:187](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-fe/src/app/admin/pendaftar/page.jsx#L187)), FE meminta `limit: 1000`. Jika peserta mencapai 600, 100 peserta lainnya akan hilang dari file Excel karena dipotong oleh batas 500 di backend.
4. **Halaman Lain Masih Mengalami Bug Serupa**:
   - `admin/pengumpulan/page.jsx` (Pengumpulan Karya): BE masih dibatasi `Math.min(100, ...)`.
   - `show-it/page.jsx` (Galeri Publik): Tidak memiliki pagination, default BE hanya 10 karya.
   - `admin/misi/page.jsx` (Review Misi Harian): Tabel pengumpulan peserta default hanya 10 tanpa pagination UI.

---

## 4. Solusi Standar Industri: Dedicated Database Aggregate Endpoint

Solusi yang benar dan berstandar *production-grade* adalah **menghitung statistik langsung di database PostgreSQL** menggunakan agregasi kondisional (*Conditional Aggregates*).

### 4.1 Query SQL Agregasi Native
```sql
SELECT 
  count(*)::int AS total,
  count(*) FILTER (WHERE is_verified = true)::int AS verified,
  count(*) FILTER (WHERE is_verified = false)::int AS not_verified,
  count(*) FILTER (WHERE team_name IS NOT NULL AND TRIM(team_name) != '')::int AS team
FROM "Registration"
WHERE (category_id = $1 OR $1 IS NULL);
```

### 4.2 Bukti Implementasi Serupa di Codebase Ini Sendiri
Pola ini **bukan hal asing** di proyek ini. Tim pengembang sudah menggunakannya secara sukses di fitur Referral:
* Lihat **[referral.service.js:327](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-be/src/services/referral.service.js#L327)**:
  ```javascript
  db.select({
    status: schema.ReferralLog.status,
    count: count(),
  })
  .from(schema.ReferralLog)
  .groupBy(schema.ReferralLog.status);
  ```
  Di fitur Referral, admin tidak pernah mengalami masalah data terpotong karena statistik dihitung langsung oleh database.

### 4.3 Analisis Keamanan & Potensi Risiko
* **Apakah Rentan SQL Injection?**
  **TIDAK (Zero Risk)**. Seluruh klausul `FILTER (...)` bersifat statis. Parameter `category_id` dimasukkan melalui operator `eq()` Drizzle ORM yang otomatis di-compile menjadi *parameterized binding* (`$1`).
* **Apakah Data Bocor Jika Kode Terbuka?**
  **TIDAK**. File backend hanya berisi rumus logika query (*blueprint*), bukan kredensial database. Kredensial tersimpan aman di `.env` server.
* **Risiko Routing Collision di Express**:
  Route `router.get("/stats", ...)` **wajib didefinisikan sebelum** `router.get("/:id", ...)` agar Express tidak mengira string `"stats"` adalah parameter `:id`.
* **Proteksi Otorisasi**:
  Wajib dipasang middleware `authenticateToken` dan `isAdmin` agar publik/peserta tidak bisa melihat metrik internal panitia.

---

## 5. Panduan Implementasi Langkah demi Langkah (Blueprint)

### A. Backend (`multimediamia-be`)

#### 1. Tambahkan Fungsi Service di `src/services/registration.service.js`
Tambahkan fungsi berikut di bagian bawah file:
```javascript
// Get registration summary statistics (Admin only)
export const getRegistrationStats = async (filters = {}) => {
  const { category_id } = filters;
  const conditions = [];

  if (category_id && category_id !== "ALL") {
    conditions.push(eq(schema.Registration.category_id, category_id));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      total: sql`count(*)::int`,
      verified: sql`count(*) FILTER (WHERE ${schema.Registration.is_verified} = true)::int`,
      not_verified: sql`count(*) FILTER (WHERE ${schema.Registration.is_verified} = false)::int`,
      team: sql`count(*) FILTER (WHERE ${schema.Registration.team_name} IS NOT NULL AND TRIM(${schema.Registration.team_name}) != '')::int`,
    })
    .from(schema.Registration)
    .where(whereClause);

  return {
    total: Number(stats?.total || 0),
    verified: Number(stats?.verified || 0),
    notVerified: Number(stats?.not_verified || 0),
    team: Number(stats?.team || 0),
  };
};
```

#### 2. Tambahkan Controller di `src/controllers/registration.controller.js`
```javascript
import { getRegistrationStats } from "../services/registration.service.js";

// Admin only: get registration statistics summary
export const getRegistrationStatsController = async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
    };
    const stats = await getRegistrationStats(filters);
    return response.success(res, stats, "Registration statistics retrieved successfully");
  } catch (error) {
    return response.error(res, "Failed to retrieve registration statistics", 500, error.message);
  }
};
```

#### 3. Daftarkan Route di `src/routes/registration.routes.js`
> ⚠️ **PENTING**: Letakkan route `/stats` **di atas** `/:id`!

```javascript
import {
  // ... fungsi controller lainnya ...
  getRegistrationStatsController,
} from "../controllers/registration.controller.js";

// ...
router.get("/check-team-name", authenticateToken, checkTeamNameAvailabilityController);

// STATS ROUTE (Wajib sebelum /:id)
router.get("/stats", authenticateToken, isAdmin, getRegistrationStatsController);

router.get("/", authenticateToken, getRegistrations);
router.get("/:id", authenticateToken, getRegistration);
// ...
```

---

### B. Frontend (`multimediamia-fe`)

#### 4. Tambahkan Service API di `src/services/admin-pendaftar.service.js`
```javascript
// Ambil ringkasan statistik pendaftar dari backend
export const getRegistrationStats = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.category_id && params.category_id !== "ALL") {
    searchParams.append("category_id", params.category_id);
  }
  const queryString = searchParams.toString();
  const url = queryString ? `/registrations/stats?${queryString}` : `/registrations/stats`;
  const res = await api.get(url);
  return res.data.data; // { total, verified, notVerified, team }
};
```

#### 5. Tambahkan Hook & Invalidate Query di `src/hooks/admin-use-pendaftar.js`
```javascript
import {
  // ... import lainnya ...
  getRegistrationStats,
} from "@/services/admin-pendaftar.service";

// Hook untuk mengambil ringkasan statistik pendaftar
export function useAdminRegistrationStats({ category_id = "" } = {}) {
  return useQuery({
    queryKey: ["admin-registration-stats", { category_id }],
    queryFn: () => getRegistrationStats({ category_id }),
    staleTime: 1000 * 60 * 2,
  });
}

// Update hook useVerifyRegistration agar meng-invalidate cache stats
export function useVerifyRegistration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchVerifyRegistration,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-registrations"] });
      qc.invalidateQueries({ queryKey: ["admin-registration-detail"] });
      qc.invalidateQueries({ queryKey: ["admin-registration-stats"] }); // <-- TAMBAHKAN INI
      toast.success(data.message || "Verifikasi berhasil!");
    },
    // ...
  });
}
```

#### 6. Hubungkan ke Halaman `src/app/admin/pendaftar/page.jsx`
1. Ganti query lama yang boros memori:
   ```javascript
   // HAPUS ATAU GANTI INI:
   // const { data: statsData } = useQuery({ ... queryFn: () => getAllRegistrations({ page: 1, limit: 500 }) });

   // GUNAKAN HOOK STATS BARU:
   const { data: statsResponse } = useAdminRegistrationStats({
     category_id: categoryId === "ALL" ? undefined : categoryId,
   });

   const stats = useMemo(() => {
     return {
       total: statsResponse?.total ?? totalItems,
       verified: statsResponse?.verified ?? 0,
       notVerified: statsResponse?.notVerified ?? 0,
       team: statsResponse?.team ?? 0,
     };
   }, [statsResponse, totalItems]);
   ```
2. Kartu statistik di JSX akan otomatis menampilkan angka ril dari database tanpa peduli berapa ribu jumlah pendaftar.

---

## 6. Rekomendasi Tambahan untuk Skalabilitas Penuh

1. **Perbaikan Export Excel Pendaftar**:
   Di `handleExportExcel` ([page.jsx:185](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-fe/src/app/admin/pendaftar/page.jsx#L185)), jangan menarik dengan limit statis jika data melebihi limit. Lakukan perulangan per halaman (*batch paging*) atau buat dedicated export endpoint di backend (`GET /registrations/export`).
2. **Terapkan Hal Serupa pada Halaman Pengumpulan Karya (`/admin/pengumpulan`)**:
   Buat endpoint `GET /submissions/stats` untuk menghitung `APPROVED`, `PENDING`, dan `REVISION` langsung via SQL `count(*) FILTER (...)`.
3. **Tambahkan Pagination pada Galeri Show It (`/show-it`)**:
   Tambahkan state pagination (`page`, `limit: 12`) dan tombol *Load More* / *Pagination* di halaman Show It agar pengunjung festival bisa melihat seluruh karya peserta.

---

## 7. Prosedur Pengujian & Verifikasi (Testing Plan)

1. **Verifikasi Database Langsung (SQL Editor)**:
   Jalankan query di PostgreSQL console:
   ```sql
   SELECT 
     count(*) AS total,
     count(*) FILTER (WHERE is_verified) AS verified,
     count(*) FILTER (WHERE NOT is_verified) AS not_verified,
     count(*) FILTER (WHERE team_name IS NOT NULL AND TRIM(team_name) != '') AS team
   FROM "Registration";
   ```
   Pastikan: `verified + not_verified = total`.
2. **Verifikasi API Endpoint**:
   Panggil `GET /api/v1/registrations/stats` dengan header Admin JWT Token. Respon harus berstatus `200 OK` dengan payload JSON angka murni dalam waktu < 10 ms.
3. **Verifikasi Reaktivitas UI**:
   Di panel admin `/admin/pendaftar`, lakukan verifikasi terhadap salah satu tim. Pastikan angka *Terverifikasi* bertambah +1 dan *Menunggu Verifikasi* berkurang -1 secara instan tanpa perlu me-refresh halaman browser.
