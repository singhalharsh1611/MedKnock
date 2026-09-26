import { scrapeNetmeds } from "../scrapers/scrapeNetmeds.js";
import { scrape1mg } from "../scrapers/scrape1mg.js";
import { scrapePharmEasy } from "../scrapers/scrapePharmEasy.js";
import { cleanMedicineName } from "../utils/searchUtils.js";

export class WebScraperService {
  static async fetchPriceComparison(medicineName) {
    const cleanedQuery = cleanMedicineName(medicineName);

    const results = await Promise.all([
      scrapeNetmeds(cleanedQuery),
      scrape1mg(cleanedQuery),
      scrapePharmEasy(cleanedQuery)
    ]);

    return results.filter((r) => r !== null);
  }
}
