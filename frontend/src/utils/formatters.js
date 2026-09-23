/**
 * Converts ALL-CAPS product names to standard Title Case with proper unit formatting
 * Example: "MEKELESHA WITH SHENO GHEE 10G" -> "Mekelesha with Sheno Ghee 10g"
 */
export function formatProductName(name) {
  if (!name || typeof name !== "string") return "";

  const minorWords = new Set(["with", "and", "or", "in", "on", "at", "to", "for", "of", "by"]);

  return name
    .toLowerCase()
    .replace(/\b([a-z0-9/()*-]+)\b/gi, (match, offset) => {
      const lower = match.toLowerCase();

      // Format unit suffixes like 10g, 500gm, 1kg, 5l, 500ml, 30ml
      const unitMatch = match.match(/^(\d+(?:\/\d+)?)(gm|g|kg|ml|l|ltr|pcs|pack|gr)$/i);
      if (unitMatch) {
        return `${unitMatch[1]}${unitMatch[2].toLowerCase()}`;
      }

      // Keep minor words lowercase unless at start of title
      if (offset > 0 && minorWords.has(lower)) {
        return lower;
      }

      // Title case word
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
    })
    .replace(/\s+/g, " ")
    .trim();
}