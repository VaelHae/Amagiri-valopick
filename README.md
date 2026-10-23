# VALORANT MapDraft Tournament System
Tanpa dependency (hanya Node.js 16+). State disimpan di `data/state.json` dan disinkronkan via Server-Sent Events.

## Menjalankan (Windows)
1. Install Node.js LTS dari https://nodejs.org
2. Ekstrak ZIP, buka Command Prompt di folder ini, lalu: `node server.js` (atau `npm start`; port lain: `set PORT=4000 && node server.js`)
3. Ban & Pick: http://localhost:3000/ban-map/
   Gacha (Pure Gacha / Tournament Gacha): http://localhost:3000/select-map/
   (kedua halaman berbagi satu match aktif; halaman yang tidak sesuai mode hanya menampilkan status)
4. OBS: Browser Source, URL `http://localhost:3000/overlay/`, ukuran 1920x1080. Untuk background transparan: `http://localhost:3000/overlay/?transparent=1`

## Mode & urutan default
- Pure Gacha: N kali gacha.
- Ban & Pick: BO1 = ban bergantian sampai sisa 1 (decider). BO3+ = A ban, B ban, pick bergantian (N-1), sisa ban bergantian sampai 1 map, decider otomatis. Ini default saya, BUKAN aturan resmi; edit di kolom "Urutan veto" (token: `A:ban,B:ban,A:pick,B:pick,gacha,decider`).
- Tournament Gacha: tiap tim ban 1 map dari pool (jika pool >= N+2), lalu semua map ditentukan gacha beranimasi.
## Gambar map
Gambar diambil dari valorant-api.com (butuh internet). Untuk lokal, isi `image` di `maps.json` (mis. `assets/maps/ascent.jpg`). Jika gagal, tampil gradient + nama map. Daftar map pool di `maps.json`; status aktif kompetitif tidak diverifikasi — atur sendiri lewat checkbox.

## Penyimpanan MongoDB (opsional)
Tanpa konfigurasi, data disimpan di `data/state.json`. Untuk memakai MongoDB: jalankan `npm install` sekali, lalu set variabel lingkungan:
- `MONGODB_URI` : connection string (mis. dari MongoDB Atlas). Wajib untuk mengaktifkan MongoDB.
- `MONGODB_DB`  : nama database (opsional, default `mapdraft`).
Windows (CMD): `set MONGODB_URI=mongodb+srv://user:pass@cluster/... && node server.js`
Data disimpan di koleksi `state` (satu dokumen berisi match aktif + riwayat), dimuat ulang saat server start.
Atlas: izinkan IP server Anda di Network Access (di Railway IP-nya dinamis, jadi biasanya perlu 0.0.0.0/0 — gunakan user dengan password kuat).
## Deploy ke Railway
Deploy repo ini, start command `node server.js`, tambah variabel `MONGODB_URI`. Port dibaca dari `PORT`. Controller belum punya password: siapa pun yang tahu URL-nya bisa mengubah match.
