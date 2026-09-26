export function cleanMedicineName(name) {
    if (!name) return "";
    
    // Remove common packaging terms but KEEP the dosage (e.g. 650mg, 10mg)
    let cleaned = name.replace(/\b(strip|tablet|tablets|tab|capsule|capsules|cap|syrup|injection|pack|vial|sachet|of)\b/gi, "");
    
    // Remove pack-size numbers only (e.g. "10's", "30 tabs") but NOT dosage numbers
    cleaned = cleaned.replace(/\b(\d+)\s*('s|tabs?|caps?|pieces?|pcs?)\b/gi, "");

    // Remove special characters
    cleaned = cleaned.replace(/[-_()]/g, " ");
    
    // Remove extra spaces
    return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Extracts dosage from a medicine name, e.g. "Dolo 650mg" -> "650mg", "650"
 * Returns { value: 650, unit: "mg", raw: "650mg" } or null
 */
export function extractDosage(name) {
    if (!name) return null;
    const match = name.match(/(\d+(?:\.\d+)?)\s*(mg|ml|mcg|g|iu|%)/i);
    if (!match) return null;
    return { value: parseFloat(match[1]), unit: match[2].toLowerCase(), raw: match[0] };
}

/**
 * Scores a result name against the original search query.
 * Higher is better. Returns a number 0-100.
 *
 * Scoring:
 * - Exact dosage match:          +60
 * - Dosage within 10% tolerance: +30
 * - No dosage in query at all:   +10 (neutral)
 * - Brand name match:            +40
 */
export function scoreMatch(searchQuery, resultName) {
    if (!resultName) return -1;

    const searchLower = searchQuery.toLowerCase();
    const resultLower = resultName.toLowerCase();
    let score = 0;

    // --- Brand / name matching ---
    // Get the "word" part of the search (strip dosage)
    const searchWords = searchLower.replace(/\d+(?:\.\d+)?\s*(mg|ml|mcg|g|iu|%)/gi, "").trim().split(/\s+/);
    const allWordsMatch = searchWords.every(word => word.length > 1 && resultLower.includes(word));
    if (allWordsMatch) score += 40;
    else if (resultLower.includes(searchWords[0])) score += 20; // at least brand matches

    // --- Dosage matching ---
    const queryDosage = extractDosage(searchQuery);
    const resultDosage = extractDosage(resultName);

    if (!queryDosage) {
        // No dosage in search query — any result is fine
        score += 10;
    } else if (!resultDosage) {
        // Query has dosage but result doesn't mention one — mild penalty
        score -= 5;
    } else if (queryDosage.unit === resultDosage.unit) {
        const diff = Math.abs(queryDosage.value - resultDosage.value);
        if (diff === 0) {
            score += 60; // exact match
        } else if (diff / queryDosage.value <= 0.10) {
            score += 30; // within 10% (e.g. 650mg vs 660mg)
        } else if (diff / queryDosage.value <= 0.25) {
            score += 10; // within 25%
        } else {
            score -= 20; // very different dosage (e.g. 500mg vs 1000mg)
        }
    } else {
        // Different unit entirely (mg vs ml) — bad match
        score -= 15;
    }

    return score;
}

/**
 * Picks the best matching item from a list based on the original search query.
 * @param {string} searchQuery - Original user query e.g. "Dolo 650mg"
 * @param {Array} items - Array of objects with a `name` field
 * @returns {object|null} - Best matching item
 */
export function pickBestMatch(searchQuery, items) {
    if (!items || items.length === 0) return null;
    if (items.length === 1) return items[0];

    let best = null;
    let bestScore = -Infinity;

    for (const item of items) {
        const name = item.name || item.productName || "";
        const s = scoreMatch(searchQuery, name);
        if (s > bestScore) {
            bestScore = s;
            best = item;
        }
    }

    return best;
}

// Optional: basic validity check
export function isValidMatch(searchQuery, resultName) {
    if (!resultName) return false;
    const cleanedSearch = cleanMedicineName(searchQuery).toLowerCase();
    const resultLower = resultName.toLowerCase();
    const firstWord = cleanedSearch.split(" ")[0];
    return resultLower.includes(firstWord);
}
