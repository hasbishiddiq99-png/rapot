# Rapor Digital Santri — Panduan Online & Login

## Apa yang berubah dari file HTML lama Anda

File `aplikasi-rapor-pesantren.html` versi lama menyimpan data pakai
`window.storage` — API ini **hanya ada di dalam Claude Artifacts**, tidak
ada sama sekali kalau file itu dibuka sebagai website biasa (misalnya lewat
hosting sendiri). Ini penyebab bug "nilai santri tidak tersimpan": tombol
"Simpan Data Semester" tetap menampilkan toast sukses, padahal panggilan
penyimpanannya gagal total dan tidak pernah benar-benar tertangkap.

Yang saya lakukan:
1. **Backend nyata** (`server.js`, Express) yang menyimpan data ke database
   Postgres (Neon) sungguhan lewat `/api/data/:key`.
2. **Halaman login** — sebelum bisa memakai aplikasi, staf harus login
   dengan username & password. Sesi disimpan sebagai token (30 hari).
3. **Frontend** (`public/index.html`) diubah supaya semua pemanggilan
   `window.storage` diganti fetch ke API di atas, dan **setiap tombol
   simpan sekarang menangkap error** — kalau penyimpanan gagal (misal
   internet putus), muncul pesan jelas dan data lama di-rollback, bukan
   diam-diam "sukses" padahal tidak tersimpan.

Struktur folder:
```
rapor-pesantren/
├── server.js              # backend Express + API
├── package.json
├── .env.example            # contoh variabel environment
├── public/index.html       # aplikasi (frontend) — sudah ada halaman login
├── sql/schema.sql          # skema tabel database
└── scripts/create-admin.js # bikin akun login
```

---

## Cara membuat aplikasi ini online (bisa diakses semua orang)

Gambar yang Anda kirim adalah dashboard **Neon** (database Postgres). Anda
sudah punya project bernama "Coba Rapor 1" di sana — kita pakai itu untuk
database-nya. Untuk menjalankan server (backend + tampilan web), kita pakai
layanan hosting seperti **Railway** (gratis untuk mulai, paling mudah).

### Langkah 1 — Ambil connection string dari Neon
1. Buka dashboard Neon Anda (sesuai gambar), project **Coba Rapor 1**.
2. Klik tombol **Connect** (kanan atas).
3. Salin **Connection string**-nya (bentuknya seperti
   `postgresql://user:pass@ep-xxxx.aws.neon.tech/neondb?sslmode=require`).

### Langkah 2 — Buat tabel database
1. Di Neon, buka menu **SQL Editor** (di sidebar).
2. Tempel seluruh isi file `sql/schema.sql`, lalu jalankan (Run).
   Ini membuat tabel `users` (akun login) dan `app_data` (data santri/nilai).

### Langkah 3 — Upload project ini ke GitHub
1. Buat repository baru di GitHub, misalnya `rapor-pesantren`.
2. Upload semua file dalam folder `rapor-pesantren/` (lewat web GitHub —
   "Add file → Upload files" — atau `git push` kalau Anda terbiasa pakai git).
   **Jangan upload file `.env`** kalau nanti Anda membuatnya — cukup
   `.env.example` yang sudah ada.

### Langkah 4 — Deploy ke Railway
1. Buka https://railway.app, daftar/masuk (bisa pakai akun GitHub).
2. Klik **New Project → Deploy from GitHub repo**, pilih repo
   `rapor-pesantren` yang tadi diupload.
3. Setelah project dibuat, buka tab **Variables**, tambahkan:
   - `DATABASE_URL` = connection string dari Neon (Langkah 1)
   - `JWT_SECRET` = teks acak panjang (boleh isi bebas, misalnya
     `p3santr3n-rahasia-2026-xyz123` — makin acak makin aman)
4. Railway otomatis menjalankan `npm install` lalu `npm start`. Tunggu
   sampai status "Deployed" / hijau.
5. Buka tab **Settings → Networking**, klik **Generate Domain**. Anda akan
   dapat URL publik, misalnya `https://rapor-pesantren-production.up.railway.app`
   — **inilah alamat yang bisa dibuka semua orang**.

> Alternatif selain Railway: **Render.com** (mirip caranya — "New Web
> Service" dari repo GitHub, isi env var yang sama, build command
> `npm install`, start command `npm start`).

### Langkah 5 — Buat akun login pertama
Akun login dibuat lewat baris perintah, bukan lewat website (supaya orang
sembarangan tidak bisa daftar sendiri). Cara termudah pakai komputer Anda:

1. Install Node.js di komputer Anda kalau belum ada (https://nodejs.org).
2. Buka folder project ini di terminal/CMD, jalankan:
   ```
   npm install
   ```
3. Buat file `.env` (salin dari `.env.example`), isi `DATABASE_URL` dengan
   connection string Neon yang sama seperti di Railway.
4. Jalankan:
   ```
   node scripts/create-admin.js admin KataSandiKuat123 "Nama Anda" admin
   ```
   Ganti `admin`, `KataSandiKuat123`, dan `"Nama Anda"` sesuai keinginan.
   Ulangi perintah ini (dengan username berbeda) untuk membuat akun staf
   lain.

### Langkah 6 — Selesai
Buka URL Railway dari Langkah 4 di browser mana pun — akan muncul halaman
login. Masukkan username & password yang dibuat di Langkah 5.

---

## Menjalankan di komputer sendiri (opsional, untuk uji coba)
```
npm install
cp .env.example .env      # lalu isi DATABASE_URL & JWT_SECRET
node scripts/create-admin.js admin sandi123456 "Admin Uji Coba" admin
npm start
```
Buka `http://localhost:3000` di browser.

---

## Catatan keamanan
- Semua data santri (nama, nilai, dsb.) dipakai bersama oleh semua akun
  yang login — cocok untuk satu unit pesantren dengan beberapa staf.
- Ganti `JWT_SECRET` dengan nilai unik milik Anda sendiri, jangan pakai
  contoh di atas.
- Kalau ada staf yang keluar/pindah, hapus akunnya langsung lewat Neon SQL
  Editor: `DELETE FROM users WHERE username = 'namauser';`
