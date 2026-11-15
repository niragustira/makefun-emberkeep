# Emberkeep — Lanterns of the Last Light

Tower-defence orisinal untuk bounty best-game-01. Semua seni digambar dari kode
(canvas 2D), semua suara disintesis live (WebAudio), tanpa aset eksternal dan
tanpa network request.

## Konsep

Malam turun di Emberkeep. Kawanan shadow wisp berjalan di jalan batu menuju
Keep, satu-satunya lentera yang masih menyala. Pemain membangun menara lentera
di lingkaran batu di tepi jalan, memakai ember yang dijatuhkan wisp yang
dibasmi, dan harus menahan cahaya sampai 10 wave. Di wave 10 datang Gloomlord,
bos terakhir.

## Kontrol

- Mouse: klik lingkaran batu untuk membangun, klik menara untuk upgrade/jual,
  klik tombol di HUD dan toko.
- `1` / `2` / `3`: pilih Spark Lantern / Ember Mortar / Frost Brazier
  (saat lingkaran dipilih, langsung membangun).
- `Space`: mulai wave berikutnya. `P`: pause. `F`: kecepatan 1x/2x.
- `M`: bisu. `R`: restart (di layar akhir). `Esc`: tutup panel. `Enter`: mulai
  dari layar judul.

## Menara

- Spark Lantern (◆60): tembakan cepat, damage kecil, jangkauan sedang.
- Ember Mortar (◆110): peluru lambat, damage besar + splash.
- Frost Brazier (◆80): damage kecil + memperlambat musuh 45-65%.
- Tiap menara 3 level, upgrade ◆50-150, jual kembali 70% dari total yang
  diinvestasikan.

## Musuh

- Wisp: cepat, HP kecil. Mote: kecil, bergerombol. Shade: lambat, HP besar,
  bocor 2 light. Wraith (wave 4+): sangat cepat. Gilded Wisp (wave 3+):
  cepat, HP kecil, hadiah ◆25. Gloomlord (wave 10): bos, HP besar, bocor
  5 light.

## Aturan menang / kalah

- Menang: bersihkan wave 10 (Gloomlord dibasmi). Bintang: 3 bila light ≥ 15,
  2 bila ≥ 8, 1 bila di bawah itu. Bonus skor +50 per light tersisa.
- Kalah: light mencapai 0 (tiap musuh yang sampai ke Keep mengurangi light
  sesuai nilainya). Skor terbaik tersimpan di localStorage.
- Ekonomi: kill memberi ember + skor, tiap wave yang bersih memberi bonus
  ◆25 + 5×wave dan skor 100×wave.

## Struktur kode (game/src)

- `config.js`: semua angka penyeimbang (biaya, damage, path, pad).
- `random.js`: RNG seeded (mulberry32) + pickWeighted/shuffle.
- `audio.js`: synth WebAudio, no-op tanpa gesture/konteks.
- `path.js`: panjang jalan, titik pada jarak tertentu, jarak ke jalan.
- `enemies.js`: data + gerak musuh, chill.
- `towers.js`: data + targeting + proyektil.
- `waves.js`: komposisi tiap wave, skala HP.
- `world.js`: semua aturan (state machine, ekonomi, menang/kalah).
- `render.js`: semua gambar + daftar area klik.
- `input.js`: mouse + keyboard.
- `shots.js`: adegan deterministik `?shot=start|play|victory|defeat&seed=1`.
- `main.js`: bootstrap, fixed step 60 Hz, mode shot.

## Cara uji

- Sim headless (tanpa browser): `node /tmp/emberkeep-sim.mjs` — menjalankan
  World asli dengan autopilot, melaporkan hasil tiap adegan dan rencana
  kuat/lemah. Hasil saat ini: rencana kuat menang 3 bintang (light 20, 0
  bocor), satu menara kalah di wave 3, tanpa menara kalah di wave 3.
- Main di browser: `node serve.ts`, buka http://localhost:8080.
- Screenshot: `shots.json` memetakan 4 file ke `?shot=...`; adegan memakai
  `window.__shotReady`.
- Entry: `MAKEFUN_OUTPUT_DIR=out node main.ts` (dijalankan 2x, hasilnya
  byte-identik), lalu cek `out/dossier.json`.
