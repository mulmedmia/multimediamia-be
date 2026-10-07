# Standar Arsitektur: Solusi Universal Pagination, Safe-Limit & Dedicated SQL Statistics di MIA 2026

> **Target Pembaca**: Tech Lead, Backend & Frontend Engineer, AI Agent, QA Tester MIA 2026.  
> **Status Dokumen**: Standar Arsitektur Resmi (*Official Engineering Guidelines*).  
> **Turunan**: Hasil modifikasi, generalisasi, dan penyempurnaan dari `DOCS_SOLUSI_STATISTIK_DAN_VERIFIKASI_PENDAFTAR.md`.

---

## 1. Latar Belakang & Gejala Nyata Kasus di Lapangan

Di platform MIA 2026, telah terjadi 2 insiden nyata yang membingungkan panitia pelaksana (*Operational & Competition Team*):

### Kasus 1: Pendaftaran Peserta (`/admin/pendaftar`)
* **Gejala**: Kartu statistik menunjukkan: *Total 232*, *Terverifikasi 86*, *Menunggu Verifikasi 14*, *Pendaftar Tim 100*.
* **Kejanggalan**: $86 + 14 = 100 \neq 232$. Angka terpotong tepat di 100 karena backend memiliki batas sepihak `safeLimit = 100`, sementara frontend menghitung status menggunakan fungsi JavaScript array `.filter()` di browser.

### Kasus 2: Pengumpulan Misi Harian (`/admin/misi` & Grup WA "Competition")
* **Gejala**: 
  - Peserta di media sosial sudah mengunggah ~64 pengumpulan karya.
  - Panitia melihat di panel admin misi: *"kok baru 10 yang isi?"*.
  - Feby (Panitia) mencoba meng-ACC (menyetujui) tugas salah satu peserta: *"barusan nyoba nge acc kagak nambah datanya, masi 10 terus"*.
* **Akar Masalah**:
  1. Backend `getMissionSubmissions` default-nya hanya memberikan `limit = 10`.
  2. Frontend Admin Misi tidak menyertakan kontrol tombol **Pagination** (Prev/Next/Halaman) di tab pengumpulan peserta.
  3. Label total dihitung dari panjang array aktif browser (`Total: {submissions.length} data`), sehingga selalu mentok di angka 10.
  4. Ketika satu tugas di-ACC, slot ke-10 diisi oleh tugas berikutnya dari database, sehingga tampilan visual panitia seolah-olah "stuck" di 10 data.

---

## 2. Anatomi Masalah: Tiga Anti-Pattern Arsitektur

Berikut adalah 3 kebiasaan buruk (*anti-patterns*) yang menjadi sumber bug di atas:

```
[❌ ANTI-PATTERN]
Browser (Frontend)                Server (Backend)                   Database
       │                                 │                              │
       │─── GET /items (no limit) ──────>│                              │
       │                                 │─── SELECT * LIMIT 10 ───────>│
       │                                 │<── 10 baris data ────────────│
       │<── 10 baris data ───────────────│                              │
       │                                                                
   (Array in-memory loop)                                               
   total = list.length (10) ❌                                          
   pending = list.filter(...).length (10) ❌                            
```

### Anti-Pattern 1: Menghitung Metrik Statistik di Memori Browser (Client-side Counting)
Frontend meminta data tabel, lalu menghitung metrik agregat menggunakan:
```javascript
// ❌ SANGAT BERBAHAYA
const total = items.length;
const pending = items.filter(x => x.status === "PENDING").length;
const approved = items.filter(x => x.status === "APPROVED").length;
```
Jika backend menerapkan paginasi (misal limit 10 atau 100), browser **hanya menghitung data yang ada di halaman tersebut**, bukan seluruh data di database!

### Anti-Pattern 2: Menarik Seluruh Data Hanya untuk Kartu Statistik (Payload Waste)
Frontend meminta `limit=1000` atau `limit=500` hanya demi menampilkan 3-4 angka kecil di kartu statistik.
* Menyebabkan transfer ratusan kilobyte data JSON mentah yang tidak perlu.
* Membebani memori browser dan CPU server (banyak *JOIN table* yang berat).
* Jika pendaftar/pengumpulan melewati angka 500, batas tersebut jebol kembali (*Band-Aid Solution*).

### Anti-Pattern 3: Tabel Terpaginasi Tanpa Kontrol UI Pagination
Backend memotong data per 10 baris, tetapi tabel di Frontend tidak menyediakan kontrol tombol `Previous`, `Next`, atau pilihan `Page Size`. Pengguna terkunci selamanya di halaman 1.

---

## 3. Standar Emas Arsitektur (*Golden Standard Architecture*)

