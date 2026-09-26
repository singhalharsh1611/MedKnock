import * as cheerio from "cheerio";

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
    }
}
