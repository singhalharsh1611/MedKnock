import * as cheerio from "cheerio";
async function test() {
    const res = await fetch("https://www.netmeds.com/products?q=montina%20l", {headers:{"User-Agent":"Mozilla/5.0"}});
    const html = await res.text();
    const $ = cheerio.load(html);
    console.log("Netmeds cards:", $(".product-card-container").length);
    console.log("PharmEasy test:");
    const res2 = await fetch("https://pharmeasy.in/search/all?name=montina%20l", {headers:{"User-Agent":"Mozilla/5.0"}});
    const html2 = await res2.text();
    const $2 = cheerio.load(html2);
    console.log("PharmEasy cards:", $2('a[class*="ProductCard_medicineUnitWrapper"]').length);
}
test();
