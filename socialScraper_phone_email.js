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
 * Regex untuk menemukan pola nomor telepon umum.
 * Contoh: (021) 1234567, +62 812-345-678
 */
const PHONE_REGEX =
  /(\+?\d{2,4}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,}[\s\.\-\(\)]*\d{2,})/g;

/**
 * Regex standar untuk menemukan pola alamat email.
 * Contoh: user.name@domain.co.id
 */
const EMAIL_REGEX = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/g;

async function scrapeSocialMedia(url) {
  let browser;
  const foundUrlsMap = new Map();
  const foundPhonesSet = new Set();
  // Set baru untuk menyimpan alamat email unik
  const foundEmailsSet = new Set();

  try {
    browser = await puppeteer.launch({
      headless: true, // Mengubah ke headless: true untuk efisiensi
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

        // Cek tautan media sosial (Logika tetap sama)
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

        // Cek tautan mailto: (Tautan khusus email)
        if (normalizedHref.startsWith("mailto:")) {
          // Mengambil bagian setelah 'mailto:' dan membersihkan parameter
          const email = normalizedHref.replace("mailto:", "").split("?")[0];
          if (email.includes("@")) {
            // Memastikan ada simbol @
            foundEmailsSet.add(email);
          }
        }
      }
    }

    // 3. Memproses teks halaman untuk menemukan Nomor Telepon dan Email

    // Cari Nomor Telepon dalam teks
    let matchPhone;
    while ((matchPhone = PHONE_REGEX.exec(pageText)) !== null) {
      const cleanPhone = matchPhone[0].replace(/[\s\.\-\(\)]/g, "");
      if (cleanPhone.length >= 7) {
        foundPhonesSet.add(cleanPhone);
      }
    }

    // Cari Alamat Email dalam teks menggunakan EMAIL_REGEX
    let matchEmail;
    while ((matchEmail = EMAIL_REGEX.exec(pageText)) !== null) {
      // matchEmail[0] adalah alamat email yang ditemukan
      foundEmailsSet.add(matchEmail[0]);
    }

    // 4. Menggabungkan hasil
    const result = Object.fromEntries(foundUrlsMap);

    if (foundPhonesSet.size > 0) {
      result.telephones = Array.from(foundPhonesSet);
    }

    // Tambahkan email ke hasil JSON
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

// --- Contoh Penggunaan ---
const TARGET_URL = "https://uad.ac.id/"; // Contoh URL

scrapeSocialMedia(TARGET_URL)
  .then((jsonResult) => {
    console.log("\n--- Hasil JSON ---");
    console.log(JSON.stringify(jsonResult, null, 2));
  })
  .catch((err) => console.error(err));
