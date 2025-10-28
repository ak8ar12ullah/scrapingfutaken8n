const puppeteer = require("puppeteer");

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
 * Menggunakan ekspresi reguler untuk menemukan pola nomor telepon umum
 * dalam teks. Ini mencakup format seperti:
 * (021) 1234567, +62 812-345-678, 0812345678, dll.
 * Ini adalah regex yang cukup kuat namun tidak terlalu ketat agar fleksibel.
 * \+? = opsional tanda plus
 * \d{2,4} = 2-4 digit (untuk kode negara/area)
 * [\s\.\-\(\)]* = opsional pemisah (spasi, titik, dash, kurung)
 * \d{2,} = minimal 2 digit
 */
const PHONE_REGEX =
  /(\+?\d{2,4}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,})/g;

async function scrapeSocialMedia(url) {
  let browser;
  // Map untuk menyimpan tautan media sosial
  const foundUrlsMap = new Map();
  // Set untuk menyimpan nomor telepon unik
  const foundPhonesSet = new Set();

  try {
    browser = await puppeteer.launch({
      headless: true, // Mengubah ke headless: true untuk efisiensi
      slowMo: 100, // Mengurangi slowMo
      ignoreHTTPSErrors: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-extensions",
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`Mengunjungi: ${url}`);

    // Pergi ke URL dan tunggu hingga jaringan tidak aktif
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });

    // 1. Mengekstrak semua teks dan tautan (href) dari halaman
    const { allHrefs, pageText } = await page.evaluate(() => {
      // Ambil semua href
      const links = Array.from(document.querySelectorAll("a"));
      const allHrefs = links.map((a) => a.href);

      // Ambil semua teks dari body, menghapus script/style untuk teks yang lebih bersih
      const body = document.body.cloneNode(true);
      Array.from(
        body.querySelectorAll("script, style, noscript, svg, button")
      ).forEach((el) => el.remove());
      const pageText = body.innerText;

      return { allHrefs, pageText };
    });

    // 2. Memproses dan memfilter tautan (Media Sosial dan Tautan Telepon)
    for (const href of allHrefs) {
      if (href && typeof href === "string") {
        const normalizedHref = href.toLowerCase();

        // Cek tautan media sosial
        for (const [name, domain] of Object.entries(SOCIAL_DOMAINS)) {
          if (normalizedHref.includes(domain)) {
            // Hanya simpan yang pertama, kecuali Linktree
            if (!foundUrlsMap.has(name) || name === "linktree") {
              foundUrlsMap.set(name, normalizedHref);
              break;
            }
          }
        }

        // Cek tautan tel:
        if (normalizedHref.startsWith("tel:")) {
          // Menghapus 'tel:' dan karakter non-digit/plus
          const cleanPhone = normalizedHref
            .replace("tel:", "")
            .replace(/[^0-9+]/g, "");
          if (cleanPhone.length >= 7) {
            // Minimal 7 digit untuk dianggap nomor telepon valid
            foundPhonesSet.add(cleanPhone);
          }
        }
      }
    }

    // 3. Memproses teks halaman untuk menemukan nomor telepon
    let match;
    while ((match = PHONE_REGEX.exec(pageText)) !== null) {
      // Menghapus pemisah (spasi, dash, kurung) untuk normalisasi
      const cleanPhone = match[0].replace(/[\s\.\-\(\)]/g, "");
      if (cleanPhone.length >= 7) {
        foundPhonesSet.add(cleanPhone);
      }
    }

    // Menggabungkan hasil
    const result = Object.fromEntries(foundUrlsMap);
    if (foundPhonesSet.size > 0) {
      result.telephones = Array.from(foundPhonesSet);
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

// --- Contoh Penggunaan ---
const TARGET_URL = "https://uad.ac.id/"; // Contoh URL

scrapeSocialMedia(TARGET_URL)
  .then((jsonResult) => {
    console.log("\n--- Hasil JSON ---");
    console.log(JSON.stringify(jsonResult, null, 2));
  })
  .catch((err) => console.error(err));
