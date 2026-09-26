import { chromium } from "playwright";
import * as cheerio from "cheerio";

export async function scrapeNetmeds(medicineName) {
  let browser = null;
  let page = null;
  try {
    browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-gpu', '--disable-dev-shm-usage', '--no-sandbox']
    });
    page = await browser.newPage();

    // Block heavy resources to save massive CPU/RAM and speed up load times
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media', 'other'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    const searchUrl = `https://www.netmeds.com/products?q=${encodeURIComponent(medicineName)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    const cardSelector = ".product-card-container";
    await page.waitForSelector(cardSelector, { timeout: 15000 });

    const $ = cheerio.load(await page.content());
    const firstCard = $(cardSelector).first();
    if (!firstCard.length) return null;

    const productName = firstCard.find("h3").first().text().trim();
    const price = firstCard.find(".priceDisplay").first().text().trim();
    const relativeLink = firstCard.find("a").attr("href");
    const productUrl = relativeLink?.startsWith("http") ? relativeLink : `https://www.netmeds.com${relativeLink}`;

    return { vendor: "Netmeds", productName, price, productUrl };
  } catch (err) {
    console.error("Netmeds scrape failed:", err.message);
    return null;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}
