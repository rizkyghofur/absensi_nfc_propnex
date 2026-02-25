# PropNex NFC Attendance System 💳🚀

Aplikasi desktop modern yang dirancang untuk mempermudah proses absensi dan verifikasi agen menggunakan teknologi NFC (**Near Field Communication**) dan alat pembaca **ACR122U**.

## ✨ Fitur Utama

- **Cek Kartu NFC**: Membaca data UID dan NDEF (vCard, Text, URL) secara real-time.
- **VCard Parser**: Otomatis mengekstrak Nama, Organisasi, No HP, dan Email dari kartu agen.
- **Mode Presensi**: Terintegrasi dengan sistem poin PropNex untuk absensi event secara cepat.
- **Pencarian Agen**: Filter nama agen di daftar kehadiran secara real-time.
- **Sorting Terbaru**: Daftar kehadiran otomatis menampilkan agen yang baru melakukan tap di urutan teratas.
- **VO Point Display**: Menampilkan perolehan poin langsung di daftar kehadiran.
- **Multi-Platform**: Mendukung macOS dan Windows (Installer DMG & EXE).

## 🖥 Kebutuhan Sistem

- **Hardware**: Alat NFC Reader **ACR122U** (USB).
- **OS**:
  - Windows 10/11
  - macOS High Sierra ke atas

## 📥 Link Driver Resmi (Penting)

Alat pembaca NFC membutuhkan driver yang tepat agar dapat dikenali oleh aplikasi:

- **Windows**: [Download ACS Unified Driver MSI](https://www.acs.com.hk/en/driver/3/acr122u-usb-nfc-reader/) (Pilih _MSI Installer for PC/SC Driver_).
- **macOS**: Biasanya tidak memerlukan driver tambahan (**Plug & Play**). Jika tidak terbaca, pastikan tool `pcscd` aktif.

## 🚀 Cara Menjalankan (Development)

Jika ingin menjalankan aplikasi dari source code:

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
# Untuk macOS
npm run build:mac

# Untuk Windows
npm run build:win
```

_Catatan: File installer akan muncul di folder `/dist`._

## 📖 Cara Penggunaan

1. **Hubungkan alat ACR122U** ke port USB. Pastikan indikator lampu menyala.
2. **Pilih Tab**:
   - **Cek Kartu**: Untuk melihat detail teknis isi kartu.
   - **Presensi**: Pilih **Event** terlebih dahulu di dropdown atas.
3. **Tap Kartu**: Tempelkan kartu agen ke reader.
4. **Konfirmasi**: Lihat status di layar ("Terkonfirmasi") dan daftar nama yang muncul di sebelah kiri.

---

© 2026 PropNex NFC Attendance System. All Rights Reserved.
