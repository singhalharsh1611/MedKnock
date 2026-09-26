import { WebScraperService } from "../services/webScraperService.js";

export const webScraperController = async (req, res) => {
  try {
    const { medicineName } = req.params;
    const validResults = await WebScraperService.fetchPriceComparison(medicineName);
    
    res.json({ medicineName, results: validResults });
  } catch (err) {
    console.error("Controller error:", err.message);
    res.status(500).json({ error: "Scraping failed" });
  }
};
