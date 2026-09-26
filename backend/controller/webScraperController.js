import { scrapeApollo } from "../scrapers/scrapeApollo.js";
import { scrapeNetmeds } from "../scrapers/scrapeNetmeds.js";
import { scrape1mg } from "../scrapers/scrape1mg.js";
import { scrapePharmEasy } from "../scrapers/scrapePharmEasy.js";
import { cleanMedicineName } from "../utils/searchUtils.js";

export const webScraperController = async (req, res) => {
  const { medicineName } = req.params;
  
  // Clean the highly specific name (e.g. "Montina L Strip of 10 Tablets" -> "Montina L")
  const cleanedQuery = cleanMedicineName(medicineName);

  try {
    const results = await Promise.all([
      scrapeApollo(cleanedQuery),
      scrapeNetmeds(cleanedQuery),
      scrape1mg(cleanedQuery),
      scrapePharmEasy(cleanedQuery)
    ]);

    // Filter out nulls
    res.json({ medicineName, results: results.filter(r => r !== null) });
  } catch (err) {
    console.error("Controller error:", err.message);
    res.status(500).json({ error: "Scraping failed" });
  }
};

