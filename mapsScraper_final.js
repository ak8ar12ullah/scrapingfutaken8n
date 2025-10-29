import browserWeb from "./browserWeb.js";

export async function mapsScraper(urlDatas) {
  try {
    const detailPage = await browserWeb.newPage();
    await detailPage.goto(urlDatas, { waitUntil: "domcontentloaded" });
    // await detailPage.waitForTimeout(4000);
    await setTimeout(() => {}, 1500);

    const content = await detailPage.content();

    console.log(`
      scraping data : ${urlDatas}`);
    // Cari telepon dengan regex pada konten halaman
    const phoneMatch = content.match(/(\+\d{1,3}\s?\d[\d\s-]{6,})/);
    const phone = phoneMatch ? phoneMatch[1] : null;

    // Ambil semua link eksternal non-google
    const externalLinks = await detailPage.$$eval("a", (as) =>
      as
        .map((a) => a.href)
        .filter((href) => href.startsWith("http") && !href.includes("google"))
    );

    const emailMatch = content.match(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    );
    const email = emailMatch ? emailMatch[0] : null;

    // Pisahkan menjadi website utama & sosial media
    let website = null;
    let socials = [];

    for (const url of externalLinks) {
      if (
        !website &&
        !/facebook|instagram|twitter|tiktok|linkedin/i.test(url)
      ) {
        website = url; // asumsikan ini website resmi
      } else if (/facebook|instagram|twitter|tiktok|linkedin/i.test(url)) {
        socials.push(url);
      }
    }

    // results.push([phone, JSON.stringify(socials), email]);

    await detailPage.close();

    return {
      phone,
      email,
      socials,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}
