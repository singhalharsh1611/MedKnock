import * as cheerio from "cheerio";

async function test() {
    const res = await fetch('https://www.apollopharmacy.in/search-medicines/montina%20l', {
        headers:{'User-Agent':'Mozilla/5.0'}
    });
    const html = await res.text();
    const $ = cheerio.load(html);
    console.log("H2s:", $('h2').length);
    console.log("Cards:", $('div[class*="ProductCard_productCardGrid"]').length);
    console.log("xb Cards:", $('div.xb').length);
}
test();
