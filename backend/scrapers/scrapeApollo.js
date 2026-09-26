import { chromium } from "playwright";
import * as cheerio from "cheerio";

export async function scrapeApollo(medicineName) {
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

    const searchUrl = `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(medicineName)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    const productCardSelector = 'div[class*="ProductCard_productCardGrid"], div.xb';
    await page.waitForSelector(productCardSelector, { timeout: 15000 });

    const $ = cheerio.load(await page.content());
    const firstCard = $(productCardSelector).first();
    if (!firstCard.length) return null;

    const productName = firstCard.find("h2").first().text().trim();
    const price = firstCard.find("p").filter((_, el) => $(el).text().trim().startsWith("₹")).first().text().trim();
    const relativeUrl = firstCard.find("a").attr("href");
    const productUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://www.apollopharmacy.in${relativeUrl}`;

    return { vendor: "Apollo Pharmacy", productName, price, productUrl };
  } catch (err) {
    console.error("Apollo scrape failed:", err.message);
    return null;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}
