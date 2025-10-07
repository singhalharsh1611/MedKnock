import { chromium } from "playwright";
import * as cheerio from "cheerio";

export async function scrapePharmEasy(medicineName) {
  let browser = null;
  let page = null;
  try {
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();

    const searchUrl = `https://pharmeasy.in/search/all?name=${encodeURIComponent(medicineName)}`;
    await page.goto(searchUrl, { waitUntil: "networkidle" });

    const cardSelector = 'a[class*="ProductCard_medicineUnitWrapper"]';
    await page.waitForSelector(cardSelector, { timeout: 20000 });

    const $ = cheerio.load(await page.content());
    const firstCard = $(cardSelector).first();
    if (!firstCard.length) return null;

    const productName = firstCard.find("h1[class*='ProductCard_medicineName']").text().trim();
    const price = firstCard.find("div[class*='ProductCard_ourPrice']").text().trim().replace(/\*$/, "");
    const relativeUrl = firstCard.attr("href");
    const productUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://pharmeasy.in${relativeUrl}`;

    return { vendor: "PharmEasy", productName, price, productUrl };
  } catch (err) {
    console.error("PharmEasy scrape failed:", err.message);
    return null;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}
