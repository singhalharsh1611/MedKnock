import { chromium } from "playwright";
import * as cheerio from "cheerio";

export async function scrape1mg(medicineName) {
    let browser = null;
    let page = null;

    // Multiple possible selectors (updated frequently by 1mg)
    const cardSelectors = [
        ".style__container___cTDz0",
        ".style__product-box___3oEU6", // add another potential card selector here
    ];
    const nameSelectors = [
        ".style__pro-title___3zxNC",
        ".style__pro-title___3G3rr", // alternative product title selector
    ];
    const priceSelectors = [
        ".style__price-tag___B2csA",
        ".style__price-tag___KzOkY", // alternative price selector
    ];

    try {
        browser = await chromium.launch({ headless: true });
        page = await browser.newPage();

        const searchUrl = `https://www.1mg.com/search/all?name=${encodeURIComponent(medicineName)}`;
        await page.goto(searchUrl, { waitUntil: "networkidle" });

        let firstCard = null;
        const content = await page.content();
        const $ = cheerio.load(content);

        // Try multiple card selectors
        for (const selector of cardSelectors) {
            firstCard = $(selector).first();
            if (firstCard.length) break;
        }
        if (!firstCard || !firstCard.length) return null;

        // Try multiple inner selectors for product name
        let productName = "";
        for (const sel of nameSelectors) {
            productName = firstCard.find(sel).first().text().trim();
            if (productName) break;
        }

        // Try multiple inner selectors for price
        let price = "";

        for (const sel of priceSelectors) {
            const priceDiv = firstCard.find(sel).first();
            if (!priceDiv.length) continue;

            if (sel === ".style__price-tag___KzOkY") {
                price = priceDiv
                    .contents()
                    .filter((i, el) => el.type === 'text')
                    .text()
                    .trim();
            } else {
                price = priceDiv.text().trim();
            }

            if (price) break;
        }

        const relativeLink = firstCard.find("a").attr("href");
        const productUrl = relativeLink?.startsWith("http") ? relativeLink : `https://www.1mg.com${relativeLink}`;

        return { vendor: "1mg", productName, price, productUrl };
    } catch (err) {
        console.error("1mg scrape failed:", err.message);
        return null;
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}