Untuk memastikan bug ini **tidak pernah terjadi lagi** di seluruh modul MIA 2026, setiap modul yang memiliki data tabel dan statistik wajib menerapkan arsitektur berikut:

```
[✅ ARSITEKTUR STANDAR INDUSTRI]

1. STATISTIK (Dedicated SQL Aggregate)
Browser (Frontend)                Server (Backend)                   PostgreSQL
       │                                 │                              │
       │─── GET /admin/.../stats ───────>│                              │
       │                                 │─── SELECT count(*) FILTER ──>│
       │                                 │<── { total: 64, pending: 54 } │
       │<── JSON Ringan (<1KB) ──────────│                              │
   (Langsung bind ke Stat Cards)

2. DAFTAR DATA (Server-Side Paginated Table)
Browser (Frontend)                Server (Backend)                   PostgreSQL
       │                                 │                              │
       │─── GET /items?page=1&limit=25 ─>│                              │
       │                                 │─── SELECT * LIMIT 25 OFFSET 0│
       │<── { data: [...], meta } ───────│                              │
   (Bind ke Table + Pagination Controls Prev/Next)
```

---

## 4. Blueprint Standar Implementasi Modul

### A. Pola Backend (PostgreSQL + Drizzle ORM)

#### 1. Aturan Query Statistik: Gunakan `count(*) FILTER (...)`
Semua kartu statistik wajib dihitung langsung oleh database menggunakan SQL Conditional Aggregates.

```javascript
// Standar fungsi Service Statistik
export const getModuleStats = async (filters = {}) => {
  const { category_id } = filters;
  const conditions = [];

  if (category_id && category_id !== "ALL") {
    conditions.push(eq(schema.MyTable.category_id, category_id));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [stats] = await db
    .select({
      total: sql`count(*)::int`,
      pending: sql`count(*) FILTER (WHERE ${schema.MyTable.status} = 'PENDING')::int`,
      approved: sql`count(*) FILTER (WHERE ${schema.MyTable.status} = 'APPROVED')::int`,
      rejected: sql`count(*) FILTER (WHERE ${schema.MyTable.status} = 'REJECTED')::int`,
    })
    .from(schema.MyTable)
    .where(whereClause);

  return {
    total: Number(stats?.total || 0),
    pending: Number(stats?.pending || 0),
    approved: Number(stats?.approved || 0),
    rejected: Number(stats?.rejected || 0),
  };
};
```

#### 2. Aturan Query List: Standarisasi `safePage` & `safeLimit`
Semua fungsi list wajib mengembalikan objek `meta` lengkap dan melindungi server dari DoS:

```javascript
// Standar fungsi Service List
export const getAllModuleItems = async (filters = {}) => {
  const safePage = Math.max(1, parseInt(filters.page, 10) || 1);
  // Default 25 atau 50 jika tidak disertakan, batas maksimal keamanan 500
  const safeLimit = Math.min(500, Math.max(1, parseInt(filters.limit, 10) || 25));
  const skip = (safePage - 1) * safeLimit;

  // ... penyusunan conditions ...

  const [rows, [countResult]] = await Promise.all([
    db.select(...).from(...).where(whereClause).limit(safeLimit).offset(skip),
    db.select({ count: sql`count(*)::int` }).from(...).where(whereClause)
  ]);

  const total = Number(countResult?.count || 0);

  return {
    items: rows,
    meta: {
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};
```

#### 3. Aturan Urutan Route di Express (`Router`)
> ⚠️ **KRUSIAL**: Route `/stats` **WAJIB** didefinisikan sebelum route dengan wildcard `/:id`.
```javascript
// ✅ BENAR:
router.get("/stats", authenticateToken, isAdmin, getStatsController);
router.get("/", authenticateToken, getListController);
router.get("/:id", authenticateToken, getDetailController);

// ❌ SALAH (Express akan menganggap "stats" adalah parameter id):
router.get("/:id", ...);
router.get("/stats", ...);
```

---

### B. Pola Frontend (Next.js + TanStack React Query)

#### 1. Pisahkan Pemanggilan Query Statistik dan List
```javascript
// 1. Query khusus untuk Statistik (Super cepat, di-refresh saat mutasi review/ACC)
const { data: statsData, refetch: refetchStats } = useQuery({
  queryKey: ["module-stats", categoryFilter],
  queryFn: () => getModuleStats({ category_id: categoryFilter }),
});

// 2. Query khusus untuk Tabel Data (Membawa state page dan limit)
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(25);

const { data: tableData, isLoading } = useQuery({
  queryKey: ["module-list", categoryFilter, statusFilter, search, currentPage, pageSize],
  queryFn: () => getModuleList({
    category_id: categoryFilter,
    status: statusFilter,
    search,
    page: currentPage,
    limit: pageSize,
  }),
});
```

