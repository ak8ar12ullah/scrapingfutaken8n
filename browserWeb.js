import puppeteer from "puppeteer";

const browserWeb = await puppeteer.launch({
  headless: true,
  slowMo: 100,
  ignoreHTTPSErrors: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-extensions"],
});

export default browserWeb;
