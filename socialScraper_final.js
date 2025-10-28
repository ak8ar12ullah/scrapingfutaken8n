// scraper.js (atau nama file Anda)

// 1. Ubah require() menjadi import
import puppeteer from "puppeteer";

// 2. Variabel dan Konstanta (Tidak perlu diubah)
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
 * Regex untuk menemukan pola nomor telepon umum.
 * Contoh: (021) 1234567, +62 812-345-678
 */
// const PHONE_REGEX =
//   /(\+?\d{2,4}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,})/g;
// const PHONE_REGEX =
//   // Mencocokkan: +62 8xx atau 08xx atau (0274) 1234567
//   /(\+?62|0)([.\s]?)(\d{2,4})[.\s\-]?(\d{3,4})[.\s\-]?(\d{3,4})/g;

const PHONE_REGEX =
  // Pola 1: Nomor Seluler Padat (+62 atau 08)
  /\b(\+?62|08)\d{8,12}\b/g +
  "|" + // ATAU
  // Pola 2: Nomor Lokal Padat (Area Kode 02xx)
  "\\b02\\d{7,9}\\b" +
  "|" + // ATAU
  // Pola 3: Nomor Terformat
  "\\b(\\+?\\d{1,4}[\\s\\.\\-]?\\d{2,4}[\\s\\.\\-]?\\d{3,4}[\\s\\.\\-]?\\d{3,4})\\b";

/**
 * Regex standar untuk menemukan pola alamat email.
 * Contoh: user.name@domain.co.id
 */
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;

// 3. Fungsi Utama (Tidak ada perubahan signifikan, hanya penulisan)
export async function scrapeSocialMedia(url) {
  let browser;
  const foundUrlsMap = new Map();
  const foundPhonesSet = new Set();
  const foundEmailsSet = new Set();

  try {
    browser = await puppeteer.launch({
      headless: true,
      slowMo: 100,
      ignoreHTTPSErrors: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);

    // --- LANGKAH PENTING 2: Tambahkan Listener Intersepsi ---
    page.on("request", (request) => {
      // Tentukan tipe resource yang ingin Anda blokir
      const blockedResources = ["image", "stylesheet", "font", "media"];

      if (blockedResources.includes(request.resourceType())) {
        // Jika resourceType adalah salah satu yang diblokir, batalkan permintaan (abort)
        request.abort();
      } else {
        // Jika bukan resource yang diblokir, lanjutkan permintaan (continue)
        request.continue();
      }
    });

    console.log(`Mengunjungi: ${url}`);

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

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

        // Cek tautan tel:
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
    // NOTE: Perlu mendefinisikan ulang regex di setiap perulangan saat menggunakan exec()
    // untuk menghindari masalah `lastIndex` yang umum terjadi pada ES Module/Mode Strict
    const newPhoneRegex = new RegExp(PHONE_REGEX, "g");
    while ((matchPhone = newPhoneRegex.exec(pageText)) !== null) {
      const cleanPhone = matchPhone[0].replace(/[\s\.\-\(\)]/g, "");
      if (cleanPhone.length >= 7) {
        foundPhonesSet.add(cleanPhone);
      }
    }

    // Cari Alamat Email dalam teks
    let matchEmail;
    // NOTE: Sama seperti di atas, gunakan objek Regex baru
    const newEmailRegex = new RegExp(EMAIL_REGEX, "g");
    while ((matchEmail = newEmailRegex.exec(pageText)) !== null) {
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
    console.error("Scraping gagal:", error.message);
    return {};
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// // 4. Contoh Penggunaan (Tanpa Perubahan)
// const TARGET_URL = "https://uad.ac.id/"; // Contoh URL

// scrapeSocialMedia(TARGET_URL)
//   .then((jsonResult) => {
//     console.log("\n--- Hasil JSON ---");
//     console.log(JSON.stringify(jsonResult, null, 2));
//   })
//   .catch((err) => console.error(err));
