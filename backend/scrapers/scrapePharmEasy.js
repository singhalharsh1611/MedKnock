import * as cheerio from "cheerio";
import { pickBestMatch } from "../utils/searchUtils.js";

export async function scrapePharmEasy(medicineName) {
    const searchUrl = `https://pharmeasy.in/search/all?name=${encodeURIComponent(medicineName)}`;
    
    try {
        const res = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            }
        });
        
        if (!res.ok) return null;
        
        const html = await res.text();
        const $ = cheerio.load(html);
        
        const cardSelector = 'a[class*="ProductCard_medicineUnitWrapper"]';
        const cards = $(cardSelector);
        if (!cards.length) return null;

        // Collect up to 10 results to score
        const candidates = [];
        cards.slice(0, 10).each((_, el) => {
            const card = $(el);
            const name = card.find("h1[class*='ProductCard_medicineName']").text().trim();
            const price = card.find("div[class*='ProductCard_ourPrice']").text().trim().replace(/\*$/, "");
            const relativeUrl = card.attr("href");
            const productUrl = relativeUrl?.startsWith("http") ? relativeUrl : `https://pharmeasy.in${relativeUrl}`;
            if (name) candidates.push({ name, price, productUrl });
        });

        if (candidates.length === 0) return null;

        // Pick the best dosage match
        const best = pickBestMatch(medicineName, candidates) || candidates[0];

        return { vendor: "PharmEasy", productName: best.name, price: best.price, productUrl: best.productUrl };
    } catch (err) {
        console.error("PharmEasy scrape failed:", err.message);
        return null;
    }
}
