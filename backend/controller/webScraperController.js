import { scrapeApollo } from "../scrapers/scrapeApollo.js";
import { scrapeNetmeds } from "../scrapers/scrapeNetmeds.js";
import { scrape1mg } from "../scrapers/scrape1mg.js";
import { scrapePharmEasy } from "../scrapers/scrapePharmEasy.js";

export const webScraperController = async (req, res) => {
  const { medicineName } = req.params;

  try {
    const results = await Promise.all([
      scrapeApollo(medicineName),
      scrapeNetmeds(medicineName),
      scrape1mg(medicineName),
      scrapePharmEasy(medicineName)
    ]);

    // Filter out nulls
    res.json({ medicineName, results: results.filter(r => r !== null) });
  } catch (err) {
    console.error("Controller error:", err.message);
    res.status(500).json({ error: "Scraping failed" });
  }
};

