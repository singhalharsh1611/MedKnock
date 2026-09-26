export function cleanMedicineName(name) {
    if (!name) return "";
    
    // Remove common packaging and dosage terms
    let cleaned = name.replace(/\b(strip|tablet|tablets|capsule|capsules|syrup|injection|pack|vial|sachet|mg|ml|gm|of)\b/gi, "");
    
    // Remove extra numbers at the end that were part of dosage/pack size (e.g. " 10 ")
    cleaned = cleaned.replace(/[0-9]+/g, ""); 
    
    // Remove special characters
    cleaned = cleaned.replace(/[-_()]/g, " ");
    
    // Remove extra spaces
    return cleaned.replace(/\s+/g, " ").trim();
}

// Optional: You can use this in your scrapers to verify the result actually matches the search query
export function isValidMatch(searchQuery, resultName) {
    if (!resultName) return false;
    
    const cleanedSearch = cleanMedicineName(searchQuery).toLowerCase();
    const resultLower = resultName.toLowerCase();
    
    // If the first word of the cleaned search is in the result, it's usually a good match
    const firstWord = cleanedSearch.split(" ")[0];
    return resultLower.includes(firstWord);
}