#### 2. Aturan Rendering Label Total di UI
```jsx
{/* ❌ JANGAN PERNAH gunakan array.length untuk data terpaginasi: */}
<span>Total: {items.length} data</span>

{/* ✅ GUNAKAN total riil dari database (meta.total): */}
<span>Total: {tableData?.meta?.total ?? 0} data</span>
```

#### 3. Komponen Navigasi Pagination Standar UI
Di bawah tabel data, **wajib** ada komponen pagination:
```jsx
<div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
  <div className="text-xs text-muted-foreground">
    Menampilkan {tableData?.items?.length ? (currentPage - 1) * pageSize + 1 : 0} -{" "}
    {Math.min(currentPage * pageSize, tableData?.meta?.total ?? 0)} dari{" "}
    <b className="text-foreground">{tableData?.meta?.total ?? 0}</b> data
  </div>

  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage <= 1}
      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      className="h-8 text-xs"
    >
      Sebelumnya
    </Button>
    <span className="text-xs font-medium">
      Halaman {currentPage} dari {tableData?.meta?.totalPages || 1}
    </span>
    <Button
      variant="outline"
      size="sm"
      disabled={currentPage >= (tableData?.meta?.totalPages || 1)}
      onClick={() => setCurrentPage((prev) => prev + 1)}
      className="h-8 text-xs"
    >
      Berikutnya
    </Button>
  </div>
</div>
```

---

## 5. Matriks Audit Modul MIA 2026 & Status Penerapan

| Modul | Lokasi File | Gejala Lama | Solusi yang Diterapkan | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pendaftaran Peserta** | `src/services/registration.service.js`<br>`admin/pendaftar/page.jsx` | Angka 86 + 14 = 100 vs Total 232 | Ditambahkan `GET /registrations/stats` (Postgres Conditional Filter) & Paginasi server | **SUDAH DITERAPKAN (RESOLVED)** |
| **Misi Harian (Admin)** | `src/services/mission.service.js`<br>`admin/misi/page.jsx` | 64 orang isi misi, hanya tampil 10 di tabel. Di-ACC tetap 10 data. | Terapkan `GET /admin/missions/stats`, default safeLimit 50/100, dan pasang kontrol Pagination di UI. | **SIAP DITERAPKAN (URGENT)** |
| **Pengumpulan Karya** | `src/services/submission.service.js`<br>`admin/pengumpulan/page.jsx` | BE membatasi `Math.min(100, ...)`. Jika karya > 100, data hilang dari dashboard. | Terapkan `GET /admin/submissions/stats` dan pagination penuh. | **RECOMMENDED** |
| **Galeri Karya Publik** | `show-it/page.jsx` | Galeri Show It memanggil karya tanpa paginasi (hanya 10 karya yang tampil). | Tambahkan pagination atau *infinite scroll* dengan page & limit. | **RECOMMENDED** |
| **Redeem Merchandise** | `src/services/product.service.js`<br>`admin/manage-redeem/page.jsx` | `getAllProducts` default limit 10. | Tambahkan safeLimit 50 dan pagination. | **RECOMMENDED** |
| **Referral Panitia** | `src/services/referral.service.js` | Sudah memakai SQL Aggregate `groupBy(status)`. | Tidak ada masalah, sudah berstandar industri. | **SUDAH BAIK** |

---

## 6. Panduan Tindakan Khusus: Kasus Pengumpulan Misi Hari Ini

Untuk segera menuntaskan keluhan di WhatsApp grup (Feby & tim Competition):

1. **Backend (`multimediamia-be`)**:
   - Tambahkan fungsi `getAdminMissionStats` di [`mission.service.js`](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-be/src/services/mission.service.js).
   - Naikkan default limit pada `getMissionSubmissions` dari `10` menjadi `safeLimit: 50` (atau `100`).
   - Daftarkan endpoint `GET /admin/missions/stats` di [`admin-mission.routes.js`](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-be/src/routes/admin-mission.routes.js).

2. **Frontend (`multimediamia-fe`)**:
   - Di [`AdminMisiPage`](file:///c:/Users/liaur/Koding/MIA2026Repair/multimediamia-fe/src/app/admin/misi/page.jsx), ganti badge `{pendingCount} Pending` agar membaca data dari stats backend riil.
   - Ganti teks `{submissions.length}` menjadi `{submissionsData?.meta?.total ?? 0}` agar langsung terbaca **64 data**.
   - Pasang state `currentPage` dan kontrol tombol *Previous / Next* di bawah tabel pengumpulan.
