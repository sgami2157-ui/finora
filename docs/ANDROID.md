# FINORA sebagai aplikasi Android (.apk)

Pendekatan: **PWA + pembungkus Capacitor**. Aplikasi Android memuat web FINORA dari URL produksi (Vercel), sehingga
pembaruan web otomatis terbawa tanpa memasang ulang APK. Data tetap di Supabase dengan RLS; tidak ada rahasia di APK.

## Yang sudah ada di repo
- PWA: `public/manifest.webmanifest`, ikon (`icon-192/512`, maskable, apple-touch), `sw.js` (hanya halaman offline; **data keuangan tidak di-cache**), `offline.html`.
- Pembungkus: `mobile/` (Capacitor 6, `capacitor.config.json` mengarah ke URL produksi).
- Workflow: `.github/workflows/android-apk.yml` membangun APK di GitHub Actions (tanpa perlu Android Studio).

## Cara mendapat APK (paling mudah)
1. Di GitHub: tab **Actions → Build Android APK → Run workflow** (URL bawaan = produksi).
2. Setelah selesai, unduh artefak **finora-apk** → `app-debug.apk` → pasang di HP (izinkan "instal dari sumber tak dikenal").
   APK debug cocok untuk uji coba/internal, bukan untuk Play Store.

## APK rilis bertanda tangan / Play Store
1. Buat keystore sekali (simpan aman, jangan hilang): `keytool -genkeypair -v -keystore release.keystore -alias finora -keyalg RSA -keysize 2048 -validity 10000`
2. Tambahkan GitHub Secrets: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 release.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`.
3. Jalankan workflow lagi → artefak berisi `finora-release.apk`.
4. Play Store menuntut AAB dan akun developer (biaya sekali bayar); aplikasi pembungkus murni dapat ditolak bila tidak memberi nilai lebih dari situs. Alternatif: Trusted Web Activity (Bubblewrap) dengan `assetlinks.json`.

## Build lokal (opsional)
```
cd mobile && npm install && npx cap add android && npx capacitor-assets generate --android && npx cap sync android
cd android && ./gradlew assembleDebug   # butuh JDK 17 + Android SDK
```

## Status verifikasi
Manifest/ikon/service worker disiapkan, tetapi build APK **belum dijalankan** (lingkungan ini tanpa jaringan/Android SDK).
Jalankan workflow di atas untuk memverifikasi; bila ada langkah gagal, kirim lognya.

## Menghilangkan bilah alamat (TWA)
Bilah alamat hilang bila Digital Asset Links terverifikasi. Web menyajikan `/.well-known/assetlinks.json` dari variabel Vercel:
- `ANDROID_PACKAGE_NAME` = package name APK Anda
- `ANDROID_SHA256_FINGERPRINTS` = sidik jari SHA-256 sertifikat penandatangan (`keytool -list -v -keystore <keystore>`). Bila APK diunggah ke Play dengan Play App Signing, pakai sidik jari dari Play Console → App integrity (bukan keystore lokal).
Redeploy, cek `https://<domain>/.well-known/assetlinks.json`, lalu hapus data aplikasi/pasang ulang APK. Tanpa env ini endpoint menjawab 404.

## Notifikasi push
Web Push (VAPID) bekerja di TWA/Chrome. Isi di Vercel: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`npx web-push generate-vapid-keys`), `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Aktifkan per perangkat di Pengaturan → Notifikasi. Cron harian 08:00 WIB mengirim ringkasan piutang/utang terlambat, tagihan ≤3 hari, dan stok menipis (hanya jika ada).
