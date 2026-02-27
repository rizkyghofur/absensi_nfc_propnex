# PropNex NFC Attendance System 💳🚀

Aplikasi desktop modern yang dirancang untuk mempermudah proses absensi dan verifikasi agen menggunakan teknologi NFC (**Near Field Communication**) dan alat pembaca **ACR122U**.

## ✨ Fitur Utama

- **Isi Kartu NFC**: Mendukung penulisan vCard, URI, dan Agent Info ke kartu NFC secara instan.
- **Smart Form**: Pengisian data otomatis (+62 No HP, "PropNex" Cabang) dan _Auto-Populate_ data dari kartu yang sedang menempel.
- **Real-time Sync**: Sinkronisasi data kartu secara otomatis di background saat berpindah tab atau setelah penulisan data.
- **Ekspor JSON Dinamis**: Nama file ekspor otomatis mengikuti Nama Agen dan Cabang (contoh: `rio_ataraska_platinum.json`).
- **Pencarian Agen**: Filter nama agen di daftar kehadiran secara real-time.
- **Sorting Terbaru**: Daftar kehadiran otomatis menampilkan agen yang baru melakukan tap di urutan teratas.
- **VO Point Display**: Menampilkan perolehan poin langsung di daftar kehadiran.
- **UI Stabil & Bersih**: Transisi antar menu tanpa kedipan (_flicker-free_) dan penyembunyian detail teknis (UID/ATR) untuk tampilan yang lebih profesional.
- **Multi-Platform**: Mendukung macOS dan Windows (Installer DMG & EXE).

## 🖥 Kebutuhan Sistem

- **Hardware**: Alat NFC Reader **ACR122U** (USB).
- **OS**:
  - Windows 10/11
  - macOS High Sierra ke atas

## 📥 Link Driver Resmi (Penting)

Alat pembaca NFC membutuhkan driver yang tepat agar dapat dikenali oleh aplikasi:

- **Windows**: [Download ACS Unified Driver](https://www.acs.com.hk/en/driver/3/acr122u-usb-nfc-reader/) (Pilih _MSI Installer for PC/SC Driver_).
- **macOS**: Biasanya tidak memerlukan driver tambahan (**Plug & Play**). Jika tidak terbaca, pastikan tool `pcscd` aktif. Namun apabila tidak terbaca, instal dahulu Homebrew.sh yang bisa diakses di [https://brew.sh/](https://brew.sh/), lalu install manual dengan perintah di terminal `brew install pcscd`, kemudian [Download ACS Unified Driver](https://www.acs.com.hk/en/driver/3/acr122u-usb-nfc-reader/) (Pilih _PC/SC Driver Installer_).

## 🚀 Cara Menjalankan (Development)

Jika ingin menjalankan aplikasi dari source code:

Install npm apabila belum terinstall di komputer anda, bisa akses dan ikuti petunjuk instalasi Node.js di [https://nodejs.org/en/download/](https://nodejs.org/en/download/).

```bash
# 1. Install dependencies
npm install

# 2. Sinkronisasi Library NFC (Native Module)
npm run rebuild

# 3. Jalankan Aplikasi
npm start
```

## 📦 Cara Membuat Installer (Production)

Untuk membuat file `.dmg` (Mac) atau `.exe` (Windows):

```bash
# Untuk macOS (wajib dijalankan di macOS)
npm run build:mac

# Untuk Windows (wajib dijalankan di Windows)
npm run build:win
```

_Catatan: File installer akan muncul di folder `/dist`._

## 📖 Cara Penggunaan

1. **Hubungkan alat ACR122U** ke port USB. Pastikan indikator lampu menyala.
2. **Pilih Tab**:
   - **Isi Kartu**: Untuk menulis data agen baru ke kartu. Gunakan fitur _Import JSON_ untuk memuat template data.
   - **Cek Kartu**: Untuk melihat detail vCard dan Agent ID yang sudah tersimpan di kartu.
   - **Presensi**: Pilih **Event** terlebih dahulu di dropdown atas sebelum melakukan tap kartu peserta.
3. **Tap Kartu**: Tempelkan kartu agen ke reader.
4. **Otomatisasi**: Data akan langsung tampil di layar. Jika di tab _Isi Kartu_, form akan terisi sendiri jika kartu lama sudah berisi data.

---

© 2026 PropNex NFC Attendance System. All Rights Reserved.
