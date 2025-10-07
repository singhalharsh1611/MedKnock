import { chromium } from "playwright";
import * as cheerio from "cheerio";

async function scrapeApollo(page, medicineName) {
  const searchUrl = `https://www.apollopharmacy.in/search-medicines/${encodeURIComponent(medicineName)}`;
  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });

  const productCardSelector = 'div[class*="ProductCard_productCardGrid"], div.xb';
  await page.waitForSelector(productCardSelector, { timeout: 20000 });

  const html = await page.content();
  const $ = cheerio.load(html);

  const firstCard = $(productCardSelector).first();
  if (!firstCard.length) return null;

  const productName = firstCard.find("h2").first().text().trim();
  const price = firstCard.find("p").filter((_, el) => $(el).text().trim().startsWith("₹")).first().text().trim();
  const relativeUrl = firstCard.find("a").attr("href");
  const productUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://www.apollopharmacy.in${relativeUrl}`;

  return { vendor: "Apollo Pharmacy", productName, price, productUrl };
}

async function scrapeNetmeds(page, medicineName) {
  const searchUrl = `https://www.netmeds.com/products?q=${encodeURIComponent(medicineName)}&sort_on=price_asc`;
  await page.goto(searchUrl, { waitUntil: "networkidle" });

  const cardSelector = ".product-card-container";
  await page.waitForSelector(cardSelector, { timeout: 20000 });

  const html = await page.content();
  const $ = cheerio.load(html);
  const firstCard = $(cardSelector).first();
  if (!firstCard.length) return null;

  const productName = firstCard.find("h3").first().text().trim();
  const price = firstCard.find(".priceDisplay").first().text().trim();
  const relativeLink = firstCard.find("a").attr("href");
  const productUrl = relativeLink?.startsWith("http") ? relativeLink : `https://www.netmeds.com${relativeLink}`;

  return { vendor: "Netmeds", productName, price, productUrl };
}

async function scrape1mg(page, medicineName) {
  const searchUrl = `https://www.1mg.com/search/all?name=${encodeURIComponent(medicineName)}`;
  await page.goto(searchUrl, { waitUntil: "networkidle" });

  const cardSelector = ".style__container___cTDz0";
  await page.waitForSelector(cardSelector, { timeout: 20000 });

  const html = await page.content();
  const $ = cheerio.load(html);
  const firstCard = $(cardSelector).first();
  if (!firstCard.length) return null;

  const productName = firstCard.find(".style__pro-title___3zxNC").first().text().trim();
  const price = firstCard.find(".style__price-tag___B2csA").first().text().trim();
  const relativeLink = firstCard.find("a").attr("href");
  const productUrl = relativeLink?.startsWith("http") ? relativeLink : `https://www.1mg.com${relativeLink}`;

  return { vendor: "1mg", productName, price, productUrl };
}

async function scrapePharmEasy(page, medicineName) {
  const searchUrl = `https://pharmeasy.in/search/all?name=${encodeURIComponent(medicineName)}`;
  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });

  const cardSelector = 'a[class*="ProductCard_medicineUnitWrapper"]';
  await page.waitForSelector(cardSelector, { timeout: 20000 });

  const html = await page.content();
  const $ = cheerio.load(html);
  const firstCard = $(cardSelector).first();
  if (!firstCard.length) return null;

  const productName = firstCard.find("h1[class*='ProductCard_medicineName']").text().trim();
  const price = firstCard.find("div[class*='ProductCard_ourPrice']").text().trim().replace(/\*$/, "");;
  const relativeUrl = firstCard.attr("href");
  const productUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://pharmeasy.in${relativeUrl}`;

  return { vendor: "PharmEasy", productName, price, productUrl };
}

// --- Controller ---
export const webScraperController = async (req, res) => {
  const { medicineName } = req.params;
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });

    // Create a page per site
    const [apolloPage, netmedsPage, oneMgPage, pharmEasyPage] = await Promise.all([
      browser.newPage(),
      browser.newPage(),
      browser.newPage(),
      browser.newPage()
    ]);

    // Run scrapers in parallel
    const results = await Promise.all([
      scrapeApollo(apolloPage, medicineName),
      scrapeNetmeds(netmedsPage, medicineName),
      scrape1mg(oneMgPage, medicineName),
      scrapePharmEasy(pharmEasyPage, medicineName)
    ]);

    // Close pages
    await Promise.all([
      apolloPage.close(),
      netmedsPage.close(),
      oneMgPage.close(),
      pharmEasyPage.close()
    ]);

    res.json({ medicineName, results: results.filter(r => r !== null) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Scraping failed" });
  } finally {
    if (browser) await browser.close();
  }
};
