import fetch from "node-fetch";

export async function scrapeNetmeds(medicineName) {
  try {
    const searchUrl = `https://www.netmeds.com/ext/search/application/api/v1.0/products?page_id=%2A&page_size=12&q=${encodeURIComponent(medicineName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'accept': 'application/json'
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    // Trust Netmeds relevance sort — pick first sellable item
    const item = data.items.find(i => i.sellable !== false) || data.items[0];
    if (!item) return null;

    const productName = item.name;
    const priceStr = item.price?.effective?.min;
    if (!productName || priceStr === undefined) return null;

    const slug = item.action?.page?.params?.slug?.[0];
    const productUrl = slug
      ? `https://www.netmeds.com/prescriptions/${slug}`
      : `https://www.netmeds.com/catalogsearch/result/${encodeURIComponent(medicineName)}/all`;

    return { vendor: "Netmeds", productName, price: `₹${priceStr}`, productUrl };
  } catch (err) {
    console.error("Netmeds scrape failed:", err.message);
    return null;
  }
}
