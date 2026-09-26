export function cleanMedicineName(name) {
  if (!name) return "";

  // Remove packaging words but KEEP dosage numbers (e.g. 650mg stays)
  let cleaned = name.replace(/\b(strip|tablet|tablets|tab|capsule|capsules|cap|syrup|injection|pack|vial|sachet|of)\b/gi, "");

  // Remove pack-size patterns like "10's", "30 tabs" but NOT "650mg"
  cleaned = cleaned.replace(/\b(\d+)\s*('s|tabs?|caps?|pieces?|pcs?)\b/gi, "");

  cleaned = cleaned.replace(/[-_()]/g, " ");
  return cleaned.replace(/\s+/g, " ").trim();
}
