// scraper.js

import browserWeb from "./browserWeb.js";

// 1. Ubah require() menjadi import

// 3. Fungsi Utama
export async function scrapeSocialMedia(url) {
  // 2. Variabel dan Konstanta
  const SOCIAL_DOMAINS = {
    instagram: "instagram.com",
    facebook: "facebook.com",
    "x (twitter)": "twitter.com",
    "x (twitter) / x.com": "x.com",
    tiktok: "tiktok.com",
    linkedin: "linkedin.com",
    linktree: "linktr.ee",
  };

  /**
   * Regex String untuk menemukan pola nomor telepon Indonesia yang valid.
   * Pola gabungan: Nomor padat (+62/08/02xx) ATAU Nomor terformat fleksibel.
   */
  const PHONE_REGEX_STRING =
    // Pola 1: Nomor Seluler Padat (+62 atau 08), wajib 9-14 digit total. Paling aman dari pola tanggal.
    "\\b(\\+?62|08)\\d{8,12}\\b" +
    "|" + // ATAU
    // Pola 2: Nomor Lokal Padat (Area Kode 02xx), wajib 9-11 digit total.
    "\\b02\\d{7,9}\\b" +
    "|" + // ATAU
    // Pola 3: Nomor Terformat (Fleksibel dengan Spasi/Hyphen/Titik).
    "\\b(\\+?\\d{1,4}[\\s\\.\\-]?\\d{2,4}[\\s\\.\\-]?\\d{3,4}[\\s\\.\\-]?\\d{3,4})\\b";

  // Definisikan PHONE_REGEX sebagai objek RegExp global
  const PHONE_REGEX = new RegExp(PHONE_REGEX_STRING, "g");

  /**
   * Regex standar untuk menemukan pola alamat email.
   * Contoh: user.name@domain.co.id
   */
  const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;

  const foundUrlsMap = new Map();
  const foundPhonesSet = new Set();
  const foundEmailsSet = new Set();

  const page = await browserWeb.newPage();

  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);

    // --- Tambahkan Listener Intersepsi ---
    page.on("request", (request) => {
      const blockedResources = ["image", "stylesheet", "font", "media"];

      if (blockedResources.includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    console.log(`Mengunjungi: ${url}`);
    let response;
    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    for (let i = 0; i < 3; i++) {
      console.log(`Percobaan ke-${i + 1} untuk mengakses URL: ${url}`);

      try {
        // Coba navigasi ke URL dengan timeout 60 detik
        response = await page.goto(url, {
          waitUntil: "networkidle2",
          // timeout: 60000,
        });

        // Cek kode status HTTP jika respons diterima
        console.log(response.status());

        if (response && response.status() === 200) {
          console.log("✅ Berhasil: Halaman dimuat dengan status 200.");
          break; // Keluar dari loop jika berhasil
        } else {
          const status = response ? response.status() : "N/A";
          console.warn(
            `❌ Gagal: Status HTTP non-200 (${status}). Mencoba lagi...`
          );
        }
      } catch (error) {
        await delay(1500);

        console.error(
          `❌ Gagal: Terjadi error atau timeout. Mencoba lagi. Error: ${error.message}`
        );
      }

      // Hanya jeda jika ini BUKAN percobaan terakhir
      if (i < 3 - 1) {
        await delay(1500);
      } else if (!response || response.status() !== 200) {
        // Jika loop selesai dan masih gagal, tampilkan pesan kegagalan akhir
        throw new Error(`Gagal memuat halaman`);
      }
    }

    // 1. Mengekstrak semua teks dan tautan (href) dari halaman
    const { allHrefs, pageText } = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const allHrefs = links.map((a) => a.href);

      const body = document.body.cloneNode(true);
      // Hapus elemen yang tidak perlu untuk teks yang lebih bersih
      Array.from(
        body.querySelectorAll("script, style, noscript, svg, button")
      ).forEach((el) => el.remove());
      const pageText = body.innerText;

      return { allHrefs, pageText };
    });

    // 2. Memproses dan memfilter tautan (Media Sosial, Telepon, dan Email 'mailto:')
    for (const href of allHrefs) {
      if (href && typeof href === "string") {
        const normalizedHref = href.toLowerCase();

        // Cek tautan media sosial
        for (const [name, domain] of Object.entries(SOCIAL_DOMAINS)) {
          if (normalizedHref.includes(domain)) {
            if (!foundUrlsMap.has(name) || name === "linktree") {
              foundUrlsMap.set(name, normalizedHref);
              break;
            }
          }
        }

        // Cek tautan tel: (Logika ini sudah benar)
        if (normalizedHref.startsWith("tel:")) {
          const cleanPhone = normalizedHref
            .replace("tel:", "")
            .replace(/[^0-9+]/g, "");
          if (cleanPhone.length >= 7) {
            foundPhonesSet.add(cleanPhone);
          }
        }

        // Cek tautan mailto:
        if (normalizedHref.startsWith("mailto:")) {
          const email = normalizedHref.replace("mailto:", "").split("?")[0];
          if (email.includes("@")) {
            foundEmailsSet.add(email);
          }
        }
      }
    }

    // 3. Memproses teks halaman untuk menemukan Nomor Telepon dan Email

    // Cari Nomor Telepon dalam teks
    let matchPhone;

    // Kloning objek Regex karena .exec() memodifikasi lastIndex
    const phoneRegexClone = new RegExp(PHONE_REGEX);
    phoneRegexClone.lastIndex = 0;

    while ((matchPhone = phoneRegexClone.exec(pageText)) !== null) {
      const rawPhone = matchPhone[0];

      // Hapus semua pemisah dari hasil pencocokan
      const cleanPhone = rawPhone.replace(/[\s\.\-\(\)]/g, "");

      // *** FILTER PENGECUALIAN KRITIS (Mengatasi pola tanggal) ***
      // Jika string angka dimulai dengan tahun yang dicurigai (2025) atau pola ID ganjil (5620/1220),
      // kita anggap itu BUKAN nomor telepon.
      if (
        cleanPhone.startsWith("2025") ||
        cleanPhone.startsWith("5620") ||
        cleanPhone.startsWith("1220") ||
        cleanPhone.startsWith("1300")
      ) {
        continue; // Lewati angka ini
      }

      if (cleanPhone.length >= 7) {
        foundPhonesSet.add(cleanPhone);
      }
    }

    // Cari Alamat Email dalam teks
    let matchEmail;
    // Kloning objek Regex
    const emailRegexClone = new RegExp(EMAIL_REGEX);
    emailRegexClone.lastIndex = 0;

    while ((matchEmail = emailRegexClone.exec(pageText)) !== null) {
      foundEmailsSet.add(matchEmail[0]);
    }

    // 4. Menggabungkan hasil
    const result = Object.fromEntries(foundUrlsMap);

    if (foundPhonesSet.size > 0) {
      result.telephones = Array.from(foundPhonesSet);
    }

    if (foundEmailsSet.size > 0) {
      result.emails = Array.from(foundEmailsSet);
    }

    return result;
  } catch (error) {
    throw new Error("Scraping gagal:", error.message);
    return {};
  } finally {
    if (page) {
      await page.close();
    }
  }
}

// // 4. Contoh Penggunaan (Tanpa Perubahan)
// // const TARGET_URL = "https://uad.ac.id/"; // Contoh URL

// // scrapeSocialMedia(TARGET_URL)
// //   .then((jsonResult) => {
// //     console.log("\n--- Hasil JSON ---");
// //     console.log(JSON.stringify(jsonResult, null, 2));
// //   })
// //   .catch((err) => console.error(err));
