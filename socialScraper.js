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

async function scrapeSocialMedia(url) {
  let browser;
  const foundUrlsMap = new Map();

  try {
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 1000,
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

    // *** PENAMBAHAN DELAY DI SINI ***
    const DELAY_MS = 3000; // 3 detik
    console.log(`Menunggu eksplisit selama ${DELAY_MS / 1000} detik...`);
    // await page.waitForTimeout(DELAY_MS);
    // **********************************

    // 1. Mengekstrak semua tautan (href) dari halaman
    const allHrefs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      return links.map((a) => a.href);
    });

    // 2. Memproses dan memfilter tautan (Logika tetap sama)
    for (const href of allHrefs) {
      if (href && typeof href === "string") {
        const normalizedHref = href.toLowerCase();

        for (const [name, domain] of Object.entries(SOCIAL_DOMAINS)) {
          if (normalizedHref.includes(domain)) {
            if (!foundUrlsMap.has(name) || name === "linktree") {
              foundUrlsMap.set(name, normalizedHref);
              break;
            }
          }
        }
      }
    }

    return Object.fromEntries(foundUrlsMap);
  } catch (error) {
    console.error("Scraping gagal:", error.message);
    return {};
  } finally {
    if (browser) {
      //   await browser.close();
    }
  }
}

// --- Contoh Penggunaan ---
const TARGET_URL = "https://uad.ac.id/";

scrapeSocialMedia(TARGET_URL)
  .then((jsonResult) => {
    console.log("\n--- Hasil JSON ---");
    console.log(JSON.stringify(jsonResult, null, 2));
  })
  .catch((err) => console.error(err));
