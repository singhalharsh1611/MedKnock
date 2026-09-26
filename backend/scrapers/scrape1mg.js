import { pickBestMatch } from "../utils/searchUtils.js";

export async function scrape1mg(medicineName, userCity = "New Delhi") {
    const url = new URL("https://www.1mg.com/pwa-api/api/v4/search/all");
    
    url.searchParams.append("q", medicineName);
    url.searchParams.append("city", userCity);
    url.searchParams.append("filter", "");
    url.searchParams.append("page_number", "0");
    url.searchParams.append("per_page", "10");
    url.searchParams.append("types", "sku,allopathy");
    url.searchParams.append("sort", "relevance");
    url.searchParams.append("fetch_eta", "true");
    url.searchParams.append("is_city_serviceable", "true");
    url.searchParams.append("substitutes_filter", "false");

    try {
        const res = await fetch(url.toString(), {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json, text/plain, */*",
                "x-city": userCity,
                "city": userCity
            }
        });
        
        if (!res.ok) return null;
        
        const responseData = await res.json();
        if (!responseData?.data?.search_results) return null;
        
        // Only consider available drugs
        const available = responseData.data.search_results.filter(
            item => item.available === true && item.type === "drug"
        );

        if (available.length === 0) return null;

        // Map to a shape pickBestMatch understands
        const candidates = available.map(item => ({ ...item, name: item.name }));

        // Pick the best dosage match, fall back to first available if no dosage in query
        const best = pickBestMatch(medicineName, candidates) || candidates[0];
        
        const finalPrice = best.prices?.discounted_price || best.prices?.mrp || "N/A";

        return {
            vendor: "1mg",
            productName: best.name,
            price: finalPrice.toString().includes("₹") ? finalPrice : `₹${finalPrice}`,
            productUrl: `https://www.1mg.com${best.url}`
        };
        
    } catch (err) {
        console.error("1mg API scrape failed:", err.message);
        return null;
    }
}
